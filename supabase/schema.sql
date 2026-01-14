-- =====================================================
-- SEDERIZE - Supabase Database Schema
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TYPE user_role AS ENUM ('user', 'admin', 'owner');

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
-- First user becomes owner, subsequent users are regular users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
    user_role_value user_role;
BEGIN
    -- Count existing profiles
    SELECT COUNT(*) INTO user_count FROM public.profiles;

    -- First user becomes owner
    IF user_count = 0 THEN
        user_role_value := 'owner';
    ELSE
        user_role_value := 'user';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        user_role_value
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. THEMES TABLE (Top-level categories)
-- =====================================================
CREATE TABLE public.themes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    color_hex TEXT DEFAULT '#6366f1' NOT NULL, -- Default indigo
    icon TEXT DEFAULT 'folder', -- Lucide icon name
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Themes policies
CREATE POLICY "Users can view their own themes"
    ON public.themes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes"
    ON public.themes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
    ON public.themes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
    ON public.themes FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 3. SUBJECTS TABLE (Projects/Companies under Themes)
-- =====================================================
CREATE TYPE subject_status AS ENUM ('active', 'archived');

CREATE TABLE public.subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    theme_id UUID REFERENCES public.themes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status subject_status DEFAULT 'active' NOT NULL,
    scratchpad TEXT, -- Persistent notes area (markdown)
    icon TEXT DEFAULT 'file-text', -- Lucide icon name
    order_index INTEGER DEFAULT 0 NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, -- For zombie detection
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Subjects policies
CREATE POLICY "Users can view their own subjects"
    ON public.subjects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subjects"
    ON public.subjects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
    ON public.subjects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
    ON public.subjects FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 4. TASKS TABLE
-- =====================================================
CREATE TYPE task_status AS ENUM ('todo', 'done', 'waiting_for');

CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE, -- Nullable for Inbox
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE, -- For subtasks
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo' NOT NULL,
    do_date DATE, -- The date user intends to work on it
    do_time TIME, -- Optional time for the task
    waiting_for_note TEXT, -- Who/what are we waiting for
    priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high
    snooze_count INTEGER DEFAULT 0, -- How many times snoozed
    order_index INTEGER DEFAULT 0 NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view their own tasks"
    ON public.tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON public.tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON public.tasks FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 4.1. TASK_ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE public.task_attachments (
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

-- =====================================================
-- 4.2. USER_PREFERENCES TABLE
-- =====================================================
CREATE TYPE theme_mode AS ENUM ('light', 'dark', 'system');
CREATE TYPE view_type AS ENUM ('daily-brief', 'inbox', 'calendar', 'kanban');

CREATE TABLE public.user_preferences (
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

-- =====================================================
-- 5. INDEXES for Performance
-- =====================================================

-- Tasks indexes
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_user_do_date ON public.tasks(user_id, do_date);
CREATE INDEX idx_tasks_subject ON public.tasks(subject_id);
CREATE INDEX idx_tasks_user_inbox ON public.tasks(user_id) WHERE subject_id IS NULL;
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id);

-- Attachments indexes
CREATE INDEX idx_attachments_task ON public.task_attachments(task_id);

-- Subjects indexes
CREATE INDEX idx_subjects_theme ON public.subjects(theme_id);
CREATE INDEX idx_subjects_user_status ON public.subjects(user_id, status);
CREATE INDEX idx_subjects_zombie ON public.subjects(user_id, last_activity_at)
    WHERE status = 'active';

-- Themes indexes
CREATE INDEX idx_themes_user ON public.themes(user_id);

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_themes_updated_at
    BEFORE UPDATE ON public.themes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update subject last_activity_at when task changes
CREATE OR REPLACE FUNCTION public.update_subject_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.subject_id IS NOT NULL THEN
        UPDATE public.subjects
        SET last_activity_at = NOW()
        WHERE id = NEW.subject_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subject_on_task_change
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_subject_activity();

-- Set completed_at when task is marked done
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_task_completion_trigger
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_completion();

-- =====================================================
-- 7. VIEWS (Optional - for convenience)
-- =====================================================

-- Daily Brief view: Tasks due today or overdue
CREATE OR REPLACE VIEW public.daily_brief AS
SELECT
    t.*,
    s.title as subject_title,
    s.theme_id,
    th.title as theme_title,
    th.color_hex as theme_color
FROM public.tasks t
LEFT JOIN public.subjects s ON t.subject_id = s.id
LEFT JOIN public.themes th ON s.theme_id = th.id
WHERE t.status = 'todo'
    AND t.do_date <= CURRENT_DATE
ORDER BY t.do_date ASC, t.priority DESC, t.order_index ASC;

-- Zombie subjects (no activity in 10+ days)
CREATE OR REPLACE VIEW public.zombie_subjects AS
SELECT s.*, th.title as theme_title, th.color_hex as theme_color
FROM public.subjects s
JOIN public.themes th ON s.theme_id = th.id
WHERE s.status = 'active'
    AND s.last_activity_at < NOW() - INTERVAL '10 days';

-- =====================================================
-- 8. ADMIN FUNCTIONS
-- =====================================================

-- Function to promote a user to owner (run as admin)
CREATE OR REPLACE FUNCTION public.make_owner(target_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles SET role = 'owner' WHERE email = target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote a user to admin
CREATE OR REPLACE FUNCTION public.make_admin(target_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE email = target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. SEED DATA (Optional - for testing)
-- =====================================================
-- Uncomment and modify as needed for testing

/*
-- Insert sample themes
INSERT INTO public.themes (user_id, title, color_hex, order_index) VALUES
    ('YOUR_USER_ID', 'Consulting', '#6366f1', 0),
    ('YOUR_USER_ID', 'Investments', '#10b981', 1),
    ('YOUR_USER_ID', 'Personal', '#f59e0b', 2);
*/

-- =====================================================
-- MANUAL ADMIN COMMANDS
-- =====================================================
-- Run these in SQL Editor after signup to manage roles:
--
-- Make yourself owner (replace with your email):
-- UPDATE public.profiles SET role = 'owner' WHERE email = 'your@email.com';
--
-- Or use the function:
-- SELECT public.make_owner('your@email.com');
--
-- Check all users and their roles:
-- SELECT email, role, created_at FROM public.profiles ORDER BY created_at;
