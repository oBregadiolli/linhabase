-- ============================================================
-- Migration: 20260429003000_create_clients
-- FEAT-01: Cadastro de Clientes
-- Creates `clients` table and adds `client_id` FK to `projects`.
-- ============================================================

-- ── 1. Create clients table ──────────────────────────────────
CREATE TABLE public.clients (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code        varchar(8) NOT NULL,
  description text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Enforce unique code per table (global)
  CONSTRAINT clients_code_unique UNIQUE (code)
);

-- Index for common queries: list clients by company
CREATE INDEX idx_clients_company_id ON public.clients(company_id);

-- Auto-generate code via FEAT-04 trigger
CREATE TRIGGER trg_clients_generate_code
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_entity_code();


-- ── 2. RLS on clients ────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Admins: full CRUD within their company
CREATE POLICY clients_admin_all ON public.clients
  FOR ALL
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT cm.company_id FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'admin')
    )
  );

-- Members: read-only access (needed for ProjectSearchCombobox / FEAT-06)
CREATE POLICY clients_member_select ON public.clients
  FOR SELECT
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );


-- ── 3. Add client_id to projects (nullable — existing projects stay null)
ALTER TABLE public.projects
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_client_id ON public.projects(client_id);


-- ── 4. Updated_at auto-update trigger for clients ────────────
CREATE OR REPLACE FUNCTION public.trigger_update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_updated_at();
