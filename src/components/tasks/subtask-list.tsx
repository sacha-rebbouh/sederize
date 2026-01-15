'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Circle, CheckCircle2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task } from '@/types/database';
import {
  useSubtasks,
  useCreateSubtask,
  useCompleteTask,
  useUpdateTask,
  useDeleteTask,
} from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';

interface SubtaskListProps {
  parentTaskId: string;
  className?: string;
}

export function SubtaskList({ parentTaskId, className }: SubtaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const { data: subtasks, isLoading } = useSubtasks(parentTaskId);
  const createSubtask = useCreateSubtask();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleAdd = () => {
    if (!newTitle.trim()) return;

    createSubtask.mutate(
      { parentTaskId, title: newTitle.trim() },
      {
        onSuccess: () => {
          setNewTitle('');
          setIsAdding(false);
        },
      }
    );
  };

  const handleToggle = (subtask: Task) => {
    if (subtask.status === 'done') {
      updateTask.mutate({ id: subtask.id, status: 'todo' });
    } else {
      completeTask.mutate(subtask.id, {
        onSuccess: () => {
          toast.success('Subtask completed');
        },
      });
    }
  };

  const handleDelete = (subtaskId: string) => {
    deleteTask.mutate(subtaskId);
  };

  const completedCount = subtasks?.filter((s) => s.status === 'done').length ?? 0;
  const totalCount = subtasks?.length ?? 0;

  // Show skeleton with same structure to prevent layout shift
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Subtasks</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic py-2 animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Subtasks</span>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 px-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtasks?.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <button
              onClick={() => handleToggle(subtask)}
              className="flex-shrink-0"
            >
              {subtask.status === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>
            <span
              className={cn(
                'flex-1 text-sm',
                subtask.status === 'done' && 'line-through text-muted-foreground'
              )}
            >
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDelete(subtask.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add subtask form */}
      {isAdding && (
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Subtask title..."
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewTitle('');
              }
            }}
          />
          <Button
            size="sm"
            className="h-8"
            onClick={handleAdd}
            disabled={!newTitle.trim() || createSubtask.isPending}
          >
            Add
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setIsAdding(false);
              setNewTitle('');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground italic py-2">
          No subtasks yet. Break this task into smaller steps.
        </p>
      )}
    </div>
  );
}
