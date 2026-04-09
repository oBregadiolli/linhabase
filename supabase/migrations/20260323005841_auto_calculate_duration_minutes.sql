-- ============================================================
-- Migration: 20260323005841_auto_calculate_duration_minutes
-- Applied: 2026-03-23 (MVP duration trigger)
-- Consolidates both duration trigger attempts into a single file.
-- Historical record of triggers applied via Supabase dashboard.
-- ============================================================

CREATE OR REPLACE FUNCTION public.calc_duration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::integer / 60;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger: auto-calculate duration_minutes on insert/update
DROP TRIGGER IF EXISTS trg_calc_duration ON public.timesheets;
CREATE TRIGGER trg_calc_duration
  BEFORE INSERT OR UPDATE OF start_time, end_time
  ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.calc_duration();

-- Trigger: auto-update updated_at on any row change
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.timesheets;
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
