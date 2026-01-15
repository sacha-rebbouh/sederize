'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const VIEW_ROUTES: Record<string, string> = {
  'daily-brief': '/',
  'inbox': '/inbox',
  'calendar': '/calendar',
  'kanban': '/kanban',
};

const LOCAL_STORAGE_KEY = 'sederize-preferences';

interface PreferredViewGuardProps {
  children: ReactNode;
}

/**
 * Guards the root path and redirects to preferred view.
 * Wraps children to prevent rendering until preference check is complete.
 */
export function PreferredViewGuard({ children }: PreferredViewGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Non-root paths: render immediately
    if (pathname !== '/') {
      setIsReady(true);
      return;
    }

    // Don't redirect if already redirected in this session
    if (hasRedirected.current) {
      setIsReady(true);
      return;
    }

    // Read preferences synchronously from localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        const preferredView = prefs.preferred_view;
        const preferredRoute = VIEW_ROUTES[preferredView];

        // Redirect if preferred view is not daily-brief
        if (preferredRoute && preferredRoute !== '/') {
          hasRedirected.current = true;
          router.replace(preferredRoute);
          return; // Don't set ready - keep showing loader while redirecting
        }
      }
    } catch {
      // Ignore parse errors
    }

    // No redirect needed - show content
    setIsReady(true);
  }, [pathname, router]);

  // Show loader while checking on root path (before rendering any content)
  if (!isReady && pathname === '/') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * @deprecated Use PreferredViewGuard instead which wraps children
 */
export function PreferredViewRedirect() {
  return null;
}
