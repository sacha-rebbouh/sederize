'use client';

import { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  CalendarDays,
  Hourglass,
  Trash2,
  Edit3,
  ArrowRight,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task, Theme, PriorityLevel, Label } from '@/types/database';
import { formatDoDate, isOverdue } from '@/lib/date-parser';
import { useCompleteTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks';
import { SnoozePopover } from './snooze-popover';
import { EditTaskDialog } from './edit-task-dialog';
import { WaitingForDialog } from './waiting-for-dialog';
import { PriorityBadge, cyclePriority } from '@/components/ui/priority-badge';
import { SnoozeBadge } from '@/components/ui/snooze-badge';
import { TaskFocusDialog } from './task-focus-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LabelBadges } from './label-picker';

interface TaskCardProps {
  task: Task;
  theme?: Theme | null;
  labels?: Label[];
  showSubject?: boolean;
  subjectTitle?: string | null;
  compact?: boolean;
  onEdit?: () => void;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard({
  task,
  theme,
  labels = [],
  showSubject = false,
  subjectTitle,
  compact = false,
}, ref) {
  const [editOpen, setEditOpen] = useState(false);
  const [waitingForOpen, setWaitingForOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleComplete = () => {
    if (task.status === 'done') {
      updateTask.mutate({ id: task.id, status: 'todo' });
    } else {
      setIsCompleting(true);
      setTimeout(() => {
        completeTask.mutate(task.id, {
          onSuccess: () => {
            toast.success('Task completed!', {
              action: {
                label: 'Undo',
                onClick: () => updateTask.mutate({ id: task.id, status: 'todo' }),
              },
            });
          },
          onSettled: () => setIsCompleting(false),
        });
      }, 300);
    }
  };

  const handlePriorityChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPriority = (task.priority ?? 0) as PriorityLevel;
    const newPriority = cyclePriority(currentPriority);
    console.log('Changing priority from', currentPriority, 'to', newPriority);
    updateTask.mutate(
      { id: task.id, priority: newPriority },
      {
        onSuccess: () => {
          console.log('Priority updated successfully');
        },
        onError: (error) => {
          console.error('Priority update failed:', error);
        },
      }
    );
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    deleteTask.mutate(task.id);
    setDeleteConfirmOpen(false);
  };

  const overdue = isOverdue(task.do_date);
  const isWaitingFor = task.status === 'waiting_for';
  const isDone = task.status === 'done';

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open focus mode if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[data-radix-collection-item]')
    ) {
      return;
    }
    setFocusOpen(true);
  };

  return (
    <div ref={ref}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: isCompleting ? 0.5 : 1,
          y: 0,
          scale: isCompleting ? 0.98 : 1,
        }}
        exit={{ opacity: 0, x: -20, height: 0 }}
        transition={{
          duration: 0.2,
          layout: { duration: 0.3 }
        }}
        onClick={handleCardClick}
        className={cn(
          'group relative flex items-start gap-3 p-4 rounded-xl border bg-card cursor-pointer',
          'transition-all duration-200',
          'hover:shadow-md hover:border-primary/20',
          isDone && 'opacity-60 bg-muted/30',
          overdue && !isDone && 'border-destructive/30 bg-destructive/5 hover:border-destructive/50',
          isWaitingFor && 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
        )}
      >
        {/* Theme color indicator - left bar */}
        {theme && (
          <motion.div
            className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
            style={{ backgroundColor: theme.color_hex }}
            layoutId={`theme-${task.id}`}
          />
        )}

        {/* Checkbox with animation */}
        <motion.button
          onClick={handleComplete}
          disabled={completeTask.isPending}
          className="mt-0.5 flex-shrink-0 relative"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
        >
          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.div
                key="done"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </motion.div>
            ) : isWaitingFor ? (
              <motion.div
                key="waiting"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Hourglass className="h-6 w-6 text-amber-500" />
              </motion.div>
            ) : isCompleting ? (
              <motion.div
                key="completing"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="todo"
                whileHover={{ scale: 1.1 }}
                className="relative"
              >
                <Circle className="h-6 w-6 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
                {/* Hover hint */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/10"
                  initial={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.5, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0 pl-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Subject badge */}
              {showSubject && subjectTitle && (
                <motion.div
                  className="flex items-center gap-1.5 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {subjectTitle}
                  </span>
                </motion.div>
              )}

              {/* Title */}
              <div
                className={cn(
                  'font-medium leading-snug flex items-center gap-1',
                  isDone ? 'line-through text-muted-foreground' : 'group-hover:text-primary transition-colors'
                )}
              >
                <span>{task.title}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity -ml-0.5" />
              </div>

              {/* Description */}
              {task.description && !compact && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Waiting for note */}
              {isWaitingFor && task.waiting_for_note && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-1.5 mt-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md"
                >
                  <Hourglass className="h-3.5 w-3.5" />
                  <span className="font-medium">Waiting:</span> {task.waiting_for_note}
                </motion.div>
              )}

              {/* Metadata row */}
              {!isDone && (
                <motion.div
                  className="flex flex-wrap items-center gap-2 mt-2.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Date badge */}
                  {task.do_date && (
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                        overdue
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDoDate(task.do_date)}
                    </div>
                  )}

                  {/* Time badge */}
                  {task.do_time && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {task.do_time.slice(0, 5)}
                    </div>
                  )}

                  {/* Priority badge */}
                  <PriorityBadge
                    priority={(task.priority ?? 0) as PriorityLevel}
                    onClick={handlePriorityChange}
                  />

                  {/* Snooze counter */}
                  <SnoozeBadge count={task.snooze_count ?? 0} />

                  {/* Labels */}
                  {labels.length > 0 && (
                    <LabelBadges labels={labels} max={2} />
                  )}
                </motion.div>
              )}
            </div>

            {/* Actions - Always visible on mobile, hover on desktop */}
            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              {!isDone && !isWaitingFor && (
                <SnoozePopover taskId={task.id} />
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit task
                  </DropdownMenuItem>
                  {!isWaitingFor && task.status !== 'done' && (
                    <DropdownMenuItem onClick={() => setWaitingForOpen(true)}>
                      <Hourglass className="h-4 w-4 mr-2" />
                      Set waiting for
                    </DropdownMenuItem>
                  )}
                  {isWaitingFor && (
                    <DropdownMenuItem
                      onClick={() =>
                        updateTask.mutate({ id: task.id, status: 'todo' })
                      }
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Move to todo
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>

      <EditTaskDialog task={task} open={editOpen} onOpenChange={setEditOpen} />
      <WaitingForDialog
        task={task}
        open={waitingForOpen}
        onOpenChange={setWaitingForOpen}
      />
      <TaskFocusDialog
        task={task}
        open={focusOpen}
        onOpenChange={setFocusOpen}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Supprimer cette tâche ?"
        description="Cette action est irréversible. La tâche sera définitivement supprimée."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
});
