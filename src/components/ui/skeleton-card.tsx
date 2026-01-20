'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-xl border bg-card',
        className
      )}
    >
      {/* Checkbox skeleton */}
      <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-3">
        {/* Title */}
        <div className="h-5 bg-muted rounded-md animate-pulse w-3/4" />

        {/* Metadata */}
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="p-4 rounded-xl border bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-8 bg-muted rounded animate-pulse" />
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="space-y-2 text-center flex flex-col items-center">
      <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <SkeletonHeader />
      <SkeletonStats />
      <SkeletonList count={5} />
    </div>
  );
}
