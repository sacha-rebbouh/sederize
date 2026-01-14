'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Subject,
  SubjectWithTheme,
  CreateSubjectInput,
  UpdateSubjectInput,
} from '@/types/database';

export function useSubjects(themeId?: string) {
  return useQuery({
    queryKey: ['subjects', themeId],
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
  });
}

export function useActiveSubjects() {
  return useQuery({
    queryKey: ['subjects', 'active'],
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
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: ['subjects', id],
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
  });
}

export function useZombieSubjects() {
  return useQuery({
    queryKey: ['subjects', 'zombies'],
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
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subjects', data.id] });
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
