'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface SubmitResult {
  success: boolean
  error?: string
}

/**
 * Transition a timesheet from 'draft' to 'submitted'.
 * Server-side validation:
 *  1. User must own the timesheet (RLS enforces via timesheets_own_all)
 *  2. Timesheet must exist and be in 'draft' status
 */
export async function submitTimesheet(id: string): Promise<SubmitResult> {
  if (!id) return { success: false, error: 'ID inválido.' }

  const supabase = await createClient()

  // Fetch the timesheet to verify ownership (via RLS) and current status
  const { data: ts, error: fetchErr } = await supabase
    .from('timesheets')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !ts) {
    return { success: false, error: 'Apontamento não encontrado.' }
  }

  if (ts.status !== 'draft') {
    return { success: false, error: 'Apenas rascunhos podem ser enviados para aprovação.' }
  }

  // Transition draft → submitted
  const { error: updateErr } = await supabase
    .from('timesheets')
    .update({ status: 'submitted', rejection_reason: null })
    .eq('id', id)
    .eq('status', 'draft') // double-check: race condition guard

  if (updateErr) {
    return { success: false, error: `Erro ao enviar: ${updateErr.message}` }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Submit multiple timesheets at once (batch).
 */
export async function submitTimesheets(ids: string[]): Promise<{ success: boolean; submitted: number; skipped: number; error?: string }> {
  if (!ids.length) return { success: false, submitted: 0, skipped: 0, error: 'Nenhum apontamento selecionado.' }

  const supabase = await createClient()

  // Fetch to validate
  const { data: targets, error: fetchErr } = await supabase
    .from('timesheets')
    .select('id, status')
    .in('id', ids)

  if (fetchErr || !targets) {
    return { success: false, submitted: 0, skipped: 0, error: 'Erro ao buscar apontamentos.' }
  }

  const eligible = targets.filter(t => t.status === 'draft').map(t => t.id)
  const skipped = targets.length - eligible.length

  if (eligible.length === 0) {
    return { success: false, submitted: 0, skipped, error: 'Nenhum rascunho elegível para envio.' }
  }

  const { error: updateErr } = await supabase
    .from('timesheets')
    .update({ status: 'submitted', rejection_reason: null })
    .in('id', eligible)
    .eq('status', 'draft')

  if (updateErr) {
    return { success: false, submitted: 0, skipped, error: `Erro ao enviar: ${updateErr.message}` }
  }

  revalidatePath('/dashboard')
  return { success: true, submitted: eligible.length, skipped }
}
