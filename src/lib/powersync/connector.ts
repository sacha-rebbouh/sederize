/**
 * PowerSync Connector for Supabase
 * Handles authentication and bidirectional sync with Supabase
 */

import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/web';
import { createClient } from '@/lib/supabase/client';

// Table names that support sync
const SYNCABLE_TABLES = [
  'categories',
  'themes',
  'subjects',
  'tasks',
  'labels',
  'task_labels',
  'pending_items',
  'user_preferences',
  'task_attachments',
] as const;

type SyncableTable = (typeof SYNCABLE_TABLES)[number];

export class SupabaseConnector implements PowerSyncBackendConnector {
  private supabase = createClient();

  /**
   * Fetch credentials for PowerSync connection
   * Returns the PowerSync endpoint and JWT token from Supabase session
   */
  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (error) {
      console.error('[PowerSync] Auth error:', error);
      throw error;
    }

    if (!session) {
      throw new Error('Not authenticated - no session available');
    }

    const powerSyncUrl = process.env.NEXT_PUBLIC_POWERSYNC_URL;
    if (!powerSyncUrl) {
      throw new Error('NEXT_PUBLIC_POWERSYNC_URL is not configured');
    }

    return {
      endpoint: powerSyncUrl,
      token: session.access_token,
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000)
        : undefined,
    };
  }

  /**
   * Upload local changes to Supabase
   * Called by PowerSync when there are pending local changes
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      // No pending changes
      return;
    }

    let lastOp: CrudEntry | null = null;

    try {
      for (const op of transaction.crud) {
        lastOp = op;
        await this.processOperation(op);
      }

      // Mark transaction as complete
      await transaction.complete();
    } catch (error) {
      console.error(
        '[PowerSync] Upload error:',
        error,
        'Last operation:',
        lastOp
      );

      // Rethrow to let PowerSync handle retry logic
      throw error;
    }
  }

  /**
   * Process a single CRUD operation
   */
  private async processOperation(op: CrudEntry): Promise<void> {
    const table = op.table as SyncableTable;

    // Validate table is syncable
    if (!SYNCABLE_TABLES.includes(table)) {
      console.warn(`[PowerSync] Skipping unsupported table: ${table}`);
      return;
    }

    // Get the record data
    const record = { ...op.opData, id: op.id };

    switch (op.op) {
      case UpdateType.PUT:
        // INSERT or full UPDATE (upsert)
        await this.upsertRecord(table, record);
        break;

      case UpdateType.PATCH:
        // Partial UPDATE
        if (op.opData) {
          await this.updateRecord(table, op.id, op.opData);
        }
        break;

      case UpdateType.DELETE:
        // DELETE
        await this.deleteRecord(table, op.id);
        break;

      default:
        console.warn(`[PowerSync] Unknown operation type: ${op.op}`);
    }
  }

  /**
   * Upsert a record (INSERT or full UPDATE)
   */
  private async upsertRecord(
    table: SyncableTable,
    record: Record<string, unknown>
  ): Promise<void> {
    // Clean up the record - remove null values for required fields
    const cleanRecord = this.cleanRecord(record);

    const { error } = await this.supabase.from(table).upsert(cleanRecord, {
      onConflict: 'id',
    });

    if (error) {
      console.error(`[PowerSync] Upsert error on ${table}:`, error);
      throw error;
    }
  }

  /**
   * Update a record partially
   */
  private async updateRecord(
    table: SyncableTable,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const cleanData = this.cleanRecord(data);

    const { error } = await this.supabase
      .from(table)
      .update(cleanData)
      .eq('id', id);

    if (error) {
      console.error(`[PowerSync] Update error on ${table}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  private async deleteRecord(table: SyncableTable, id: string): Promise<void> {
    const { error } = await this.supabase.from(table).delete().eq('id', id);

    if (error) {
      console.error(`[PowerSync] Delete error on ${table}:`, error);
      throw error;
    }
  }

  /**
   * Clean record for Supabase - convert empty strings to null, etc.
   */
  private cleanRecord(
    record: Record<string, unknown>
  ): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      // Skip internal PowerSync fields
      if (key.startsWith('_')) continue;

      // Convert empty strings to null for optional fields
      if (value === '') {
        cleaned[key] = null;
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }
}

// Singleton instance
let connectorInstance: SupabaseConnector | null = null;

export function getConnector(): SupabaseConnector {
  if (!connectorInstance) {
    connectorInstance = new SupabaseConnector();
  }
  return connectorInstance;
}
