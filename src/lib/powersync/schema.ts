/**
 * PowerSync Schema for Sederize
 * Mirrors the Supabase PostgreSQL schema for offline-first sync
 */

import { column, Schema, Table } from '@powersync/web';

// ============================================
// CATEGORIES TABLE
// ============================================
const categories = new Table(
  {
    // id is mod by PowerSync
    user_id: column.text,
    title: column.text,
    color_hex: column.text,
    icon: column.text,
    order_index: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_user: ['user_id'] } }
);

// ============================================
// THEMES TABLE
// ============================================
const themes = new Table(
  {
    user_id: column.text,
    category_id: column.text, // nullable - FK to categories
    title: column.text,
    color_hex: column.text,
    icon: column.text,
    order_index: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_user: ['user_id'], by_category: ['category_id'] } }
);

// ============================================
// SUBJECTS TABLE
// ============================================
const subjects = new Table(
  {
    theme_id: column.text, // FK to themes
    user_id: column.text,
    title: column.text,
    description: column.text,
    status: column.text, // 'active' | 'archived'
    scratchpad: column.text,
    icon: column.text,
    order_index: column.integer,
    last_activity_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_user: ['user_id'], by_theme: ['theme_id'], by_status: ['status'] } }
);

// ============================================
// TASKS TABLE
// ============================================
const tasks = new Table(
  {
    subject_id: column.text, // nullable - FK to subjects
    theme_id: column.text, // nullable - direct assignment (waterfall)
    category_id: column.text, // nullable - direct assignment (waterfall)
    user_id: column.text,
    parent_task_id: column.text, // nullable - for subtasks
    title: column.text,
    description: column.text,
    status: column.text, // 'todo' | 'done' | 'waiting_for'
    do_date: column.text, // DATE as ISO string
    do_time: column.text, // TIME as HH:mm string
    waiting_for_note: column.text,
    priority: column.integer, // 0=low, 1=normal, 2=high, 3=urgent
    order_index: column.integer,
    snooze_count: column.integer,
    completed_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      by_user: ['user_id'],
      by_date: ['do_date'],
      by_status: ['status'],
      by_subject: ['subject_id'],
      by_theme: ['theme_id'],
      by_category: ['category_id'],
      by_parent: ['parent_task_id'],
    },
  }
);

// ============================================
// LABELS TABLE
// ============================================
const labels = new Table(
  {
    user_id: column.text,
    name: column.text,
    color_hex: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_user: ['user_id'] } }
);

// ============================================
// TASK_LABELS JUNCTION TABLE
// ============================================
const task_labels = new Table(
  {
    task_id: column.text, // FK to tasks
    label_id: column.text, // FK to labels
    created_at: column.text,
  },
  { indexes: { by_task: ['task_id'], by_label: ['label_id'] } }
);

// ============================================
// PENDING_ITEMS TABLE
// ============================================
const pending_items = new Table(
  {
    user_id: column.text,
    title: column.text,
    description: column.text,
    category_id: column.text, // nullable
    theme_id: column.text, // nullable
    subject_id: column.text, // nullable
    task_id: column.text, // nullable
    status: column.text, // 'pending' | 'reminded' | 'resolved'
    reminder_date: column.text,
    reminded_count: column.integer,
    resolved_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_user: ['user_id'], by_status: ['status'] } }
);

// ============================================
// USER_PREFERENCES TABLE
// ============================================
const user_preferences = new Table(
  {
    user_id: column.text,
    preferred_view: column.text, // 'daily-brief' | 'inbox' | 'calendar' | 'kanban'
    sidebar_collapsed: column.integer, // boolean as 0/1
    theme_mode: column.text, // 'light' | 'dark' | 'system'
    email_digest_enabled: column.integer, // boolean as 0/1
    email_digest_time: column.text, // HH:mm
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_user: ['user_id'] } }
);

// ============================================
// TASK_ATTACHMENTS TABLE
// ============================================
const task_attachments = new Table(
  {
    task_id: column.text,
    user_id: column.text,
    file_name: column.text,
    file_type: column.text,
    file_size: column.integer,
    storage_path: column.text,
    created_at: column.text,
  },
  { indexes: { by_task: ['task_id'], by_user: ['user_id'] } }
);

// ============================================
// EXPORT SCHEMA
// ============================================
export const AppSchema = new Schema({
  categories,
  themes,
  subjects,
  tasks,
  labels,
  task_labels,
  pending_items,
  user_preferences,
  task_attachments,
});

// Type exports for use in hooks
export type Database = (typeof AppSchema)['types'];
export type TaskRow = Database['tasks'];
export type ThemeRow = Database['themes'];
export type SubjectRow = Database['subjects'];
export type CategoryRow = Database['categories'];
export type LabelRow = Database['labels'];
export type TaskLabelRow = Database['task_labels'];
export type PendingItemRow = Database['pending_items'];
export type UserPreferencesRow = Database['user_preferences'];
export type TaskAttachmentRow = Database['task_attachments'];
