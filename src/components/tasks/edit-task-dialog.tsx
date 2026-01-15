'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Clock, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Task, PriorityLevel, Label as LabelType } from '@/types/database';
import { useUpdateTask } from '@/hooks/use-tasks';
import { useTaskLabels, useSetTaskLabels } from '@/hooks/use-labels';
import { LabelPicker } from './label-picker';
import { WaterfallPicker, WaterfallValue } from './waterfall-picker';
import { cn } from '@/lib/utils';

interface EditTaskDialogProps {
  task: Task & {
    // Extended fields that may come from TaskWithRelations
    theme?: { id: string; category_id?: string | null } | null;
    category?: { id: string } | null;
    subject?: { theme_id: string } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to get the resolved waterfall value from a task
function getResolvedWaterfall(task: EditTaskDialogProps['task']): WaterfallValue {
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
  return {
    categoryId: null,
    themeId: null,
    subjectId: null,
  };
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
}: EditTaskDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [doDate, setDoDate] = useState<Date | undefined>(
    task.do_date ? new Date(task.do_date) : undefined
  );
  const [doTime, setDoTime] = useState(task.do_time?.slice(0, 5) || '');
  const [priority, setPriority] = useState<PriorityLevel>((task.priority ?? 0) as PriorityLevel);
  const [waterfall, setWaterfall] = useState<WaterfallValue>(getResolvedWaterfall(task));
  const [selectedLabels, setSelectedLabels] = useState<LabelType[]>([]);

  const updateTask = useUpdateTask();
  const { data: taskLabels } = useTaskLabels(task.id);
  const setTaskLabels = useSetTaskLabels();

  // Initialize labels when dialog opens
  useEffect(() => {
    if (open && taskLabels) {
      setSelectedLabels(taskLabels);
    }
  }, [open, taskLabels]);

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDoDate(task.do_date ? new Date(task.do_date) : undefined);
      setDoTime(task.do_time?.slice(0, 5) || '');
      setPriority((task.priority ?? 0) as PriorityLevel);
      setWaterfall(getResolvedWaterfall(task));
    }
  }, [open, task]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Update task with waterfall assignment
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description: description || null,
        do_date: doDate ? format(doDate, 'yyyy-MM-dd') : null,
        do_time: doTime || null,
        priority,
        subject_id: waterfall.subjectId,
        theme_id: waterfall.themeId,
        category_id: waterfall.categoryId,
      });

      // Update labels (optional - don't fail if labels table doesn't exist)
      try {
        await setTaskLabels.mutateAsync({
          taskId: task.id,
          labelIds: selectedLabels.map((l) => l.id),
        });
      } catch (err) {
        console.warn('Failed to update labels:', err);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Erreur lors de la sauvegarde: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              placeholder="Titre de la tâche"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start',
                      !doDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {doDate ? format(doDate, 'd MMM yyyy') : 'Choisir'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={doDate}
                    onSelect={setDoDate}
                    initialFocus
                  />
                  {doDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDoDate(undefined)}
                      >
                        Effacer la date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label htmlFor="time">Heure</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={doTime}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Auto-complete minutes if only hour is provided
                    if (value && !value.includes(':')) {
                      value = `${value.padStart(2, '0')}:00`;
                    }
                    setDoTime(value);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Priority & Subject Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                value={priority.toString()}
                onValueChange={(v) => setPriority(parseInt(v) as PriorityLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-blue-500" />
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      Normal
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-amber-500" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="3">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-red-500" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Waterfall Assignment */}
            <div className="space-y-2">
              <Label>Assignation</Label>
              <WaterfallPicker
                value={waterfall}
                onChange={setWaterfall}
                className="w-full"
              />
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label>Labels</Label>
            <LabelPicker
              selectedLabels={selectedLabels}
              onLabelsChange={setSelectedLabels}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSaving}
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
