import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// GET: Get backup status for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create client with user's token to verify auth
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

    // Use service role client for storage operations
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const backupFileName = `backup-${user.id}.json`;

    // Check if backup exists and get metadata
    const { data: files, error } = await serviceClient.storage
      .from('backups')
      .list('', {
        search: backupFileName,
      });

    if (error) {
      console.error('Status check error:', error);
      return NextResponse.json(
        { error: 'Failed to check backup status' },
        { status: 500 }
      );
    }

    const backupFile = files?.find((f) => f.name === backupFileName);

    if (!backupFile) {
      return NextResponse.json({
        exists: false,
        message: 'No backup found',
      });
    }

    // Download and parse to get backup metadata
    const { data: fileData } = await serviceClient.storage
      .from('backups')
      .download(backupFileName);

    let backupInfo = null;
    if (fileData) {
      try {
        const content = await fileData.text();
        const parsed = JSON.parse(content);
        backupInfo = {
          version: parsed.version,
          created_at: parsed.created_at,
          tables_count: Object.keys(parsed.tables || {}).length,
          total_records: Object.values(parsed.tables || {}).reduce(
            (acc: number, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
            0
          ),
        };
      } catch {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      exists: true,
      file_size: backupFile.metadata?.size || 0,
      updated_at: backupFile.updated_at,
      ...backupInfo,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
