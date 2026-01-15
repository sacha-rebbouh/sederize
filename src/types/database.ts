// Database types for SEDERIZE
// These types match the Supabase schema

export type TaskStatus = 'todo' | 'done' | 'waiting_for';
export type SubjectStatus = 'active' | 'archived';
export type UserRole = 'user' | 'admin' | 'owner';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ViewType = 'daily-brief' | 'inbox' | 'calendar' | 'kanban';

// Priority levels: 0 = low (blue), 1 = normal (gray), 2 = high (amber), 3 = urgent (red)
export type PriorityLevel = 0 | 1 | 2 | 3;
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  0: 'Low',
  1: 'Normal',
  2: 'High',
  3: 'Urgent',
};
export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  0: 'text-blue-600 dark:text-blue-400',
  1: 'text-muted-foreground',
  2: 'text-amber-600 dark:text-amber-400',
  3: 'text-red-600 dark:text-red-400',
};

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  title: string;
  color_hex: string;
  icon: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Theme {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  color_hex: string;
  icon: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ThemeWithCategory extends Theme {
  category?: Category;
}

export interface Subject {
  id: string;
  theme_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: SubjectStatus;
  scratchpad: string | null;
  icon: string;
  order_index: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  subject_id: string | null;
  theme_id: string | null;       // Direct assignment to theme (waterfall)
  category_id: string | null;    // Direct assignment to category (waterfall)
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  do_date: string | null;
  do_time: string | null; // HH:mm format
  waiting_for_note: string | null;
  priority: PriorityLevel;
  order_index: number;
  snooze_count: number;
  parent_task_id: string | null; // For subtasks
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_view: ViewType;
  sidebar_collapsed: boolean;
  theme_mode: ThemeMode;
  email_digest_enabled: boolean;
  email_digest_time: string;
  created_at: string;
  updated_at: string;
}

export type PendingStatus = 'pending' | 'reminded' | 'resolved';

export interface PendingItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  theme_id: string | null;
  subject_id: string | null;
  task_id: string | null;
  status: PendingStatus;
  reminder_date: string | null;
  reminded_count: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingItemWithRelations extends PendingItem {
  category?: Category | null;
  theme?: Theme | null;
  subject?: Subject | null;
  task?: Task | null;
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color_hex: string;
  created_at: string;
  updated_at: string;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
  created_at: string;
}

// Extended types with relations
export interface SubjectWithTheme extends Subject {
  theme?: Theme;
}

export interface TaskWithRelations extends Task {
  subject?: Subject | null;
  theme?: Theme | null;           // Theme from subject OR direct theme_id
  category?: Category | null;     // Category from theme OR direct category_id
  direct_theme?: Theme | null;    // When assigned directly to theme (no subject)
  direct_category?: Category | null; // When assigned directly to category (no theme)
  attachments?: TaskAttachment[];
  subtasks?: Task[];
  labels?: Label[];
}

// For daily brief grouping
export interface DailyBriefTask extends Task {
  subject_title: string | null;
  theme_title: string | null;
  theme_color: string | null;
  category_title: string | null;
  category_color: string | null;
  subtask_count?: number;
  subtask_done_count?: number;
}

// Grouped tasks by theme
export interface TaskGroup {
  theme: Theme | null;
  subjects: {
    subject: Subject | null;
    tasks: Task[];
  }[];
}

// Form types
export interface CreateCategoryInput {
  title: string;
  color_hex?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  title?: string;
  color_hex?: string;
  icon?: string;
  order_index?: number;
}

export interface CreateThemeInput {
  category_id?: string | null;
  title: string;
  color_hex?: string;
  icon?: string;
}

export interface UpdateThemeInput {
  category_id?: string | null;
  title?: string;
  color_hex?: string;
  icon?: string;
  order_index?: number;
}

export interface CreateSubjectInput {
  theme_id: string;
  title: string;
  description?: string;
  icon?: string;
}

export interface UpdateSubjectInput {
  title?: string;
  description?: string;
  status?: SubjectStatus;
  scratchpad?: string;
  icon?: string;
  order_index?: number;
}

export interface CreateTaskInput {
  subject_id?: string | null;
  theme_id?: string | null;      // Direct assignment to theme (waterfall)
  category_id?: string | null;   // Direct assignment to category (waterfall)
  parent_task_id?: string | null;
  title: string;
  description?: string;
  do_date?: string | null;
  do_time?: string | null;
  priority?: PriorityLevel;
}

export interface UpdateTaskInput {
  subject_id?: string | null;
  theme_id?: string | null;      // Direct assignment to theme (waterfall)
  category_id?: string | null;   // Direct assignment to category (waterfall)
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  do_date?: string | null;
  do_time?: string | null;
  waiting_for_note?: string | null;
  priority?: PriorityLevel;
  order_index?: number;
}

export interface CreateAttachmentInput {
  task_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
}

export interface UpdatePreferencesInput {
  preferred_view?: ViewType;
  sidebar_collapsed?: boolean;
  theme_mode?: ThemeMode;
  email_digest_enabled?: boolean;
  email_digest_time?: string;
}

export interface CreateLabelInput {
  name: string;
  color_hex?: string;
}

export interface UpdateLabelInput {
  name?: string;
  color_hex?: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      themes: {
        Row: Theme;
        Insert: Omit<Theme, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Theme, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'last_activity_at'> & { id?: string };
        Update: Partial<Omit<Subject, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'snooze_count'> & { id?: string };
        Update: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      task_attachments: {
        Row: TaskAttachment;
        Insert: Omit<TaskAttachment, 'id' | 'created_at'> & { id?: string };
        Update: never; // Attachments are immutable
      };
      user_preferences: {
        Row: UserPreferences;
        Insert: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
