-- ══════════════════════════════════════════════════════════════
-- Migration: 20260529000000_feat01_clients
-- FEAT-01: Cadastro de Clientes
-- Creates the clients table with RLS, auto-generated code,
-- and adds client_id FK to projects.
-- ══════════════════════════════════════════════════════════════

-- ── 1. clients table ═════════════════════════════════════════

CREATE TABLE public.clients (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code        varchar(8)  UNIQUE NOT NULL DEFAULT public.generate_entity_code(),
  description text        NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Auto-generate code trigger ════════════════════════════

CREATE TRIGGER set_client_code
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_entity_code();

-- ── 3. Indexes ═══════════════════════════════════════════════

CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_clients_code    ON public.clients(code);

-- ── 4. Row Level Security ════════════════════════════════════

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- SELECT: any active member of the company can read clients
CREATE POLICY "clients_select"
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = clients.company_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'active'
    )
  );

-- INSERT: admin/owner only
CREATE POLICY "clients_insert"
  ON public.clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = clients.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role        = 'admin'
        AND cm.status     = 'active'
    )
  );

-- UPDATE: admin/owner only
CREATE POLICY "clients_update"
  ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = clients.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role        = 'admin'
        AND cm.status     = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = clients.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role        = 'admin'
        AND cm.status     = 'active'
    )
  );

-- DELETE: admin/owner only
CREATE POLICY "clients_delete"
  ON public.clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = clients.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role        = 'admin'
        AND cm.status     = 'active'
    )
  );

-- ── 5. Add client_id to projects ═════════════════════════════

ALTER TABLE public.projects
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_client ON public.projects(client_id);
