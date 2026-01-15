'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  Subject,
  SubjectWithTheme,
  CreateSubjectInput,
  UpdateSubjectInput,
} from '@/types/database';

interface UseSubjectsOptions {
  enabled?: boolean;
}

export function useSubjects(themeId?: string) {
  return useQuery({
    queryKey: queryKeys.subjects.byTheme(themeId),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('subjects')
        .select('*, theme:themes(*)')
        .order('order_index', { ascending: true });

      if (themeId) {
        query = query.eq('theme_id', themeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SubjectWithTheme[];
    },
    staleTime: STALE_TIMES.subjects,
  });
}

export function useActiveSubjects(options?: UseSubjectsOptions) {
  return useQuery({
    queryKey: queryKeys.subjects.active(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subjects')
        .select('*, theme:themes(*)')
        .eq('status', 'active')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as SubjectWithTheme[];
    },
    staleTime: STALE_TIMES.subjects,
    enabled: options?.enabled ?? true,
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(id),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subjects')
        .select('*, theme:themes(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SubjectWithTheme;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.subjects,
  });
}

export function useZombieSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects.zombies(),
    queryFn: async () => {
      const supabase = createClient();
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const { data, error } = await supabase
        .from('subjects')
        .select('*, theme:themes(*)')
        .eq('status', 'active')
        .lt('last_activity_at', tenDaysAgo.toISOString());

      if (error) throw error;
      return data as SubjectWithTheme[];
    },
    staleTime: STALE_TIMES.subjects,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubjectInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          theme_id: input.theme_id,
          title: input.title,
          description: input.description || null,
          icon: input.icon || 'file-text',
          status: 'active' as const,
          order_index: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSubjectInput & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subjects')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('subjects').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.subjects.all });

      // Snapshot current state
      const previousSubjects = queryClient.getQueryData<SubjectWithTheme[]>(queryKeys.subjects.active());

      // Optimistically remove from cache
      if (previousSubjects) {
        queryClient.setQueryData<SubjectWithTheme[]>(
          queryKeys.subjects.active(),
          previousSubjects.filter((s) => s.id !== id)
        );
      }

      return { previousSubjects };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousSubjects) {
        queryClient.setQueryData(queryKeys.subjects.active(), context.previousSubjects);
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}
