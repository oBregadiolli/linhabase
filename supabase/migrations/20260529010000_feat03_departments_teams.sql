-- ══════════════════════════════════════════════════════════════
-- Migration: 20260529010000_feat03_departments_teams
-- FEAT-03: Departamentos e Equipes
-- Creates departments and teams tables with RLS, auto-generated
-- codes, and adds team_id FK to company_members.
-- ══════════════════════════════════════════════════════════════

-- ── 1. departments table ═══════════════════════════════════════

CREATE TABLE public.departments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code        varchar(8)  UNIQUE NOT NULL DEFAULT public.generate_entity_code(),
  name        text        NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Auto-generate department code trigger ═══════════════════

CREATE TRIGGER set_department_code
  BEFORE INSERT ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_entity_code();

-- ── 3. Department indexes ══════════════════════════════════════

CREATE INDEX idx_departments_company ON public.departments(company_id);

-- ── 4. Department RLS ══════════════════════════════════════════

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- SELECT: any active member of the company can read departments
CREATE POLICY "departments_select"
  ON public.departments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = departments.company_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'active'
    )
  );

-- INSERT: admin/owner only
CREATE POLICY "departments_insert"
  ON public.departments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = departments.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- UPDATE: admin/owner only
CREATE POLICY "departments_update"
  ON public.departments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = departments.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = departments.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- DELETE: admin/owner only
CREATE POLICY "departments_delete"
  ON public.departments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = departments.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- ── 5. teams table ═════════════════════════════════════════════

CREATE TABLE public.teams (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id uuid        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code          varchar(8)  UNIQUE NOT NULL DEFAULT public.generate_entity_code(),
  name          text        NOT NULL,
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 6. Auto-generate team code trigger ═════════════════════════

CREATE TRIGGER set_team_code
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_entity_code();

-- ── 7. Team indexes ════════════════════════════════════════════

CREATE INDEX idx_teams_department ON public.teams(department_id);
CREATE INDEX idx_teams_company    ON public.teams(company_id);

-- ── 8. Team RLS ════════════════════════════════════════════════

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- SELECT: any active member of the company can read teams
CREATE POLICY "teams_select"
  ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = teams.company_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'active'
    )
  );

-- INSERT: admin/owner only
CREATE POLICY "teams_insert"
  ON public.teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = teams.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- UPDATE: admin/owner only
CREATE POLICY "teams_update"
  ON public.teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = teams.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = teams.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- DELETE: admin/owner only
CREATE POLICY "teams_delete"
  ON public.teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = teams.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- ── 9. Add team_id to company_members ══════════════════════════

ALTER TABLE public.company_members
  ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX idx_members_team ON public.company_members(team_id);
