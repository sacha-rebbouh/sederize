'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase, SyncStatus } from '@powersync/web';
import { AppSchema } from '@/lib/powersync/schema';
import { SupabaseConnector } from '@/lib/powersync/connector';
import { useAuth } from './auth-provider';

// ============================================
// TYPES
// ============================================
interface PowerSyncState {
  /** The PowerSync database instance */
  db: PowerSyncDatabase | null;
  /** Whether PowerSync is connected to the server */
  isConnected: boolean;
  /** Whether PowerSync is currently syncing data */
  isSyncing: boolean;
  /** Whether there are pending local changes not yet synced */
  hasPendingChanges: boolean;
  /** Number of pending local changes */
  pendingChangesCount: number;
  /** Last sync timestamp */
  lastSyncedAt: Date | null;
  /** Any sync error */
  syncError: Error | null;
  /** Manually trigger a sync */
  triggerSync: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================
const PowerSyncStateContext = createContext<PowerSyncState>({
  db: null,
  isConnected: false,
  isSyncing: false,
  hasPendingChanges: false,
  pendingChangesCount: 0,
  lastSyncedAt: null,
  syncError: null,
  triggerSync: async () => {},
});

// ============================================
// PROVIDER
// ============================================
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();

  // State
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Initialize PowerSync when user authenticates
  useEffect(() => {
    // Skip if no user or already initialized for this user
    if (!user || !session) {
      // Clean up if user logs out
      if (db) {
        console.log('[PowerSync] User logged out, disconnecting...');
        db.disconnectAndClear().catch(console.error);
        setDb(null);
        setIsConnected(false);
        setIsSyncing(false);
        setHasPendingChanges(false);
        setPendingChangesCount(0);
        setLastSyncedAt(null);
        setSyncError(null);
      }
      return;
    }

    // Check if PowerSync URL is configured
    if (!process.env.NEXT_PUBLIC_POWERSYNC_URL) {
      console.warn('[PowerSync] NEXT_PUBLIC_POWERSYNC_URL not configured, running in online-only mode');
      return;
    }

    let powerSync: PowerSyncDatabase | null = null;
    let isMounted = true;

    const initPowerSync = async () => {
      try {
        console.log('[PowerSync] Initializing...');

        // Create PowerSync instance
        powerSync = new PowerSyncDatabase({
          schema: AppSchema,
          database: {
            dbFilename: `sederize-${user.id}.db`,
          },
        });

        // Set up status listener with state change guards
        let lastConnected = false;
        let lastSyncing = false;

        powerSync.registerListener({
          statusChanged: (status: SyncStatus) => {
            if (!isMounted) return;

            const connected = status.connected ?? false;
            const syncing =
              (status.dataFlowStatus?.uploading ?? false) ||
              (status.dataFlowStatus?.downloading ?? false);

            // Only update state if values actually changed
            if (connected !== lastConnected) {
              lastConnected = connected;
              setIsConnected(connected);
            }
            if (syncing !== lastSyncing) {
              lastSyncing = syncing;
              setIsSyncing(syncing);
            }

            // Don't update lastSyncedAt on every sync - it causes re-renders
            // The sync indicator can just show "synced" without the timestamp
          },
        });

        // Initialize the database with timeout fallback for browsers that block WASM
        const initPromise = powerSync.init();
        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('PowerSync init timeout')), 5000)
        );

        try {
          await Promise.race([initPromise, timeoutPromise]);
        } catch {
          console.warn('[PowerSync] init() failed or timed out, running in online-only mode');
          // Don't throw - allow app to work without PowerSync (e.g., Brave browser)
          return;
        }

        // Create connector and connect
        const connector = new SupabaseConnector();
        await powerSync.connect(connector);

        if (isMounted) {
          setDb(powerSync);
          setSyncError(null);
          console.log('[PowerSync] Connected successfully');
        }
      } catch (error) {
        console.error('[PowerSync] Initialization error:', error);
        if (isMounted) {
          setSyncError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    initPowerSync();

    // Cleanup on unmount or user change
    return () => {
      isMounted = false;
      if (powerSync) {
        console.log('[PowerSync] Cleaning up...');
        powerSync.disconnectAndClear().catch(console.error);
      }
    };
  // Only depend on user.id - NOT session.access_token
  // Token refreshes should NOT trigger PowerSync re-initialization
  // The SupabaseConnector handles token refreshes internally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Check for pending changes periodically
  // Use refs to avoid unnecessary state updates
  useEffect(() => {
    if (!db) return;

    let lastHasPending = false;
    let lastCount = 0;

    const checkPendingChanges = async () => {
      try {
        const transaction = await db.getNextCrudTransaction();
        const hasPending = !!transaction;
        const count = hasPending && transaction ? transaction.crud.length : 0;

        // Only update state if values actually changed
        if (hasPending !== lastHasPending) {
          lastHasPending = hasPending;
          setHasPendingChanges(hasPending);
        }
        if (count !== lastCount) {
          lastCount = count;
          setPendingChangesCount(count);
        }
      } catch {
        // Ignore errors during pending check
      }
    };

    // Check immediately
    checkPendingChanges();

    // Check every 30 seconds instead of 5 (reduce frequency)
    const interval = setInterval(checkPendingChanges, 30000);

    return () => clearInterval(interval);
  }, [db]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!db) return;

    try {
      setIsSyncing(true);
      // Trigger a sync by reconnecting
      const connector = new SupabaseConnector();
      await db.connect(connector);
      setLastSyncedAt(new Date());
      setSyncError(null);
    } catch (error) {
      console.error('[PowerSync] Manual sync error:', error);
      setSyncError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsSyncing(false);
    }
  }, [db]);

  // Memoize context value
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
    }),
    [
      db,
      isConnected,
      isSyncing,
      hasPendingChanges,
      pendingChangesCount,
      lastSyncedAt,
      syncError,
      triggerSync,
    ]
  );

  return (
    <PowerSyncStateContext.Provider value={contextValue}>
      {/* Also provide the PowerSync React context for useQuery hooks */}
      {/* PowerSyncContext expects non-null db, so only provide when available */}
      {db ? (
        <PowerSyncContext.Provider value={db}>
          {children}
        </PowerSyncContext.Provider>
      ) : (
        children
      )}
    </PowerSyncStateContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

/**
 * Get the PowerSync state (connection status, sync status, etc.)
 */
export function usePowerSyncState(): PowerSyncState {
  const context = useContext(PowerSyncStateContext);
  if (!context) {
    throw new Error('usePowerSyncState must be used within a PowerSyncProvider');
  }
  return context;
}

/**
 * Get the PowerSync database instance
 * Returns null if not initialized
 */
export function usePowerSyncDb(): PowerSyncDatabase | null {
  const { db } = usePowerSyncState();
  return db;
}

/**
 * Check if PowerSync is ready (initialized and connected)
 */
export function usePowerSyncReady(): boolean {
  const { db, isConnected } = usePowerSyncState();
  return !!db && isConnected;
}
