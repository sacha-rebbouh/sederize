-- =====================================================
-- SEDERIZE - Migration 003: Add Pending Items (Waiting For Redesign)
-- =====================================================
-- New standalone entity for tracking what we're waiting for
-- Can be linked to categories, themes, subjects, or tasks

-- =====================================================
-- 1. CREATE PENDING_ITEMS TABLE
-- =====================================================
CREATE TYPE pending_status AS ENUM ('pending', 'reminded', 'resolved');

CREATE TABLE IF NOT EXISTS public.pending_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

    -- What we're waiting for
    title TEXT NOT NULL,
    description TEXT,

    -- Optional link to one entity (only one should be set)
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,

    -- Tracking
    status pending_status DEFAULT 'pending' NOT NULL,
    reminder_date DATE,
    reminded_count INTEGER DEFAULT 0 NOT NULL,
    resolved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 2. ENABLE RLS
-- =====================================================
ALTER TABLE public.pending_items ENABLE ROW LEVEL SECURITY;

-- Pending items policies
CREATE POLICY "Users can view their own pending items"
    ON public.pending_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pending items"
    ON public.pending_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending items"
    ON public.pending_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending items"
    ON public.pending_items FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 3. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pending_items_user ON public.pending_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_items_status ON public.pending_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_items_task ON public.pending_items(task_id);
CREATE INDEX IF NOT EXISTS idx_pending_items_subject ON public.pending_items(subject_id);
CREATE INDEX IF NOT EXISTS idx_pending_items_theme ON public.pending_items(theme_id);
CREATE INDEX IF NOT EXISTS idx_pending_items_category ON public.pending_items(category_id);

-- =====================================================
-- 4. TRIGGERS
-- =====================================================
CREATE TRIGGER update_pending_items_updated_at
    BEFORE UPDATE ON public.pending_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 5. MIGRATE EXISTING WAITING_FOR TASKS (Optional)
-- =====================================================
-- This creates pending_items from tasks with status='waiting_for'
-- Uncomment if you want to migrate existing data

/*
INSERT INTO public.pending_items (user_id, title, description, task_id, status)
SELECT
    user_id,
    COALESCE(waiting_for_note, 'En attente'),
    'Migrated from task: ' || title,
    id,
    'pending'
FROM public.tasks
WHERE status = 'waiting_for' AND waiting_for_note IS NOT NULL;
*/
