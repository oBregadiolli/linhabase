-- ============================================================
-- Migration: 20260404211500_team_uniqueness_constraints
-- Phase 2, Round 5 — Uniqueness guards for team management
--
-- Purpose:
--   Prevent duplicate memberships and duplicate pending invitations
--   for the same email within the same company.
--
-- 1. company_members: UNIQUE(company_id, email)
--    → One membership per email per company. Prevents creating
--      two "pending" rows for the same person.
--
-- 2. invitations: partial UNIQUE(company_id, email) 
--    WHERE accepted_at IS NULL
--    → One pending invitation per email per company.
--      Accepted invitations are excluded so re-inviting someone
--      who previously accepted (and was removed) is possible.
--
-- Impact on existing data:
--   Current data has 1 member (admin). No conflicts expected.
-- ============================================================

-- Guard: only one membership per email per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_members_company_email
  ON public.company_members (company_id, email);

-- Guard: only one pending invitation per email per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_pending_company_email
  ON public.invitations (company_id, email)
  WHERE accepted_at IS NULL;
