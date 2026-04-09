'use server'

import { createClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin, getCurrentMembership } from '@/lib/supabase/membership'
import { revalidatePath } from 'next/cache'

// ── Eligibility rules ────────────────────────────────────────────
// Only timesheets with status 'submitted' can be approved.
// - 'draft' cannot be approved (user must submit first)
// - 'approved' is already final
const APPROVABLE_STATUS = 'submitted'

interface ApproveResult {
  success: boolean
  approved: number
  skipped: number
  error?: string
}

/**
 * Approve one or more timesheets.
 * Server-side validation:
 *  1. Caller must be active admin of the company
 *  2. Only timesheets with status = 'submitted' are eligible
 *  3. RLS ensures admin can only update same-company timesheets
 */
export async function approveTimesheets(ids: string[]): Promise<ApproveResult> {
  if (!ids.length) return { success: false, approved: 0, skipped: 0, error: 'Nenhum apontamento selecionado.' }

  // 1. Server-side admin check
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, approved: 0, skipped: 0, error: 'Acesso negado. Somente administradores podem aprovar.' }
  }

  const supabase = await createClient()

  // 2. Fetch target timesheets to validate eligibility
  const { data: targets, error: fetchErr } = await supabase
    .from('timesheets')
    .select('id, status')
    .in('id', ids)

  if (fetchErr || !targets) {
    return { success: false, approved: 0, skipped: 0, error: 'Erro ao buscar apontamentos.' }
  }

  // 3. Separate eligible from ineligible
  const eligible = targets.filter(t => t.status === APPROVABLE_STATUS).map(t => t.id)
  const skipped = targets.length - eligible.length

  if (eligible.length === 0) {
    return {
      success: false,
      approved: 0,
      skipped,
      error: 'Nenhum apontamento elegível para aprovação. Somente apontamentos com status "Enviado" podem ser aprovados.',
    }
  }

  // 4. Update eligible timesheets to 'approved'
  const { error: updateErr, count } = await supabase
    .from('timesheets')
    .update({ status: 'approved' })
    .in('id', eligible)
    .eq('status', APPROVABLE_STATUS) // double-check: only update if still submitted

  if (updateErr) {
    return { success: false, approved: 0, skipped, error: `Erro ao aprovar: ${updateErr.message}` }
  }

  revalidatePath('/admin/timesheets')

  return {
    success: true,
    approved: count ?? eligible.length,
    skipped,
  }
}

// ── Rejection ────────────────────────────────────────────────────

interface RejectResult {
  success: boolean
  rejected: number
  skipped: number
  error?: string
}

/**
 * Reject one or more timesheets (submitted → draft with reason).
 * Server-side validation:
 *  1. Caller must be active admin of the company
 *  2. Only timesheets with status = 'submitted' are eligible
 *  3. reason is mandatory and non-empty
 *  4. RLS ensures admin can only update same-company timesheets
 */
export async function rejectTimesheets(
  ids: string[],
  reason: string,
): Promise<RejectResult> {
  const trimmedReason = reason?.trim() ?? ''

  if (!ids.length) return { success: false, rejected: 0, skipped: 0, error: 'Nenhum apontamento selecionado.' }
  if (!trimmedReason) return { success: false, rejected: 0, skipped: 0, error: 'Motivo da rejeição é obrigatório.' }

  // 1. Server-side admin check
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    return { success: false, rejected: 0, skipped: 0, error: 'Acesso negado. Somente administradores podem rejeitar.' }
  }

  const supabase = await createClient()

  // 2. Fetch target timesheets
  const { data: targets, error: fetchErr } = await supabase
    .from('timesheets')
    .select('id, status')
    .in('id', ids)

  if (fetchErr || !targets) {
    return { success: false, rejected: 0, skipped: 0, error: 'Erro ao buscar apontamentos.' }
  }

  // 3. Only submitted can be rejected
  const eligible = targets.filter(t => t.status === APPROVABLE_STATUS).map(t => t.id)
  const skipped = targets.length - eligible.length

  if (eligible.length === 0) {
    return {
      success: false,
      rejected: 0,
      skipped,
      error: 'Nenhum apontamento elegível para rejeição. Somente "Enviados" podem ser rejeitados.',
    }
  }

  // 4. Update: submitted → draft + rejection_reason
  const { error: updateErr, count } = await supabase
    .from('timesheets')
    .update({
      status: 'draft',
      rejection_reason: trimmedReason,
    })
    .in('id', eligible)
    .eq('status', APPROVABLE_STATUS) // double-check

  if (updateErr) {
    return { success: false, rejected: 0, skipped, error: `Erro ao rejeitar: ${updateErr.message}` }
  }

  revalidatePath('/admin/timesheets')

  return {
    success: true,
    rejected: count ?? eligible.length,
    skipped,
  }
}
