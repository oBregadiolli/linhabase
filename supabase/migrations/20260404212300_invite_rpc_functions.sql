-- ============================================================
-- Migration: 20260404212300_invite_rpc_functions
-- Phase 2, Round 6 — Secure invitation lookup & atomic accept
--
-- Strategy:
--   SECURITY DEFINER functions bypass RLS and run with the
--   privileges of the function owner (postgres). This avoids
--   creating any broad RLS policy on the invitations table.
--
-- lookup_invitation_by_token(token_input):
--   Returns invitation metadata (email, company name, status)
--   without exposing sensitive fields. Callable by any
--   authenticated user, but only returns non-sensitive data.
--
-- accept_invitation(token_input):
--   Atomic accept: validates token, expiration, email match.
--   Updates both invitations and company_members in one
--   transaction. Returns success/error status.
-- ============================================================

-- ── Lookup function ─────────────────────────────────────────

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
  -- Find invitation by token
  SELECT i.id, i.email, i.company_id, i.role, i.expires_at,
         i.accepted_at, i.created_at
    INTO inv
    FROM invitations i
   WHERE i.token = token_input;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  -- Get company name
  SELECT c.name INTO comp_name FROM companies c WHERE c.id = inv.company_id;

  -- Check if already accepted
  IF inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'accepted',
      'email', inv.email,
      'company_name', comp_name,
      'accepted_at', inv.accepted_at
    );
  END IF;

  -- Check expiration
  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object(
      'status', 'expired',
      'email', inv.email,
      'company_name', comp_name,
      'expired_at', inv.expires_at
    );
  END IF;

  -- Valid and pending
  RETURN jsonb_build_object(
    'status', 'pending',
    'email', inv.email,
    'company_name', comp_name,
    'role', inv.role,
    'expires_at', inv.expires_at
  );
END;
$$;

-- ── Accept function ─────────────────────────────────────────

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
  -- Get the authenticated user
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Usuário não autenticado.');
  END IF;

  -- Get caller email from auth.users
  SELECT au.email INTO caller_email FROM auth.users au WHERE au.id = caller_id;
  IF caller_email IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Email do usuário não encontrado.');
  END IF;

  -- Normalize
  caller_email := lower(trim(caller_email));

  -- Lock the invitation row to prevent race conditions
  SELECT i.id, i.email, i.company_id, i.role, i.expires_at, i.accepted_at
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

  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Este convite expirou.');
  END IF;

  -- Email match check
  IF lower(trim(inv.email)) <> caller_email THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'O email do convite não corresponde ao email da sua conta.'
    );
  END IF;

  -- Get company name for response
  SELECT c.name INTO comp_name FROM companies c WHERE c.id = inv.company_id;

  -- ── Atomic updates ──────────────────────────────────────

  -- 1. Mark invitation as accepted
  UPDATE invitations
     SET accepted_at = now()
   WHERE id = inv.id;

  -- 2. Update company_member: set user_id, activate, set joined_at
  UPDATE company_members
     SET user_id = caller_id,
         status = 'active',
         joined_at = now()
   WHERE company_id = inv.company_id
     AND lower(trim(email)) = lower(trim(inv.email))
     AND status = 'pending';

  -- 3. If no pending member was found, create one (defensive)
  IF NOT FOUND THEN
    INSERT INTO company_members (company_id, user_id, email, role, status, joined_at)
    VALUES (inv.company_id, caller_id, inv.email, inv.role, 'active', now())
    ON CONFLICT (company_id, email) DO UPDATE
      SET user_id = caller_id,
          status = 'active',
          joined_at = now();
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'company_name', comp_name,
    'message', 'Convite aceito com sucesso!'
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_invitation_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- Also allow anon for lookup (so non-logged-in users can see the invite status)
GRANT EXECUTE ON FUNCTION public.lookup_invitation_by_token(text) TO anon;
