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
            Mettre en attente
          </DialogTitle>
          <DialogDescription>
            Cette tache sera retiree de votre Brief du jour jusqu'a ce que vous la marquiez
            comme active a nouveau.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="De qui ou quoi attendez-vous ?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ex: &quot;Retour client&quot;, &quot;Validation de Jean&quot;, &quot;Virement bancaire&quot;
            </p>
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
              disabled={!note.trim() || setWaitingFor.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Mettre en attente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
