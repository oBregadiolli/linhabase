'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'
import type { Project } from '@/lib/types/database.types'

export interface ProjectResult {
  success: boolean
  error?: string
  data?: Project
}

// ── Create ────────────────────────────────────────────────────

export async function createProject(
  name: string,
  color: string | null,
  code?: string,
  clientId?: string | null
): Promise<ProjectResult> {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 100) {
    return { success: false, error: 'Nome do projeto é obrigatório (máx. 100 caracteres).' }
  }

  if (code && !/^[A-Z0-9]{1,8}$/.test(code)) {
    return { success: false, error: 'Código deve ter 1-8 caracteres alfanuméricos (A-Z, 0-9).' }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessão expirada.' }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      company_id: membership.company.id,
      name: trimmedName,
      color: color?.trim() || null,
      created_by: user.id,
      ...(code ? { code } : {}),
      client_id: clientId || null,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe um projeto com este código.' }
      }
      return { success: false, error: 'Já existe um projeto com este nome.' }
    }
    console.error('Failed to create project:', error)
    return { success: false, error: 'Erro ao criar projeto.' }
  }

  return { success: true, data }
}

// ── Update ────────────────────────────────────────────────────

export async function updateProject(
  projectId: string,
  name: string,
  color: string | null,
  code?: string,
  clientId?: string | null
): Promise<ProjectResult> {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 100) {
    return { success: false, error: 'Nome do projeto é obrigatório (máx. 100 caracteres).' }
  }

  if (code && !/^[A-Z0-9]{1,8}$/.test(code)) {
    return { success: false, error: 'Código deve ter 1-8 caracteres alfanuméricos (A-Z, 0-9).' }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, company_id')
    .eq('id', projectId)
    .single()

  if (!project) return { success: false, error: 'Projeto não encontrado.' }
  if (project.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      name: trimmedName,
      color: color?.trim() || null,
      ...(code ? { code } : {}),
      client_id: clientId !== undefined ? (clientId || null) : undefined,
    })
    .eq('id', projectId)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe um projeto com este código.' }
      }
      return { success: false, error: 'Já existe um projeto com este nome.' }
    }
    console.error('Failed to update project:', error)
    return { success: false, error: 'Erro ao atualizar projeto.' }
  }

  return { success: true, data }
}

// ── Toggle active ─────────────────────────────────────────────

export async function toggleProjectActive(
  projectId: string,
  active: boolean
): Promise<ProjectResult> {
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, company_id')
    .eq('id', projectId)
    .single()

  if (!project) return { success: false, error: 'Projeto não encontrado.' }
  if (project.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { data, error } = await supabase
    .from('projects')
    .update({ active })
    .eq('id', projectId)
    .select('*')
    .single()

  if (error) {
    console.error('Failed to toggle project:', error)
    return { success: false, error: 'Erro ao alterar status do projeto.' }
  }

  return { success: true, data }
}
