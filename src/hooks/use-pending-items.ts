'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery as usePowerSyncWatchedQuery } from '@powersync/react';
import { createClient } from '@/lib/supabase/client';
import { usePowerSyncDb, usePowerSyncReady } from '@/providers/powersync-provider';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  PendingItem,
  PendingItemWithRelations,
  PendingStatus,
  Category,
  Theme,
  Subject,
  Task,
} from '@/types/database';
import { generateUUID, nowISO, formatDateSQL } from '@/lib/powersync/hooks';
import { addDays } from 'date-fns';
import { useMemo } from 'react';

// ============================================
// READ HOOKS (PowerSync local SQLite)
// ============================================

// Fetch all pending items for the current user
export function usePendingItems(status?: PendingStatus) {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched queries
  const pendingQuery = status
    ? `SELECT * FROM pending_items WHERE status = ? ORDER BY created_at DESC`
    : `SELECT * FROM pending_items ORDER BY created_at DESC`;
  const pendingParams = status ? [status] : [];

  const pendingResult = usePowerSyncWatchedQuery<PendingItem>(
    pendingQuery,
    pendingParams
  );

  // Fetch related data for joining
  const categoriesResult = usePowerSyncWatchedQuery<Category>(
    'SELECT * FROM categories',
    [],
    { runQueryOnce: true }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: true }
  );

  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    'SELECT * FROM subjects',
    [],
    { runQueryOnce: true }
  );

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    'SELECT * FROM tasks',
    [],
    { runQueryOnce: true }
  );

  // Join in memory
  const pendingItemsWithRelations = useMemo(() => {
    const items = (pendingResult.data ?? []) as PendingItem[];
    const categories = (categoriesResult.data ?? []) as Category[];
    const themes = (themesResult.data ?? []) as Theme[];
    const subjects = (subjectsResult.data ?? []) as Subject[];
    const tasks = (tasksResult.data ?? []) as Task[];

    const categoriesMap = new Map(categories.map((c) => [c.id, c]));
    const themesMap = new Map(themes.map((t) => [t.id, t]));
    const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
    const tasksMap = new Map(tasks.map((t) => [t.id, t]));

    return items.map((item) => ({
      ...item,
      category: item.category_id ? categoriesMap.get(item.category_id) || null : null,
      theme: item.theme_id ? themesMap.get(item.theme_id) || null : null,
      subject: item.subject_id ? subjectsMap.get(item.subject_id) || null : null,
      task: item.task_id ? tasksMap.get(item.task_id) || null : null,
    })) as PendingItemWithRelations[];
  }, [
    pendingResult.data,
    categoriesResult.data,
    themesResult.data,
    subjectsResult.data,
    tasksResult.data,
  ]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.pendingItems.byStatus(status),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('pending_items')
        .select(`
          *,
          category:categories(*),
          theme:themes(*),
          subject:subjects(*),
          task:tasks(*)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as PendingItemWithRelations[];
    },
    staleTime: STALE_TIMES.pendingItems,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    const isLoading =
      pendingResult.isLoading ||
      categoriesResult.isLoading ||
      themesResult.isLoading ||
      subjectsResult.isLoading ||
      tasksResult.isLoading;

    return {
      data: pendingItemsWithRelations,
      isLoading,
      isFetching: pendingResult.isFetching,
      error: pendingResult.error ?? null,
      refetch: pendingResult.refresh,
    };
  }

  return supabaseResult;
}

// Fetch pending items count (for badge)
export function usePendingItemsCount() {
  const isPowerSyncReady = usePowerSyncReady();

  const powerSyncResult = usePowerSyncWatchedQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_items WHERE status = 'pending'`,
    []
  );

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.pendingItems.count(),
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('pending_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    staleTime: STALE_TIMES.pendingItems,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    const count = powerSyncResult.data?.[0]?.count ?? 0;
    return {
      data: count,
      isLoading: powerSyncResult.isLoading,
      isFetching: powerSyncResult.isFetching,
      error: powerSyncResult.error ?? null,
      refetch: powerSyncResult.refresh,
    };
  }

  return supabaseResult;
}

// Fetch oldest pending items for Daily Brief
export function useOldestPendingItems(limit: number = 5) {
  const isPowerSyncReady = usePowerSyncReady();

  const pendingResult = usePowerSyncWatchedQuery<PendingItem>(
    `SELECT * FROM pending_items WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
    [limit]
  );

  // Fetch related data
  const categoriesResult = usePowerSyncWatchedQuery<Category>(
    'SELECT * FROM categories',
    [],
    { runQueryOnce: true }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: true }
  );

  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    'SELECT * FROM subjects',
    [],
    { runQueryOnce: true }
  );

  const tasksResult = usePowerSyncWatchedQuery<Task>(
    'SELECT * FROM tasks',
    [],
    { runQueryOnce: true }
  );

  // Join in memory
  const pendingItemsWithRelations = useMemo(() => {
    const items = (pendingResult.data ?? []) as PendingItem[];
    const categories = (categoriesResult.data ?? []) as Category[];
    const themes = (themesResult.data ?? []) as Theme[];
    const subjects = (subjectsResult.data ?? []) as Subject[];
    const tasks = (tasksResult.data ?? []) as Task[];

    const categoriesMap = new Map(categories.map((c) => [c.id, c]));
    const themesMap = new Map(themes.map((t) => [t.id, t]));
    const subjectsMap = new Map(subjects.map((s) => [s.id, s]));
    const tasksMap = new Map(tasks.map((t) => [t.id, t]));

    return items.map((item) => ({
      ...item,
      category: item.category_id ? categoriesMap.get(item.category_id) || null : null,
      theme: item.theme_id ? themesMap.get(item.theme_id) || null : null,
      subject: item.subject_id ? subjectsMap.get(item.subject_id) || null : null,
      task: item.task_id ? tasksMap.get(item.task_id) || null : null,
    })) as PendingItemWithRelations[];
  }, [
    pendingResult.data,
    categoriesResult.data,
    themesResult.data,
    subjectsResult.data,
    tasksResult.data,
  ]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.pendingItems.oldest(limit),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pending_items')
        .select(`
          *,
          category:categories(*),
          theme:themes(*),
          subject:subjects(*),
          task:tasks(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []) as PendingItemWithRelations[];
    },
    staleTime: STALE_TIMES.pendingItems,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: pendingItemsWithRelations,
      isLoading: pendingResult.isLoading,
      isFetching: pendingResult.isFetching,
      error: pendingResult.error ?? null,
      refetch: pendingResult.refresh,
    };
  }

  return supabaseResult;
}

