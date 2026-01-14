'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Label, CreateLabelInput, UpdateLabelInput } from '@/types/database';

// Fetch all labels for the current user
export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Label[];
    },
  });
}

// Get labels for a specific task
export function useTaskLabels(taskId: string) {
  return useQuery({
    queryKey: ['task-labels', taskId],
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
    enabled: !!taskId,
  });
}

// Create a new label
export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLabelInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

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
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });
}

// Update a label
export function useUpdateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateLabelInput) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });
}

// Delete a label
export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('labels').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
    },
  });
}

// Add label to task
export function useAddLabelToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, labelId }: { taskId: string; labelId: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['task-labels', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Remove label from task
export function useRemoveLabelFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, labelId }: { taskId: string; labelId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('task_labels')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);

      if (error) throw error;
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task-labels', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Set all labels for a task (replace existing)
export function useSetTaskLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, labelIds }: { taskId: string; labelIds: string[] }) => {
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
      queryClient.invalidateQueries({ queryKey: ['task-labels', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
