-- ============================================================
-- Migration: 20260404210000_timesheets_admin_read_policy
-- Phase 2, Round 3 — Admin read access to company timesheets
--
-- Strategy:
--   Add a SELECT-only policy so company admins can READ timesheets
--   of fellow active company members. The existing timesheets_own_all
--   policy remains UNTOUCHED — users continue to see/write their own data.
--
-- Security model:
--   1. The current user must be an active admin in company_members
--   2. The timesheet owner must be an active member of the SAME company
--   3. No cross-company access: the company_id join is the boundary
--   4. Write access is NOT granted — admin can only READ
--
-- Impact on existing behavior:
--   NONE. Postgres RLS policies are OR-combined (PERMISSIVE default).
--   The existing timesheets_own_all still works independently.
--   A normal user who is NOT an admin will see exactly the same data.
--   An admin will additionally see timesheets from their company peers.
-- ============================================================

CREATE POLICY "timesheets_company_admin_select"
  ON public.timesheets
  FOR SELECT
  USING (
    -- The current user is an active admin in at least one company
    -- AND the timesheet owner is an active member of that same company.
    EXISTS (
      SELECT 1
      FROM public.company_members admin_cm
      INNER JOIN public.company_members target_cm
        ON  admin_cm.company_id = target_cm.company_id   -- same company
        AND target_cm.user_id   = timesheets.user_id     -- timesheet owner
        AND target_cm.status    = 'active'               -- owner must be active
      WHERE admin_cm.user_id  = auth.uid()               -- current user
        AND admin_cm.role     = 'admin'                  -- must be admin
        AND admin_cm.status   = 'active'                 -- admin must be active
    )
  );
