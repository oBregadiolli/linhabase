-- ============================================================
-- Migration: 20260415193000_timesheets_no_overlap_constraint
-- Prevent overlapping timesheets per user (server-side guarantee).
-- ============================================================

-- Needed for EXCLUDE constraint with uuid equality operator
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  -- Ensure we don't create invalid time ranges (no overnight spans)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timesheets_end_after_start'
      AND conrelid = 'public.timesheets'::regclass
  ) THEN
    ALTER TABLE public.timesheets
      ADD CONSTRAINT timesheets_end_after_start
      CHECK (end_time > start_time);
  END IF;

  -- Exclusion: same user cannot have overlapping time ranges on same date
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timesheets_no_overlap_per_user'
      AND conrelid = 'public.timesheets'::regclass
  ) THEN
    ALTER TABLE public.timesheets
      ADD CONSTRAINT timesheets_no_overlap_per_user
      EXCLUDE USING gist (
        user_id WITH =,
        tsrange(
          (date + start_time)::timestamp,
          (date + end_time)::timestamp,
          '[)'
        ) WITH &&
      );
  END IF;
END
$$;

