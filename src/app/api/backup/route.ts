import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Tables to backup in order (respecting foreign key dependencies)
const TABLES_TO_BACKUP = [
  'profiles',
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

interface BackupData {
  version: string;
  created_at: string;
  user_id: string;
  tables: Record<string, unknown[]>;
}

// POST: Trigger backup for authenticated user (manual from settings)
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

    // Export all user data
    const backupData = await exportUserData(supabase, user.id);

    // Store backup in Supabase Storage
    const backupFileName = `backup-${user.id}.json`;
    const backupContent = JSON.stringify(backupData, null, 2);

    // Use service role client for storage operations
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete previous backup if exists
    await serviceClient.storage
      .from('backups')
      .remove([backupFileName]);

    // Upload new backup
    const { error: uploadError } = await serviceClient.storage
      .from('backups')
      .upload(backupFileName, backupContent, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to store backup', details: uploadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      created_at: backupData.created_at,
      tables_count: Object.keys(backupData.tables).length,
      total_records: Object.values(backupData.tables).reduce(
        (acc, arr) => acc + arr.length,
        0
      ),
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Trigger backup via cron (automatic daily backup for all users)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client to bypass RLS
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email');

    if (profilesError) {
      console.error('Failed to fetch profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const results: { user_id: string; email: string; success: boolean; error?: string }[] = [];

    // Backup each user's data
    for (const profile of profiles || []) {
      try {
        const backupData = await exportUserData(serviceClient, profile.id);
        const backupFileName = `backup-${profile.id}.json`;
        const backupContent = JSON.stringify(backupData, null, 2);

        // Delete previous backup
        await serviceClient.storage
          .from('backups')
          .remove([backupFileName]);

        // Upload new backup
        const { error: uploadError } = await serviceClient.storage
          .from('backups')
          .upload(backupFileName, backupContent, {
            contentType: 'application/json',
            upsert: true,
          });

        if (uploadError) {
          results.push({
            user_id: profile.id,
            email: profile.email,
            success: false,
            error: uploadError.message,
          });
        } else {
          results.push({
            user_id: profile.id,
            email: profile.email,
            success: true,
          });
        }
      } catch (err) {
        results.push({
          user_id: profile.id,
          email: profile.email,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Backup completed: ${successCount} success, ${failCount} failed`,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Cron backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportUserData(
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<BackupData> {
  const tables: Record<string, unknown[]> = {};

  for (const tableName of TABLES_TO_BACKUP) {
    try {
      // Most tables filter by user_id, some by different columns
      const baseQuery = supabase.from(tableName).select('*');

      if (tableName === 'profiles') {
        const { data, error } = await baseQuery.eq('id', userId);
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          tables[tableName] = [];
        } else {
          tables[tableName] = data || [];
        }
      } else if (tableName === 'task_labels') {
        // task_labels needs to be filtered by tasks belonging to user
        const { data: userTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', userId);

        const taskIds = (userTasks || []).map((t: { id: string }) => t.id);
        if (taskIds.length === 0) {
          tables[tableName] = [];
          continue;
        }
        const { data, error } = await baseQuery.in('task_id', taskIds);
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          tables[tableName] = [];
        } else {
          tables[tableName] = data || [];
        }
      } else {
        const { data, error } = await baseQuery.eq('user_id', userId);
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          tables[tableName] = [];
        } else {
          tables[tableName] = data || [];
        }
      }
    } catch (err) {
      console.error(`Error processing ${tableName}:`, err);
      tables[tableName] = [];
    }
  }

  return {
    version: '1.0',
    created_at: new Date().toISOString(),
    user_id: userId,
    tables,
  };
}
