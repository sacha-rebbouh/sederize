-- Migration: Add backup storage bucket
-- This creates a private bucket for storing user backups

-- Create the backups bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow service role to manage all files
-- (The backup API uses service_role key, so no user-specific policies needed)
-- Service role bypasses RLS automatically

-- Optional: If you want users to read their own backups directly (not recommended)
-- CREATE POLICY "Users can read own backups"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'backups' AND auth.uid()::text = split_part(name, '-', 2));
