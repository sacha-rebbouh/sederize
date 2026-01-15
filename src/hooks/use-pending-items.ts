'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  PendingItem,
  PendingItemWithRelations,
  PendingStatus,
} from '@/types/database';
import { addDays, format } from 'date-fns';

// Fetch all pending items for the current user
export function usePendingItems(status?: PendingStatus) {
  return useQuery({
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
  });
}

// Fetch pending items count (for badge)
export function usePendingItemsCount() {
  return useQuery({
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
  });
}

// Fetch oldest pending items for Daily Brief
export function useOldestPendingItems(limit: number = 5) {
  return useQuery({
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
  });
}

// Create a new pending item
export function useCreatePendingItem() {
  const queryClient = useQueryClient();

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

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
      const supabase = createClient();

      const updateData: Record<string, unknown> = { ...updates };

      // If marking as resolved, set resolved_at
      if (updates.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('pending_items')
        .update(updateData)
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

// Remind/bump a pending item (increment count + snooze 3 days)
export function useRemindPendingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();

      // First get current item
      const { data: current, error: fetchError } = await supabase
        .from('pending_items')
        .select('reminded_count')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update with new reminder date and increment count
      const newReminderDate = format(addDays(new Date(), 3), 'yyyy-MM-dd');
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

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('pending_items')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
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

  return useMutation({
    mutationFn: async (id: string) => {
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
