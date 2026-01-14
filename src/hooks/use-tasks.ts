'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Task,
  TaskWithRelations,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
} from '@/types/database';
import { format, addDays } from 'date-fns';

// Daily Brief: Tasks due on a specific date or overdue (status = todo)
export function useDailyBriefTasks(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['tasks', 'daily-brief', dateStr],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*)),
          task_labels(label:labels(*))
        `
        )
        .eq('status', 'todo')
        .lte('do_date', dateStr)
        .order('do_date', { ascending: true })
        .order('priority', { ascending: false })
        .order('order_index', { ascending: true });

      if (error) throw error;

      // Transform to include theme info and labels at top level
      return data.map((task) => ({
        ...task,
        theme: task.subject?.theme || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
  });
}

// Inbox tasks (no subject assigned)
export function useInboxTasks() {
  return useQuery({
    queryKey: ['tasks', 'inbox'],
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
        .neq('status', 'done')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((task) => ({
        ...task,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
  });
}

// Inbox count (lightweight for badges)
export function useInboxCount() {
  return useQuery({
    queryKey: ['tasks', 'inbox', 'count'],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .is('subject_id', null)
        .neq('status', 'done');

      if (error) throw error;
      return count ?? 0;
    },
  });
}

// Tasks for a specific subject
export function useSubjectTasks(subjectId: string) {
  return useQuery({
    queryKey: ['tasks', 'subject', subjectId],
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
      return data.map((task) => ({
        ...task,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
    enabled: !!subjectId,
  });
}

// Waiting for tasks
export function useWaitingForTasks() {
  return useQuery({
    queryKey: ['tasks', 'waiting-for'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*)),
          task_labels(label:labels(*))
        `
        )
        .eq('status', 'waiting_for')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data.map((task) => ({
        ...task,
        theme: task.subject?.theme || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
  });
}

// Count of waiting_for tasks (for sidebar badge)
export function useWaitingForCount() {
  return useQuery({
    queryKey: ['tasks', 'waiting-for-count'],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_for');

      if (error) throw error;
      return count || 0;
    },
  });
}

// Tasks for calendar view (by date range)
export function useTasksByDateRange(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: [
      'tasks',
      'calendar',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*)),
          task_labels(label:labels(*))
        `
        )
        .gte('do_date', format(startDate, 'yyyy-MM-dd'))
        .lte('do_date', format(endDate, 'yyyy-MM-dd'))
        .order('do_date', { ascending: true });

      if (error) throw error;
      return data.map((task) => ({
        ...task,
        theme: task.subject?.theme || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
  });
}

// All tasks (for search)
export function useAllTasks() {
  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*)),
          task_labels(label:labels(*))
        `
        )
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data.map((task) => ({
        ...task,
        theme: task.subject?.theme || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
  });
}

// All tasks for Kanban (no limit, all statuses)
export function useKanbanTasks() {
  return useQuery({
    queryKey: ['tasks', 'kanban'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*)),
          task_labels(label:labels(*))
        `
        )
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data.map((task) => ({
        ...task,
        theme: task.subject?.theme || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
  });
}

// All tasks without limit (for All Tasks page)
export function useAllTasksUnlimited() {
  return useQuery({
    queryKey: ['tasks', 'all-unlimited'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subject:subjects(*, theme:themes(*)),
          task_labels(label:labels(*))
        `
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data.map((task) => ({
        ...task,
        theme: task.subject?.theme || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: task.task_labels?.map((tl: any) => tl.label).filter(Boolean) || [],
      })) as TaskWithRelations[];
    },
  });
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const supabase = createClient();

      // Log what we're sending for debugging
      console.log('Updating task:', id, 'with:', input);

      const { data, error } = await supabase
        .from('tasks')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update task error:', error);
        throw new Error(`Failed to update task: ${error.message} (${error.code})`);
      }
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

      const { data, error } = await supabase
        .from('tasks')
        .update({ do_date: format(newDate, 'yyyy-MM-dd') })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Subtasks for a parent task
export function useSubtasks(parentTaskId: string | null) {
  return useQuery({
    queryKey: ['tasks', 'subtasks', parentTaskId],
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
      const { data: { user } } = await supabase.auth.getUser();
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'subtasks', variables.parentTaskId],
      });
    },
  });
}
