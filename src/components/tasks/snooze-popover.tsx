'use client';

import { useState, useMemo } from 'react';
import { AlarmClock, CalendarDays } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
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
  taskDate?: string | null; // Current task's do_date
  className?: string;
}

export function SnoozePopover({ taskId, taskDate, className }: SnoozePopoverProps) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const snoozeTask = useSnoozeTask();

  const handleSnooze = (days: number) => {
    const newDate = addDays(new Date(), days);
    snoozeTask.mutate(
      { id: taskId, days },
      {
        onSuccess: () => {
          toast.success(`Reporté au ${format(newDate, 'EEEE d MMMM', { locale: fr })}`, {
            icon: <AlarmClock className="h-4 w-4" />,
          });
        },
      }
    );
    setOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      snoozeTask.mutate(
        { id: taskId, date },
        {
          onSuccess: () => {
            toast.success(`Reporté au ${format(date, 'EEEE d MMMM', { locale: fr })}`, {
              icon: <AlarmClock className="h-4 w-4" />,
            });
          },
        }
      );
      setOpen(false);
      setShowCalendar(false);
    }
  };

  // Filter out options that would snooze to the same date
  const quickOptions = useMemo(() => {
    const today = startOfDay(new Date());
    const currentTaskDate = taskDate ? startOfDay(new Date(taskDate)) : null;

    const allOptions = [
      { label: 'Demain', days: 1 },
      { label: 'Dans 3 jours', days: 3 },
      { label: 'Semaine prochaine', days: 7 },
    ];

    // Filter out options where the target date is the same as the current task date
    return allOptions.filter(option => {
      const targetDate = addDays(today, option.days);
      // Keep the option if task has no date, or if target date is different from current task date
      return !currentTaskDate || !isSameDay(targetDate, currentTaskDate);
    });
  }, [taskDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-10 w-10', className)}
        >
          <AlarmClock className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {!showCalendar ? (
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Reporter jusqu'a
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
                  {format(addDays(new Date(), option.days), 'EEE d MMM', { locale: fr })}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowCalendar(true)}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Choisir une date
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
              Retour
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
