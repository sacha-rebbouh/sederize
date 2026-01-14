'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CalendarDays, Send, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCreateTask } from '@/hooks/use-tasks';
import { SubjectPicker } from './subject-picker';
import { parseTaskInput } from '@/lib/date-parser';
import { cn } from '@/lib/utils';

interface QuickAddProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickAdd({ open: controlledOpen, onOpenChange }: QuickAddProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [input, setInput] = useState('');
  const [doDate, setDoDate] = useState<Date | undefined>();
  const [doTime, setDoTime] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const createTask = useCreateTask();

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const parsed = parseTaskInput(input);
    const finalDate = doDate || parsed.date;
    const finalTime = doTime || parsed.time;

    try {
      await createTask.mutateAsync({
        title: parsed.title || input,
        do_date: finalDate ? format(finalDate, 'yyyy-MM-dd') : null,
        do_time: finalTime || null,
        subject_id: subjectId,
      });

      toast.success('Task created!', {
        icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      });

      // Reset and close
      setInput('');
      setDoDate(undefined);
      setDoTime('');
      setSubjectId(null);
      setOpen(false);
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    const parsed = parseTaskInput(value);
    if (parsed.date && !doDate) {
      setDoDate(parsed.date);
    }
    if (parsed.time && !doTime) {
      setDoTime(parsed.time);
    }
  };

  const clearAll = () => {
    setInput('');
    setDoDate(undefined);
    setDoTime('');
    setSubjectId(null);
  };

  const hasOptions = doDate || doTime || subjectId;

  return (
    <>
      {/* FAB Button */}
      <motion.div
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.3 }}
      >
        <motion.button
          onClick={() => setOpen(true)}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg flex items-center justify-center',
            'bg-primary text-primary-foreground',
            'hover:shadow-xl hover:scale-105 active:scale-95',
            'transition-all duration-200'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      </motion.div>

      {/* Quick Add Dialog */}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: isSubmitting ? 360 : 0 }}
                transition={{ duration: 0.5, repeat: isSubmitting ? Infinity : 0, ease: 'linear' }}
              >
                <Sparkles className="h-5 w-5 text-amber-500" />
              </motion.div>
              Quick Add
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Input */}
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder='What needs to be done? Try "Call Mark tomorrow"'
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                className="pr-10 text-lg h-12"
                disabled={isSubmitting}
              />
              <AnimatePresence>
                {input && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setInput('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Options Row */}
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-2 transition-all',
                      doDate && 'bg-primary/10 border-primary text-primary hover:bg-primary/20'
                    )}
                  >
                    <CalendarDays className="h-4 w-4" />
                    {doDate ? format(doDate, 'MMM d') : 'Date'}
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
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDoDate(undefined)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Time Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-2 transition-all',
                      doTime && 'bg-primary/10 border-primary text-primary hover:bg-primary/20'
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    {doTime || 'Time'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-2">
                    <Input
                      type="time"
                      value={doTime}
                      onChange={(e) => setDoTime(e.target.value)}
                      className="w-full"
                    />
                    {doTime && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDoTime('')}
                      >
                        Clear time
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Subject Selector */}
              <SubjectPicker
                value={subjectId}
                onChange={setSubjectId}
              />

              {/* Clear all options */}
              <AnimatePresence>
                {hasOptions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="text-muted-foreground"
                    >
                      Clear all
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={!input.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Add Task
                  </>
                )}
              </Button>
            </motion.div>

            {/* Keyboard hint */}
            <p className="text-xs text-center text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd> to add
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
