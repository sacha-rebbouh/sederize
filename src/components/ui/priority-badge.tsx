'use client';

import { cn } from '@/lib/utils';
import { PriorityLevel, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types/database';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const PRIORITY_BG: Record<PriorityLevel, string> = {
  0: 'bg-muted hover:bg-muted/80',
  1: 'bg-amber-100 dark:bg-amber-900/30',
  2: 'bg-red-100 dark:bg-red-900/30',
};

export function PriorityBadge({
  priority,
  onClick,
  size = 'sm',
  className,
}: PriorityBadgeProps) {
  const isClickable = !!onClick;
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  // Don't show badge for normal priority unless clickable
  if (priority === 0 && !isClickable) {
    return null;
  }

  // For normal priority when clickable, show a subtle indicator
  if (priority === 0 && isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center rounded-md text-xs font-medium transition-colors',
          'px-2 py-0.5 bg-muted/50 text-muted-foreground hover:bg-muted',
          className
        )}
      >
        Priority
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'inline-flex items-center rounded-md text-xs font-bold uppercase tracking-wide transition-colors',
        padding,
        PRIORITY_BG[priority],
        PRIORITY_COLORS[priority],
        isClickable && 'cursor-pointer hover:opacity-80',
        !isClickable && 'cursor-default',
        className
      )}
    >
      {PRIORITY_LABELS[priority]}
    </button>
  );
}

// Helper to cycle priority: Low -> Medium -> High -> Low
export function cyclePriority(current: PriorityLevel): PriorityLevel {
  return ((current + 1) % 3) as PriorityLevel;
}
