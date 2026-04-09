import { createClient } from '@/lib/supabase/server'
import InviteClient from './InviteClient'

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>
}

/**
 * /invite?token=... — Public page for accepting invitations.
 *
 * Security strategy:
 *   - The token is looked up via a SECURITY DEFINER RPC function
 *     (lookup_invitation_by_token) that bypasses RLS and returns
 *     only sanitized metadata (status, email, company name).
 *   - No RLS policy is opened on the invitations table.
 *   - The accept action also uses a SECURITY DEFINER function
 *     (accept_invitation) that atomically validates and updates.
 */
export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams

  if (!token) {
    return <InviteClient status="missing_token" />
  }

  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  // Lookup invitation via SECURITY DEFINER function
  const { data: inviteData, error } = await supabase.rpc(
    'lookup_invitation_by_token',
    { token_input: token }
  )

  if (error || !inviteData) {
    return <InviteClient status="invalid" />
  }

  const inviteStatus = (inviteData as Record<string, unknown>).status as string

  if (inviteStatus === 'invalid') {
    return <InviteClient status="invalid" />
  }

  if (inviteStatus === 'expired') {
    return (
      <InviteClient
        status="expired"
        email={(inviteData as Record<string, unknown>).email as string}
        companyName={(inviteData as Record<string, unknown>).company_name as string}
      />
    )
  }

  if (inviteStatus === 'accepted') {
    return (
      <InviteClient
        status="accepted"
        email={(inviteData as Record<string, unknown>).email as string}
        companyName={(inviteData as Record<string, unknown>).company_name as string}
      />
    )
  }

  if (inviteStatus === 'revoked') {
    return (
      <InviteClient
        status="revoked"
        email={(inviteData as Record<string, unknown>).email as string}
        companyName={(inviteData as Record<string, unknown>).company_name as string}
      />
    )
  }

  // Status is 'pending' — valid invitation
  const inviteEmail = (inviteData as Record<string, unknown>).email as string
  const companyName = (inviteData as Record<string, unknown>).company_name as string
  const role = (inviteData as Record<string, unknown>).role as string

  if (!user) {
    // Not authenticated — prompt login/register
    return (
      <InviteClient
        status="needs_auth"
        email={inviteEmail}
        companyName={companyName}
        role={role}
        token={token}
      />
    )
  }

  // Authenticated — check email match
  const userEmail = user.email?.toLowerCase().trim() ?? ''
  const normalizedInviteEmail = inviteEmail.toLowerCase().trim()

  if (userEmail !== normalizedInviteEmail) {
    return (
      <InviteClient
        status="email_mismatch"
        email={inviteEmail}
        companyName={companyName}
        userEmail={userEmail}
      />
    )
  }

  // All good — ready to accept
  return (
    <InviteClient
      status="ready"
      email={inviteEmail}
      companyName={companyName}
      role={role}
      token={token}
    />
  )
}
