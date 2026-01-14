'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isSameDay } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { TaskWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

interface DayViewProps {
  date: Date;
  tasks: TaskWithRelations[];
  onDateClick?: (date: Date) => void;
}

export function DayView({ date, tasks }: DayViewProps) {
  // Group tasks by hour
  const tasksByHour = useMemo(() => {
    const grouped: Record<number, TaskWithRelations[]> = {};

    // Initialize hours 0-23
    for (let i = 0; i < 24; i++) {
      grouped[i] = [];
    }

    tasks.forEach((task) => {
      if (task.do_date && isSameDay(new Date(task.do_date), date)) {
        // If task has a time, place it in that hour
        if (task.do_time) {
          const hour = parseInt(task.do_time.split(':')[0]);
          grouped[hour].push(task);
        } else {
          // Tasks without time go in "All day" (hour -1)
          if (!grouped[-1]) grouped[-1] = [];
          grouped[-1].push(task);
        }
      }
    });

    return grouped;
  }, [tasks, date]);

  const allDayTasks = tasksByHour[-1] || [];
  const hasAnyTasks = tasks.filter(t => t.do_date && isSameDay(new Date(t.do_date), date)).length > 0;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <motion.div
            className={cn(
              'h-12 w-12 rounded-xl flex flex-col items-center justify-center',
              isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
            <span className="text-lg font-bold">{format(date, 'd')}</span>
          </motion.div>
          <div>
            <h3 className="font-semibold">{format(date, 'EEEE, MMMM d')}</h3>
            <p className="text-sm text-muted-foreground">
              {hasAnyTasks ? `${tasks.length} tasks` : 'No tasks'}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        {/* All day section */}
        {allDayTasks.length > 0 && (
          <div className="border-b p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">ALL DAY</p>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {allDayTasks.map((task, index) => (
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
                      compact
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Hourly grid */}
        <div className="divide-y">
          {Array.from({ length: 24 }, (_, hour) => {
            const hourTasks = tasksByHour[hour] || [];
            const timeLabel = format(new Date().setHours(hour, 0), 'HH:mm');

            return (
              <div key={hour} className="flex min-h-[60px]">
                <div className="w-16 flex-shrink-0 p-2 text-xs text-muted-foreground border-r bg-muted/30">
                  {timeLabel}
                </div>
                <div className="flex-1 p-2">
                  {hourTasks.length > 0 && (
                    <div className="space-y-1">
                      {hourTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-2 rounded-md text-sm"
                          style={{
                            backgroundColor: (task.theme?.color_hex || '#6366f1') + '20',
                            borderLeft: `3px solid ${task.theme?.color_hex || '#6366f1'}`,
                          }}
                        >
                          <p className="font-medium truncate">{task.title}</p>
                          {task.subject && (
                            <p className="text-xs text-muted-foreground">{task.subject.title}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!hasAnyTasks && (
          <div className="p-8">
            <EmptyState
              type="calendar"
              title="No tasks"
              description="No tasks scheduled for this day."
            />
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
