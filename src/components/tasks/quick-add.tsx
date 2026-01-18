'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CalendarDays, Send, Sparkles, Clock, Flag } from 'lucide-react';
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
import { WaterfallPicker, WaterfallValue } from './waterfall-picker';
import { parseTaskInput } from '@/lib/date-parser';
import { cn } from '@/lib/utils';
import { PriorityLevel, PRIORITY_LABELS } from '@/types/database';

interface QuickAddProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickAdd({ open: controlledOpen, onOpenChange }: QuickAddProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [input, setInput] = useState('');
  const [doDate, setDoDate] = useState<Date | undefined>();
  const [doTime, setDoTime] = useState<string>('');
  const [waterfall, setWaterfall] = useState<WaterfallValue>({
    categoryId: null,
    themeId: null,
    subjectId: null,
  });
  const [priority, setPriority] = useState<PriorityLevel>(1); // Default: Normal
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

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Increment key to force form remount and reset all state
      setFormKey(k => k + 1);
      setInput('');
      setDoDate(undefined);
      setDoTime('');
      setWaterfall({ categoryId: null, themeId: null, subjectId: null });
      setPriority(1);
      setIsSubmitting(false);
      // Focus input after a short delay
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    // Parse the input exactly like inbox does
    const parsed = parseTaskInput(input);

    try {
      await createTask.mutateAsync({
        title: parsed.title || input,
        // Use manually selected date/time if set, otherwise use parsed values
        do_date: doDate ? format(doDate, 'yyyy-MM-dd') : (parsed.date ? format(parsed.date, 'yyyy-MM-dd') : null),
        do_time: doTime || parsed.time || null,
        subject_id: waterfall.subjectId,
        theme_id: waterfall.themeId,
        category_id: waterfall.categoryId,
        // Use parsed priority if detected, otherwise use manual selection (default 1 = Normal)
        priority: parsed.priority ?? priority,
      });

      // Build success message with details (like inbox does)
      const details: string[] = [];
      if (parsed.priority !== null) {
        const priorityNames = { 0: 'Low', 1: 'Normal', 2: 'High', 3: 'Urgent' };
        details.push(priorityNames[parsed.priority]);
      }
      if (parsed.date) {
        details.push(format(parsed.date, 'MMM d'));
      }
      if (parsed.time) {
        details.push(parsed.time);
      }

      toast.success(
        details.length > 0 ? `Task created (${details.join(', ')})` : 'Task created!',
        { icon: <Sparkles className="h-4 w-4 text-amber-500" /> }
      );

      // Reset and close
      setInput('');
      setDoDate(undefined);
      setDoTime('');
      setWaterfall({ categoryId: null, themeId: null, subjectId: null });
      setPriority(1);
      setOpen(false);
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple input change - parsing happens on submit (like inbox)
  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const clearAll = () => {
    setInput('');
    setDoDate(undefined);
    setDoTime('');
    setWaterfall({ categoryId: null, themeId: null, subjectId: null });
    setPriority(1);
  };

  const hasOptions = doDate || doTime || waterfall.subjectId || waterfall.themeId || waterfall.categoryId || priority !== 1;

  return (
    <>
      {/* FAB Button - above bottom nav on mobile, normal position on desktop */}
      <motion.div
        className="fixed right-4 z-40 md:right-6"
        style={{
          bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
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

          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            {/* Task Input */}
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder='What needs to be done? Try "Call Mark tomorrow"'
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                className="pr-10 text-lg h-12"
                disabled={isSubmitting}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
              />
              <AnimatePresence>
                {input && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-2 inset-y-0 flex items-center"
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

            {/* Row 1: Date, Time, Priority */}
            <motion.div
              className="flex gap-2"
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

              {/* Priority Selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-2 transition-all',
                      priority !== 1 && priority === 3 && 'bg-red-500/10 border-red-500 text-red-600 hover:bg-red-500/20',
                      priority !== 1 && priority === 2 && 'bg-amber-500/10 border-amber-500 text-amber-600 hover:bg-amber-500/20',
                      priority !== 1 && priority === 0 && 'bg-blue-500/10 border-blue-500 text-blue-600 hover:bg-blue-500/20'
                    )}
                  >
                    <Flag className="h-4 w-4" />
                    {PRIORITY_LABELS[priority]}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  <div className="space-y-0.5">
                    {([3, 2, 1, 0] as PriorityLevel[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                          priority === p ? 'bg-accent' : 'hover:bg-accent/50',
                          p === 3 && 'text-red-600',
                          p === 2 && 'text-amber-600',
                          p === 0 && 'text-blue-600'
                        )}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>

            {/* Row 2: Assignment + Clear */}
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {/* Waterfall Assignment */}
              <WaterfallPicker
                value={waterfall}
                onChange={setWaterfall}
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
