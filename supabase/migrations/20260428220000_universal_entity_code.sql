-- ============================================================
-- Migration: 20260428220000_universal_entity_code
-- FEAT-04: Universal Entity Code
-- Adds an 8-char alphanumeric `code` column to all core entities.
-- ============================================================

-- ── 1. Code generator function ────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_entity_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars  text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i      integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


-- ── 2. Add `code` columns (nullable initially for backfill) ───
ALTER TABLE public.profiles   ADD COLUMN IF NOT EXISTS code varchar(8);
ALTER TABLE public.companies  ADD COLUMN IF NOT EXISTS code varchar(8);
ALTER TABLE public.projects   ADD COLUMN IF NOT EXISTS code varchar(8);
ALTER TABLE public.timesheets ADD COLUMN IF NOT EXISTS code varchar(8);


-- ── 3. Backfill existing rows with unique codes ───────────────
DO $$
DECLARE
  rec       record;
  new_code  text;
  collision boolean;
BEGIN
  -- profiles
  FOR rec IN SELECT id FROM public.profiles WHERE code IS NULL LOOP
    LOOP
      new_code  := public.generate_entity_code();
      collision := EXISTS (SELECT 1 FROM public.profiles WHERE code = new_code);
      EXIT WHEN NOT collision;
    END LOOP;
    UPDATE public.profiles SET code = new_code WHERE id = rec.id;
  END LOOP;

  -- companies
  FOR rec IN SELECT id FROM public.companies WHERE code IS NULL LOOP
    LOOP
      new_code  := public.generate_entity_code();
      collision := EXISTS (SELECT 1 FROM public.companies WHERE code = new_code);
      EXIT WHEN NOT collision;
    END LOOP;
    UPDATE public.companies SET code = new_code WHERE id = rec.id;
  END LOOP;

  -- projects
  FOR rec IN SELECT id FROM public.projects WHERE code IS NULL LOOP
    LOOP
      new_code  := public.generate_entity_code();
      collision := EXISTS (SELECT 1 FROM public.projects WHERE code = new_code);
      EXIT WHEN NOT collision;
    END LOOP;
    UPDATE public.projects SET code = new_code WHERE id = rec.id;
  END LOOP;

  -- timesheets
  FOR rec IN SELECT id FROM public.timesheets WHERE code IS NULL LOOP
    LOOP
      new_code  := public.generate_entity_code();
      collision := EXISTS (SELECT 1 FROM public.timesheets WHERE code = new_code);
      EXIT WHEN NOT collision;
    END LOOP;
    UPDATE public.timesheets SET code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;


-- ── 4. Enforce NOT NULL + UNIQUE ──────────────────────────────
ALTER TABLE public.profiles
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT profiles_code_unique UNIQUE (code);

ALTER TABLE public.companies
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT companies_code_unique UNIQUE (code);

ALTER TABLE public.projects
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT projects_code_unique UNIQUE (code);

ALTER TABLE public.timesheets
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT timesheets_code_unique UNIQUE (code);


-- ── 5. Auto-generate trigger function ─────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_generate_entity_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    NEW.code := public.generate_entity_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Attach to each table
CREATE TRIGGER trg_profiles_generate_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_entity_code();

CREATE TRIGGER trg_companies_generate_code
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_entity_code();

CREATE TRIGGER trg_projects_generate_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_entity_code();

CREATE TRIGGER trg_timesheets_generate_code
  BEFORE INSERT ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_entity_code();
