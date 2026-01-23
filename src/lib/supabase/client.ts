import { createBrowserClient } from '@supabase/ssr';

// Storage key for remember me preference
const REMEMBER_ME_KEY = 'sederize_remember_me';
const SESSION_MARKER_KEY = 'sederize_session_active';

// Singleton instance for browser client
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}

// For cases where a fresh client is needed (rare)
export function createFreshClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Set remember me preference
export function setRememberMe(remember: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
    // Mark session as active
    sessionStorage.setItem(SESSION_MARKER_KEY, 'true');
  }
}

// Get remember me preference (defaults to true for existing users)
export function getRememberMe(): boolean {
  if (typeof window !== 'undefined') {
    const value = localStorage.getItem(REMEMBER_ME_KEY);
    return value !== 'false';
  }
  return true;
}

// Check if user should be logged out (new browser session + remember me disabled)
export function shouldClearSession(): boolean {
  if (typeof window === 'undefined') return false;

  const rememberMe = getRememberMe();
  const sessionActive = sessionStorage.getItem(SESSION_MARKER_KEY);

  // If remember me is false AND this is a new browser session (no sessionStorage marker)
  // then we should clear the session
  if (!rememberMe && !sessionActive) {
    return true;
  }

  // Mark session as active for future checks within same browser session
  sessionStorage.setItem(SESSION_MARKER_KEY, 'true');
  return false;
}
