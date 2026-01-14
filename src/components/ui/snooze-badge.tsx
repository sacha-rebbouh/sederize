'use client';

import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SnoozeBadgeProps {
  count: number;
  className?: string;
}

export function SnoozeBadge({ count, className }: SnoozeBadgeProps) {
  // Don't show badge if never snoozed
  if (count <= 0) {
    return null;
  }

  // Color escalation based on snooze count
  const badgeClass =
    count >= 5
      ? 'bg-destructive/10 text-destructive' // 5+ = red (shame zone)
      : count >= 3
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' // 3-4 = warning
        : 'bg-muted text-muted-foreground'; // 1-2 = neutral

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
              badgeClass,
              className
            )}
          >
            <RotateCcw className="h-3 w-3" />
            {count}x
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>
            Snoozed {count} time{count > 1 ? 's' : ''}
            {count >= 5 && ' - Time to face it!'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
