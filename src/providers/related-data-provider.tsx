'use client';

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from 'react';
import { useQuery as usePowerSyncWatchedQuery } from '@powersync/react';
import { usePowerSyncReady } from './powersync-provider';
import { Subject, Theme, Category, Label } from '@/types/database';

// ============================================
// TYPES
// ============================================

interface TaskLabel {
  task_id: string;
  label_id: string;
}

interface RelatedData {
  subjects: Map<string, Subject>;
  themes: Map<string, Theme>;
  categories: Map<string, Category>;
  labels: Map<string, Label>;
  taskLabels: TaskLabel[];
  isLoading: boolean;
}

// ============================================
// CONTEXT
// ============================================

const RelatedDataContext = createContext<RelatedData | null>(null);

// ============================================
// PROVIDER
// ============================================

export function RelatedDataProvider({ children }: { children: ReactNode }) {
  const isPowerSyncReady = usePowerSyncReady();

  // Only run queries when PowerSync is ready
  // These queries are shared across ALL components that need related data
  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    isPowerSyncReady ? 'SELECT * FROM subjects' : 'SELECT 1 WHERE 0',
    [],
    { runQueryOnce: false }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    isPowerSyncReady ? 'SELECT * FROM themes' : 'SELECT 1 WHERE 0',
    [],
    { runQueryOnce: false }
  );

  const categoriesResult = usePowerSyncWatchedQuery<Category>(
    isPowerSyncReady ? 'SELECT * FROM categories' : 'SELECT 1 WHERE 0',
    [],
    { runQueryOnce: false }
  );

  const labelsResult = usePowerSyncWatchedQuery<Label>(
    isPowerSyncReady ? 'SELECT * FROM labels' : 'SELECT 1 WHERE 0',
    [],
    { runQueryOnce: false }
  );

  const taskLabelsResult = usePowerSyncWatchedQuery<TaskLabel>(
    isPowerSyncReady ? 'SELECT task_id, label_id FROM task_labels' : 'SELECT 1 WHERE 0',
    [],
    { runQueryOnce: false }
  );

  // Memoize the data to prevent unnecessary re-renders
  const value = useMemo<RelatedData>(() => {
    // If PowerSync is not ready, return empty data
    if (!isPowerSyncReady) {
      return {
        subjects: new Map(),
        themes: new Map(),
        categories: new Map(),
        labels: new Map(),
        taskLabels: [],
        isLoading: true,
      };
    }

    return {
      subjects: new Map((subjectsResult.data ?? []).map((s) => [s.id, s])),
      themes: new Map((themesResult.data ?? []).map((t) => [t.id, t])),
      categories: new Map((categoriesResult.data ?? []).map((c) => [c.id, c])),
      labels: new Map((labelsResult.data ?? []).map((l) => [l.id, l])),
      taskLabels: (taskLabelsResult.data ?? []) as TaskLabel[],
      isLoading:
        subjectsResult.isLoading ||
        themesResult.isLoading ||
        categoriesResult.isLoading ||
        labelsResult.isLoading ||
        taskLabelsResult.isLoading,
    };
  }, [
    isPowerSyncReady,
    subjectsResult.data,
    themesResult.data,
    categoriesResult.data,
    labelsResult.data,
    taskLabelsResult.data,
    subjectsResult.isLoading,
    themesResult.isLoading,
    categoriesResult.isLoading,
    labelsResult.isLoading,
    taskLabelsResult.isLoading,
  ]);

  return (
    <RelatedDataContext.Provider value={value}>
      {children}
    </RelatedDataContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Get shared related data (subjects, themes, categories, labels, taskLabels)
 * This hook returns data from a shared context, avoiding duplicate PowerSync queries
 */
export function useRelatedData(): RelatedData {
  const context = useContext(RelatedDataContext);

  // Fallback for when context is not available (e.g., during SSR or outside provider)
  if (!context) {
    return {
      subjects: new Map(),
      themes: new Map(),
      categories: new Map(),
      labels: new Map(),
      taskLabels: [],
      isLoading: true,
    };
  }

  return context;
}
