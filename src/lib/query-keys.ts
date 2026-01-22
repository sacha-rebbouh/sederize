/**
 * Query Key Factory Pattern
 *
 * Provides structured, type-safe query keys for React Query.
 * Enables granular cache invalidation instead of invalidating all queries.
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

export const queryKeys = {
  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,

    // Specific list views
    dailyBrief: (date: string) =>
      [...queryKeys.tasks.lists(), { view: 'daily-brief', date }] as const,
    inbox: () =>
      [...queryKeys.tasks.lists(), { view: 'inbox' }] as const,
    inboxCount: () =>
      [...queryKeys.tasks.lists(), { view: 'inbox-count' }] as const,
    kanban: () =>
      [...queryKeys.tasks.lists(), { view: 'kanban' }] as const,
    waitingFor: () =>
      [...queryKeys.tasks.lists(), { view: 'waiting-for' }] as const,
    waitingForCount: () =>
      [...queryKeys.tasks.lists(), { view: 'waiting-for-count' }] as const,
    calendar: (startDate: string, endDate: string) =>
      [...queryKeys.tasks.lists(), { view: 'calendar', startDate, endDate }] as const,
    all100: () =>
      [...queryKeys.tasks.lists(), { view: 'all', limit: 100 }] as const,
    allUnlimited: () =>
      [...queryKeys.tasks.lists(), { view: 'all-unlimited' }] as const,
    bySubject: (subjectId: string) =>
      [...queryKeys.tasks.lists(), { view: 'subject', subjectId }] as const,
    subtasks: (parentId: string) =>
      [...queryKeys.tasks.lists(), { view: 'subtasks', parentId }] as const,

    // Detail views
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },

  // Themes
  themes: {
    all: ['themes'] as const,
    lists: () => [...queryKeys.themes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.themes.all, 'detail', id] as const,
  },

  // Subjects
  subjects: {
    all: ['subjects'] as const,
    lists: () => [...queryKeys.subjects.all, 'list'] as const,
    byTheme: (themeId?: string) =>
      [...queryKeys.subjects.lists(), { themeId }] as const,
    active: () =>
      [...queryKeys.subjects.lists(), { status: 'active' }] as const,
    zombies: () =>
      [...queryKeys.subjects.lists(), { status: 'zombies' }] as const,
    detail: (id: string) => [...queryKeys.subjects.all, 'detail', id] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    withThemes: () =>
      [...queryKeys.categories.lists(), { withThemes: true }] as const,
    detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
  },

  // Labels
  labels: {
    all: ['labels'] as const,
    lists: () => [...queryKeys.labels.all, 'list'] as const,
    byTask: (taskId: string) => [...queryKeys.labels.all, 'task', taskId] as const,
  },

  // Pending Items
  pendingItems: {
    all: ['pending-items'] as const,
    lists: () => [...queryKeys.pendingItems.all, 'list'] as const,
    byStatus: (status?: string) =>
      [...queryKeys.pendingItems.lists(), { status }] as const,
    count: () =>
      [...queryKeys.pendingItems.lists(), { view: 'count' }] as const,
    oldest: (limit: number) =>
      [...queryKeys.pendingItems.lists(), { view: 'oldest', limit }] as const,
  },

  // Attachments
  attachments: {
    all: ['attachments'] as const,
    byTask: (taskId: string) => [...queryKeys.attachments.all, 'task', taskId] as const,
  },

  // Preferences
  preferences: {
    all: ['preferences'] as const,
    byUser: (userId: string) => [...queryKeys.preferences.all, 'user', userId] as const,
  },
} as const;

// Type helpers for query key types
export type TasksQueryKey = ReturnType<typeof queryKeys.tasks.lists>;
export type ThemesQueryKey = ReturnType<typeof queryKeys.themes.lists>;
export type SubjectsQueryKey = ReturnType<typeof queryKeys.subjects.lists>;
export type CategoriesQueryKey = ReturnType<typeof queryKeys.categories.lists>;
export type LabelsQueryKey = ReturnType<typeof queryKeys.labels.lists>;
export type PendingItemsQueryKey = ReturnType<typeof queryKeys.pendingItems.lists>;
