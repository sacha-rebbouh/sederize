'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useQuery as usePowerSyncWatchedQuery } from '@powersync/react';
import { createClient } from '@/lib/supabase/client';
import { usePowerSyncDb, usePowerSyncReady } from '@/providers/powersync-provider';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  Task,
  TaskWithRelations,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  Subject,
  Theme,
  Category,
  Label,
} from '@/types/database';
import { generateUUID, nowISO, formatDateSQL } from '@/lib/powersync/hooks';
import { format, addDays } from 'date-fns';
import { useMemo } from 'react';

// ============================================
// HELPER TYPES & FUNCTIONS
// ============================================

interface TaskLabel {
  task_id: string;
  label_id: string;
}

// Transform raw task data to TaskWithRelations with waterfall logic
function transformTaskWithRelations(
  task: Task,
  subjects: Map<string, Subject>,
  themes: Map<string, Theme>,
  categories: Map<string, Category>,
  taskLabels: TaskLabel[],
  labels: Map<string, Label>
): TaskWithRelations {
  // Get subject and its theme
  const subject = task.subject_id ? subjects.get(task.subject_id) || null : null;
  const themeFromSubject = subject?.theme_id ? themes.get(subject.theme_id) || null : null;

  // Get direct theme
  const directTheme = task.theme_id ? themes.get(task.theme_id) || null : null;

  // Waterfall: subject's theme > direct theme
  const theme = themeFromSubject || directTheme;

  // Get category from theme or direct
  const categoryFromTheme = theme?.category_id ? categories.get(theme.category_id) || null : null;
  const directCategory = task.category_id ? categories.get(task.category_id) || null : null;

  // Waterfall: theme's category > direct category
  const category = categoryFromTheme || directCategory;

  // Get labels for this task
  const taskLabelIds = taskLabels
    .filter((tl) => tl.task_id === task.id)
    .map((tl) => tl.label_id);
  const taskLabelsList = taskLabelIds
    .map((lid) => labels.get(lid))
    .filter(Boolean) as Label[];

  // Build subject with theme for the return value
  const subjectWithTheme = subject ? {
    ...subject,
    theme: themeFromSubject ? {
      ...themeFromSubject,
      category: categoryFromTheme,
    } : null,
  } : null;

  return {
    ...task,
    subject: subjectWithTheme,
    theme,
    category,
    direct_theme: directTheme,
    direct_category: directCategory,
    labels: taskLabelsList,
  };
}

// ============================================
// SHARED DATA HOOKS (for PowerSync mode)
// ============================================

function useRelatedData() {
  // Related data (subjects, themes, categories, labels) rarely changes during a session
  // Use runQueryOnce: true to prevent re-renders on every PowerSync sync
  // Data refreshes on page navigation or component remount
  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    'SELECT * FROM subjects',
    [],
    { runQueryOnce: true }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: true }
  );

  const categoriesResult = usePowerSyncWatchedQuery<Category>(
    'SELECT * FROM categories',
    [],
    { runQueryOnce: true }
  );

  const labelsResult = usePowerSyncWatchedQuery<Label>(
    'SELECT * FROM labels',
    [],
    { runQueryOnce: true }
  );

  // task_labels - use runQueryOnce: true to prevent re-render cascade
  // Label assignments refresh on navigation or manual refresh
  const taskLabelsResult = usePowerSyncWatchedQuery<TaskLabel>(
    'SELECT task_id, label_id FROM task_labels',
    [],
    { runQueryOnce: true }
  );

  return useMemo(() => ({
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
}

// ============================================
// READ HOOKS (PowerSync local SQLite)
// ============================================

interface UseTasksOptions {
  enabled?: boolean;
}

// Daily Brief: Tasks due on a specific date or overdue (status = todo)
export function useDailyBriefTasks(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();

  // PowerSync watched query
  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks
     WHERE status = 'todo' AND do_date <= ?
     ORDER BY do_date ASC, priority DESC, order_index ASC`,
    [dateStr],
    { runQueryOnce: false }
  );

  // Transform tasks with relations
  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.dailyBrief(dateStr),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `)
        .eq('status', 'todo')
        .lte('do_date', dateStr)
        .order('do_date', { ascending: true })
        .order('priority', { ascending: false })
        .order('order_index', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    placeholderData: keepPreviousData,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// Inbox tasks (no assignment at all)
export function useInboxTasks() {
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks
     WHERE subject_id IS NULL AND theme_id IS NULL AND category_id IS NULL AND status != 'done'
     ORDER BY created_at DESC`,
    [],
    { runQueryOnce: false }
  );

  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.inbox(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`*, task_labels(label:labels(*))`)
        .is('subject_id', null)
        .is('theme_id', null)
        .is('category_id', null)
        .neq('status', 'done')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// Inbox count (lightweight for badges)
export function useInboxCount() {
  const isPowerSyncReady = usePowerSyncReady();

  const powerSyncResult = usePowerSyncWatchedQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks
     WHERE subject_id IS NULL AND theme_id IS NULL AND category_id IS NULL AND status != 'done'`,
    [],
    { runQueryOnce: false }
  );

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.inboxCount(),
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .is('subject_id', null)
        .is('theme_id', null)
        .is('category_id', null)
        .neq('status', 'done');

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: STALE_TIMES.tasksCount,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: powerSyncResult.data?.[0]?.count ?? 0,
      isLoading: powerSyncResult.isLoading,
      isFetching: powerSyncResult.isFetching,
      error: powerSyncResult.error ?? null,
      refetch: powerSyncResult.refresh,
    };
  }

  return supabaseResult;
}

