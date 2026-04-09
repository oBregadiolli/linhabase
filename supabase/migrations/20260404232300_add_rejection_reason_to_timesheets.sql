-- Add rejection_reason column to timesheets for the rejection workflow.
-- Nullable text: only populated when admin rejects (submitted → draft).
-- Cleared on next submission (draft → submitted) to avoid stale reasons.
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT NULL;
