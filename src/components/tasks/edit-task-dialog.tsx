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
import { SubjectPicker } from './subject-picker';
import { cn } from '@/lib/utils';

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [subjectId, setSubjectId] = useState<string | null>(task.subject_id);
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
      setSubjectId(task.subject_id);
    }
  }, [open, task]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Update task
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description: description || null,
        do_date: doDate ? format(doDate, 'yyyy-MM-dd') : null,
        do_time: doTime || null,
        priority,
        subject_id: subjectId,
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
      <DialogContent className="sm:max-w-lg">
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
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      Normal
                    </div>
                  </SelectItem>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-amber-500" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-red-500" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject Selector */}
            <div className="space-y-2">
              <Label>Projet</Label>
              <SubjectPicker
                value={subjectId}
                onChange={setSubjectId}
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
