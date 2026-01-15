'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#64748b', // Slate
];

export interface EditEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'category' | 'theme' | 'subject';
  initialTitle: string;
  initialColor?: string;
  onSave: (title: string, color?: string) => void;
  isPending?: boolean;
}

export function EditEntityDialog({
  open,
  onOpenChange,
  type,
  initialTitle,
  initialColor,
  onSave,
  isPending,
}: EditEntityDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [color, setColor] = useState(initialColor || COLORS[0]);

  // Sync state when dialog opens with new values
  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setColor(initialColor || COLORS[0]);
    }
  }, [open, initialTitle, initialColor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), color);
  };

  const typeLabels = {
    category: 'la catégorie',
    theme: 'le thème',
    subject: 'le sujet',
  };

  const showColor = type === 'category' || type === 'theme';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier {typeLabels[type]}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nom</Label>
            <Input
              id="title"
              placeholder="Nom..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {showColor && (
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-all ${
                      color === c
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          )}

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
              disabled={!title.trim() || isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