// Tasks for a specific subject
export function useSubjectTasks(subjectId: string) {
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks WHERE subject_id = ? ORDER BY status ASC, order_index ASC`,
    [subjectId],
    { runQueryOnce: false }
  );

  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.bySubject(subjectId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`*, task_labels(label:labels(*))`)
        .eq('subject_id', subjectId)
        .order('status', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    enabled: !!subjectId && !isPowerSyncReady,
    staleTime: STALE_TIMES.tasks,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// Waiting for tasks
export function useWaitingForTasks() {
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks WHERE status = 'waiting_for' ORDER BY updated_at DESC`,
    [],
    { runQueryOnce: false }
  );

  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.waitingFor(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `)
        .eq('status', 'waiting_for')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// Count of waiting_for tasks (for sidebar badge)
export function useWaitingForCount() {
  const isPowerSyncReady = usePowerSyncReady();

  const powerSyncResult = usePowerSyncWatchedQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks WHERE status = 'waiting_for'`,
    [],
    { runQueryOnce: false }
  );

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.waitingForCount(),
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_for');

      if (error) throw error;
      return count || 0;
    },
    staleTime: STALE_TIMES.tasksCount,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: powerSyncResult.data?.[0]?.count ?? 0,
      isLoading: powerSyncResult.isLoading,
      isFetching: powerSyncResult.isFetching,
      error: powerSyncResult.error ?? null,
      refetch: powerSyncResult.refresh,
    };
  }

  return supabaseResult;
}

