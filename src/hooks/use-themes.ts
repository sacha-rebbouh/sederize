'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Theme, CreateThemeInput, UpdateThemeInput } from '@/types/database';

export function useThemes() {
  return useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Theme[];
    },
  });
}

export function useTheme(id: string) {
  return useQuery({
    queryKey: ['themes', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Theme;
    },
    enabled: !!id,
  });
}

export function useCreateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateThemeInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('themes')
        .insert({
          user_id: user.id,
          category_id: input.category_id || null,
          title: input.title,
          color_hex: input.color_hex || '#6366f1',
          icon: input.icon || 'folder',
          order_index: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Theme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateThemeInput & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('themes')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Theme;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes', data.id] });
    },
  });
}

export function useDeleteTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('themes').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
}
