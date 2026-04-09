-- ============================================================
-- Migration: 20260404205000_phase2_rls_hardening_and_bootstrap
-- Phase 2, Round 2 — RLS hardening + admin bootstrap
-- ============================================================

-- ── PART 1: RLS Hardening ────────────────────────────────────

-- 1a. DROP the overly-broad invitation token policy
--     (token IS NOT NULL allows any authenticated user to read ALL invitations)
DROP POLICY IF EXISTS "invitations_token_select" ON public.invitations;

-- 1b. Add WITH CHECK to write policies to prevent privilege escalation.
--     Postgres FOR ALL without WITH CHECK means USING clause is applied to
--     both reads AND writes, which works but is implicit. Making it explicit
--     documents intent and prevents future ambiguity.

-- companies: owner cannot insert a row claiming someone else is owner_id
DROP POLICY IF EXISTS "companies_owner_all" ON public.companies;
CREATE POLICY "companies_owner_all"
  ON public.companies
  FOR ALL
  USING      (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- company_members: admin of company can manage members,
-- but cannot insert members into a company they don't own
DROP POLICY IF EXISTS "company_members_admin_all" ON public.company_members;
CREATE POLICY "company_members_admin_all"
  ON public.company_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_members.company_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_members.company_id
        AND c.owner_id = auth.uid()
    )
  );

-- projects: owner can write — lock down with WITH CHECK
DROP POLICY IF EXISTS "projects_admin_write" ON public.projects;
CREATE POLICY "projects_admin_write"
  ON public.projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = projects.company_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = projects.company_id
        AND c.owner_id = auth.uid()
    )
  );

-- invitations: owner can write — lock down with WITH CHECK
DROP POLICY IF EXISTS "invitations_owner_all" ON public.invitations;
CREATE POLICY "invitations_owner_all"
  ON public.invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = invitations.company_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = invitations.company_id
        AND c.owner_id = auth.uid()
    )
  );


-- ── PART 2: Bootstrap — Initial Admin Company ────────────────
--
-- Strategy: SEED via migration (not a separate seed file), using
--   DO $$...$$  with ON CONFLICT DO NOTHING for full idempotency.
--
-- Why migration and not separate seed?
--   - The bootstrap is structural data, not test data.
--   - Running this migration twice is safe: ON CONFLICT DO NOTHING guards both inserts.
--   - No UI or trigger exists yet to create companies; this is the only
--     safe creation path before the onboarding screen is built.
--
-- Who is bootstrapped?
--   - bregadiolli.contato@gmail.com (id: 0c1e860e-5d5d-447d-9beb-12532953ca86)
--     Reason: first user created in auth.users (project owner/developer).
--     This is the account that will manage the company in Phase 2.
--
-- Supabase Auth limitation note:
--   We cannot call auth.uid() inside a migration — it runs as postgres role,
--   not as an authenticated user. We therefore hard-code the owner UUID via
--   a CTE. This is acceptable for a one-time seed migration targeting a
--   known, verified user ID.

DO $$
DECLARE
  v_owner_id   uuid := '0c1e860e-5d5d-447d-9beb-12532953ca86';
  v_owner_email text := 'bregadiolli.contato@gmail.com';
  v_company_id uuid;
BEGIN
  -- Insert company (idempotent: skip if owner already has one)
  INSERT INTO public.companies (name, owner_id)
  SELECT 'LinhaBase', v_owner_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.companies WHERE owner_id = v_owner_id
  )
  RETURNING id INTO v_company_id;

  -- If company already existed, fetch its id
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE owner_id = v_owner_id
    LIMIT 1;
  END IF;

  -- Insert company_member row for the owner as admin (idempotent)
  INSERT INTO public.company_members (
    company_id,
    user_id,
    email,
    role,
    status,
    joined_at
  )
  SELECT
    v_company_id,
    v_owner_id,
    v_owner_email,
    'admin',
    'active',
    now()
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.company_members
    WHERE company_id = v_company_id
      AND user_id    = v_owner_id
  );
END;
$$;
