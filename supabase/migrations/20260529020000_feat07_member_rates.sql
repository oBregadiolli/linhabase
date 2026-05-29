-- ══════════════════════════════════════════════════════════════
-- Migration: 20260529020000_feat07_member_rates
-- FEAT-07: Custo-Hora (Member Rates)
-- Creates the member_rates table with exclusion constraint
-- to prevent overlapping date ranges per user+company.
-- ══════════════════════════════════════════════════════════════

-- ── 1. btree_gist extension ═════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── 2. member_rates table ═══════════════════════════════════

CREATE TABLE public.member_rates (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid           NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date  date           NOT NULL,
  end_date    date,          -- NULL = indefinido
  sale_rate   decimal(10,2)  NOT NULL,
  cost_rate   decimal(10,2)  NOT NULL,
  created_at  timestamptz    NOT NULL DEFAULT now(),

  -- Integrity
  CONSTRAINT chk_rates_dates    CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_rates_positive CHECK (sale_rate >= 0 AND cost_rate >= 0)
);

-- ── 3. Exclusion constraint (no overlapping ranges) ═════════

ALTER TABLE public.member_rates ADD CONSTRAINT no_overlapping_rates
  EXCLUDE USING gist (
    user_id    WITH =,
    company_id WITH =,
    daterange(start_date, COALESCE(end_date, '9999-12-31'), '[]') WITH &&
  );

-- ── 4. Indexes ══════════════════════════════════════════════

CREATE INDEX idx_member_rates_user  ON public.member_rates(user_id, company_id);
CREATE INDEX idx_member_rates_dates ON public.member_rates(start_date, end_date);

-- ── 5. Row Level Security ═══════════════════════════════════

ALTER TABLE public.member_rates ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/owner only
CREATE POLICY "rates_select"
  ON public.member_rates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = member_rates.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- INSERT: admin/owner only
CREATE POLICY "rates_insert"
  ON public.member_rates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = member_rates.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- UPDATE: admin/owner only
CREATE POLICY "rates_update"
  ON public.member_rates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = member_rates.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = member_rates.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );

-- DELETE: admin/owner only
CREATE POLICY "rates_delete"
  ON public.member_rates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = member_rates.company_id
        AND cm.user_id    = auth.uid()
        AND cm.role       IN ('admin', 'owner')
        AND cm.status     = 'active'
    )
  );
