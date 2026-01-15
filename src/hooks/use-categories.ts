'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  Category,
  Theme,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/database';

export interface CategoryWithThemes extends Category {
  themes: Theme[];
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    staleTime: STALE_TIMES.categories,
  });
}

export function useCategoriesWithThemes() {
  return useQuery({
    queryKey: queryKeys.categories.withThemes(),
    queryFn: async () => {
      const supabase = createClient();

      // PARALLEL fetching with Promise.all - eliminates waterfall
      const [categoriesResult, themesResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true }),
        supabase
          .from('themes')
          .select('*')
          .order('order_index', { ascending: true }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (themesResult.error) throw themesResult.error;

      const categories = categoriesResult.data as Category[];
      const themes = themesResult.data as Theme[];

      // Build theme lookup map for O(1) access
      const themesByCategory = new Map<string | null, Theme[]>();
      for (const theme of themes) {
        const categoryId = theme.category_id;
        const existing = themesByCategory.get(categoryId) || [];
        existing.push(theme);
        themesByCategory.set(categoryId, existing);
      }

      // Group themes by category using map
      const categoriesWithThemes: CategoryWithThemes[] = categories.map(
        (category) => ({
          ...category,
          themes: themesByCategory.get(category.id) || [],
        })
      );

      // Add uncategorized themes as a virtual category
      const uncategorizedThemes = themesByCategory.get(null) || [];
      if (uncategorizedThemes.length > 0) {
        categoriesWithThemes.push({
          id: 'uncategorized',
          user_id: '',
          title: 'Sans catégorie',
          color_hex: '#64748b',
          icon: 'folder',
          order_index: 999,
          created_at: '',
          updated_at: '',
          themes: uncategorizedThemes,
        });
      }

      return categoriesWithThemes;
    },
    staleTime: STALE_TIMES.categories,
    placeholderData: keepPreviousData,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Category;
    },
    enabled: !!id && id !== 'uncategorized',
    staleTime: STALE_TIMES.categories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          title: input.title,
          color_hex: input.color_hex || '#6366f1',
          icon: input.icon || 'folder',
          order_index: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      // Invalidate category lists (includes withThemes)
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCategoryInput & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      // Invalidate both lists and the specific detail
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.all });

      // Snapshot current state
      const previousCategories = queryClient.getQueryData<Category[]>(queryKeys.categories.lists());
      const previousWithThemes = queryClient.getQueryData<CategoryWithThemes[]>(queryKeys.categories.withThemes());

      // Optimistically remove from cache
      if (previousCategories) {
        queryClient.setQueryData<Category[]>(
          queryKeys.categories.lists(),
          previousCategories.filter((c) => c.id !== id)
        );
      }
      if (previousWithThemes) {
        queryClient.setQueryData<CategoryWithThemes[]>(
          queryKeys.categories.withThemes(),
          previousWithThemes.filter((c) => c.id !== id)
        );
      }

      return { previousCategories, previousWithThemes };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(queryKeys.categories.lists(), context.previousCategories);
      }
      if (context?.previousWithThemes) {
        queryClient.setQueryData(queryKeys.categories.withThemes(), context.previousWithThemes);
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all });
    },
  });
}
