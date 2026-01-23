'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { PowerSyncContext } from '@powersync/react';
import {
  PowerSyncDatabase,
  SyncStatus,
  WASQLiteOpenFactory,
  WASQLiteVFS
} from '@powersync/web';
import { AppSchema } from '@/lib/powersync/schema';
import { SupabaseConnector } from '@/lib/powersync/connector';
import { useAuth } from './auth-provider';

// ============================================
// SAFARI/iOS DETECTION
// ============================================
function isSafariOrIOS(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;

  // iOS detection (all browsers on iOS are WebKit-based)
  const iOS = /iPad|iPhone|iPod/.test(ua);
  if (iOS) return true;

  // macOS Safari detection
  const isMac = /Macintosh/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);

  return isMac && isSafari;
}

// ============================================
// TYPES
// ============================================
interface PowerSyncState {
  db: PowerSyncDatabase | null;
  isConnected: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  pendingChangesCount: number;
  lastSyncedAt: Date | null;
  syncError: Error | null;
  triggerSync: () => Promise<void>;
  isDisabled: boolean;
}

// ============================================
// CONTEXT
// ============================================
const defaultState: PowerSyncState = {
  db: null,
  isConnected: false,
  isSyncing: false,
  hasPendingChanges: false,
  pendingChangesCount: 0,
  lastSyncedAt: null,
  syncError: null,
  triggerSync: async () => {},
  isDisabled: false,
};

const PowerSyncStateContext = createContext<PowerSyncState>(defaultState);

// ============================================
// PROVIDER
// ============================================
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();

  // State
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingChanges] = useState(false);
  const [pendingChangesCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  // Ref to track if PowerSync has been initialized
  const initRef = useRef(false);
  const powerSyncRef = useRef<PowerSyncDatabase | null>(null);

  // Initialize PowerSync
  useEffect(() => {
    // Skip if no user/session
    if (!user || !session) {
      if (powerSyncRef.current) {
        console.log('[PowerSync] User logged out, disconnecting...');
        powerSyncRef.current.disconnectAndClear().catch(console.error);
        powerSyncRef.current = null;
        setDb(null);
        setIsConnected(false);
        setIsSyncing(false);
        initRef.current = false;
      }
      return;
    }

    // Check if PowerSync URL is configured
    if (!process.env.NEXT_PUBLIC_POWERSYNC_URL) {
      console.warn('[PowerSync] URL not configured, using Supabase only');
      setIsDisabled(true);
      return;
    }

    // Skip if already initialized
    if (initRef.current) return;
    initRef.current = true;

    let isMounted = true;

    const initPowerSync = async () => {
      try {
        // Use OPFSCoopSyncVFS for Safari/iOS (better compatibility)
        // Use IDBBatchAtomicVFS for other browsers (better performance)
        const useSafariVFS = isSafariOrIOS();
        const vfs = useSafariVFS
          ? WASQLiteVFS.OPFSCoopSyncVFS
          : WASQLiteVFS.IDBBatchAtomicVFS;

        console.log(`[PowerSync] Initializing with VFS: ${vfs} (Safari/iOS: ${useSafariVFS})`);

        const dbFilename = `sederize-${user.id}.db`;

        const powerSync = new PowerSyncDatabase({
          schema: AppSchema,
          database: new WASQLiteOpenFactory({
            dbFilename,
            vfs,
          }),
          flags: {
            enableMultiTabs: typeof SharedWorker !== 'undefined',
          },
        });
        powerSyncRef.current = powerSync;

        // Status listener with guards
        let lastConnected = false;
        let lastSyncing = false;

        powerSync.registerListener({
          statusChanged: (status: SyncStatus) => {
            if (!isMounted) return;

            const connected = status.connected ?? false;
            const syncing =
              (status.dataFlowStatus?.uploading ?? false) ||
              (status.dataFlowStatus?.downloading ?? false);

            if (connected !== lastConnected) {
              lastConnected = connected;
              setIsConnected(connected);
            }
            if (syncing !== lastSyncing) {
              lastSyncing = syncing;
              setIsSyncing(syncing);
            }
          },
        });

        // Init with timeout
        const initPromise = powerSync.init();
        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('PowerSync init timeout')), 5000)
        );

        try {
          await Promise.race([initPromise, timeoutPromise]);
        } catch (e) {
          console.warn('[PowerSync] Init failed:', e);
          setIsDisabled(true);
          initRef.current = false;
          return;
        }

        // Connect
        const connector = new SupabaseConnector();
        await powerSync.connect(connector);

        if (isMounted) {
          setDb(powerSync);
          setSyncError(null);
          console.log('[PowerSync] Connected successfully');
        }
      } catch (error) {
        console.error('[PowerSync] Error:', error);
        if (isMounted) {
          setSyncError(error instanceof Error ? error : new Error(String(error)));
          setIsDisabled(true);
          initRef.current = false;
        }
      }
    };

    initPowerSync();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (powerSyncRef.current) {
        powerSyncRef.current.disconnectAndClear().catch(console.error);
      }
    };
  }, []);

  // Manual sync
  const triggerSync = useCallback(async () => {
    if (!db) return;
    try {
      setIsSyncing(true);
      const connector = new SupabaseConnector();
      await db.connect(connector);
      setLastSyncedAt(new Date());
      setSyncError(null);
    } catch (error) {
      console.error('[PowerSync] Sync error:', error);
      setSyncError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsSyncing(false);
    }
  }, [db]);

  // Context value
  const contextValue = useMemo<PowerSyncState>(
    () => ({
      db,
      isConnected,
      isSyncing,
      hasPendingChanges,
      pendingChangesCount,
      lastSyncedAt,
      syncError,
      triggerSync,
      isDisabled,
    }),
    [db, isConnected, isSyncing, hasPendingChanges, pendingChangesCount, lastSyncedAt, syncError, triggerSync, isDisabled]
  );

  // IMPORTANT: Always render the same structure to avoid remounts
  // Use a stable wrapper div instead of conditional rendering
  return (
    <PowerSyncStateContext.Provider value={contextValue}>
      <PowerSyncContextWrapper db={db}>
        {children}
      </PowerSyncContextWrapper>
    </PowerSyncStateContext.Provider>
  );
}

// Separate component to handle the PowerSync context
// This prevents the conditional rendering issue
function PowerSyncContextWrapper({
  db,
  children
}: {
  db: PowerSyncDatabase | null;
  children: ReactNode;
}) {
  // Always provide context, but with null db if not ready
  // The hooks will check for null and fall back to Supabase
  if (db) {
    return (
      <PowerSyncContext.Provider value={db}>
        {children}
      </PowerSyncContext.Provider>
    );
  }
  return <>{children}</>;
}

// ============================================
// HOOKS
// ============================================

export function usePowerSyncState(): PowerSyncState {
  return useContext(PowerSyncStateContext);
}

export function usePowerSyncDb(): PowerSyncDatabase | null {
  const { db } = usePowerSyncState();
  return db;
}

export function usePowerSyncReady(): boolean {
  const { db, isConnected, isDisabled } = usePowerSyncState();
  // Return false if disabled, forcing Supabase fallback
  if (isDisabled) return false;
  return !!db && isConnected;
}
