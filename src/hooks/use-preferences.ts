'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { ViewType, ThemeMode, UpdatePreferencesInput, UserPreferences } from '@/types/database';

const LOCAL_STORAGE_KEY = 'sederize-preferences';
const PREFERRED_VIEW_COOKIE = 'sederize-preferred-view'; // Must match middleware.ts

interface LocalPreferences {
  preferred_view: ViewType;
  sidebar_collapsed: boolean;
  theme_mode: ThemeMode;
  email_digest_enabled: boolean;
  email_digest_time: string;
}

const DEFAULT_PREFERENCES: LocalPreferences = {
  preferred_view: 'daily-brief',
  sidebar_collapsed: false,
  theme_mode: 'system',
  email_digest_enabled: true,
  email_digest_time: '07:00',
};

// Get preferences from localStorage (client-side only)
function getLocalPreferences(): LocalPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

// Set a cookie for middleware to read (server-side redirect)
function setPreferredViewCookie(view: ViewType) {
  if (typeof document === 'undefined') return;
  // Set cookie with 1 year expiry, path=/, SameSite=Lax
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${PREFERRED_VIEW_COOKIE}=${view}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

// Save preferences to localStorage (and cookie for preferred_view)
function setLocalPreferences(prefs: Partial<LocalPreferences>) {
  if (typeof window === 'undefined') return;

  try {
    const current = getLocalPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // Also set cookie for middleware if preferred_view changed
    if (prefs.preferred_view) {
      setPreferredViewCookie(prefs.preferred_view);
    }
  } catch {
    // Ignore storage errors
  }
}

// Hook for local preferences (fast, no network)
export function useLocalPreferences() {
  const [preferences, setPreferences] = useState<LocalPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount and sync cookie
  useEffect(() => {
    const prefs = getLocalPreferences();
    setPreferences(prefs);
    setIsLoaded(true);

    // Sync the cookie if it doesn't exist or differs (for existing users)
    if (typeof document !== 'undefined') {
      const cookieMatch = document.cookie.match(new RegExp(`${PREFERRED_VIEW_COOKIE}=([^;]+)`));
      const cookieValue = cookieMatch ? cookieMatch[1] : null;
      if (cookieValue !== prefs.preferred_view) {
        setPreferredViewCookie(prefs.preferred_view);
      }
    }
  }, []);

  const updatePreferences = useCallback((updates: Partial<LocalPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...updates };
      setLocalPreferences(updated);
      return updated;
    });
  }, []);

  // Generic update for single key
  const updatePreference = useCallback(<K extends keyof LocalPreferences>(
    key: K,
    value: LocalPreferences[K]
  ) => {
    updatePreferences({ [key]: value } as Partial<LocalPreferences>);
  }, [updatePreferences]);

  return {
    preferences,
    isLoaded,
    updatePreferences,
    updatePreference,
    setPreferredView: (view: ViewType) => updatePreferences({ preferred_view: view }),
    setSidebarCollapsed: (collapsed: boolean) => updatePreferences({ sidebar_collapsed: collapsed }),
    setThemeMode: (mode: ThemeMode) => updatePreferences({ theme_mode: mode }),
  };
}

// Hook for synced preferences (with Supabase)
export function usePreferences() {
  const queryClient = useQueryClient();

  // Fetch preferences from Supabase
  const query = useQuery({
    queryKey: queryKeys.preferences.all,
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If not found, create default preferences
        if (error.code === 'PGRST116') {
          const { data: newPrefs } = await supabase
            .from('user_preferences')
            .insert({ user_id: user.id })
            .select()
            .single();
          return newPrefs as UserPreferences;
        }
        throw error;
      }
      return data as UserPreferences;
    },
  });

  // Update preferences mutation
  const mutation = useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_preferences')
        .update(input)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Also update localStorage for fast access
      setLocalPreferences(input as Partial<LocalPreferences>);

      return data as UserPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreferences: mutation.mutate,
    setPreferredView: (view: ViewType) => mutation.mutate({ preferred_view: view }),
    setSidebarCollapsed: (collapsed: boolean) => mutation.mutate({ sidebar_collapsed: collapsed }),
    setThemeMode: (mode: ThemeMode) => mutation.mutate({ theme_mode: mode }),
  };
}

// Hook to get and save the last visited view
export function useViewPersistence() {
  const { preferences, isLoaded, setPreferredView } = useLocalPreferences();

  return {
    preferredView: preferences.preferred_view,
    isLoaded,
    saveCurrentView: setPreferredView,
  };
}

// Hook for sidebar state
export function useSidebarState() {
  const { preferences, isLoaded, setSidebarCollapsed } = useLocalPreferences();

  return {
    isCollapsed: preferences.sidebar_collapsed,
    isLoaded,
    toggle: () => setSidebarCollapsed(!preferences.sidebar_collapsed),
    setCollapsed: setSidebarCollapsed,
  };
}
