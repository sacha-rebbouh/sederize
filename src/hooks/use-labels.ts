'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery as usePowerSyncWatchedQuery } from '@powersync/react';
import { createClient } from '@/lib/supabase/client';
import { usePowerSyncDb, usePowerSyncReady } from '@/providers/powersync-provider';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import { Label, CreateLabelInput, UpdateLabelInput } from '@/types/database';
import { generateUUID, nowISO } from '@/lib/powersync/hooks';
import { useMemo } from 'react';

interface TaskLabel {
  task_id: string;
  label_id: string;
  created_at: string;
}

// ============================================
// READ HOOKS (PowerSync local SQLite)
// ============================================

// Fetch all labels for the current user
export function useLabels() {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched query - runQueryOnce: true to prevent re-renders on sync events
  const powerSyncResult = usePowerSyncWatchedQuery<Label>(
    'SELECT * FROM labels ORDER BY name ASC',
    [],
    { runQueryOnce: true }
  );

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.labels.lists(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Label[];
    },
    staleTime: STALE_TIMES.labels,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: (powerSyncResult.data ?? []) as Label[],
      isLoading: powerSyncResult.isLoading,
      isFetching: powerSyncResult.isFetching,
      error: powerSyncResult.error ?? null,
      refetch: powerSyncResult.refresh,
    };
  }

  return supabaseResult;
}

// Get labels for a specific task
export function useTaskLabels(taskId: string) {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched queries - join task_labels with labels
  const taskLabelsResult = usePowerSyncWatchedQuery<TaskLabel>(
    'SELECT * FROM task_labels WHERE task_id = ?',
    [taskId]
  );

  // labels list is static reference data
  const labelsResult = usePowerSyncWatchedQuery<Label>(
    'SELECT * FROM labels',
    [],
    { runQueryOnce: true }
  );

  // Join in memory
  const labels = useMemo(() => {
    const taskLabels = (taskLabelsResult.data ?? []) as TaskLabel[];
    const allLabels = (labelsResult.data ?? []) as Label[];

    const labelsMap = new Map(allLabels.map((l) => [l.id, l]));

    return taskLabels
      .map((tl) => labelsMap.get(tl.label_id))
      .filter(Boolean) as Label[];
  }, [taskLabelsResult.data, labelsResult.data]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.labels.byTask(taskId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('task_labels')
        .select('label:labels(*)')
        .eq('task_id', taskId);

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data?.map((d: any) => d.label).filter(Boolean) || []) as Label[];
    },
    enabled: !!taskId && !isPowerSyncReady,
    staleTime: STALE_TIMES.labels,
  });

  if (isPowerSyncReady) {
    return {
      data: labels,
      isLoading: taskLabelsResult.isLoading || labelsResult.isLoading,
      isFetching: taskLabelsResult.isFetching || labelsResult.isFetching,
      error: taskLabelsResult.error ?? labelsResult.error ?? null,
      refetch: () => {
        taskLabelsResult.refresh?.();
        labelsResult.refresh?.();
      },
    };
  }

  return supabaseResult;
}

// ============================================
// WRITE HOOKS (PowerSync local SQLite -> Supabase sync)
// ============================================

// Create a new label
export function useCreateLabel() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateLabelInput) => {
      if (!user) throw new Error('Not authenticated');

      const id = generateUUID();
      const now = nowISO();
      const label: Label = {
        id,
        user_id: user.id,
        name: input.name,
        color_hex: input.color_hex || '#6366f1',
        created_at: now,
        updated_at: now,
      };

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `INSERT INTO labels (id, user_id, name, color_hex, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            label.id,
            label.user_id,
            label.name,
            label.color_hex,
            label.created_at,
            label.updated_at,
          ]
        );
        return label;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data, error } = await supabase
        .from('labels')
        .insert({
          user_id: user.id,
          name: input.name,
          color_hex: input.color_hex || '#6366f1',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.all });
    },
  });
}

// Update a label
export function useUpdateLabel() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateLabelInput) => {
      const now = nowISO();
      const data = { ...updates, updated_at: now };

      // Write to PowerSync local DB
      if (db) {
        const fields = Object.keys(data);
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = [...Object.values(data), id];

        await db.execute(
          `UPDATE labels SET ${setClause} WHERE id = ?`,
          values
        );

        const result = await db.get<Label>('SELECT * FROM labels WHERE id = ?', [id]);
        return result as Label;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { data: result, error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as Label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.all });
      // Label updates affect task displays
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

// Delete a label
export function useDeleteLabel() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      // Write to PowerSync local DB
      if (db) {
        // Delete task_labels first (cascade)
        await db.execute('DELETE FROM task_labels WHERE label_id = ?', [id]);
        await db.execute('DELETE FROM labels WHERE id = ?', [id]);
        return;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { error } = await supabase.from('labels').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.all });
      // Label deletion affects task displays
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

// Add label to task
export function useAddLabelToTask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ taskId, labelId }: { taskId: string; labelId: string }) => {
      const now = nowISO();

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `INSERT INTO task_labels (task_id, label_id, created_at) VALUES (?, ?, ?)`,
          [taskId, labelId, now]
        );
        return;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { error } = await supabase
        .from('task_labels')
        .insert({
          task_id: taskId,
          label_id: labelId,
        });

      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.byTask(taskId) });
      // Only invalidate lists that show this task (granular invalidation)
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

// Remove label from task
export function useRemoveLabelFromTask() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ taskId, labelId }: { taskId: string; labelId: string }) => {
      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          'DELETE FROM task_labels WHERE task_id = ? AND label_id = ?',
          [taskId, labelId]
        );
        return;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { error } = await supabase
        .from('task_labels')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);

      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

// Set all labels for a task (replace existing)
export function useSetTaskLabels() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ taskId, labelIds }: { taskId: string; labelIds: string[] }) => {
      const now = nowISO();

      // Write to PowerSync local DB
      if (db) {
        await db.writeTransaction(async (tx) => {
          // First remove all existing labels
          await tx.execute('DELETE FROM task_labels WHERE task_id = ?', [taskId]);

          // Then add new labels
          for (const labelId of labelIds) {
            await tx.execute(
              'INSERT INTO task_labels (task_id, label_id, created_at) VALUES (?, ?, ?)',
              [taskId, labelId, now]
            );
          }
        });
        return;
      }

      // Fallback to Supabase
      const supabase = createClient();

      // First remove all existing labels
      const { error: deleteError } = await supabase
        .from('task_labels')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) throw deleteError;

      // Then add new labels if any
      if (labelIds.length > 0) {
        const { error: insertError } = await supabase
          .from('task_labels')
          .insert(
            labelIds.map((labelId) => ({
              task_id: taskId,
              label_id: labelId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}
