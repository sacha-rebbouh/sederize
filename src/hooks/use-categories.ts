'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
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
    queryKey: ['categories'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCategoriesWithThemes() {
  return useQuery({
    queryKey: ['categories', 'with-themes'],
    queryFn: async () => {
      const supabase = createClient();

      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (catError) throw catError;

      // Fetch themes
      const { data: themes, error: themeError } = await supabase
        .from('themes')
        .select('*')
        .order('order_index', { ascending: true });

      if (themeError) throw themeError;

      // Group themes by category
      const categoriesWithThemes: CategoryWithThemes[] = (
        categories as Category[]
      ).map((category) => ({
        ...category,
        themes: (themes as Theme[]).filter((t) => t.category_id === category.id),
      }));

      // Add uncategorized themes as a virtual category
      const uncategorizedThemes = (themes as Theme[]).filter(
        (t) => !t.category_id
      );
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
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['categories', id],
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
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', data.id] });
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
}
