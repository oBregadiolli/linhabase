'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'
import { sendInviteEmail } from '@/lib/email/send-invite'
import { randomUUID } from 'crypto'

export interface InviteResult {
  success: boolean
  error?: string
  /** Whether the invitation email was successfully sent */
  emailSent?: boolean
  /** Warning message (e.g., email failed but invite was created) */
  warning?: string
}

/**
 * Server Action: create an invitation + pending company_member + send email.
 *
 * Security:
 *   - Only active admins can invoke (checked server-side)
 *   - Uniqueness enforced by DB constraints
 *   - Token generated server-side with crypto.randomUUID()
 *   - Email sent via server-only Resend API (key never exposed to client)
 *
 * Failure strategy:
 *   If the email fails, the invitation record is preserved.
 *   The admin is warned and can copy the link manually as fallback.
 */
export async function createInvitation(email: string, role: 'admin' | 'member'): Promise<InviteResult> {
  // ── Validate input ──────────────────────────────────────────
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { success: false, error: 'Email inválido.' }
  }
  if (role !== 'admin' && role !== 'member') {
    return { success: false, error: 'Papel inválido.' }
  }

  // ── Auth + membership check ─────────────────────────────────
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado. Apenas administradores podem convidar.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessão expirada.' }

  const companyId = membership.company.id
  const companyName = membership.company.name

  // ── Check if already active member ──────────────────────────
  const { data: existingMember } = await supabase
    .from('company_members')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (existingMember) {
    if (existingMember.status === 'active') {
      return { success: false, error: 'Este email já é um membro ativo da empresa.' }
    }
    if (existingMember.status === 'pending') {
      return { success: false, error: 'Já existe um convite pendente para este email.' }
    }
    // status === 'inactive': allow re-invite (future use case)
  }

  // ── Generate token ──────────────────────────────────────────
  const token = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const expiresAtIso = expiresAt.toISOString()

  // ── Insert invitation ───────────────────────────────────────
  const { error: invError } = await supabase
    .from('invitations')
    .insert({
      company_id: companyId,
      email: trimmedEmail,
      token,
      role,
      expires_at: expiresAtIso,
      created_by: user.id,
    })

  if (invError) {
    if (invError.code === '23505') {
      return { success: false, error: 'Já existe um convite pendente para este email.' }
    }
    return { success: false, error: 'Erro ao criar convite. Tente novamente.' }
  }

  // ── Insert pending company_member ───────────────────────────
  if (!existingMember) {
    const { error: memberError } = await supabase
      .from('company_members')
      .insert({
        company_id: companyId,
        email: trimmedEmail,
        role,
        status: 'pending',
        user_id: null,
      })

    if (memberError && memberError.code !== '23505') {
      // Non-duplicate error — log but don't fail the invite
      console.error('Failed to create pending member:', memberError)
    }
  }

  // ── Send invitation email ──────────────────────────────────
  const emailResult = await sendInviteEmail({
    to: trimmedEmail,
    companyName,
    role,
    token,
    expiresAt: expiresAtIso,
  })

  if (!emailResult.sent) {
    return {
      success: true,
      emailSent: false,
      warning: emailResult.error || 'Email não pôde ser enviado. Use o botão "Copiar link" para compartilhar manualmente.',
    }
  }

  return { success: true, emailSent: true }
}

/**
 * Server Action: revoke a pending invitation.
 *
 * Strategy: SET revoked_at = now() instead of DELETE.
 * This preserves audit history and makes the token unusable.
 * Also deletes the corresponding pending company_member.
 */
export async function revokeInvitation(invitationId: string): Promise<InviteResult> {
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()
  const companyId = membership.company.id

  // Fetch invitation to ensure it belongs to this company and is pending
  const { data: inv } = await supabase
    .from('invitations')
    .select('id, email, company_id, accepted_at, revoked_at')
    .eq('id', invitationId)
    .single()

  if (!inv) return { success: false, error: 'Convite não encontrado.' }
  if (inv.company_id !== companyId) return { success: false, error: 'Acesso negado.' }
  if (inv.accepted_at) return { success: false, error: 'Convite já foi aceito.' }
  if (inv.revoked_at) return { success: false, error: 'Convite já foi revogado.' }

  // Revoke the invitation
  const { error: revokeError } = await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)

  if (revokeError) {
    return { success: false, error: 'Erro ao revogar convite.' }
  }

  // Remove the pending company_member (so they can be re-invited)
  await supabase
    .from('company_members')
    .delete()
    .eq('company_id', companyId)
    .eq('email', inv.email)
    .eq('status', 'pending')

  return { success: true }
}

/**
 * Server Action: resend an invitation.
 *
 * Strategy: REVOKE old + CREATE new + SEND email.
 *
 * The old invitation is marked with revoked_at (preserved for audit).
 * A new invitation is created with a fresh token, expiration, and email.
 */
export async function resendInvitation(invitationId: string): Promise<InviteResult> {
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessão expirada.' }

  const companyId = membership.company.id
  const companyName = membership.company.name

  // Fetch old invitation
  const { data: oldInv } = await supabase
    .from('invitations')
    .select('id, email, role, company_id, accepted_at, revoked_at')
    .eq('id', invitationId)
    .single()

  if (!oldInv) return { success: false, error: 'Convite não encontrado.' }
  if (oldInv.company_id !== companyId) return { success: false, error: 'Acesso negado.' }
  if (oldInv.accepted_at) return { success: false, error: 'Convite já foi aceito.' }

  // Revoke old invitation (if not already revoked)
  if (!oldInv.revoked_at) {
    await supabase
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', oldInv.id)
  }

  // Generate new token and expiration
  const token = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const expiresAtIso = expiresAt.toISOString()

  // Create new invitation
  const { error: insertError } = await supabase
    .from('invitations')
    .insert({
      company_id: companyId,
      email: oldInv.email,
      token,
      role: oldInv.role,
      expires_at: expiresAtIso,
      created_by: user.id,
    })

  if (insertError) {
    return { success: false, error: 'Erro ao reenviar convite.' }
  }

  // Ensure pending company_member exists
  const { data: existingMember } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', oldInv.email)
    .maybeSingle()

  if (!existingMember) {
    await supabase
      .from('company_members')
      .insert({
        company_id: companyId,
        email: oldInv.email,
        role: oldInv.role as 'admin' | 'member',
        status: 'pending',
        user_id: null,
      })
  }

  // ── Send email for the new invitation ──────────────────────
  const emailResult = await sendInviteEmail({
    to: oldInv.email,
    companyName,
    role: oldInv.role,
    token,
    expiresAt: expiresAtIso,
  })

  if (!emailResult.sent) {
    return {
      success: true,
      emailSent: false,
      warning: emailResult.error || 'Convite reenviado, mas o email não pôde ser entregue. Use "Copiar link".',
    }
  }

  return { success: true, emailSent: true }
}
