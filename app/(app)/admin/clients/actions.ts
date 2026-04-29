'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'
import type { ClientInsert, ClientUpdate } from '@/lib/types/database.types'

export interface ClientResult {
  success: boolean
  error?: string
}

// ── Create ────────────────────────────────────────────────────

export async function createClientAction(
  description: string,
  code?: string
): Promise<ClientResult> {
  const trimmedDesc = description.trim()
  if (!trimmedDesc || trimmedDesc.length > 200) {
    return { success: false, error: 'Descrição é obrigatória (máx. 200 caracteres).' }
  }

  const membership = await getCurrentMembership()
  if (!membership || !['admin', 'owner'].includes(membership.member.role)) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const insertPayload: ClientInsert = {
    company_id: membership.company.id,
    description: trimmedDesc,
  }

  // If admin supplies a custom code, use it; otherwise trigger auto-generates
  if (code && code.trim()) {
    const trimmedCode = code.trim().toUpperCase()
    if (trimmedCode.length > 8) {
      return { success: false, error: 'Código deve ter no máximo 8 caracteres.' }
    }
    insertPayload.code = trimmedCode
  }

  const { error } = await supabase
    .from('clients')
    .insert(insertPayload)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Já existe um registro com este código.' }
    }
    console.error('Failed to create client:', error)
    return { success: false, error: 'Erro ao criar cliente.' }
  }

  return { success: true }
}

// ── Update ────────────────────────────────────────────────────

export async function updateClientAction(
  clientId: string,
  description: string,
  code?: string
): Promise<ClientResult> {
  const trimmedDesc = description.trim()
  if (!trimmedDesc || trimmedDesc.length > 200) {
    return { success: false, error: 'Descrição é obrigatória (máx. 200 caracteres).' }
  }

  const membership = await getCurrentMembership()
  if (!membership || !['admin', 'owner'].includes(membership.member.role)) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  // Verify client belongs to this company
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_id')
    .eq('id', clientId)
    .single()

  if (!client) return { success: false, error: 'Cliente não encontrado.' }
  if (client.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const updatePayload: ClientUpdate = {
    description: trimmedDesc,
  }

  if (code !== undefined) {
    const trimmedCode = code.trim().toUpperCase()
    if (trimmedCode.length > 8) {
      return { success: false, error: 'Código deve ter no máximo 8 caracteres.' }
    }
    if (trimmedCode) updatePayload.code = trimmedCode
  }

  const { error } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', clientId)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Já existe um registro com este código.' }
    }
    console.error('Failed to update client:', error)
    return { success: false, error: 'Erro ao atualizar cliente.' }
  }

  return { success: true }
}

// ── Toggle active ─────────────────────────────────────────────

export async function toggleClientActive(
  clientId: string,
  active: boolean
): Promise<ClientResult> {
  const membership = await getCurrentMembership()
  if (!membership || !['admin', 'owner'].includes(membership.member.role)) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_id')
    .eq('id', clientId)
    .single()

  if (!client) return { success: false, error: 'Cliente não encontrado.' }
  if (client.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('clients')
    .update({ active })
    .eq('id', clientId)

  if (error) {
    console.error('Failed to toggle client:', error)
    return { success: false, error: 'Erro ao alterar status do cliente.' }
  }

  return { success: true }
}
