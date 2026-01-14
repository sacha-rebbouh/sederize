-- =====================================================
-- SEDERIZE - Migration 005: Fix Subtasks & Attachments
-- =====================================================
-- Cette migration corrige les tables manquantes pour subtasks et attachments

-- 1. Add parent_task_id column to tasks if not exists
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Index for subtasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- 2. Create task_attachments table using gen_random_uuid() (Supabase native)
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can create their own attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.task_attachments;

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
