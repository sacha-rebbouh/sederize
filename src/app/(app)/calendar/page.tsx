'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  format,
  addDays,
  subDays,
  startOfDay,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isSameDay,
  eachDayOfInterval,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronUp,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/task-card';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useTasksByDateRange } from '@/hooks/use-tasks';
import { TaskWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Number of days to load initially and on each load more
const INITIAL_DAYS = 14;
const LOAD_MORE_DAYS = 14;

function formatDayHeader(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return 'Demain';
  if (isYesterday(date)) return 'Hier';
  return format(date, 'EEEE d MMMM', { locale: fr });
}

function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: fr });
}

// Sort tasks by time, then priority
function sortDayTasks(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return [...tasks].sort((a, b) => {
    // Time first (nulls last)
    if (a.do_time && b.do_time) return a.do_time.localeCompare(b.do_time);
    if (a.do_time && !b.do_time) return -1;
    if (!a.do_time && b.do_time) return 1;
    // Then priority (high first)
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}

interface DaySection {
  date: Date;
  dateKey: string;
  tasks: TaskWithRelations[];
  isOverdue: boolean;
}

export default function CalendarPage() {
  const today = startOfDay(new Date());
  const [daysToShow, setDaysToShow] = useState(INITIAL_DAYS);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  // Calculate date range: 7 days ago to daysToShow in future
  const dateRange = useMemo(() => ({
    start: subDays(today, 7),
    end: addDays(today, daysToShow),
  }), [today, daysToShow]);

  const { data: tasks, isLoading } = useTasksByDateRange(dateRange.start, dateRange.end);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};
    tasks?.forEach((task) => {
      if (task.do_date) {
        if (!grouped[task.do_date]) {
          grouped[task.do_date] = [];
        }
        grouped[task.do_date].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Build day sections (only days with tasks + today + selected date even if empty)
  const daySections = useMemo(() => {
    const sections: DaySection[] = [];
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

    // Collect overdue tasks (before today)
    const overdueTasks: TaskWithRelations[] = [];

    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dateKey] || [];
      const isOverdue = isPast(day) && !isToday(day);
      const isSelected = selectedDate && isSameDay(day, selectedDate);

      if (isOverdue && dayTasks.length > 0) {
        // Collect overdue tasks
        overdueTasks.push(...dayTasks.filter(t => t.status !== 'done'));
      } else if (isToday(day) || isSelected || dayTasks.length > 0) {
        // Show today always, selected date, or days with tasks
        sections.push({
          date: day,
          dateKey,
          tasks: sortDayTasks(dayTasks),
          isOverdue: false,
        });
      }
    });

    // If selected date is outside current range, add it
    if (selectedDate && !sections.find(s => isSameDay(s.date, selectedDate))) {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dateKey] || [];
      sections.push({
        date: selectedDate,
        dateKey,
        tasks: sortDayTasks(dayTasks),
        isOverdue: false,
      });
      // Sort by date
      sections.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    // Add overdue section at the top if there are overdue tasks
    if (overdueTasks.length > 0) {
      sections.unshift({
        date: subDays(today, 1),
        dateKey: 'overdue',
        tasks: sortDayTasks(overdueTasks),
        isOverdue: true,
      });
    }

    return sections;
  }, [tasksByDate, dateRange, today, selectedDate]);

  // Total tasks count
  const totalTasks = useMemo(() => {
    return daySections.reduce((sum, section) => sum + section.tasks.length, 0);
  }, [daySections]);

  // Current month based on first visible section
  const currentMonth = useMemo(() => {
    const firstNonOverdue = daySections.find(s => !s.isOverdue);
    return firstNonOverdue ? firstNonOverdue.date : today;
  }, [daySections, today]);

  // Load more days
  const handleLoadMore = useCallback(() => {
    setDaysToShow(prev => prev + LOAD_MORE_DAYS);
  }, []);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Handle date selection from calendar picker
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
      // Extend range if needed
      const daysFromToday = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysFromToday > daysToShow) {
        setDaysToShow(daysFromToday + 7);
      }
      // Scroll to date after a short delay for DOM update
      setTimeout(() => {
        const element = document.getElementById(`day-${format(date, 'yyyy-MM-dd')}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [today, daysToShow]);

  // Check if we can see today section
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setShowScrollToTop(scrollContainer.scrollTop > 200);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold capitalize">
                {formatMonthYear(currentMonth)}
              </h1>
              {totalTasks > 0 && (
                <p className="text-xs text-muted-foreground">
                  {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Aller à</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={handleDateSelect}
                modifiers={{
                  hasTasks: (date) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    return (tasksByDate[dateKey]?.length || 0) > 0;
                  },
                }}
                modifiersStyles={{
                  hasTasks: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))',
                    textUnderlineOffset: '3px',
                  },
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Agenda List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
      >
        <div className="divide-y">
          {daySections.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune tâche planifiée</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Vos tâches avec une date apparaîtront ici
              </p>
            </div>
          ) : (
            daySections.map((section) => (
              <div
                key={section.dateKey}
                id={`day-${section.dateKey}`}
                ref={isToday(section.date) && !section.isOverdue ? todayRef : undefined}
              >
                {/* Day Header - Sticky */}
                <div
                  className={cn(
                    'sticky top-0 z-10 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b',
                    section.isOverdue && 'bg-destructive/5',
                    isToday(section.date) && !section.isOverdue && 'bg-primary/5',
                    selectedDate && isSameDay(section.date, selectedDate) && !section.isOverdue && 'bg-purple-500/10 border-l-2 border-l-purple-500'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {section.isOverdue ? (
                        <span className="text-sm font-semibold text-destructive">
                          En retard
                        </span>
                      ) : (
                        <>
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              isToday(section.date) && 'text-primary',
                              selectedDate && isSameDay(section.date, selectedDate) && 'text-purple-600'
                            )}
                          >
                            {formatDayHeader(section.date)}
                          </span>
                          {!isToday(section.date) && !isTomorrow(section.date) && !isYesterday(section.date) && (
                            <span className="text-xs text-muted-foreground">
                              {format(section.date, 'd MMM', { locale: fr })}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {section.tasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks for this day */}
                <div className="p-3 space-y-2 bg-muted/20">
                  {section.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune tâche
                    </p>
                  ) : (
                    section.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        theme={task.theme}
                        labels={task.labels}
                        showSubject
                        subjectTitle={task.subject?.title}
                        compact
                      />
                    ))
                  )}
                </div>
              </div>
            ))
          )}

          {/* Load More */}
          {daySections.length > 0 && (
            <div className="p-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLoadMore}
              >
                Voir plus ({daysToShow + LOAD_MORE_DAYS} jours)
              </Button>
            </div>
          )}
        </div>

        {/* Bottom padding for FAB */}
        <div className="h-24" />
      </div>

      {/* Scroll to Today FAB */}
      {showScrollToTop && (
        <div
          className="fixed right-4 z-50"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <Button
            size="sm"
            className="rounded-full shadow-lg gap-1"
            onClick={scrollToToday}
          >
            <ChevronUp className="h-4 w-4" />
            Aujourd&apos;hui
          </Button>
        </div>
      )}
    </div>
  );
}
