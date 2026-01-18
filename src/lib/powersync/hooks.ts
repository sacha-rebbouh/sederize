'use client';

/**
 * PowerSync Hooks Utilities
 *
 * Provides integration between PowerSync (local SQLite) and React Query.
 * - Reads from local SQLite via PowerSync (instant, offline-capable)
 * - Writes to local SQLite, which syncs automatically to Supabase
 * - Falls back to Supabase when PowerSync is unavailable
 */

import { useCallback } from 'react';
import { useQuery as usePowerSyncQuery } from '@powersync/react';
import { usePowerSyncDb } from '@/providers/powersync-provider';
import { useAuth } from '@/providers/auth-provider';

// ============================================
// TYPES
// ============================================

export interface WatchedQueryResult<T> {
  data: T;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================
// CORE HOOKS
// ============================================

/**
 * Execute a watched SQL query against PowerSync local database.
 * Automatically re-renders when data changes.
 *
 * @param sql SQL query string
 * @param parameters Query parameters
 */
export function useWatchedQuery<T>(
  sql: string,
  parameters: unknown[] = []
): WatchedQueryResult<T[]> {
  // Use PowerSync's reactive query hook
  const result = usePowerSyncQuery<T>(sql, parameters, {
    runQueryOnce: false, // Keep watching for changes
  });

  return {
    data: (result.data ?? []) as T[],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error ?? null,
    refetch: result.refresh ?? (() => {}),
  };
}

/**
 * Get the current user ID from auth context
 */
export function useUserId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}

/**
 * Execute a write operation on PowerSync local database.
 * Changes are automatically synced to Supabase.
 */
export function usePowerSyncWrite() {
  const db = usePowerSyncDb();

  const execute = useCallback(
    async (sql: string, parameters: unknown[] = []) => {
      if (!db) {
        throw new Error('PowerSync database not initialized');
      }
      return db.execute(sql, parameters);
    },
    [db]
  );

  const writeTransaction = useCallback(
    async (operations: { sql: string; parameters?: unknown[] }[]) => {
      if (!db) {
        throw new Error('PowerSync database not initialized');
      }
      return db.writeTransaction(async (tx) => {
        for (const op of operations) {
          await tx.execute(op.sql, op.parameters ?? []);
        }
      });
    },
    [db]
  );

  return {
    execute,
    writeTransaction,
    isReady: !!db,
  };
}

/**
 * Check if PowerSync is available and ready
 */
export function usePowerSyncReady(): boolean {
  const db = usePowerSyncDb();
  return !!db;
}

// ============================================
// SQL QUERY BUILDERS
// ============================================

/**
 * Build an INSERT SQL statement
 */
export function buildInsertSQL(
  table: string,
  data: Record<string, unknown>
): { sql: string; params: unknown[] } {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const params = Object.values(data);

  return {
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    params,
  };
}

/**
 * Build an UPDATE SQL statement
 */
export function buildUpdateSQL(
  table: string,
  data: Record<string, unknown>,
  whereClause: string,
  whereParams: unknown[] = []
): { sql: string; params: unknown[] } {
  const columns = Object.keys(data);
  const setClause = columns.map((col) => `${col} = ?`).join(', ');
  const params = [...Object.values(data), ...whereParams];

  return {
    sql: `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`,
    params,
  };
}

/**
 * Build a DELETE SQL statement
 */
export function buildDeleteSQL(
  table: string,
  whereClause: string,
  whereParams: unknown[] = []
): { sql: string; params: unknown[] } {
  return {
    sql: `DELETE FROM ${table} WHERE ${whereClause}`,
    params: whereParams,
  };
}

// ============================================
// UUID GENERATOR
// ============================================

/**
 * Generate a UUID v4 (compatible with Supabase)
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// DATE/TIME UTILITIES
// ============================================

/**
 * Get current ISO timestamp
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Format date for SQL (YYYY-MM-DD)
 */
export function formatDateSQL(date: Date): string {
  return date.toISOString().split('T')[0];
}
