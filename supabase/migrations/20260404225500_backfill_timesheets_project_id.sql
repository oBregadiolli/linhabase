-- Migration: Backfill timesheets.project_id from project text
--
-- Strategy:
--   1. Only update timesheets WHERE project_id IS NULL AND project text is non-empty
--   2. Match via lower(trim(timesheets.project)) = lower(trim(projects.name))
--   3. Restrict to SAME COMPANY via company_members join (no cross-company)
--   4. Only update when there is EXACTLY ONE match (no ambiguity)
--   5. Idempotent: running again has no effect on already-linked rows
--
-- Join path:
--   timesheets.user_id → company_members(user_id, status='active') → company_id
--   projects(company_id, lower(trim(name))) = lower(trim(timesheets.project))

UPDATE timesheets t
SET project_id = sub.matched_project_id
FROM (
  -- Subquery: find timesheets with exactly ONE matching project
  SELECT
    c.timesheet_id,
    (array_agg(m.project_id))[1] AS matched_project_id
  FROM (
    -- Candidates: timesheets without project_id, with non-empty project text,
    -- belonging to a user with active company membership
    SELECT
      t2.id AS timesheet_id,
      lower(trim(t2.project)) AS norm_project,
      cm.company_id
    FROM timesheets t2
    JOIN company_members cm
      ON cm.user_id = t2.user_id
      AND cm.status = 'active'
    WHERE t2.project_id IS NULL
      AND t2.project IS NOT NULL
      AND trim(t2.project) != ''
  ) c
  JOIN (
    -- Potential matches: projects with their normalized names
    SELECT
      p.id AS project_id,
      p.company_id,
      lower(trim(p.name)) AS norm_name
    FROM projects p
  ) m
    ON m.company_id = c.company_id
    AND m.norm_name = c.norm_project
  GROUP BY c.timesheet_id
  -- ONLY take unambiguous matches (exactly 1 project matched)
  HAVING count(*) = 1
) sub
WHERE t.id = sub.timesheet_id
  -- Safety: double-check project_id is still null (idempotency)
  AND t.project_id IS NULL;
