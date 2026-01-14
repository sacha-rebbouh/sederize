'use client';

import { useState } from 'react';
import { Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Task } from '@/types/database';
import { useSetWaitingFor } from '@/hooks/use-tasks';

interface WaitingForDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WaitingForDialog({
  task,
  open,
  onOpenChange,
}: WaitingForDialogProps) {
  const [note, setNote] = useState('');
  const setWaitingFor = useSetWaitingFor();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setWaitingFor.mutate(
      { id: task.id, note },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNote('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-amber-500" />
            Set Waiting For
          </DialogTitle>
          <DialogDescription>
            This task will be removed from your Daily Brief until you mark it as
            active again.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Who or what are you waiting for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              e.g., &quot;Client feedback&quot;, &quot;John&apos;s approval&quot;, &quot;Bank transfer&quot;
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!note.trim() || setWaitingFor.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Set Waiting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
