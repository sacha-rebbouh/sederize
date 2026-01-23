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

// Empty data constant to avoid recreating objects
const EMPTY_DATA: RelatedData = {
  subjects: new Map(),
  themes: new Map(),
  categories: new Map(),
  labels: new Map(),
  taskLabels: [],
  isLoading: true,
};

// ============================================
// CONTEXT
// ============================================

const RelatedDataContext = createContext<RelatedData | null>(null);

// ============================================
// PROVIDER
// ============================================

/**
 * RelatedDataProvider - Centralized data provider for shared PowerSync queries
 *
 * IMPORTANT: usePowerSyncWatchedQuery requires PowerSyncContext to be available.
 * PowerSyncContext is only provided when db is initialized.
 * We use a two-component pattern to conditionally render queries only when ready.
 */
export function RelatedDataProvider({ children }: { children: ReactNode }) {
  const isPowerSyncReady = usePowerSyncReady();

  // When PowerSync is not ready, provide empty data
  // This avoids calling usePowerSyncWatchedQuery without PowerSyncContext
  if (!isPowerSyncReady) {
    return (
      <RelatedDataContext.Provider value={EMPTY_DATA}>
        {children}
      </RelatedDataContext.Provider>
    );
  }

  // When PowerSync IS ready, render the inner provider with actual queries
  return (
    <RelatedDataProviderInner>
      {children}
    </RelatedDataProviderInner>
  );
}

/**
 * Inner provider that only renders when PowerSync is ready
 * This ensures usePowerSyncWatchedQuery has access to PowerSyncContext
 */
function RelatedDataProviderInner({ children }: { children: ReactNode }) {
  // runQueryOnce: true - fetch once, don't watch for changes
  // This prevents constant re-renders from PowerSync sync events
  // Data will refresh on page navigation
  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    'SELECT * FROM subjects',
    [],
    { runQueryOnce: false }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: false }
  );

  const categoriesResult = usePowerSyncWatchedQuery<Category>(
    'SELECT * FROM categories',
    [],
    { runQueryOnce: false }
  );

  const labelsResult = usePowerSyncWatchedQuery<Label>(
    'SELECT * FROM labels',
    [],
    { runQueryOnce: false }
  );

  const taskLabelsResult = usePowerSyncWatchedQuery<TaskLabel>(
    'SELECT task_id, label_id FROM task_labels',
    [],
    { runQueryOnce: false }
  );

  // Memoize the data to prevent unnecessary re-renders
  const value = useMemo<RelatedData>(() => ({
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
  }), [
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
