'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'

export interface ClientResult {
  success: boolean
  error?: string
}

// ── Create ────────────────────────────────────────────────────

export async function createClientRecord(
  description: string,
  code?: string
): Promise<ClientResult> {
  const trimmedDescription = description.trim()
  if (!trimmedDescription || trimmedDescription.length > 200) {
    return { success: false, error: 'Descrição do cliente é obrigatória (máx. 200 caracteres).' }
  }

  // Validate code format if provided
  if (code && !/^[A-Z0-9]{1,8}$/.test(code)) {
    return { success: false, error: 'Código deve ter 1-8 caracteres alfanuméricos (A-Z, 0-9).' }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('clients')
    .insert({
      company_id: membership.company.id,
      description: trimmedDescription,
      ...(code ? { code } : {}),
    })

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe um cliente com este código.' }
      }
      return { success: false, error: 'Já existe um cliente com esta descrição.' }
    }
    console.error('Failed to create client:', error)
    return { success: false, error: 'Erro ao criar cliente.' }
  }

  return { success: true }
}

// ── Update ────────────────────────────────────────────────────

export async function updateClientRecord(
  clientId: string,
  description: string,
  code?: string,
  active?: boolean
): Promise<ClientResult> {
  const trimmedDescription = description.trim()
  if (!trimmedDescription || trimmedDescription.length > 200) {
    return { success: false, error: 'Descrição do cliente é obrigatória (máx. 200 caracteres).' }
  }

  // Validate code format if provided
  if (code && !/^[A-Z0-9]{1,8}$/.test(code)) {
    return { success: false, error: 'Código deve ter 1-8 caracteres alfanuméricos (A-Z, 0-9).' }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
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

  const { error } = await supabase
    .from('clients')
    .update({
      description: trimmedDescription,
      ...(code ? { code } : {}),
      ...(active !== undefined ? { active } : {}),
    })
    .eq('id', clientId)

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe um cliente com este código.' }
      }
      return { success: false, error: 'Já existe um cliente com esta descrição.' }
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
  if (!membership || membership.member.role !== 'admin') {
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

// ── List ──────────────────────────────────────────────────────

export async function getClientsForCompany(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  const membership = await getCurrentMembership()
  if (!membership) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('company_id', membership.company.id)
    .order('active', { ascending: false })
    .order('description', { ascending: true })

  if (error) {
    console.error('Failed to fetch clients:', error)
    return { success: false, error: 'Erro ao buscar clientes.' }
  }

  return { success: true, data: data ?? [] }
}
