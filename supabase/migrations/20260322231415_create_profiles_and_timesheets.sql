-- ============================================================
-- Migration: 20260322231415_create_profiles_and_timesheets
-- Applied: 2026-03-22 (initial MVP)
-- This file is a historical record of the schema applied via Supabase dashboard.
-- ============================================================

CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  email      text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_all"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id);

CREATE TABLE public.timesheets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id),
  date             date NOT NULL,
  start_time       time NOT NULL,
  end_time         time NOT NULL,
  duration_minutes integer,
  project          text NOT NULL,
  description      text,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'submitted', 'approved')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheets_own_all"
  ON public.timesheets
  FOR ALL
  USING (auth.uid() = user_id);
