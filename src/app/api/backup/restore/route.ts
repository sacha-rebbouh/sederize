import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Tables to restore in order (respecting foreign key dependencies)
const TABLES_TO_RESTORE = [
  'categories',
  'themes',
  'subjects',
  'labels',
  'tasks',
  'task_labels',
  'task_attachments',
  'pending_items',
  'user_preferences',
];

// Tables to clear before restore (in reverse order to respect FK)
const TABLES_TO_CLEAR = [...TABLES_TO_RESTORE].reverse();

interface BackupData {
  version: string;
  created_at: string;
  user_id: string;
  tables: Record<string, unknown[]>;
}

// POST: Restore from uploaded backup file
export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create client with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse backup data from request body
    const backupData: BackupData = await request.json();

    // Validate backup format
    if (!backupData.version || !backupData.tables || !backupData.user_id) {
      return NextResponse.json(
        { error: 'Invalid backup format' },
        { status: 400 }
      );
    }

    // Security: Only allow restoring own data (backup user_id must match current user)
    if (backupData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Backup belongs to a different user' },
        { status: 403 }
      );
    }

    // Use service role client to bypass RLS for restore
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results: { table: string; deleted: number; inserted: number; error?: string }[] = [];

    // Step 1: Clear existing data (in reverse FK order)
    for (const tableName of TABLES_TO_CLEAR) {
      try {
        if (tableName === 'task_labels') {
          // task_labels needs special handling - delete by task_id
          const { data: userTasks } = await serviceClient
            .from('tasks')
            .select('id')
            .eq('user_id', user.id);

          const taskIds = (userTasks || []).map((t: { id: string }) => t.id);
          if (taskIds.length > 0) {
            await serviceClient
              .from('task_labels')
              .delete()
              .in('task_id', taskIds);
          }
        } else {
          await serviceClient
            .from(tableName)
            .delete()
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.error(`Error clearing ${tableName}:`, err);
      }
    }

    // Step 2: Insert backup data (in FK order)
    for (const tableName of TABLES_TO_RESTORE) {
      const tableData = backupData.tables[tableName] || [];
      let insertedCount = 0;

      if (tableData.length === 0) {
        results.push({ table: tableName, deleted: 0, inserted: 0 });
        continue;
      }

      try {
        // Ensure user_id matches current user for all records
        const sanitizedData = tableData.map((record) => {
          const rec = record as Record<string, unknown>;
          if ('user_id' in rec) {
            return { ...rec, user_id: user.id };
          }
          return rec;
        });

        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < sanitizedData.length; i += batchSize) {
          const batch = sanitizedData.slice(i, i + batchSize);
          const { error } = await serviceClient
            .from(tableName)
            .insert(batch);

          if (error) {
            console.error(`Error inserting into ${tableName}:`, error);
            results.push({
              table: tableName,
              deleted: 0,
              inserted: insertedCount,
              error: error.message,
            });
            break;
          }
          insertedCount += batch.length;
        }

        if (!results.find((r) => r.table === tableName)) {
          results.push({
            table: tableName,
            deleted: 0,
            inserted: insertedCount,
          });
        }
      } catch (err) {
        console.error(`Error restoring ${tableName}:`, err);
        results.push({
          table: tableName,
          deleted: 0,
          inserted: insertedCount,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const totalInserted = results.reduce((acc, r) => acc + r.inserted, 0);
    const hasErrors = results.some((r) => r.error);

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors
        ? 'Restore completed with some errors'
        : 'Restore completed successfully',
      backup_date: backupData.created_at,
      total_records_restored: totalInserted,
      results,
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
