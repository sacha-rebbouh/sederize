-- =====================================================
-- SEDERIZE - Migration 001: v1 Enhancements
-- =====================================================
-- Run this SQL in your Supabase SQL Editor AFTER initial schema.sql

-- =====================================================
-- 1. TASKS ENHANCEMENTS
-- =====================================================

-- Add time field for tasks with specific hours
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS do_time TIME;

-- Add snooze counter to track how many times a task was postponed
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS snooze_count INTEGER DEFAULT 0;

-- Add parent_task_id for subtasks support
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index for subtasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- =====================================================
-- 2. ATTACHMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- MIME type
    file_size INTEGER NOT NULL, -- bytes
    storage_path TEXT NOT NULL, -- Supabase Storage path
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Attachments policies
CREATE POLICY "Users can view their own attachments"
    ON public.task_attachments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attachments"
    ON public.task_attachments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
    ON public.task_attachments FOR DELETE
    USING (auth.uid() = user_id);

-- Index for attachment queries
CREATE INDEX IF NOT EXISTS idx_attachments_task ON public.task_attachments(task_id);

-- =====================================================
-- 3. USER PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    preferred_view TEXT DEFAULT 'daily-brief', -- 'daily-brief' | 'inbox' | 'calendar' | 'kanban'
    sidebar_collapsed BOOLEAN DEFAULT false,
    theme_mode TEXT DEFAULT 'system', -- 'light' | 'dark' | 'system'
    email_digest_enabled BOOLEAN DEFAULT true,
    email_digest_time TIME DEFAULT '07:00',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Preferences policies
CREATE POLICY "Users can view their own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Auto-create preferences on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_created_preferences') THEN
        CREATE TRIGGER on_profile_created_preferences
            AFTER INSERT ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_preferences();
    END IF;
END $$;

-- Update updated_at for preferences
CREATE TRIGGER update_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 4. UPDATE SNOOZE FUNCTION
-- =====================================================

-- Function to increment snooze_count when task is snoozed
CREATE OR REPLACE FUNCTION public.handle_task_snooze()
RETURNS TRIGGER AS $$
BEGIN
    -- If do_date changed and task is still todo, increment snooze counter
    IF OLD.do_date IS DISTINCT FROM NEW.do_date
       AND NEW.status = 'todo'
       AND OLD.do_date IS NOT NULL
       AND NEW.do_date > OLD.do_date THEN
        NEW.snooze_count = COALESCE(OLD.snooze_count, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_task_snooze_trigger') THEN
        CREATE TRIGGER handle_task_snooze_trigger
            BEFORE UPDATE ON public.tasks
            FOR EACH ROW EXECUTE FUNCTION public.handle_task_snooze();
    END IF;
END $$;

-- =====================================================
-- 5. STORAGE BUCKET FOR ATTACHMENTS
-- =====================================================
-- Note: Run this in the Supabase Dashboard > Storage > Create Bucket
-- Bucket name: task-attachments
-- Public: No
-- File size limit: 10MB
-- Allowed MIME types: image/*, application/pdf, text/*, application/msword,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--   application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

-- Storage policies (run in Storage > Policies)
/*
-- SELECT policy
CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- INSERT policy
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE policy
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- =====================================================
-- 6. UPDATED VIEWS
-- =====================================================

-- Drop and recreate daily_brief view with new fields
DROP VIEW IF EXISTS public.daily_brief;
CREATE VIEW public.daily_brief AS
SELECT
    t.*,
    s.title as subject_title,
    s.theme_id,
    th.title as theme_title,
    th.color_hex as theme_color,
    (SELECT COUNT(*) FROM public.tasks st WHERE st.parent_task_id = t.id) as subtask_count,
    (SELECT COUNT(*) FROM public.tasks st WHERE st.parent_task_id = t.id AND st.status = 'done') as subtask_done_count
FROM public.tasks t
LEFT JOIN public.subjects s ON t.subject_id = s.id
LEFT JOIN public.themes th ON s.theme_id = th.id
WHERE t.status = 'todo'
    AND t.do_date <= CURRENT_DATE
    AND t.parent_task_id IS NULL -- Only show parent tasks
ORDER BY
    t.priority DESC, -- Urgent first
    t.do_time ASC NULLS LAST, -- Tasks with time first
    t.do_date ASC,
    t.order_index ASC;

-- =====================================================
-- 7. BACKFILL EXISTING DATA
-- =====================================================

-- Set snooze_count to 0 for existing tasks
UPDATE public.tasks SET snooze_count = 0 WHERE snooze_count IS NULL;

-- Create preferences for existing users
INSERT INTO public.user_preferences (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_preferences)
ON CONFLICT (user_id) DO NOTHING;
