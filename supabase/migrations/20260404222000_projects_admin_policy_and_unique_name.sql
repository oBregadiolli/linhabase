-- Rodada 9: Improve projects policies and add unique name constraint
--
-- 1. Update projects_admin_write to allow company_members with role='admin' (not just owner)
-- 2. Add unique index on (company_id, lower(name)) to prevent duplicate project names

-- Drop old restrictive policy that only checked companies.owner_id
DROP POLICY IF EXISTS "projects_admin_write" ON public.projects;

-- Create new admin write policy that checks company_members for admin role
CREATE POLICY "projects_admin_write"
  ON public.projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = projects.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = projects.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'active'
    )
  );

-- Unique project name per company (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_company_name
  ON public.projects (company_id, lower(name));
