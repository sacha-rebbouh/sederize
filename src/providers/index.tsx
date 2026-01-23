'use client';

import { QueryProvider } from './query-provider';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';
import { PowerSyncProvider } from './powersync-provider';
import { RelatedDataProvider } from './related-data-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <PowerSyncProvider>
            <RelatedDataProvider>
              <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
            </RelatedDataProvider>
          </PowerSyncProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
