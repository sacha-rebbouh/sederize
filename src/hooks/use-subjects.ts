'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery as usePowerSyncWatchedQuery } from '@powersync/react';
import { createClient } from '@/lib/supabase/client';
import { usePowerSyncDb, usePowerSyncReady } from '@/providers/powersync-provider';
import { useAuth } from '@/providers/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/providers/query-provider';
import {
  Subject,
  Theme,
  SubjectWithTheme,
  CreateSubjectInput,
  UpdateSubjectInput,
} from '@/types/database';
import { generateUUID, nowISO } from '@/lib/powersync/hooks';
import { useMemo } from 'react';

interface UseSubjectsOptions {
  enabled?: boolean;
}

// ============================================
// READ HOOKS (PowerSync local SQLite)
// ============================================

export function useSubjects(themeId?: string) {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched queries for subjects and themes
  const subjectsQuery = themeId
    ? `SELECT * FROM subjects WHERE theme_id = ? ORDER BY order_index ASC`
    : `SELECT * FROM subjects ORDER BY order_index ASC`;
  const subjectsParams = themeId ? [themeId] : [];

  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    subjectsQuery,
    subjectsParams,
    { runQueryOnce: false }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: false }
  );

  // Join subjects with themes in memory
  const subjectsWithThemes = useMemo(() => {
    const subjects = (subjectsResult.data ?? []) as Subject[];
    const themes = (themesResult.data ?? []) as Theme[];

    const themesMap = new Map(themes.map((t) => [t.id, t]));

    return subjects.map((subject) => ({
      ...subject,
      theme: themesMap.get(subject.theme_id) || null,
    })) as SubjectWithTheme[];
  }, [subjectsResult.data, themesResult.data]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
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
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: subjectsWithThemes,
      isLoading: subjectsResult.isLoading || themesResult.isLoading,
      isFetching: subjectsResult.isFetching || themesResult.isFetching,
      error: subjectsResult.error ?? themesResult.error ?? null,
      refetch: () => {
        subjectsResult.refresh?.();
        themesResult.refresh?.();
      },
    };
  }

  return supabaseResult;
}

export function useActiveSubjects(options?: UseSubjectsOptions) {
  const isPowerSyncReady = usePowerSyncReady();
  const enabled = options?.enabled ?? true;

  // PowerSync watched queries
  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    `SELECT * FROM subjects WHERE status = 'active' ORDER BY order_index ASC`,
    [],
    { runQueryOnce: false }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: false }
  );

  // Join subjects with themes
  const subjectsWithThemes = useMemo(() => {
    const subjects = (subjectsResult.data ?? []) as Subject[];
    const themes = (themesResult.data ?? []) as Theme[];

    const themesMap = new Map(themes.map((t) => [t.id, t]));

    return subjects.map((subject) => ({
      ...subject,
      theme: themesMap.get(subject.theme_id) || null,
    })) as SubjectWithTheme[];
  }, [subjectsResult.data, themesResult.data]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
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
    enabled: enabled && !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: subjectsWithThemes,
      isLoading: subjectsResult.isLoading || themesResult.isLoading,
      isFetching: subjectsResult.isFetching || themesResult.isFetching,
      error: subjectsResult.error ?? themesResult.error ?? null,
      refetch: () => {
        subjectsResult.refresh?.();
        themesResult.refresh?.();
      },
    };
  }

  return supabaseResult;
}

export function useSubject(id: string) {
  const isPowerSyncReady = usePowerSyncReady();

  // PowerSync watched queries
  const subjectResult = usePowerSyncWatchedQuery<Subject>(
    'SELECT * FROM subjects WHERE id = ?',
    [id],
    { runQueryOnce: false }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: false }
  );

  // Join subject with theme
  const subjectWithTheme = useMemo(() => {
    const subject = (subjectResult.data?.[0] ?? null) as Subject | null;
    if (!subject) return null;

    const themes = (themesResult.data ?? []) as Theme[];
    const theme = themes.find((t) => t.id === subject.theme_id) || null;

    return { ...subject, theme } as SubjectWithTheme;
  }, [subjectResult.data, themesResult.data]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
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
    enabled: !!id && !isPowerSyncReady,
    staleTime: STALE_TIMES.subjects,
  });

  if (isPowerSyncReady) {
    return {
      data: subjectWithTheme,
      isLoading: subjectResult.isLoading || themesResult.isLoading,
      isFetching: subjectResult.isFetching || themesResult.isFetching,
      error: subjectResult.error ?? themesResult.error ?? null,
      refetch: () => {
        subjectResult.refresh?.();
        themesResult.refresh?.();
      },
    };
  }

  return supabaseResult;
}

