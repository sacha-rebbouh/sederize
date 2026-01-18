'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import {
  ThemeSubjectFilter,
  FilterState,
  filterTasksByThemeAndSubject,
} from '@/components/filters/theme-subject-filter';
import { useTasksByDateRange } from '@/hooks/use-tasks';
import { TaskWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

// Lazy load calendar views - only loaded when needed
const DayView = dynamic(() => import('@/components/calendar/day-view').then(m => m.DayView), {
  loading: () => <Card className="p-4"><SkeletonCard /></Card>,
});
const ThreeDayView = dynamic(() => import('@/components/calendar/three-day-view').then(m => m.ThreeDayView), {
  loading: () => <Card className="p-4"><SkeletonCard /></Card>,
});
const WeekView = dynamic(() => import('@/components/calendar/week-view').then(m => m.WeekView), {
  loading: () => <Card className="p-4"><SkeletonCard /></Card>,
});

type CalendarViewType = 'day' | '3days' | 'week' | 'month';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02 }
  }
};

const dayVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 }
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [filter, setFilter] = useState<FilterState>({ categoryIds: [], themeIds: [], subjectIds: [] });

  // Persist calendar view type in localStorage
  const [viewType, setViewType] = useState<CalendarViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sederize-calendar-view');
      if (saved && ['day', '3days', 'week', 'month'].includes(saved)) {
        return saved as CalendarViewType;
      }
    }
    return 'month';
  });

  // Save view type to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sederize-calendar-view', viewType);
  }, [viewType]);

  // Calculate date range based on view type
  const dateRange = useMemo(() => {
    switch (viewType) {
      case 'day':
        return { start: currentDate, end: currentDate };
      case '3days':
        return { start: currentDate, end: addDays(currentDate, 2) };
      case 'week':
        return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
      case 'month':
      default:
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return { start: startOfWeek(monthStart), end: endOfWeek(monthEnd) };
    }
  }, [viewType, currentDate]);

  const { data: allTasks, isLoading } = useTasksByDateRange(dateRange.start, dateRange.end);

  // For backward compatibility with month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // Apply filter
  const tasks = useMemo(() => {
    return filterTasksByThemeAndSubject(allTasks || [], filter);
  }, [allTasks, filter]);

  const hasFilters = (filter.categoryIds?.length || 0) > 0 || (filter.themeIds?.length || 0) > 0 || (filter.subjectIds?.length || 0) > 0;

  // Get days to display
  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};

    tasks?.forEach((task) => {
      if (task.do_date) {
        const dateKey = task.do_date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // Count total tasks in view
  const totalTasksInMonth = useMemo(() => {
    return Object.values(tasksByDate).reduce((sum, dayTasks) => sum + dayTasks.length, 0);
  }, [tasksByDate]);

  const getTasksForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  };

  const handleDateClick = (date: Date) => {
    const dayTasks = getTasksForDate(date);
    if (dayTasks.length > 0) {
      setSelectedDate(date);
      setDialogOpen(true);
    }
  };

  const goToPrevious = () => {
    setDirection(-1);
    switch (viewType) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1));
        break;
      case '3days':
        setCurrentDate(subDays(currentDate, 3));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const goToNext = () => {
    setDirection(1);
    switch (viewType) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case '3days':
        setCurrentDate(addDays(currentDate, 3));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setDirection(0);
    setCurrentDate(new Date());
  };

  // Format header label based on view type
  const headerLabel = useMemo(() => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case '3days':
        return `${format(currentDate, 'MMM d')} - ${format(addDays(currentDate, 2), 'MMM d, yyyy')}`;
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  }, [viewType, currentDate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto p-4 md:p-6 space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <CalendarDays className="h-5 w-5 text-purple-500" />
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
              <p className="text-sm text-muted-foreground">
                Plan your schedule
                {totalTasksInMonth > 0 && (
                  <span className="ml-2 text-purple-600">
                    · {totalTasksInMonth} tasks{hasFilters && ' (filtered)'}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewType}
            onValueChange={(value) => value && setViewType(value as CalendarViewType)}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem value="day" className="text-xs px-2 sm:px-3 h-8">Jour</ToggleGroupItem>
            <ToggleGroupItem value="3days" className="text-xs px-2 sm:px-3 h-8">3J</ToggleGroupItem>
            <ToggleGroupItem value="week" className="text-xs px-2 sm:px-3 h-8">Sem</ToggleGroupItem>
            <ToggleGroupItem value="month" className="text-xs px-2 sm:px-3 h-8">Mois</ToggleGroupItem>
          </ToggleGroup>

          <ThemeSubjectFilter value={filter} onChange={setFilter} />
        </div>

        {/* Navigation Row */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 active:scale-95" onClick={goToPrevious}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.span
                key={headerLabel}
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.2 }}
                className="text-lg font-semibold"
              >
                {headerLabel}
              </motion.span>
            </AnimatePresence>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd&apos;hui
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11 active:scale-95" onClick={goToNext}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {/* Calendar Views */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {isLoading ? (
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </Card>
        ) : viewType === 'day' ? (
          <DayView date={currentDate} tasks={tasks || []} />
        ) : viewType === '3days' ? (
          <ThreeDayView startDate={currentDate} tasks={tasks || []} />
        ) : viewType === 'week' ? (
          <WeekView
            date={currentDate}
            tasks={tasks || []}
            onDateClick={(date) => {
              setCurrentDate(date);
              setViewType('day');
            }}
          />
        ) : (
          <Card className="overflow-hidden shadow-sm">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-3 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </motion.div>
              ))}
            </div>

            {/* Calendar Days - Month View */}
            <AnimatePresence mode="wait">
              <motion.div
                key={format(currentDate, 'yyyy-MM')}
                className="grid grid-cols-7"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {days.map((day, index) => {
                  const dayTasks = getTasksForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelectedDay = selectedDate && isSameDay(day, selectedDate);
                  const hasTasks = dayTasks.length > 0;

                  // Group tasks by theme color for dots
                  const themeColors = Array.from(new Set(
                    dayTasks
                      .filter((t) => t.theme?.color_hex)
                      .map((t) => t.theme!.color_hex)
                  )).slice(0, 3);

                  return (
                    <motion.button
                      key={index}
                      variants={dayVariants}
                      onClick={() => handleDateClick(day)}
                      disabled={!hasTasks}
                      whileHover={hasTasks ? { scale: 1.02, backgroundColor: 'rgba(0,0,0,0.02)' } : undefined}
                      whileTap={hasTasks ? { scale: 0.98 } : undefined}
                      className={cn(
                        'relative min-h-[80px] md:min-h-[100px] p-2 border-b border-r text-left transition-colors',
                        !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                        isSelectedDay && 'bg-primary/10',
                        !hasTasks && 'cursor-default',
                        hasTasks && 'hover:bg-accent/50'
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <motion.span
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                            isToday(day) && 'bg-primary text-primary-foreground font-bold'
                          )}
                          whileHover={isToday(day) ? { scale: 1.1 } : undefined}
                        >
                          {format(day, 'd')}
                        </motion.span>
                        {/* Purple dot indicator for days with tasks */}
                        {hasTasks && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-2 w-2 rounded-full bg-purple-500"
                          />
                        )}
                      </div>

                      {/* Task Dots */}
                      <AnimatePresence>
                        {hasTasks && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1 space-y-1"
                          >
                            {/* Show up to 2 task previews on larger screens */}
                            <div className="hidden md:block space-y-0.5">
                              {dayTasks.slice(0, 2).map((task, taskIndex) => (
                                <motion.div
                                  key={task.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: taskIndex * 0.05 }}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate"
                                  style={{
                                    backgroundColor: (task.theme?.color_hex || '#6366f1') + '20',
                                  }}
                                >
                                  <div
                                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                                    style={{
                                      backgroundColor: task.theme?.color_hex || '#6366f1',
                                    }}
                                  />
                                  <span className="truncate">{task.title}</span>
                                </motion.div>
                              ))}
                              {dayTasks.length > 2 && (
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-xs text-muted-foreground px-1"
                                >
                                  +{dayTasks.length - 2} more
                                </motion.span>
                              )}
                            </div>

                            {/* Mobile: Just show colored dots */}
                            <div className="flex gap-1 md:hidden flex-wrap">
                              {themeColors.map((color, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                              {dayTasks.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{dayTasks.length - 3}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </Card>
        )}
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-4 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span>Has tasks</span>
        </div>
      </motion.div>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <motion.div
                className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
              </motion.div>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {selectedDate && getTasksForDate(selectedDate).length === 0 ? (
                <EmptyState
                  type="calendar"
                  title="No tasks"
                  description="No tasks scheduled for this day."
                />
              ) : (
                <AnimatePresence mode="sync">
                  {selectedDate &&
                    getTasksForDate(selectedDate).map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TaskCard
                          task={task}
                          theme={task.theme}
                          labels={task.labels}
                          showSubject
                          subjectTitle={task.subject?.title}
                        />
                      </motion.div>
                    ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Bottom padding for FAB */}
      <div className="h-20 md:h-8" />
    </motion.div>
  );
}