// Tasks for calendar view (by date range)
export function useTasksByDateRange(startDate: Date, endDate: Date) {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks WHERE do_date >= ? AND do_date <= ? ORDER BY do_date ASC`,
    [startStr, endStr],
    { runQueryOnce: false }
  );

  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.calendar(startStr, endStr),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `)
        .gte('do_date', startStr)
        .lte('do_date', endStr)
        .order('do_date', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// All tasks (for search, limited to 100)
export function useAllTasks(options?: UseTasksOptions) {
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();
  const enabled = options?.enabled ?? true;

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks ORDER BY updated_at DESC LIMIT 100`,
    [],
    { runQueryOnce: false }
  );

  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.all100(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    enabled: enabled && !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// All tasks for Kanban (no limit, all statuses)
export function useKanbanTasks() {
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks ORDER BY order_index ASC`,
    [],
    { runQueryOnce: false }
  );

  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.kanban(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// All tasks without limit (for All Tasks page)
export function useAllTasksUnlimited() {
  const isPowerSyncReady = usePowerSyncReady();
  const relatedData = useRelatedData();

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    `SELECT * FROM tasks ORDER BY updated_at DESC`,
    [],
    { runQueryOnce: false }
  );

  const tasksWithRelations = useMemo(() => {
    const tasks = (tasksResult.data ?? []) as Task[];
    return tasks.map((task) =>
      transformTaskWithRelations(
        task,
        relatedData.subjects,
        relatedData.themes,
        relatedData.categories,
        relatedData.taskLabels,
        relatedData.labels
      )
    );
  }, [tasksResult.data, relatedData]);

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.allUnlimited(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: tasksWithRelations,
      isLoading: tasksResult.isLoading || relatedData.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// Subtasks for a parent task
export function useSubtasks(parentTaskId: string | null) {
  const isPowerSyncReady = usePowerSyncReady();

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    parentTaskId
      ? `SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY order_index ASC`
      : `SELECT * FROM tasks WHERE 1 = 0`, // Empty result
    parentTaskId ? [parentTaskId] : [],
    { runQueryOnce: false }
  );

  const supabaseResult = useQuery({
    queryKey: queryKeys.tasks.subtasks(parentTaskId || ''),
    queryFn: async () => {
      if (!parentTaskId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentTaskId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!parentTaskId && !isPowerSyncReady,
    staleTime: STALE_TIMES.tasks,
  });

  if (isPowerSyncReady) {
    return {
      data: (tasksResult.data ?? []) as Task[],
      isLoading: tasksResult.isLoading,
      isFetching: tasksResult.isFetching,
      error: tasksResult.error ?? null,
      refetch: tasksResult.refresh,
    };
  }

  return supabaseResult;
}

// ============================================
// HELPER: Transform Supabase response
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTask(task: any): TaskWithRelations {
  const themeFromSubject = task.subject?.theme || null;
  const directTheme = task.direct_theme || null;
  const theme = themeFromSubject || directTheme;

  const categoryFromTheme = theme?.category || null;
  const directCategory = task.direct_category || null;
  const category = categoryFromTheme || directCategory;

  return {
    ...task,
    theme,
    category,
    direct_theme: directTheme,
    direct_category: directCategory,
    labels: task.task_labels?.map((tl: { label: unknown }) => tl.label).filter(Boolean) || [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTasks(tasks: any[]): TaskWithRelations[] {
  return tasks.map(transformTask);
}

// ============================================
// MUTATIONS with GRANULAR INVALIDATION
// ============================================

export function useCreateTask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error('Not authenticated');

      const id = generateUUID();
      const now = nowISO();
      const task: Task = {
        id,
        user_id: user.id,
        subject_id: input.subject_id || null,
        theme_id: input.theme_id || null,
        category_id: input.category_id || null,
        parent_task_id: null,
        title: input.title,
        description: input.description || null,
        status: 'todo',
        do_date: input.do_date || null,
        do_time: input.do_time || null,
        waiting_for_note: null,
        priority: input.priority || 0,
        order_index: 0,
        snooze_count: 0,
        completed_at: null,
        created_at: now,
        updated_at: now,
      };

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `INSERT INTO tasks (id, user_id, subject_id, theme_id, category_id, parent_task_id, title, description, status, do_date, do_time, waiting_for_note, priority, order_index, snooze_count, completed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            task.user_id,
            task.subject_id,
            task.theme_id,
            task.category_id,
            task.parent_task_id,
            task.title,
            task.description,
            task.status,
            task.do_date,
            task.do_time,
            task.waiting_for_note,
            task.priority,
            task.order_index,
            task.snooze_count,
            task.completed_at,
            task.created_at,
            task.updated_at,
          ]
        );
        return task;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          subject_id: input.subject_id || null,
          theme_id: input.theme_id || null,
          category_id: input.category_id || null,
          title: input.title,
          description: input.description || null,
          do_date: input.do_date || null,
          do_time: input.do_time || null,
          priority: input.priority || 0,
          status: 'todo' as const,
          order_index: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.allUnlimited() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all100() });

      if (!data.subject_id && !data.theme_id && !data.category_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inboxCount() });
      } else if (data.subject_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.bySubject(data.subject_id) });
      }

      if (data.do_date) {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === 'tasks' && key[1] === 'list' &&
              typeof key[2] === 'object' && key[2] !== null && 'view' in key[2] && key[2].view === 'calendar';
          },
        });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const now = nowISO();
      const updates = { ...input, updated_at: now };

      // Write to PowerSync local DB
      if (db) {
        const fields = Object.keys(updates);
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await db.execute(`UPDATE tasks SET ${setClause} WHERE id = ?`, values);

        const result = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
        return result as Task;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update task: ${error.message} (${error.code})`);
      }
      return data as Task;
    },
    onSuccess: (data, variables) => {
      const changedFields = Object.keys(variables).filter((k) => k !== 'id');

      if (changedFields.includes('status')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingFor() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingForCount() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      }

      if (changedFields.includes('do_date')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === 'tasks' && key[1] === 'list' &&
              typeof key[2] === 'object' && key[2] !== null && 'view' in key[2] && key[2].view === 'calendar';
          },
        });
      }

      const assignmentChanged = changedFields.includes('subject_id') ||
                                changedFields.includes('theme_id') ||
                                changedFields.includes('category_id');
      if (assignmentChanged) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inboxCount() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingFor() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === 'tasks' && key[1] === 'list' &&
              typeof key[2] === 'object' && key[2] !== null && 'view' in key[2] && key[2].view === 'daily-brief';
          },
        });
        if (data.subject_id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.bySubject(data.subject_id) });
        }
      }

      if (changedFields.includes('priority')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.allUnlimited() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all100() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      const now = nowISO();

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `UPDATE tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, id]
        );

        const result = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
        return result as Task;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'done' as TaskStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inboxCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.allUnlimited() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all100() });
    },
  });
}

export function useSnoozeTask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({
      id,
      days,
      date,
    }: {
      id: string;
      days?: number;
      date?: Date;
    }) => {
      const newDate = date || addDays(new Date(), days || 1);
      const now = nowISO();

      // Write to PowerSync local DB
      if (db) {
        const current = await db.get<{ snooze_count: number }>(
          'SELECT snooze_count FROM tasks WHERE id = ?',
          [id]
        );

        await db.execute(
          `UPDATE tasks SET do_date = ?, snooze_count = ?, updated_at = ? WHERE id = ?`,
          [formatDateSQL(newDate), (current?.snooze_count || 0) + 1, now, id]
        );

        const result = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
        return result as Task;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('snooze_count')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .update({
          do_date: format(newDate, 'yyyy-MM-dd'),
          snooze_count: (currentTask?.snooze_count || 0) + 1,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === 'tasks' && key[1] === 'list' &&
            typeof key[2] === 'object' && key[2] !== null && 'view' in key[2] &&
            (key[2].view === 'daily-brief' || key[2].view === 'calendar');
        },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.allUnlimited() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
    },
  });
}

export function useSetWaitingFor() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const now = nowISO();

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `UPDATE tasks SET status = 'waiting_for', waiting_for_note = ?, updated_at = ? WHERE id = ?`,
          [note, now, id]
        );

        const result = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
        return result as Task;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'waiting_for' as TaskStatus,
          waiting_for_note: note,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingFor() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingForCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      // Write to PowerSync local DB
      if (db) {
        // Delete task_labels first
        await db.execute('DELETE FROM task_labels WHERE task_id = ?', [id]);
        // Delete subtasks
        await db.execute('DELETE FROM tasks WHERE parent_task_id = ?', [id]);
        // Delete task
        await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
        return;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

// Create subtask
export function useCreateSubtask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      parentTaskId,
      title,
    }: {
      parentTaskId: string;
      title: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const id = generateUUID();
      const now = nowISO();

      // Write to PowerSync local DB
      if (db) {
        // Get parent task to inherit subject_id
        const parentTask = await db.get<{ subject_id: string | null }>(
          'SELECT subject_id FROM tasks WHERE id = ?',
          [parentTaskId]
        );

        const task: Task = {
          id,
          user_id: user.id,
          parent_task_id: parentTaskId,
          subject_id: parentTask?.subject_id || null,
          theme_id: null,
          category_id: null,
          title,
          description: null,
          status: 'todo',
          do_date: null,
          do_time: null,
          waiting_for_note: null,
          priority: 0,
          order_index: 0,
          snooze_count: 0,
          completed_at: null,
          created_at: now,
          updated_at: now,
        };

        await db.execute(
          `INSERT INTO tasks (id, user_id, subject_id, theme_id, category_id, parent_task_id, title, description, status, do_date, do_time, waiting_for_note, priority, order_index, snooze_count, completed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            task.user_id,
            task.subject_id,
            task.theme_id,
            task.category_id,
            task.parent_task_id,
            task.title,
            task.description,
            task.status,
            task.do_date,
            task.do_time,
            task.waiting_for_note,
            task.priority,
            task.order_index,
            task.snooze_count,
            task.completed_at,
            task.created_at,
            task.updated_at,
          ]
        );
        return task;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data: parentTask } = await supabase
        .from('tasks')
        .select('subject_id')
        .eq('id', parentTaskId)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          parent_task_id: parentTaskId,
          subject_id: parentTask?.subject_id || null,
          title,
          status: 'todo' as const,
          priority: 0,
          order_index: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.subtasks(variables.parentTaskId),
      });
    },
  });
}
