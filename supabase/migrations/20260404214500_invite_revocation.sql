-- ============================================================
-- Migration: 20260404214500_invite_revocation
-- Phase 2, Round 7 — Invitation revocation + resend support
--
-- Changes:
--   1. Add revoked_at column to invitations (nullable timestamp)
--   2. Drop old partial unique and recreate to exclude revoked
--   3. Update lookup RPC to handle revoked state
--   4. Update accept RPC to reject revoked invitations
-- ============================================================

-- ── 1. Add revoked_at column ────────────────────────────────

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz DEFAULT NULL;

-- ── 2. Update partial unique index ──────────────────────────
--
-- Old: WHERE accepted_at IS NULL
-- New: WHERE accepted_at IS NULL AND revoked_at IS NULL
--
-- This allows re-inviting an email after revoking the old invitation.

DROP INDEX IF EXISTS public.uq_invitations_pending_company_email;

CREATE UNIQUE INDEX uq_invitations_pending_company_email
  ON public.invitations (company_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ── 3. Update lookup_invitation_by_token ────────────────────

CREATE OR REPLACE FUNCTION public.lookup_invitation_by_token(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  comp_name text;
BEGIN
  SELECT i.id, i.email, i.company_id, i.role, i.expires_at,
         i.accepted_at, i.revoked_at, i.created_at
    INTO inv
    FROM invitations i
   WHERE i.token = token_input;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT c.name INTO comp_name FROM companies c WHERE c.id = inv.company_id;

  IF inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'accepted',
      'email', inv.email,
      'company_name', comp_name,
      'accepted_at', inv.accepted_at
    );
  END IF;

  IF inv.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'revoked',
      'email', inv.email,
      'company_name', comp_name
    );
  END IF;

  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object(
      'status', 'expired',
      'email', inv.email,
      'company_name', comp_name,
      'expired_at', inv.expires_at
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'pending',
    'email', inv.email,
    'company_name', comp_name,
    'role', inv.role,
    'expires_at', inv.expires_at
  );
END;
$$;

-- ── 4. Update accept_invitation ─────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_invitation(token_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  caller_id uuid;
  caller_email text;
  comp_name text;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Usuário não autenticado.');
  END IF;

  SELECT au.email INTO caller_email FROM auth.users au WHERE au.id = caller_id;
  IF caller_email IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Email do usuário não encontrado.');
  END IF;

  caller_email := lower(trim(caller_email));

  SELECT i.id, i.email, i.company_id, i.role, i.expires_at, i.accepted_at, i.revoked_at
    INTO inv
    FROM invitations i
   WHERE i.token = token_input
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Convite não encontrado.');
  END IF;

  IF inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Este convite já foi utilizado.');
  END IF;

  IF inv.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Este convite foi revogado pelo administrador.');
  END IF;

  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Este convite expirou.');
  END IF;

  IF lower(trim(inv.email)) <> caller_email THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'O email do convite não corresponde ao email da sua conta.'
    );
  END IF;

  SELECT c.name INTO comp_name FROM companies c WHERE c.id = inv.company_id;

  UPDATE invitations SET accepted_at = now() WHERE id = inv.id;

  UPDATE company_members
     SET user_id = caller_id, status = 'active', joined_at = now()
   WHERE company_id = inv.company_id
     AND lower(trim(email)) = lower(trim(inv.email))
     AND status = 'pending';

  IF NOT FOUND THEN
    INSERT INTO company_members (company_id, user_id, email, role, status, joined_at)
    VALUES (inv.company_id, caller_id, inv.email, inv.role, 'active', now())
    ON CONFLICT (company_id, email) DO UPDATE
      SET user_id = caller_id, status = 'active', joined_at = now();
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'company_name', comp_name,
    'message', 'Convite aceito com sucesso!'
  );
END;
$$;
