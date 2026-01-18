'use client';

import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';
import { PowerSyncProvider } from './powersync-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <PowerSyncProvider>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          </PowerSyncProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
