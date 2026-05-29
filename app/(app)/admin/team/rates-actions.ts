'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'

export interface RateResult {
  success: boolean
  error?: string
}

// ── List ──────────────────────────────────────────────────────

export async function getMemberRates(userId: string): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  const membership = await getCurrentMembership()
  if (!membership || !['admin', 'owner'].includes(membership.member.role)) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('member_rates')
    .select('*')
    .eq('company_id', membership.company.id)
    .eq('user_id', userId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Failed to fetch member rates:', error)
    return { success: false, error: 'Erro ao buscar taxas do membro.' }
  }

  return { success: true, data: data ?? [] }
}

// ── Create ────────────────────────────────────────────────────

export async function createMemberRate(
  userId: string,
  startDate: string,
  endDate: string | null,
  saleRate: number,
  costRate: number
): Promise<RateResult> {
  if (!startDate) {
    return { success: false, error: 'Data de início é obrigatória.' }
  }

  if (saleRate < 0 || costRate < 0) {
    return { success: false, error: 'Taxas devem ser valores positivos.' }
  }

  if (endDate && endDate < startDate) {
    return { success: false, error: 'Data final deve ser igual ou posterior à data de início.' }
  }

  const membership = await getCurrentMembership()
  if (!membership || !['admin', 'owner'].includes(membership.member.role)) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('member_rates')
    .insert({
      company_id: membership.company.id,
      user_id: userId,
      start_date: startDate,
      end_date: endDate || null,
      sale_rate: saleRate,
      cost_rate: costRate,
    })

  if (error) {
    if (error.code === '23P01') {
      return { success: false, error: 'O período informado conflita com outro já cadastrado para este membro.' }
    }
    console.error('Failed to create member rate:', error)
    return { success: false, error: 'Erro ao criar taxa do membro.' }
  }

  return { success: true }
}

// ── Update ────────────────────────────────────────────────────

export async function updateMemberRate(
  rateId: string,
  startDate: string,
  endDate: string | null,
  saleRate: number,
  costRate: number
): Promise<RateResult> {
  if (!startDate) {
    return { success: false, error: 'Data de início é obrigatória.' }
  }

  if (saleRate < 0 || costRate < 0) {
    return { success: false, error: 'Taxas devem ser valores positivos.' }
  }

  if (endDate && endDate < startDate) {
    return { success: false, error: 'Data final deve ser igual ou posterior à data de início.' }
  }

  const membership = await getCurrentMembership()
  if (!membership || !['admin', 'owner'].includes(membership.member.role)) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  // Verify rate belongs to this company
  const { data: rate } = await supabase
    .from('member_rates')
    .select('id, company_id')
    .eq('id', rateId)
    .single()

  if (!rate) return { success: false, error: 'Taxa não encontrada.' }
  if (rate.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('member_rates')
    .update({
      start_date: startDate,
      end_date: endDate || null,
      sale_rate: saleRate,
      cost_rate: costRate,
    })
    .eq('id', rateId)

  if (error) {
    if (error.code === '23P01') {
      return { success: false, error: 'O período informado conflita com outro já cadastrado para este membro.' }
    }
    console.error('Failed to update member rate:', error)
    return { success: false, error: 'Erro ao atualizar taxa do membro.' }
  }

  return { success: true }
}

// ── Delete ────────────────────────────────────────────────────

export async function deleteMemberRate(rateId: string): Promise<RateResult> {
  const membership = await getCurrentMembership()
  if (!membership || !['admin', 'owner'].includes(membership.member.role)) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  // Verify rate belongs to this company
  const { data: rate } = await supabase
    .from('member_rates')
    .select('id, company_id')
    .eq('id', rateId)
    .single()

  if (!rate) return { success: false, error: 'Taxa não encontrada.' }
  if (rate.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('member_rates')
    .delete()
    .eq('id', rateId)

  if (error) {
    console.error('Failed to delete member rate:', error)
    return { success: false, error: 'Erro ao excluir taxa do membro.' }
  }

  return { success: true }
}
