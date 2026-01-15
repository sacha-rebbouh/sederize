'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isSameDay, addDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

interface ThreeDayViewProps {
  startDate: Date;
  tasks: TaskWithRelations[];
}

export function ThreeDayView({ startDate, tasks }: ThreeDayViewProps) {
  const days = useMemo(
    () => [startDate, addDays(startDate, 1), addDays(startDate, 2)],
    [startDate]
  );

  // Group tasks by date and sort (completed at bottom)
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};

    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayTasks = tasks.filter(
        (task) => task.do_date && isSameDay(new Date(task.do_date), day)
      );
      // Sort: incomplete tasks first, then completed tasks
      grouped[dateKey] = dayTasks.sort((a, b) => {
        const aCompleted = a.status === 'done' ? 1 : 0;
        const bCompleted = b.status === 'done' ? 1 : 0;
        return aCompleted - bCompleted;
      });
    });

    return grouped;
  }, [tasks, days]);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-3 divide-x">
        {days.map((day, dayIndex) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] || [];

          return (
            <div key={dateKey} className="min-h-[500px]">
              {/* Day Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.1 }}
                className={cn(
                  'p-4 border-b text-center',
                  isToday(day) ? 'bg-primary/10' : 'bg-muted/50'
                )}
              >
                <p className="text-sm text-muted-foreground">{format(day, 'EEE')}</p>
                <motion.div
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold mt-1',
                    isToday(day) && 'bg-primary text-primary-foreground'
                  )}
                  whileHover={{ scale: 1.1 }}
                >
                  {format(day, 'd')}
                </motion.div>
              </motion.div>

              {/* Tasks */}
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="p-2 space-y-2">
                  <AnimatePresence mode="sync">
                    {dayTasks.length > 0 ? (
                      dayTasks.map((task, taskIndex) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: taskIndex * 0.05 }}
                        >
                          <TaskCard
                            task={task}
                            theme={task.theme}
                            labels={task.labels}
                            compact
                          />
                        </motion.div>
                      ))
                    ) : (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-muted-foreground text-center py-8"
                      >
                        No tasks
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
