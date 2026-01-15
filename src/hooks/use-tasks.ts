'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  Task,
  TaskWithRelations,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
} from '@/types/database';
import { format, addDays } from 'date-fns';

// Helper to transform raw task data to TaskWithRelations
// Handles waterfall: subject > direct_theme > direct_category
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTask(task: any): TaskWithRelations {
  // Priority: subject's theme > direct theme
  const themeFromSubject = task.subject?.theme || null;
  const directTheme = task.direct_theme || null;
  const theme = themeFromSubject || directTheme;

  // Priority: theme's category > direct category
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

interface UseTasksOptions {
  enabled?: boolean;
}

// Daily Brief: Tasks due on a specific date or overdue (status = todo)
export function useDailyBriefTasks(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.tasks.dailyBrief(dateStr),
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `
        )
        .eq('status', 'todo')
        .lte('do_date', dateStr)
        .order('do_date', { ascending: true })
        .order('priority', { ascending: false })
        .order('order_index', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    placeholderData: keepPreviousData, // Keep showing old data while fetching new
  });
}

// Inbox tasks (no assignment at all - no subject, no theme, no category)
export function useInboxTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.inbox(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          task_labels(label:labels(*))
        `
        )
        .is('subject_id', null)
        .is('theme_id', null)
        .is('category_id', null)
        .neq('status', 'done')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
  });
}

// Inbox count (lightweight for badges)
export function useInboxCount() {
  return useQuery({
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
  });
}

// Tasks for a specific subject
export function useSubjectTasks(subjectId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.bySubject(subjectId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          task_labels(label:labels(*))
        `
        )
        .eq('subject_id', subjectId)
        .order('status', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    enabled: !!subjectId,
    staleTime: STALE_TIMES.tasks,
  });
}

// Waiting for tasks
export function useWaitingForTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.waitingFor(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `
        )
        .eq('status', 'waiting_for')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
  });
}

// Count of waiting_for tasks (for sidebar badge)
export function useWaitingForCount() {
  return useQuery({
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
  });
}

// Tasks for calendar view (by date range)
export function useTasksByDateRange(startDate: Date, endDate: Date) {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.tasks.calendar(startStr, endStr),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `
        )
        .gte('do_date', startStr)
        .lte('do_date', endStr)
        .order('do_date', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
  });
}

// All tasks (for search, limited to 100)
export function useAllTasks(options?: UseTasksOptions) {
  return useQuery({
    queryKey: queryKeys.tasks.all100(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `
        )
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
    enabled: options?.enabled ?? true,
  });
}

// All tasks for Kanban (no limit, all statuses)
export function useKanbanTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.kanban(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `
        )
        .order('order_index', { ascending: true });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
  });
}

// All tasks without limit (for All Tasks page)
export function useAllTasksUnlimited() {
  return useQuery({
    queryKey: queryKeys.tasks.allUnlimited(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*, category:categories(*))),
          direct_theme:themes!tasks_theme_id_fkey(*, category:categories(*)),
          direct_category:categories!tasks_category_id_fkey(*),
          task_labels(label:labels(*))
        `
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return transformTasks(data);
    },
    staleTime: STALE_TIMES.tasks,
  });
}

// Subtasks for a parent task
export function useSubtasks(parentTaskId: string | null) {
  return useQuery({
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
    enabled: !!parentTaskId,
    staleTime: STALE_TIMES.tasks,
  });
}

// =============================================================================
// MUTATIONS with GRANULAR INVALIDATION
// =============================================================================

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          subject_id: input.subject_id || null,
          theme_id: input.theme_id || null,       // Waterfall: direct theme assignment
          category_id: input.category_id || null, // Waterfall: direct category assignment
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
      // New task can appear in multiple views - invalidate relevant lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.allUnlimited() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all100() });

      // If truly unassigned (no subject, theme, or category), invalidate inbox
      if (!data.subject_id && !data.theme_id && !data.category_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inboxCount() });
      } else if (data.subject_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.bySubject(data.subject_id) });
      }

      // If has date, invalidate calendar
      if (data.do_date) {
        // Invalidate all calendar queries since we don't know which date range is displayed
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

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
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

      // Status change affects multiple views
      if (changedFields.includes('status')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingFor() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingForCount() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      }

      // Date change affects calendar, daily brief, and kanban
      if (changedFields.includes('do_date')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
        // Invalidate all calendar queries
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === 'tasks' && key[1] === 'list' &&
              typeof key[2] === 'object' && key[2] !== null && 'view' in key[2] && key[2].view === 'calendar';
          },
        });
      }

      // Assignment change (subject/theme/category) affects inbox, subject views, daily brief, waiting, and kanban
      const assignmentChanged = changedFields.includes('subject_id') ||
                                changedFields.includes('theme_id') ||
                                changedFields.includes('category_id');
      if (assignmentChanged) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inboxCount() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingFor() });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
        // Invalidate all daily brief queries (any date) since task grouping changes
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

      // Priority change affects sorted views
      if (changedFields.includes('priority')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      }

      // Always invalidate unlimited list for All Tasks page
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.allUnlimited() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all100() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
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
      // Completing a task affects daily brief, kanban, and counts
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
      const supabase = createClient();
      const newDate = date || addDays(new Date(), days || 1);

      // Get current task to increment snooze_count
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
      // Snoozing changes date - affects all daily briefs (any date being viewed) and calendar
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === 'tasks' && key[1] === 'list' &&
            typeof key[2] === 'object' && key[2] !== null && 'view' in key[2] &&
            (key[2].view === 'daily-brief' || key[2].view === 'calendar');
        },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.allUnlimited() });
      // Also invalidate inbox since snoozed task needs UI update
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
    },
  });
}

export function useSetWaitingFor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
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
      // Setting waiting_for affects daily brief, waiting for lists, kanban, and inbox
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dailyBrief(format(new Date(), 'yyyy-MM-dd')) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingFor() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.waitingForCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.kanban() });
      // Also invalidate inbox since waiting_for task needs UI update
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.inbox() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Deleting a task can affect any view - invalidate all task lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

// Create subtask
export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentTaskId,
      title,
    }: {
      parentTaskId: string;
      title: string;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get parent task to inherit subject_id
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
      // Subtask created - invalidate subtasks list and parent task views
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.subtasks(variables.parentTaskId),
      });
    },
  });
}
