'use client';

/**
 * PowerSync Utilities
 *
 * Helper functions for PowerSync operations.
 */

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
