'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Inbox,
  Calendar,
  Search,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateType = 'success' | 'inbox' | 'calendar' | 'search' | 'folder';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

const EMPTY_STATES: Record<
  EmptyStateType,
  {
    icon: typeof CheckCircle2;
    title: string;
    description: string;
    bgColor: string;
    iconColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    title: 'All caught up!',
    description: "You're doing great. Enjoy your freedom!",
    bgColor: 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  inbox: {
    icon: Inbox,
    title: 'Inbox Zero',
    description: 'All tasks have been processed. Nice work!',
    bgColor: 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  calendar: {
    icon: Calendar,
    title: 'Clear Schedule',
    description: 'No tasks scheduled for this period.',
    bgColor: 'bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  search: {
    icon: Search,
    title: 'No Results',
    description: 'Try adjusting your search or filters.',
    bgColor: 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-800/30',
    iconColor: 'text-slate-500 dark:text-slate-400',
  },
  folder: {
    icon: FolderOpen,
    title: 'Nothing Here Yet',
    description: 'Create your first item to get started.',
    bgColor: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
};

export function EmptyState({
  type = 'success',
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  const config = EMPTY_STATES[type];
  const Icon = config.icon;
  const isSuccess = type === 'success' || type === 'inbox';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {/* Icon container with animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative mb-6"
      >
        <motion.div
          className={cn(
            'flex items-center justify-center w-20 h-20 rounded-2xl',
            config.bgColor
          )}
          whileHover={{ scale: 1.05, rotate: 5 }}
        >
          <Icon className={cn('w-10 h-10', config.iconColor)} />
        </motion.div>

        {/* Success sparkle */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="absolute -top-2 -right-2"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-6 h-6 text-amber-500" />
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-bold mb-2"
      >
        {title || config.title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground max-w-xs"
      >
        {description || config.description}
      </motion.p>

      {/* Optional action */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          {action}
        </motion.div>
      )}

      {/* Celebration particles for success */}
      {isSuccess && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-20, -60],
                x: [(i - 2.5) * 20, (i - 2.5) * 40],
              }}
              transition={{
                duration: 1.5,
                delay: 0.5 + i * 0.1,
                ease: 'easeOut',
              }}
              className="absolute left-1/2 top-1/2"
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  i % 3 === 0 ? 'bg-emerald-400' : i % 3 === 1 ? 'bg-blue-400' : 'bg-amber-400'
                )}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