export function useZombieSubjects() {
  const isPowerSyncReady = usePowerSyncReady();

  // Calculate 10 days ago ISO string
  const tenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 10);
    return date.toISOString();
  }, []);

  // PowerSync watched queries - filter zombies by last_activity_at
  const subjectsResult = usePowerSyncWatchedQuery<Subject>(
    `SELECT * FROM subjects WHERE status = 'active' AND last_activity_at < ?`,
    [tenDaysAgo],
    { runQueryOnce: false }
  );

  const themesResult = usePowerSyncWatchedQuery<Theme>(
    'SELECT * FROM themes',
    [],
    { runQueryOnce: false }
  );

  // Join subjects with themes
  const subjectsWithThemes = useMemo(() => {
    const subjects = (subjectsResult.data ?? []) as Subject[];
    const themes = (themesResult.data ?? []) as Theme[];

    const themesMap = new Map(themes.map((t) => [t.id, t]));

    return subjects.map((subject) => ({
      ...subject,
      theme: themesMap.get(subject.theme_id) || null,
    })) as SubjectWithTheme[];
  }, [subjectsResult.data, themesResult.data]);

  // Fallback to Supabase
  const supabaseResult = useQuery({
    queryKey: queryKeys.subjects.zombies(),
    queryFn: async () => {
      const supabase = createClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 10);

      const { data, error } = await supabase
        .from('subjects')
        .select('*, theme:themes(*)')
        .eq('status', 'active')
        .lt('last_activity_at', cutoff.toISOString());

      if (error) throw error;
      return data as SubjectWithTheme[];
    },
    staleTime: STALE_TIMES.subjects,
    enabled: !isPowerSyncReady,
  });

  if (isPowerSyncReady) {
    return {
      data: subjectsWithThemes,
      isLoading: subjectsResult.isLoading || themesResult.isLoading,
      isFetching: subjectsResult.isFetching || themesResult.isFetching,
      error: subjectsResult.error ?? themesResult.error ?? null,
      refetch: () => {
        subjectsResult.refresh?.();
        themesResult.refresh?.();
      },
    };
  }

  return supabaseResult;
}

// ============================================
// WRITE HOOKS (PowerSync local SQLite -> Supabase sync)
// ============================================

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const db = usePowerSyncDb();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSubjectInput) => {
      if (!user) throw new Error('Not authenticated');

      const id = generateUUID();
      const now = nowISO();
      const subject: Subject = {
        id,
        user_id: user.id,
        theme_id: input.theme_id,
        title: input.title,
        description: input.description || null,
        icon: input.icon || 'file-text',
        status: 'active',
        scratchpad: null,
        order_index: 0,
        last_activity_at: now,
        created_at: now,
        updated_at: now,
      };

      // Write to PowerSync local DB
      if (db) {
        await db.execute(
          `INSERT INTO subjects (id, user_id, theme_id, title, description, icon, status, scratchpad, order_index, last_activity_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            subject.id,
            subject.user_id,
            subject.theme_id,
            subject.title,
            subject.description,
            subject.icon,
            subject.status,
            subject.scratchpad,
            subject.order_index,
            subject.last_activity_at,
            subject.created_at,
            subject.updated_at,
          ]
        );
        return subject;
      }

      // Fallback to Supabase
      const supabase = createClient();
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
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSubjectInput & { id: string }) => {
      const now = nowISO();
      const updates = { ...input, updated_at: now };

      // Write to PowerSync local DB
      if (db) {
        const fields = Object.keys(updates);
        const setClause = fields.map((f) => `${f} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        await db.execute(
          `UPDATE subjects SET ${setClause} WHERE id = ?`,
          values
        );

        const result = await db.get<Subject>('SELECT * FROM subjects WHERE id = ?', [id]);
        return result as Subject;
      }

      // Fallback to Supabase
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
  const db = usePowerSyncDb();

  return useMutation({
    mutationFn: async (id: string) => {
      // Write to PowerSync local DB
      if (db) {
        await db.execute('DELETE FROM subjects WHERE id = ?', [id]);
        return id;
      }

      // Fallback to Supabase
      const supabase = createClient();
      const { error } = await supabase.from('subjects').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.subjects.all });

      const previousSubjects = queryClient.getQueryData<SubjectWithTheme[]>(queryKeys.subjects.active());

      if (previousSubjects) {
        queryClient.setQueryData<SubjectWithTheme[]>(
          queryKeys.subjects.active(),
          previousSubjects.filter((s) => s.id !== id)
        );
      }

      return { previousSubjects };
    },
    onError: (_err, _id, context) => {
      if (context?.previousSubjects) {
        queryClient.setQueryData(queryKeys.subjects.active(), context.previousSubjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}
