'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { WaterfallAssignDialog, WaterfallSelection } from '@/components/tasks/waterfall-assign-dialog';
import { useInboxTasks, useCreateTask, useUpdateTask } from '@/hooks/use-tasks';
import { useLabels, useSetTaskLabels } from '@/hooks/use-labels';
import { queryKeys } from '@/lib/query-keys';
import { parseTaskInput, findMatchingLabels } from '@/lib/date-parser';
import { format } from 'date-fns';
import { Task, TaskWithRelations } from '@/types/database';


export default function InboxPage() {
  const [newTask, setNewTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useInboxTasks();
  const { data: labels } = useLabels();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const setTaskLabels = useSetTaskLabels();

  const handleAddTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const parsed = parseTaskInput(newTask);

    // Find matching labels based on the original input (before title cleanup)
    const matchedLabels = findMatchingLabels(newTask, labels || []);

    try {
      // Create task with smart-parsed priority (default to 1 = Normal if not detected)
      const createdTask = await createTask.mutateAsync({
        title: parsed.title || newTask,
        do_date: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : null,
        do_time: parsed.time || null,
        subject_id: null,
        priority: parsed.priority ?? 1,
      });

      // If labels were matched, assign them to the task
      if (matchedLabels.length > 0) {
        await setTaskLabels.mutateAsync({
          taskId: createdTask.id,
          labelIds: matchedLabels.map(l => l.id),
        });
      }

      // Build success message with details
      const details: string[] = [];
      if (parsed.priority !== null) {
        const priorityNames = { 0: 'Basse', 1: 'Normale', 2: 'Haute', 3: 'Urgente' };
        details.push(priorityNames[parsed.priority]);
      }
      if (matchedLabels.length > 0) {
        details.push(`${matchedLabels.length} etiquette${matchedLabels.length > 1 ? 's' : ''}`);
      }

      toast.success(
        details.length > 0 ? `Ajoute a la boite de reception (${details.join(', ')})` : 'Ajoute a la boite de reception',
        { icon: <Sparkles className="h-4 w-4 text-amber-500" /> }
      );
      setNewTask('');
    } catch {
      toast.error('Erreur lors de l\'ajout de la tache');
    } finally {
      setIsSubmitting(false);
    }
  }, [newTask, isSubmitting, labels, createTask, setTaskLabels]);

  const handleOpenAssignDialog = useCallback((task: Task) => {
    setSelectedTask(task);
    setAssignDialogOpen(true);
  }, []);

  const handleAssign = useCallback((selection: WaterfallSelection) => {
    if (!selectedTask) return;

    // Build assignment label for toast
    let label = 'Inbox';
    if (selection.subjectId) label = 'sujet';
    else if (selection.themeId) label = 'thème';
    else if (selection.categoryId) label = 'catégorie';

    // Close dialog immediately
    setAssignDialogOpen(false);

    // Optimistic update: remove task from inbox list immediately
    const previousTasks = queryClient.getQueryData<TaskWithRelations[]>(queryKeys.tasks.inbox());
    if (previousTasks) {
      queryClient.setQueryData<TaskWithRelations[]>(
        queryKeys.tasks.inbox(),
        previousTasks.filter(t => t.id !== selectedTask.id)
      );
    }

    toast.success(`Assigné à ${label}`);

    updateTask.mutate(
      {
        id: selectedTask.id,
        subject_id: selection.subjectId,
        theme_id: selection.themeId,
        category_id: selection.categoryId,
      },
      {
        onSuccess: () => {
          setSelectedTask(null);
        },
        onError: () => {
          // Rollback on error
          if (previousTasks) {
            queryClient.setQueryData(queryKeys.tasks.inbox(), previousTasks);
          }
          toast.error('Erreur lors de l\'assignation');
        },
      }
    );
  }, [selectedTask, updateTask, queryClient]);

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
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <InboxIcon className="h-5 w-5 text-blue-500" />
          </div>
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
              Capturez rapidement. Organisez plus tard.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Add */}
      <form
        onSubmit={handleAddTask}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Input
            placeholder='Capture rapide... Essayez "Appeler Jean demain"'
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
              Ajouter
            </>
          )}
        </Button>
      </form>

      {/* Empty State */}
      {taskCount === 0 && (
        <Card className="border-2 border-dashed">
          <EmptyState
            type="inbox"
            title="Boite vide !"
            description="Rien a traiter. Utilisez l'ajout rapide ci-dessus pour capturer de nouvelles taches."
          />
        </Card>
      )}

      {/* Tasks */}
      {taskCount > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="sync">
            {tasks?.map((task) => (
              <div key={task.id} className="group relative">
                <TaskCard task={task} labels={task.labels} />

                {/* Move to Subject Button - visible on mobile, hover on desktop */}
                <div className="absolute right-24 top-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 bg-primary/10 hover:bg-primary/20 rounded-lg"
                    onClick={() => handleOpenAssignDialog(task)}
                    title="Deplacer vers un sujet"
                  >
                    <FolderInput className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Tip */}
      {taskCount > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          Survolez une tache et cliquez sur <FolderInput className="inline h-3 w-3" /> pour la deplacer vers un sujet
        </p>
      )}

      {/* Bottom padding for FAB */}
      <div className="h-20 md:h-8" />

      {/* Waterfall Assign Dialog */}
      <WaterfallAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSelect={handleAssign}
        currentValue={{
          categoryId: selectedTask?.category_id || null,
          themeId: selectedTask?.theme_id || null,
          subjectId: selectedTask?.subject_id || null,
        }}
      />
    </div>
  );
}
