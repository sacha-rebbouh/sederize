'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Stale time configuration per data type
 * - Tasks: Frequently changing, short stale time
 * - Themes/Subjects/Labels: Rarely changing, longer stale time
 * - Categories: Very rarely changing, longest stale time
 */
export const STALE_TIMES = {
  tasks: 30 * 1000,           // 30 seconds
  tasksCount: 60 * 1000,      // 1 minute (badge counts)
  themes: 5 * 60 * 1000,      // 5 minutes
  subjects: 5 * 60 * 1000,    // 5 minutes
  categories: 10 * 60 * 1000, // 10 minutes
  labels: 5 * 60 * 1000,      // 5 minutes
  pendingItems: 60 * 1000,    // 1 minute
} as const;

// Garbage collection time (how long to keep unused queries in cache)
export const GC_TIME = 10 * 60 * 1000; // 10 minutes

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIMES.tasks, // Default for most queries
            gcTime: GC_TIME,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
