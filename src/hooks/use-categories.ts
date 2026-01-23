'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useQuery as usePowerSyncWatchedQuery } from '@powersync/react';
import { createClient } from '@/lib/supabase/client';
import { usePowerSyncDb, usePowerSyncReady } from '@/providers/powersync-provider';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  Category,
  Theme,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/database';
import { generateUUID, nowISO } from '@/lib/powersync/hooks';
import { useMemo } from 'react';

export interface CategoryWithThemes extends Category {
  themes: Theme[];
}

// ============================================
// READ HOOKS (PowerSync local SQLite)
// ============================================

export function useCategories() {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched query - runQueryOnce: true to prevent re-renders on sync events
  const powerSyncResult = usePowerSyncWatchedQuery<Category>(
    'SELECT * FROM categories ORDER BY order_index ASC',
    [],
    { runQueryOnce: true }
  );

  // Fallback to Supabase
  const supabaseResult = useQuery({
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
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: (powerSyncResult.data ?? []) as Category[],
      isLoading: powerSyncResult.isLoading,
      isFetching: powerSyncResult.isFetching,
      error: powerSyncResult.error ?? null,
      refetch: powerSyncResult.refresh,
    };
  }

  return supabaseResult;
}

export function useCategoriesWithThemes() {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched queries for categories and themes - runQueryOnce: true to prevent re-renders on sync events
  const categoriesResult = usePowerSyncWatchedQuery<Category>(
    'SELECT * FROM categories ORDER BY order_index ASC',
    [],
    { runQueryOnce: true }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes ORDER BY order_index ASC',
    [],
    { runQueryOnce: true }
  );

  // Combine categories with their themes
  const categoriesWithThemes = useMemo(() => {
    const categories = (categoriesResult.data ?? []) as Category[];
    const themes = (themesResult.data ?? []) as Theme[];

    // Build theme lookup map for O(1) access
    const themesByCategory = new Map<string | null, Theme[]>();
    for (const theme of themes) {
      const categoryId = theme.category_id;
      const existing = themesByCategory.get(categoryId) || [];
      existing.push(theme);
      themesByCategory.set(categoryId, existing);
    }

    // Group themes by category
    const result: CategoryWithThemes[] = categories.map((category) => ({
      ...category,
      themes: themesByCategory.get(category.id) || [],
    }));

    // Add uncategorized themes as a virtual category
    const uncategorizedThemes = themesByCategory.get(null) || [];
    if (uncategorizedThemes.length > 0) {
      result.push({
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

    return result;
  }, [categoriesResult.data, themesResult.data]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.categories.withThemes(),
    queryFn: async () => {
      const supabase = createClient();

      // PARALLEL fetching with Promise.all - eliminates waterfall
      const [categoriesRes, themesRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true }),
        supabase
          .from('themes')
          .select('*')
          .order('order_index', { ascending: true }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (themesRes.error) throw themesRes.error;

      const categories = categoriesRes.data as Category[];
      const themes = themesRes.data as Theme[];

      // Build theme lookup map
      const themesByCategory = new Map<string | null, Theme[]>();
      for (const theme of themes) {
        const categoryId = theme.category_id;
        const existing = themesByCategory.get(categoryId) || [];
        existing.push(theme);
        themesByCategory.set(categoryId, existing);
      }

      // Group themes by category
      const result: CategoryWithThemes[] = categories.map((category) => ({
        ...category,
        themes: themesByCategory.get(category.id) || [],
      }));

      // Add uncategorized themes
      const uncategorizedThemes = themesByCategory.get(null) || [];
      if (uncategorizedThemes.length > 0) {
        result.push({
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

      return result;
    },
    staleTime: STALE_TIMES.categories,
    placeholderData: keepPreviousData,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: categoriesWithThemes,
      isLoading: categoriesResult.isLoading || themesResult.isLoading,
      isFetching: categoriesResult.isFetching || themesResult.isFetching,
      error: categoriesResult.error ?? themesResult.error ?? null,
      refetch: () => {
        categoriesResult.refresh?.();
        themesResult.refresh?.();
      },
    };
  }

  return supabaseResult;
}

export function useCategory(id: string) {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched query - runQueryOnce: true to prevent re-renders on sync events
  const powerSyncResult = usePowerSyncWatchedQuery<Category>(
    'SELECT * FROM categories WHERE id = ?',
    [id],
    { runQueryOnce: true }
  );

  // Fallback to Supabase
  const supabaseResult = useQuery({
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
    enabled: !!id && id !== 'uncategorized' && !isPowerSyncReady,
    staleTime: STALE_TIMES.categories,
  });

  if (isPowerSyncReady) {
    const category = powerSyncResult.data?.[0] ?? null;
    return {
      data: category as Category | null,
      isLoading: powerSyncResult.isLoading,
      isFetching: powerSyncResult.isFetching,
      error: powerSyncResult.error ?? null,
      refetch: powerSyncResult.refresh,
    };
  }

  return supabaseResult;
}

// ============================================
// WRITE HOOKS (PowerSync local SQLite -> Supabase sync)
// ============================================

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (!user) throw new Error('Not authenticated');

      const id = generateUUID();
      const now = nowISO();
      const category: Category = {
        id,
        user_id: user.id,
        title: input.title,
        color_hex: input.color_hex || '#6366f1',
        icon: input.icon || 'folder',
        order_index: 0,
        created_at: now,
        updated_at: now,
      };

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `INSERT INTO categories (id, user_id, title, color_hex, icon, order_index, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            category.id,
            category.user_id,
            category.title,
            category.color_hex,
            category.icon,
            category.order_index,
            category.created_at,
            category.updated_at,
          ]
        );
        return category;
      }

      // Fallback to Supabase
      const supabase = createClient();
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
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCategoryInput & { id: string }) => {
      const now = nowISO();
      const updates = { ...input, updated_at: now };

      // Write to PowerSync local DB
      if (db) {
        const fields = Object.keys(updates);
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await db.execute(
          `UPDATE categories SET ${setClause} WHERE id = ?`,
          values
        );

        const result = await db.get<Category>('SELECT * FROM categories WHERE id = ?', [id]);
        return result as Category;
      }

      // Fallback to Supabase
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
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      // Write to PowerSync local DB
      if (db) {
        await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        return id;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.all });

      const previousCategories = queryClient.getQueryData<Category[]>(queryKeys.categories.lists());
      const previousWithThemes = queryClient.getQueryData<CategoryWithThemes[]>(queryKeys.categories.withThemes());

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
      if (context?.previousCategories) {
        queryClient.setQueryData(queryKeys.categories.lists(), context.previousCategories);
      }
      if (context?.previousWithThemes) {
        queryClient.setQueryData(queryKeys.categories.withThemes(), context.previousWithThemes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all });
    },
  });
}
