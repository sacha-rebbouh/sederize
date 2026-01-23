'use client';

import {
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { PowerSyncDatabase } from '@powersync/web';

// ============================================
// TEMPORARY: PowerSync is DISABLED to test if it's causing the iOS Safari crash
// If the app stops crashing with this, PowerSync WASM is the problem
// ============================================

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
};

const PowerSyncStateContext = createContext<PowerSyncState>(defaultState);

// ============================================
// PROVIDER (DISABLED - just passes through children)
// ============================================
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  // PowerSync is disabled - just render children with default (null) context
  // This forces all hooks to fall back to Supabase queries
  return (
    <PowerSyncStateContext.Provider value={defaultState}>
      {children}
    </PowerSyncStateContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

export function usePowerSyncState(): PowerSyncState {
  return useContext(PowerSyncStateContext);
}

export function usePowerSyncDb(): PowerSyncDatabase | null {
  return null; // Always null when disabled
}

export function usePowerSyncReady(): boolean {
  return false; // Always false when disabled - forces Supabase fallback
}
