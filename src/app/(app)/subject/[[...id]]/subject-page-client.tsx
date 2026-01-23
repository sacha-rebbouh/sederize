'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Folder,
  Plus,
  MoreHorizontal,
  Trash2,
  Archive,
  FileText,
  Hourglass,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { TaskCard } from '@/components/tasks/task-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard, SkeletonHeader } from '@/components/ui/skeleton-card';
import { useSubject, useUpdateSubject, useDeleteSubject } from '@/hooks/use-subjects';
import { useSubjectTasks, useCreateTask } from '@/hooks/use-tasks';
import { parseTaskInput } from '@/lib/date-parser';

export default function SubjectPage() {
  const router = useRouter();
  const params = useParams();

  // Extract ID from catch-all params
  const idArray = params.id as string[] | undefined;
  const subjectId = idArray?.[0] || '';

  const [newTask, setNewTask] = useState('');
  const [scratchpad, setScratchpad] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: subject, isLoading: subjectLoading } = useSubject(subjectId);
  const { data: tasks } = useSubjectTasks(subjectId);
  const createTask = useCreateTask();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  // Initialize scratchpad from subject data
  useEffect(() => {
    if (subject?.scratchpad !== undefined) {
      setScratchpad(subject.scratchpad || '');
    }
  }, [subject?.scratchpad]);

  // Auto-save scratchpad with debounce
  useEffect(() => {
    if (subject && scratchpad !== (subject.scratchpad || '')) {
      setIsSaving(true);
      const timeout = setTimeout(() => {
        updateSubject.mutate(
          { id: subject.id, scratchpad },
          { onSettled: () => setIsSaving(false) }
        );
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [scratchpad, subject, updateSubject]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTask.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const parsed = parseTaskInput(newTask);

    try {
      await createTask.mutateAsync({
        title: parsed.title || newTask,
        do_date: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : null,
        subject_id: subjectId,
      });

      toast.success('Task added', {
        icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      });
      setNewTask('');
    } catch {
      toast.error('Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = () => {
    if (!subject) return;
    updateSubject.mutate(
      { id: subject.id, status: 'archived' },
      {
        onSuccess: () => {
          toast.success('Subject archived');
          router.push('/');
        },
      }
    );
  };

  const handleDelete = () => {
    if (!subject) return;
    if (confirm('Are you sure? This will delete all tasks in this subject.')) {
      deleteSubject.mutate(subject.id, {
        onSuccess: () => {
          toast.success('Subject deleted');
          router.push('/');
        },
      });
    }
  };

  // Handle no ID provided
  if (!subjectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          type="folder"
          title="No subject selected"
          description="Please select a subject from the sidebar."
          action={
            <Button onClick={() => router.push('/')}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  // Separate tasks by status
  const todoTasks = tasks?.filter((t) => t.status === 'todo') || [];
  const waitingTasks = tasks?.filter((t) => t.status === 'waiting_for') || [];
  const doneTasks = tasks?.filter((t) => t.status === 'done') || [];

  if (subjectLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b p-4">
          <div className="max-w-5xl mx-auto">
            <SkeletonHeader />
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <div className="max-w-5xl mx-auto space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          type="folder"
          title="Subject not found"
          description="This subject may have been deleted or moved."
          action={
            <Button onClick={() => router.push('/')}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="max-w-5xl mx-auto space-y-3">
          {/* Breadcrumbs - Desktop only */}
          <Breadcrumbs
            items={[
              ...(subject.theme
                ? [{ label: subject.theme.title, icon: <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.theme.color_hex }} /> }]
                : []),
              { label: subject.title },
            ]}
            className="hidden md:flex"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: subject.theme?.color_hex + '20' }}
              >
                <Folder
                  className="h-5 w-5"
                  style={{ color: subject.theme?.color_hex }}
                />
              </div>

              <div>
                <h1 className="text-xl font-bold">{subject.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {subject.theme && (
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: subject.theme.color_hex + '20',
                        color: subject.theme.color_hex,
                      }}
                    >
                      {subject.theme.title}
                    </Badge>
                  )}
                  <span>{todoTasks.length} tasks</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Subject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Subject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-5xl mx-auto h-full">
          <Tabs defaultValue="tasks" className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="tasks" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Notes
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="flex-1 overflow-auto p-4 space-y-6">
              {/* Add Task */}
              <form
                onSubmit={handleAddTask}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Input
                    placeholder="Add a task... Try 'Call John tomorrow'"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    className="h-11"
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!newTask.trim() || isSubmitting}
                  className="h-11"
                >
                  {isSubmitting ? (
                    <Sparkles className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </form>

              {/* To Do */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-500" />
                  </div>
                  <h2 className="font-semibold">To Do</h2>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                    {todoTasks.length}
                  </Badge>
                </div>

                {todoTasks.length === 0 ? (
                  <Card className="border-2 border-dashed p-6">
                    <EmptyState
                      type="folder"
                      title="No tasks yet"
                      description="Add your first task above to get started."
                      className="py-4"
                    />
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {todoTasks.map((task) => (
                      <div key={task.id}>
                        <TaskCard task={task} theme={subject.theme} labels={task.labels} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Waiting For */}
              {waitingTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Hourglass className="h-4 w-4 text-amber-500" />
                    </div>
                    <h2 className="font-semibold text-amber-600">Waiting For</h2>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                      {waitingTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {waitingTasks.map((task) => (
                      <div key={task.id}>
                        <TaskCard task={task} theme={subject.theme} labels={task.labels} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Done */}
              {doneTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <h2 className="font-semibold text-muted-foreground">Completed</h2>
                    <Badge variant="secondary">
                      {doneTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {doneTasks.slice(0, 5).map((task) => (
                      <div key={task.id}>
                        <TaskCard task={task} theme={subject.theme} labels={task.labels} compact />
                      </div>
                    ))}
                    {doneTasks.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        + {doneTasks.length - 5} more completed tasks
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom padding */}
              <div className="h-20 md:h-8" />
            </TabsContent>

            {/* Notes Tab (Scratchpad) */}
            <TabsContent value="notes" className="flex-1 overflow-auto p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                  <h2 className="font-semibold">Scratchpad</h2>
                  {isSaving && (
                    <span className="text-xs text-muted-foreground">
                      Saving...
                    </span>
                  )}
                </div>
                <MarkdownEditor
                  value={scratchpad}
                  onChange={setScratchpad}
                  placeholder="Write notes, codes, contacts, or anything useful about this subject..."
                  minHeight="400px"
                  isSaving={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Changes are saved automatically. Use this for digicodes, contact
                  info, or quick notes.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
