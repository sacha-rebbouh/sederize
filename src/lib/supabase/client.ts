import { createBrowserClient } from '@supabase/ssr';

// Cookie names for remember me feature
// These are readable by both client and server (middleware)
export const REMEMBER_ME_COOKIE = 'sederize-remember-me';
export const SESSION_ACTIVE_COOKIE = 'sederize-session-active';

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

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Helper to set cookie
function setCookie(name: string, value: string, options: { maxAge?: number; session?: boolean } = {}) {
  if (typeof document === 'undefined') return;

  let cookie = `${name}=${value}; path=/; SameSite=Lax`;

  // If maxAge is provided, it's a persistent cookie
  // If session is true or no options, it's a session cookie (expires when browser closes)
  if (options.maxAge) {
    cookie += `; max-age=${options.maxAge}`;
  }
  // Session cookies don't need max-age - they expire when browser closes

  document.cookie = cookie;
}

// Helper to delete cookie
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

// Set remember me preference (called on login)
export function setRememberMe(remember: boolean) {
  if (typeof window !== 'undefined') {
    // Store remember me preference as persistent cookie (1 year)
    setCookie(REMEMBER_ME_COOKIE, remember ? 'true' : 'false', { maxAge: 365 * 24 * 60 * 60 });

    // Set session-active as session cookie (no max-age = expires when browser closes)
    setCookie(SESSION_ACTIVE_COOKIE, 'true', { session: true });
  }
}

// Get remember me preference (defaults to true for existing users)
export function getRememberMe(): boolean {
  if (typeof window !== 'undefined') {
    const value = getCookie(REMEMBER_ME_COOKIE);
    return value !== 'false';
  }
  return true;
}

// Mark session as active (called when we confirm user should stay logged in)
export function markSessionActive() {
  if (typeof window !== 'undefined') {
    setCookie(SESSION_ACTIVE_COOKIE, 'true', { session: true });
  }
}

// Check if session-active cookie exists (means browser session is still active)
export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  return getCookie(SESSION_ACTIVE_COOKIE) === 'true';
}

// Clear remember me cookies (called on logout)
export function clearRememberMeCookies() {
  deleteCookie(REMEMBER_ME_COOKIE);
  deleteCookie(SESSION_ACTIVE_COOKIE);
}
