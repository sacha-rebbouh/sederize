'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Flag,
  Link as LinkIcon,
  CheckCircle2,
  Hourglass,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, PriorityLevel, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types/database';
import { useUpdateTask, useCompleteTask, useDeleteTask } from '@/hooks/use-tasks';
import { WaterfallPicker, WaterfallValue } from './waterfall-picker';
import { cn } from '@/lib/utils';
import { SnoozeBadge } from '@/components/ui/snooze-badge';
import { MarkdownContent } from '@/components/ui/markdown-editor';
import { AttachmentList } from './attachment-list';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ExtendedTask extends Task {
  theme?: { id: string; category_id?: string | null } | null;
  category?: { id: string } | null;
  subject?: { theme_id: string } | null;
}

interface TaskFocusDialogProps {
  task: ExtendedTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to get the resolved waterfall value from a task
function getResolvedWaterfall(task: ExtendedTask | null): WaterfallValue {
  if (!task) {
    return { categoryId: null, themeId: null, subjectId: null };
  }
  // If subject_id is set, the assignment is at subject level
  if (task.subject_id) {
    return {
      categoryId: task.category_id || task.theme?.category_id || task.category?.id || null,
      themeId: task.theme_id || task.subject?.theme_id || task.theme?.id || null,
      subjectId: task.subject_id,
    };
  }
  // If only theme_id is set, the assignment is at theme level
  if (task.theme_id || task.theme?.id) {
    return {
      categoryId: task.category_id || task.theme?.category_id || task.category?.id || null,
      themeId: task.theme_id || task.theme?.id || null,
      subjectId: null,
    };
  }
  // If only category_id is set, the assignment is at category level
  if (task.category_id || task.category?.id) {
    return {
      categoryId: task.category_id || task.category?.id || null,
      themeId: null,
      subjectId: null,
    };
  }
  // Inbox (no assignment)
  return { categoryId: null, themeId: null, subjectId: null };
}

export function TaskFocusDialog({ task, open, onOpenChange }: TaskFocusDialogProps) {
  // Initialize state directly from task to avoid flash on first open
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [doDate, setDoDate] = useState<Date | undefined>(task?.do_date ? new Date(task.do_date) : undefined);
  const [doTime, setDoTime] = useState(task?.do_time?.slice(0, 5) || '');
  const [priority, setPriority] = useState<PriorityLevel>((task?.priority ?? 0) as PriorityLevel);
  const [waterfall, setWaterfall] = useState<WaterfallValue>(getResolvedWaterfall(task));
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [prevTaskId, setPrevTaskId] = useState(task?.id);

  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  // Only reset state when task ID changes (not on every task prop change)
  useEffect(() => {
    if (task && task.id !== prevTaskId) {
      setPrevTaskId(task.id);
      setTitle(task.title);
      setDescription(task.description || '');
      setDoDate(task.do_date ? new Date(task.do_date) : undefined);
      setDoTime(task.do_time?.slice(0, 5) || '');
      setPriority((task.priority ?? 0) as PriorityLevel);
      setWaterfall(getResolvedWaterfall(task));
      setIsEditing(false);
    }
  }, [task, prevTaskId]);

  const handleSave = useCallback(() => {
    if (!task) return;
    // Normalize time (add :00 if only hour provided)
    let normalizedTime = doTime;
    if (normalizedTime && !normalizedTime.includes(':')) {
      normalizedTime = `${normalizedTime.padStart(2, '0')}:00`;
    }

    updateTask.mutate(
      {
        id: task.id,
        title,
        description: description || null,
        do_date: doDate ? format(doDate, 'yyyy-MM-dd') : null,
        do_time: normalizedTime || null,
        priority,
        subject_id: waterfall.subjectId,
        theme_id: waterfall.themeId,
        category_id: waterfall.categoryId,
      },
      {
        onSuccess: () => {
          toast.success('Task updated');
          setIsEditing(false);
          onOpenChange(false);
        },
      }
    );
  }, [task, doTime, title, description, doDate, priority, waterfall, updateTask, onOpenChange]);

  const handleComplete = useCallback(() => {
    if (!task) return;
    if (task.status === 'done') {
      updateTask.mutate({ id: task.id, status: 'todo' });
    } else {
      completeTask.mutate(task.id, {
        onSuccess: () => {
          toast.success('Task completed', {
            action: {
              label: 'Undo',
              onClick: () => updateTask.mutate({ id: task.id, status: 'todo' }),
            },
          });
          onOpenChange(false);
        },
      });
    }
  }, [task, updateTask, completeTask, onOpenChange]);

  const handleDelete = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success('Task deleted');
        setDeleteConfirmOpen(false);
        onOpenChange(false);
      },
    });
  }, [task, deleteTask, onOpenChange]);

  if (!task) return null;

  const isDone = task.status === 'done';
  const isWaitingFor = task.status === 'waiting_for';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Details de la tache</DialogTitle>
          <DialogDescription>Voir et modifier les details de la tache</DialogDescription>
        </DialogHeader>

        {/* Header with status and actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Status badges */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('text-xs', PRIORITY_COLORS[priority])}
              >
                <Flag className="h-3 w-3 mr-1" />
                {PRIORITY_LABELS[priority]}
              </Badge>
              <SnoozeBadge count={task.snooze_count ?? 0} />
              {isWaitingFor && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  <Hourglass className="h-3 w-3 mr-1" />
                  En attente
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Modifier
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateTask.isPending}>
                  Enregistrer
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Mark as done button */}
        <Button
          onClick={handleComplete}
          variant={isDone ? 'outline' : 'default'}
          className={cn(
            'w-full',
            !isDone && 'bg-green-600 hover:bg-green-700 text-white'
          )}
        >
          {isDone ? (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Marquer non terminée
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marquer terminée
            </>
          )}
        </Button>

        <Separator />

        {/* Title */}
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la tache"
            className="text-lg font-semibold"
          />
        ) : (
          <h2 className={cn('text-lg font-semibold', isDone && 'line-through text-muted-foreground')}>
            {task.title}
          </h2>
        )}

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Description</label>
          {isEditing ? (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajouter une description... (Markdown supporte)"
              rows={4}
            />
          ) : (
            <div className="min-h-[60px] p-3 rounded-md bg-muted/50 text-sm">
              {description ? (
                <MarkdownContent content={description} />
              ) : (
                <span className="text-muted-foreground italic">Pas de description</span>
              )}
            </div>
          )}
        </div>

        {/* Waiting for note */}
        {isWaitingFor && task.waiting_for_note && (
          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
              <Hourglass className="h-4 w-4" />
              <span className="text-sm font-medium">En attente de :</span>
            </div>
            <p className="text-sm mt-1">{task.waiting_for_note}</p>
          </div>
        )}

        <Separator />

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date d'echeance
            </label>
            {isEditing ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {doDate ? format(doDate, 'PPP') : 'Choisir une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={doDate}
                    onSelect={setDoDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <p className="text-sm">
                {task.do_date ? format(new Date(task.do_date), 'PPP') : 'Pas de date'}
              </p>
            )}
          </div>

          {/* Time */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Heure
            </label>
            {isEditing ? (
              <Input
                type="time"
                value={doTime}
                onChange={(e) => setDoTime(e.target.value)}
              />
            ) : (
              <p className="text-sm">{task.do_time?.slice(0, 5) || 'Pas d\'heure'}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Priorite
            </label>
            {isEditing ? (
              <Select
                value={priority.toString()}
                onValueChange={(v) => setPriority(parseInt(v) as PriorityLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Basse</SelectItem>
                  <SelectItem value="1">Normale</SelectItem>
                  <SelectItem value="2">Haute</SelectItem>
                  <SelectItem value="3">Urgente</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className={cn('text-sm', PRIORITY_COLORS[task.priority as PriorityLevel])}>
                {PRIORITY_LABELS[task.priority as PriorityLevel]}
              </p>
            )}
          </div>

          {/* Assignation */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Assignation
            </label>
            {isEditing ? (
              <WaterfallPicker
                value={waterfall}
                onChange={setWaterfall}
                className="w-full"
              />
            ) : (
              <p className="text-sm">
                {waterfall.subjectId ? 'Sujet assigne' :
                 waterfall.themeId ? 'Theme assigne' :
                 waterfall.categoryId ? 'Categorie assignee' : 'Boite de reception'}
              </p>
            )}
          </div>
        </div>

        {/* Attachments */}
        <Separator />
        <AttachmentList taskId={task.id} />

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p>Creee le : {format(new Date(task.created_at), 'PPP p')}</p>
          <p>Modifiee le : {format(new Date(task.updated_at), 'PPP p')}</p>
          {task.completed_at && (
            <p>Terminee le : {format(new Date(task.completed_at), 'PPP p')}</p>
          )}
          {task.snooze_count > 0 && (
            <p className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              Reportee {task.snooze_count} fois
            </p>
          )}
        </div>
      </DialogContent>
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
    </Dialog>
  );
}
