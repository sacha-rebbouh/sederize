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
  0: 'bg-blue-100 dark:bg-blue-900/30',
  1: 'bg-muted hover:bg-muted/80',
  2: 'bg-amber-100 dark:bg-amber-900/30',
  3: 'bg-red-100 dark:bg-red-900/30',
};

export function PriorityBadge({
  priority,
  onClick,
  size = 'sm',
  className,
}: PriorityBadgeProps) {
  const isClickable = !!onClick;
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

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

// Helper to cycle priority: Low -> Normal -> High -> Urgent -> Low
export function cyclePriority(current: PriorityLevel): PriorityLevel {
  return ((current + 1) % 4) as PriorityLevel;
}
