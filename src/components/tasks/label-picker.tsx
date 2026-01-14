'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLabels, useCreateLabel } from '@/hooks/use-labels';
import { Label } from '@/types/database';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
];

interface LabelPickerProps {
  selectedLabels: Label[];
  onLabelsChange: (labels: Label[]) => void;
}

export function LabelPicker({ selectedLabels, onLabelsChange }: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [showCreate, setShowCreate] = useState(false);

  const { data: labels = [] } = useLabels();
  const createLabel = useCreateLabel();

  const selectedIds = new Set(selectedLabels.map((l) => l.id));

  const toggleLabel = (label: Label) => {
    if (selectedIds.has(label.id)) {
      onLabelsChange(selectedLabels.filter((l) => l.id !== label.id));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    const newLabel = await createLabel.mutateAsync({
      name: newLabelName.trim(),
      color_hex: newLabelColor,
    });

    onLabelsChange([...selectedLabels, newLabel]);
    setNewLabelName('');
    setShowCreate(false);
  };

  const removeLabel = (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onLabelsChange(selectedLabels.filter((l) => l.id !== labelId));
  };

  return (
    <div className="space-y-2">
      {/* Selected labels */}
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence mode="popLayout">
          {selectedLabels.map((label) => (
            <motion.div
              key={label.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                variant="secondary"
                className="gap-1 pr-1 cursor-default"
                style={{
                  backgroundColor: label.color_hex + '20',
                  borderColor: label.color_hex,
                  color: label.color_hex,
                }}
              >
                {label.name}
                <button
                  onClick={(e) => removeLabel(label.id, e)}
                  className="ml-1 hover:bg-foreground/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add label button */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 gap-1">
              <Tag className="h-3 w-3" />
              {selectedLabels.length === 0 ? 'Add label' : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            {showCreate ? (
              <div className="space-y-3">
                <Input
                  placeholder="Label name..."
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <motion.button
                      key={color}
                      className={cn(
                        'h-6 w-6 rounded-full transition-transform',
                        newLabelColor === color && 'ring-2 ring-offset-2 ring-foreground'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewLabelColor(color)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreateLabel}
                    disabled={!newLabelName.trim() || createLabel.isPending}
                  >
                    Create
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {labels.map((label) => {
                      const isSelected = selectedIds.has(label.id);
                      return (
                        <motion.button
                          key={label.id}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left',
                            isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                          onClick={() => toggleLabel(label)}
                          whileHover={{ x: 2 }}
                        >
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: label.color_hex }}
                          />
                          <span className="flex-1 text-sm truncate">{label.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </motion.button>
                      );
                    })}
                    {labels.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No labels yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 gap-2"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create new label
                </Button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Simple badge display for labels (read-only)
interface LabelBadgesProps {
  labels: Label[];
  max?: number;
}

export function LabelBadges({ labels, max = 3 }: LabelBadgesProps) {
  const displayLabels = labels.slice(0, max);
  const remaining = labels.length - max;

  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {displayLabels.map((label) => (
        <Badge
          key={label.id}
          variant="secondary"
          className="text-[10px] px-1.5 py-0"
          style={{
            backgroundColor: label.color_hex + '20',
            borderColor: label.color_hex,
            color: label.color_hex,
          }}
        >
          {label.name}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
