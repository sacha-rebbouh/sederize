-- =====================================================
-- SEDERIZE - Migration 004: Add Labels
-- =====================================================
-- Labels allow cross-cutting categorization of tasks

-- =====================================================
-- 1. CREATE LABELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.labels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color_hex TEXT DEFAULT '#6366f1' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, name)
);

-- =====================================================
-- 2. CREATE JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.task_labels (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    label_id UUID REFERENCES public.labels(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (task_id, label_id)
);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

-- Labels policies
CREATE POLICY "Users can view their own labels"
    ON public.labels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labels"
    ON public.labels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labels"
    ON public.labels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labels"
    ON public.labels FOR DELETE
    USING (auth.uid() = user_id);

-- Task labels policies (based on label ownership)
CREATE POLICY "Users can view their own task labels"
    ON public.task_labels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.labels
            WHERE labels.id = task_labels.label_id
            AND labels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own task labels"
    ON public.task_labels FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.labels
            WHERE labels.id = task_labels.label_id
            AND labels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own task labels"
    ON public.task_labels FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.labels
            WHERE labels.id = task_labels.label_id
            AND labels.user_id = auth.uid()
        )
    );

-- =====================================================
-- 4. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_labels_user ON public.labels(user_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_task ON public.task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label ON public.task_labels(label_id);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
CREATE TRIGGER update_labels_updated_at
    BEFORE UPDATE ON public.labels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
