-- =====================================================
-- MIGRATION 001: Add missing columns to tasks table
-- =====================================================
-- Run this in Supabase SQL Editor to fix the schema

-- 1. Add do_time column for time support
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS do_time TIME;

-- 2. Add snooze_count column for snooze counter
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS snooze_count INTEGER DEFAULT 0;

-- 3. Add parent_task_id for subtasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index for subtasks
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);

-- =====================================================
-- 4. Create task_attachments table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
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

-- Index for attachments
CREATE INDEX IF NOT EXISTS idx_attachments_task ON public.task_attachments(task_id);

-- =====================================================
-- 5. Create user_preferences table
-- =====================================================
CREATE TYPE IF NOT EXISTS theme_mode AS ENUM ('light', 'dark', 'system');
CREATE TYPE IF NOT EXISTS view_type AS ENUM ('daily-brief', 'inbox', 'calendar', 'kanban');

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    preferred_view view_type DEFAULT 'daily-brief' NOT NULL,
    sidebar_collapsed BOOLEAN DEFAULT false NOT NULL,
    theme_mode theme_mode DEFAULT 'system' NOT NULL,
    email_digest_enabled BOOLEAN DEFAULT false NOT NULL,
    email_digest_time TIME DEFAULT '08:00' NOT NULL,
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

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 6. Create Storage bucket for attachments
-- =====================================================
-- Note: Run this separately or via Supabase dashboard
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('task-attachments', 'task-attachments', false);

-- Storage policies
-- CREATE POLICY "Users can upload attachments"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their attachments"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their attachments"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- VERIFICATION: Check that columns exist
-- =====================================================
-- Run this to verify the migration worked:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'tasks';
