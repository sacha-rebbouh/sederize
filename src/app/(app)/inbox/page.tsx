'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox as InboxIcon, Plus, FolderInput, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from '@/components/tasks/task-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList, SkeletonHeader } from '@/components/ui/skeleton-card';
import { MoveToSubjectDialog } from '@/components/tasks/move-to-subject-dialog';
import { useInboxTasks, useCreateTask, useUpdateTask } from '@/hooks/use-tasks';
import { useActiveSubjects } from '@/hooks/use-subjects';
import { parseTaskInput } from '@/lib/date-parser';
import { format } from 'date-fns';
import { Task } from '@/types/database';

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

export default function InboxPage() {
  const [newTask, setNewTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: tasks, isLoading } = useInboxTasks();
  const { data: subjects } = useActiveSubjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const parsed = parseTaskInput(newTask);

    try {
      await createTask.mutateAsync({
        title: parsed.title || newTask,
        do_date: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : null,
        do_time: parsed.time || null,
        subject_id: null,
      });

      toast.success('Added to inbox', {
        icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      });
      setNewTask('');
    } catch {
      toast.error('Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMoveDialog = (task: Task) => {
    setSelectedTask(task);
    setMoveDialogOpen(true);
  };

  const handleMoveToSubject = (subjectId: string) => {
    if (!selectedTask) return;
    const subject = subjects?.find(s => s.id === subjectId);
    updateTask.mutate(
      { id: selectedTask.id, subject_id: subjectId },
      {
        onSuccess: () => {
          toast.success(`Moved to ${subject?.title || 'subject'}`);
          setSelectedTask(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <SkeletonHeader />
        <SkeletonList count={5} />
      </div>
    );
  }

  const taskCount = tasks?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto p-4 md:p-6 space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
          >
            <InboxIcon className="h-5 w-5 text-blue-500" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inbox</h1>
              {taskCount > 0 && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  {taskCount}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Capture quickly. Organize later.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Add */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleAddTask}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Input
            placeholder='Quick capture... Try "Call John tomorrow"'
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="h-12 text-base"
            disabled={isSubmitting}
          />
        </div>
        <Button
          type="submit"
          disabled={!newTask.trim() || isSubmitting}
          className="h-12 px-6"
        >
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </motion.form>

      {/* Empty State */}
      {taskCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-dashed">
            <EmptyState
              type="inbox"
              title="Inbox Zero!"
              description="Nothing to process. Use the quick add above to capture new tasks."
            />
          </Card>
        </motion.div>
      )}

      {/* Tasks */}
      {taskCount > 0 && (
        <motion.div
          className="space-y-2"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout">
            {tasks?.map((task) => (
              <motion.div
                key={task.id}
                variants={itemVariants}
                layout
                className="group relative"
              >
                <TaskCard task={task} labels={task.labels} />

                {/* Move to Subject Button */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute right-14 top-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-primary/10 hover:bg-primary/20 rounded-lg"
                    onClick={() => handleOpenMoveDialog(task)}
                  >
                    <FolderInput className="h-4 w-4 text-primary" />
                  </Button>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Tip */}
      {taskCount > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-center text-muted-foreground"
        >
          Hover on a task and click <FolderInput className="inline h-3 w-3" /> to move it to a subject
        </motion.p>
      )}

      {/* Bottom padding for FAB */}
      <div className="h-20 md:h-8" />

      {/* Move to Subject Dialog */}
      <MoveToSubjectDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onSelect={handleMoveToSubject}
        currentSubjectId={selectedTask?.subject_id}
      />
    </motion.div>
  );
}
