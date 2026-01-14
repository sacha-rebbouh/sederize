'use client';

import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, startOfDay, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  Hourglass,
  Clock,
  AlertCircle,
  Sparkles,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonPage } from '@/components/ui/skeleton-card';
import { useDailyBriefTasks, useWaitingForTasks } from '@/hooks/use-tasks';
import { useZombieSubjects } from '@/hooks/use-subjects';
import { TaskWithRelations, Theme } from '@/types/database';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type FilterType = 'all' | 'todo' | 'waiting' | 'stale';

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return 'Demain';
  if (isYesterday(date)) return 'Hier';
  return format(date, 'EEEE d MMMM', { locale: fr });
}

interface GroupedTasks {
  theme: Theme | null;
  tasks: TaskWithRelations[];
}

// Sort tasks: Priority DESC > Time ASC (nulls last) > Date ASC > Order ASC
function sortTasks(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return [...tasks].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    if (a.do_time && b.do_time) return a.do_time.localeCompare(b.do_time);
    if (a.do_time && !b.do_time) return -1;
    if (!a.do_time && b.do_time) return 1;
    if (a.do_date && b.do_date) return a.do_date.localeCompare(b.do_date);
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DailyBriefPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { data: tasks, isLoading: tasksLoading } = useDailyBriefTasks(selectedDate);
  const { data: waitingFor } = useWaitingForTasks();
  const { data: zombies } = useZombieSubjects();

  const goToPreviousDay = () => setSelectedDate(d => subDays(d, 1));
  const goToNextDay = () => setSelectedDate(d => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  const { overdueTasks, groupedTasks } = useMemo(() => {
    if (!tasks) return { overdueTasks: [], groupedTasks: [] };

    const today = startOfDay(new Date());
    const overdue: TaskWithRelations[] = [];
    const todayOnly: TaskWithRelations[] = [];

    tasks.forEach((task) => {
      if (!task.do_date) {
        todayOnly.push(task);
      } else {
        const taskDate = startOfDay(new Date(task.do_date));
        if (isBefore(taskDate, today)) {
          overdue.push(task);
        } else {
          todayOnly.push(task);
        }
      }
    });

    const groups: Map<string | null, GroupedTasks> = new Map();

    sortTasks(todayOnly).forEach((task) => {
      const themeId = task.theme?.id || null;
      if (!groups.has(themeId)) {
        groups.set(themeId, { theme: task.theme || null, tasks: [] });
      }
      groups.get(themeId)!.tasks.push(task);
    });

    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (!a.theme) return 1;
      if (!b.theme) return -1;
      return (a.theme.order_index || 0) - (b.theme.order_index || 0);
    });

    return { overdueTasks: sortTasks(overdue), groupedTasks: sortedGroups };
  }, [tasks]);

  const totalTasks = tasks?.length || 0;
  const overdueCount = overdueTasks.length;
  const waitingCount = waitingFor?.length || 0;
  const zombieCount = zombies?.length || 0;

  useEffect(() => {
    if (totalTasks > 0) {
      document.title = `(${totalTasks}) Daily Brief - Sederize`;
    } else {
      document.title = 'Daily Brief - Sederize';
    }
    return () => { document.title = 'Sederize - Order from Chaos'; };
  }, [totalTasks]);

  if (tasksLoading) {
    return <SkeletonPage />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto p-4 md:p-6 space-y-6"
    >
      {/* Header with Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Daily Brief</h1>
            {totalTasks === 0 && isToday(selectedDate) && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
              >
                <Sparkles className="h-6 w-6 text-amber-500" />
              </motion.span>
            )}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <motion.span
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground font-medium min-w-[180px] text-center capitalize"
          >
            {formatDateLabel(selectedDate)}
          </motion.span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-2"
            >
              Aujourd&apos;hui
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Row - Clickable Filters */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <Card
            onClick={() => setActiveFilter(activeFilter === 'todo' ? 'all' : 'todo')}
            className={cn(
              "p-4 hover:shadow-md transition-all cursor-pointer",
              activeFilter === 'todo' && "ring-2 ring-primary shadow-md"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground font-medium">To Do</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card
            onClick={() => setActiveFilter(activeFilter === 'waiting' ? 'all' : 'waiting')}
            className={cn(
              "p-4 hover:shadow-md transition-all cursor-pointer",
              activeFilter === 'waiting' && "ring-2 ring-amber-500 shadow-md"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Hourglass className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{waitingCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Waiting</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card
            onClick={() => setActiveFilter(activeFilter === 'stale' ? 'all' : 'stale')}
            className={cn(
              "p-4 hover:shadow-md transition-all cursor-pointer",
              activeFilter === 'stale' && "ring-2 ring-destructive shadow-md"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{zombieCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Stale</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Active Filter Indicator */}
      <AnimatePresence>
        {activeFilter !== 'all' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <Badge variant="secondary" className="gap-1">
              Filtre: {activeFilter === 'todo' ? 'To Do' : activeFilter === 'waiting' ? 'En attente' : 'Inactifs'}
              <button
                onClick={() => setActiveFilter('all')}
                className="ml-1 hover:text-destructive"
              >
                &times;
              </button>
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERDUE Section - Show when filter is 'all' or 'todo' */}
      <AnimatePresence>
        {overdueCount > 0 && (activeFilter === 'all' || activeFilter === 'todo') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-destructive/50 bg-gradient-to-br from-destructive/5 to-transparent overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertCircle className="h-5 w-5" />
                  </motion.div>
                  Overdue
                  <Badge variant="destructive" className="ml-1">
                    {overdueCount}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {overdueTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      theme={task.theme}
                      labels={task.labels}
                      showSubject
                      subjectTitle={task.subject?.title}
                    />
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State - Show when filter is 'all' or 'todo' and no tasks */}
      {totalTasks === 0 && (activeFilter === 'all' || activeFilter === 'todo') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-dashed">
            <EmptyState
              type="success"
              title="You're all caught up!"
              description="No tasks for today. Enjoy your freedom or plan ahead."
            />
          </Card>
        </motion.div>
      )}

      {/* Grouped Tasks - Show when filter is 'all' or 'todo' */}
      {(activeFilter === 'all' || activeFilter === 'todo') && (
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {groupedTasks.map((group) => (
            <motion.div
              key={group.theme?.id || 'inbox'}
              variants={itemVariants}
              className="space-y-3"
            >
              {/* Theme Header */}
              <div className="flex items-center gap-2">
                {group.theme ? (
                  <>
                    <motion.div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: group.theme.color_hex }}
                      whileHover={{ scale: 1.2 }}
                    />
                    <h2 className="font-semibold">{group.theme.title}</h2>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {group.tasks.length}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-semibold text-muted-foreground">Unassigned</h2>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {group.tasks.length}
                    </Badge>
                  </>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      theme={task.theme}
                      labels={task.labels}
                      showSubject
                      subjectTitle={task.subject?.title}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Waiting For Section - Show when filter is 'all' or 'waiting' */}
      <AnimatePresence>
        {waitingFor && waitingFor.length > 0 && (activeFilter === 'all' || activeFilter === 'waiting') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activeFilter === 'all' && <Separator className="my-6" />}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold">En Attente</h2>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {waitingFor.length}
                  </Badge>
                </div>
                <Link href="/pending">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    Voir tout →
                  </Button>
                </Link>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {waitingFor.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      theme={task.theme}
                      labels={task.labels}
                      showSubject
                      subjectTitle={task.subject?.title}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state for Waiting filter */}
      {activeFilter === 'waiting' && (!waitingFor || waitingFor.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-dashed">
            <EmptyState
              type="success"
              title="Rien en attente"
              description="Aucune tâche en attente de réponse."
            />
          </Card>
        </motion.div>
      )}

      {/* Zombie Alert - Show when filter is 'all' or 'stale' */}
      <AnimatePresence>
        {zombies && zombies.length > 0 && (activeFilter === 'all' || activeFilter === 'stale') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {activeFilter === 'all' && <Separator className="my-6" />}

            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Subjects Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  These subjects haven&apos;t had activity in over 10 days.
                </p>
                <div className="flex flex-wrap gap-2">
                  {zombies.map((subject, i) => (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={`/subject/${subject.id}`}>
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-accent hover:scale-105 transition-all"
                        >
                          <div
                            className="h-2 w-2 rounded-full mr-1.5"
                            style={{ backgroundColor: subject.theme?.color_hex }}
                          />
                          {subject.title}
                        </Badge>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state for Stale filter */}
      {activeFilter === 'stale' && (!zombies || zombies.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-dashed">
            <EmptyState
              type="success"
              title="Tout est actif"
              description="Aucun sujet inactif depuis plus de 10 jours."
            />
          </Card>
        </motion.div>
      )}

      {/* Bottom padding for FAB */}
      <div className="h-20 md:h-8" />
    </motion.div>
  );
}
