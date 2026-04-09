-- ============================================================
-- Migration: 20260404203000_phase2_multi_company
-- Applied: 2026-04-04 via Supabase MCP (phase2_multi_company)
-- Phase 2, Round 1 — Multi-company scaffold (additive, backward-compatible)
-- ============================================================

-- ── 1. companies ─────────────────────────────────────────────
CREATE TABLE public.companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_owner_all"
  ON public.companies
  FOR ALL
  USING (auth.uid() = owner_id);

-- ── 2. company_members ───────────────────────────────────────
CREATE TABLE public.company_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid  NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id    uuid  REFERENCES auth.users(id),
  email      text  NOT NULL,
  role       text  NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin', 'member')),
  status     text  NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'active', 'inactive')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at  timestamptz
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_self_select"
  ON public.company_members
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "company_members_admin_all"
  ON public.company_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_company_members_user_id    ON public.company_members(user_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX idx_company_members_status     ON public.company_members(company_id, status);

-- ── 3. invitations ───────────────────────────────────────────
CREATE TABLE public.invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid  NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email        text  NOT NULL,
  token        text  UNIQUE NOT NULL,
  role         text  NOT NULL DEFAULT 'member',
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  created_by   uuid  NOT NULL REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_owner_all"
  ON public.invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id
        AND c.owner_id = auth.uid()
    )
  );

-- NOTE: invitations_token_select NOT included here intentionally.
-- Public invitation reading by token will be added in a future migration
-- with proper expiry and accepted_at guard logic.

CREATE INDEX idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX idx_invitations_email      ON public.invitations(email);
CREATE INDEX idx_invitations_token      ON public.invitations(token);

-- ── 4. projects ──────────────────────────────────────────────
CREATE TABLE public.projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid  NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name       text  NOT NULL,
  color      text,
  active     boolean NOT NULL DEFAULT true,
  created_by uuid  NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_member_select"
  ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = projects.company_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = projects.company_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "projects_admin_write"
  ON public.projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = projects.company_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_active     ON public.projects(company_id, active);

-- ── 5. timesheets.project_id (nullable FK – transition column) ──
ALTER TABLE public.timesheets
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX idx_timesheets_project_id ON public.timesheets(project_id)
  WHERE project_id IS NOT NULL;
