'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import { Theme, CreateThemeInput, UpdateThemeInput } from '@/types/database';

interface UseThemesOptions {
  enabled?: boolean;
}

export function useThemes(options?: UseThemesOptions) {
  return useQuery({
    queryKey: queryKeys.themes.lists(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Theme[];
    },
    staleTime: STALE_TIMES.themes,
    enabled: options?.enabled ?? true,
  });
}

export function useTheme(id: string) {
  return useQuery({
    queryKey: queryKeys.themes.detail(id),
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
    staleTime: STALE_TIMES.themes,
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
      // Invalidate themes list and categories with themes (sidebar needs update)
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.withThemes() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.withThemes() });
    },
  });
}

interface CategoryWithThemes {
  id: string;
  themes: Theme[];
  [key: string]: unknown;
}

export function useDeleteTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('themes').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.themes.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.withThemes() });

      // Snapshot current state
      const previousThemes = queryClient.getQueryData<Theme[]>(queryKeys.themes.lists());
      const previousWithThemes = queryClient.getQueryData<CategoryWithThemes[]>(queryKeys.categories.withThemes());

      // Optimistically remove from cache
      if (previousThemes) {
        queryClient.setQueryData<Theme[]>(
          queryKeys.themes.lists(),
          previousThemes.filter((t) => t.id !== id)
        );
      }
      if (previousWithThemes) {
        queryClient.setQueryData<CategoryWithThemes[]>(
          queryKeys.categories.withThemes(),
          previousWithThemes.map((cat) => ({
            ...cat,
            themes: cat.themes.filter((t) => t.id !== id),
          }))
        );
      }

      return { previousThemes, previousWithThemes };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousThemes) {
        queryClient.setQueryData(queryKeys.themes.lists(), context.previousThemes);
      }
      if (context?.previousWithThemes) {
        queryClient.setQueryData(queryKeys.categories.withThemes(), context.previousWithThemes);
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.withThemes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
    },
  });
}