// ============================================
// WRITE HOOKS (PowerSync local SQLite -> Supabase sync)
// ============================================

// Create a new pending item
export function useCreatePendingItem() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      category_id?: string | null;
      theme_id?: string | null;
      subject_id?: string | null;
      task_id?: string | null;
      reminder_date?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const id = generateUUID();
      const now = nowISO();
      const item: PendingItem = {
        id,
        user_id: user.id,
        title: input.title,
        description: input.description || null,
        category_id: input.category_id || null,
        theme_id: input.theme_id || null,
        subject_id: input.subject_id || null,
        task_id: input.task_id || null,
        status: 'pending',
        reminder_date: input.reminder_date || null,
        reminded_count: 0,
        resolved_at: null,
        created_at: now,
        updated_at: now,
      };

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `INSERT INTO pending_items (id, user_id, title, description, category_id, theme_id, subject_id, task_id, status, reminder_date, reminded_count, resolved_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.user_id,
            item.title,
            item.description,
            item.category_id,
            item.theme_id,
            item.subject_id,
            item.task_id,
            item.status,
            item.reminder_date,
            item.reminded_count,
            item.resolved_at,
            item.created_at,
            item.updated_at,
          ]
        );
        return item;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pending_items')
        .insert({
          user_id: user.id,
          title: input.title,
          description: input.description || null,
          category_id: input.category_id || null,
          theme_id: input.theme_id || null,
          subject_id: input.subject_id || null,
          task_id: input.task_id || null,
          reminder_date: input.reminder_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PendingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingItems.all });
    },
  });
}

// Update a pending item
export function useUpdatePendingItem() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      title?: string;
      description?: string | null;
      status?: PendingStatus;
      reminder_date?: string | null;
    }) => {
      const now = nowISO();
      const data: Record<string, unknown> = { ...updates, updated_at: now };

      // If marking as resolved, set resolved_at
      if (updates.status === 'resolved') {
        data.resolved_at = now;
      }

      // Write to PowerSync local DB
      if (db) {
        const fields = Object.keys(data);
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = [...Object.values(data), id];

        await db.execute(
          `UPDATE pending_items SET ${setClause} WHERE id = ?`,
          values
        );

        const result = await db.get<PendingItem>('SELECT * FROM pending_items WHERE id = ?', [id]);
        return result as PendingItem;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data: result, error } = await supabase
        .from('pending_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as PendingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingItems.all });
    },
  });
}

// Remind/bump a pending item (increment count + snooze 3 days)
export function useRemindPendingItem() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      const now = nowISO();
      const newReminderDate = formatDateSQL(addDays(new Date(), 3));

      // Write to PowerSync local DB
      if (db) {
        // Get current reminded_count
        const current = await db.get<{ reminded_count: number }>(
          'SELECT reminded_count FROM pending_items WHERE id = ?',
          [id]
        );

        await db.execute(
          `UPDATE pending_items SET status = 'reminded', reminder_date = ?, reminded_count = ?, updated_at = ? WHERE id = ?`,
          [newReminderDate, (current?.reminded_count || 0) + 1, now, id]
        );

        const result = await db.get<PendingItem>('SELECT * FROM pending_items WHERE id = ?', [id]);
        return result as PendingItem;
      }

      // Fallback to Supabase
      const supabase = createClient();

      // First get current item
      const { data: current, error: fetchError } = await supabase
        .from('pending_items')
        .select('reminded_count')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update with new reminder date and increment count
      const { data, error } = await supabase
        .from('pending_items')
        .update({
          status: 'reminded',
          reminder_date: newReminderDate,
          reminded_count: (current?.reminded_count || 0) + 1,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PendingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingItems.all });
    },
  });
}

// Resolve a pending item
export function useResolvePendingItem() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      const now = nowISO();

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `UPDATE pending_items SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, id]
        );

        const result = await db.get<PendingItem>('SELECT * FROM pending_items WHERE id = ?', [id]);
        return result as PendingItem;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pending_items')
        .update({
          status: 'resolved',
          resolved_at: now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PendingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingItems.all });
    },
  });
}

// Delete a pending item
export function useDeletePendingItem() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      // Write to PowerSync local DB
      if (db) {
        await db.execute('DELETE FROM pending_items WHERE id = ?', [id]);
        return;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { error } = await supabase
        .from('pending_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingItems.all });
    },
  });
}
