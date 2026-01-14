-- =====================================================
-- SEDERIZE - Migration 002: Add Categories (4-level hierarchy)
-- =====================================================
-- New hierarchy: Category > Theme > Subject > Task
-- Example: Immobilier > Jerusalem > Fuites > Envoyer document assurance

-- =====================================================
-- 1. CREATE CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    color_hex TEXT DEFAULT '#6366f1' NOT NULL,
    icon TEXT DEFAULT 'folder',
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 2. ADD CATEGORY_ID TO THEMES
-- =====================================================
ALTER TABLE public.themes
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- =====================================================
-- 3. ENABLE RLS ON CATEGORIES
-- =====================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view their own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 4. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_themes_category ON public.themes(category_id);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 6. CREATE DEFAULT CATEGORY FOR EXISTING THEMES
-- =====================================================
-- This migrates existing themes that don't have a category
-- by creating a "General" category for each user with uncategorized themes

DO $$
DECLARE
    user_record RECORD;
    new_category_id UUID;
BEGIN
    -- For each user that has themes without categories
    FOR user_record IN
        SELECT DISTINCT user_id
        FROM public.themes
        WHERE category_id IS NULL
    LOOP
        -- Create a "General" category
        INSERT INTO public.categories (user_id, title, color_hex, icon, order_index)
        VALUES (user_record.user_id, 'General', '#64748b', 'folder', 0)
        RETURNING id INTO new_category_id;

        -- Assign all uncategorized themes to this category
        UPDATE public.themes
        SET category_id = new_category_id
        WHERE user_id = user_record.user_id AND category_id IS NULL;
    END LOOP;
END $$;
