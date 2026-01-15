'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isSameDay, startOfWeek, addDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskFocusDialog } from '@/components/tasks/task-focus-dialog';
import { TaskWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  date: Date;
  tasks: TaskWithRelations[];
  onDateClick?: (date: Date) => void;
}

export function WeekView({ date, tasks, onDateClick }: WeekViewProps) {
  const [focusedTask, setFocusedTask] = useState<TaskWithRelations | null>(null);

  const handleTaskClick = useCallback((task: TaskWithRelations, e: React.MouseEvent) => {
    e.stopPropagation();
    setFocusedTask(task);
  }, []);

  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};

    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = tasks.filter(
        (task) => task.do_date && isSameDay(new Date(task.do_date), day)
      );
    });

    return grouped;
  }, [tasks, days]);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 divide-x">
        {days.map((day, dayIndex) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] || [];

          return (
            <div key={dateKey} className="min-h-[400px]">
              {/* Day Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.05 }}
                className={cn(
                  'p-2 border-b text-center cursor-pointer hover:bg-muted/50 transition-colors',
                  isToday(day) ? 'bg-primary/10' : 'bg-muted/30'
                )}
                onClick={() => onDateClick?.(day)}
              >
                <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                <motion.div
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold mt-1',
                    isToday(day) && 'bg-primary text-primary-foreground'
                  )}
                  whileHover={{ scale: 1.1 }}
                >
                  {format(day, 'd')}
                </motion.div>
              </motion.div>

              {/* Tasks */}
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="p-1 space-y-1">
                  <AnimatePresence mode="sync">
                    {dayTasks.map((task, taskIndex) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(taskIndex * 0.03, 0.3) }}
                        onClick={(e) => handleTaskClick(task, e)}
                        className={cn(
                          "p-1.5 rounded text-xs truncate cursor-pointer hover:opacity-80 hover:shadow-sm transition-all",
                          task.status === 'done' && "opacity-60"
                        )}
                        style={{
                          backgroundColor: (task.theme?.color_hex || '#6366f1') + '20',
                          borderLeft: `2px solid ${task.theme?.color_hex || '#6366f1'}`,
                        }}
                        title={task.title}
                      >
                        {task.do_time && (
                          <span className="text-muted-foreground mr-1">
                            {task.do_time.slice(0, 5)}
                          </span>
                        )}
                        <span className={cn(
                          "font-medium",
                          task.status === 'done' && "line-through"
                        )}>{task.title}</span>
                      </motion.div>
                    ))}
                    {dayTasks.length === 0 && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-muted-foreground text-center py-4"
                      >
                        -
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Task Focus Dialog */}
      {focusedTask && (
        <TaskFocusDialog
          task={focusedTask}
          open={!!focusedTask}
          onOpenChange={(open) => !open && setFocusedTask(null)}
        />
      )}
    </Card>
  );
}
