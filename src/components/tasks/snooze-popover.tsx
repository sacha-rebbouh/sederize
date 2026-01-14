'use client';

import { useState } from 'react';
import { AlarmClock, CalendarDays } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSnoozeTask } from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';

interface SnoozePopoverProps {
  taskId: string;
  className?: string;
}

export function SnoozePopover({ taskId, className }: SnoozePopoverProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const snoozeTask = useSnoozeTask();

  const handleSnooze = (days: number) => {
    snoozeTask.mutate({ id: taskId, days });
    setOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      snoozeTask.mutate({ id: taskId, date });
      setOpen(false);
      setShowCalendar(false);
    }
  };

  const quickOptions = [
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 days', days: 3 },
    { label: 'Next week', days: 7 },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', className)}
        >
          <AlarmClock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {!showCalendar ? (
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Snooze until
            </p>
            {quickOptions.map((option) => (
              <Button
                key={option.days}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleSnooze(option.days)}
                disabled={snoozeTask.isPending}
              >
                <AlarmClock className="h-4 w-4 mr-2" />
                {option.label}
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(addDays(new Date(), option.days), 'EEE, MMM d')}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowCalendar(true)}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Pick a date
            </Button>
          </div>
        ) : (
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => setShowCalendar(false)}
            >
              Back
            </Button>
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
