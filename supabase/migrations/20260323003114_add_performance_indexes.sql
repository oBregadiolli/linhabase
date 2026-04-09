-- ============================================================
-- Migration: 20260323003114_add_performance_indexes
-- Applied: 2026-03-23 (MVP performance)
-- Historical record of indexes applied via Supabase dashboard.
-- ============================================================

-- Fast lookup of timesheets by user and date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_timesheets_user_date
  ON public.timesheets (user_id, date DESC);

-- Fast lookup by status for admin views
CREATE INDEX IF NOT EXISTS idx_timesheets_status
  ON public.timesheets (status);
