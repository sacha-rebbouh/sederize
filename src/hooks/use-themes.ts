'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery as usePowerSyncWatchedQuery } from '@powersync/react';
import { createClient } from '@/lib/supabase/client';
import { usePowerSyncDb, usePowerSyncReady } from '@/providers/powersync-provider';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import { Theme, CreateThemeInput, UpdateThemeInput } from '@/types/database';
import { generateUUID, nowISO } from '@/lib/powersync/hooks';

interface UseThemesOptions {
  enabled?: boolean;
}

// ============================================
// READ HOOKS (PowerSync local SQLite)
// ============================================

export function useThemes(options?: UseThemesOptions) {
  const isPowerSyncReady = usePowerSyncReady();
  const enabled = options?.enabled ?? true;

  // PowerSync watched query - runQueryOnce: true to prevent re-renders on sync events
  const powerSyncResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes ORDER BY order_index ASC',
    [],
    { runQueryOnce: true }
  );

  // Fallback to Supabase when PowerSync is not ready
  const supabaseResult = useQuery({
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
    enabled: enabled && !isPowerSyncReady,
  });

  // Return PowerSync data when available, otherwise Supabase
  if (isPowerSyncReady) {
    return {
      data: (powerSyncResult.data ?? []) as Theme[],
      isLoading: powerSyncResult.isLoading,
      isFetching: powerSyncResult.isFetching,
      error: powerSyncResult.error ?? null,
      refetch: powerSyncResult.refresh,
    };
  }

  return supabaseResult;
}

export function useTheme(id: string) {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched query - runQueryOnce: true to prevent re-renders on sync events
  const powerSyncResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes WHERE id = ?',
    [id],
    { runQueryOnce: true }
  );

  // Fallback to Supabase
  const supabaseResult = useQuery({
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
    enabled: !!id && !isPowerSyncReady,
    staleTime: STALE_TIMES.themes,
  });

  if (isPowerSyncReady) {
    const theme = powerSyncResult.data?.[0] ?? null;
    return {
      data: theme as Theme | null,
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

export function useCreateTheme() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateThemeInput) => {
      if (!user) throw new Error('Not authenticated');

      const id = generateUUID();
      const now = nowISO();
      const theme: Theme = {
        id,
        user_id: user.id,
        category_id: input.category_id || null,
        title: input.title,
        color_hex: input.color_hex || '#6366f1',
        icon: input.icon || 'folder',
        order_index: 0,
        created_at: now,
        updated_at: now,
      };

      // Write to PowerSync local DB (syncs automatically to Supabase)
      if (db) {
        await db.execute(
          `INSERT INTO themes (id, user_id, category_id, title, color_hex, icon, order_index, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            theme.id,
            theme.user_id,
            theme.category_id,
            theme.title,
            theme.color_hex,
            theme.icon,
            theme.order_index,
            theme.created_at,
            theme.updated_at,
          ]
        );
        return theme;
      }

      // Fallback to Supabase direct write
      const supabase = createClient();
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
      // Invalidate React Query cache (needed for Supabase fallback mode)
      queryClient.invalidateQueries({ queryKey: queryKeys.themes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.withThemes() });
    },
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateThemeInput & { id: string }) => {
      const now = nowISO();
      const updates = { ...input, updated_at: now };

      // Write to PowerSync local DB
      if (db) {
        // Build dynamic update query
        const fields = Object.keys(updates);
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await db.execute(
          `UPDATE themes SET ${setClause} WHERE id = ?`,
          values
        );

        // Return updated theme
        const result = await db.get<Theme>('SELECT * FROM themes WHERE id = ?', [id]);
        return result as Theme;
      }

      // Fallback to Supabase
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
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      // Write to PowerSync local DB
      if (db) {
        await db.execute('DELETE FROM themes WHERE id = ?', [id]);
        return id;
      }

      // Fallback to Supabase
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
