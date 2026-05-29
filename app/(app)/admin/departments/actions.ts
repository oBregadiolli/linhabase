'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'

export interface DepartmentResult {
  success: boolean
  error?: string
}

// ── Create Department ─────────────────────────────────────────

export async function createDepartment(
  name: string,
  code?: string
): Promise<DepartmentResult> {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 100) {
    return { success: false, error: 'Nome do departamento é obrigatório (máx. 100 caracteres).' }
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
    .from('departments')
    .insert({
      company_id: membership.company.id,
      name: trimmedName,
      ...(code ? { code } : {}),
    })

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe um departamento com este código.' }
      }
      return { success: false, error: 'Já existe um departamento com este nome.' }
    }
    console.error('Failed to create department:', error)
    return { success: false, error: 'Erro ao criar departamento.' }
  }

  return { success: true }
}

// ── Update Department ─────────────────────────────────────────

export async function updateDepartment(
  id: string,
  name: string,
  code?: string,
  active?: boolean
): Promise<DepartmentResult> {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 100) {
    return { success: false, error: 'Nome do departamento é obrigatório (máx. 100 caracteres).' }
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

  // Verify department belongs to this company
  const { data: department } = await supabase
    .from('departments')
    .select('id, company_id')
    .eq('id', id)
    .single()

  if (!department) return { success: false, error: 'Departamento não encontrado.' }
  if (department.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('departments')
    .update({
      name: trimmedName,
      ...(code ? { code } : {}),
      ...(active !== undefined ? { active } : {}),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe um departamento com este código.' }
      }
      return { success: false, error: 'Já existe um departamento com este nome.' }
    }
    console.error('Failed to update department:', error)
    return { success: false, error: 'Erro ao atualizar departamento.' }
  }

  return { success: true }
}

// ── Toggle Department Active ──────────────────────────────────

export async function toggleDepartmentActive(
  id: string,
  active: boolean
): Promise<DepartmentResult> {
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { data: department } = await supabase
    .from('departments')
    .select('id, company_id')
    .eq('id', id)
    .single()

  if (!department) return { success: false, error: 'Departamento não encontrado.' }
  if (department.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('departments')
    .update({ active })
    .eq('id', id)

  if (error) {
    console.error('Failed to toggle department:', error)
    return { success: false, error: 'Erro ao alterar status do departamento.' }
  }

  return { success: true }
}

// ── Create Team ───────────────────────────────────────────────

export async function createTeam(
  departmentId: string,
  name: string,
  code?: string
): Promise<DepartmentResult> {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 100) {
    return { success: false, error: 'Nome da equipe é obrigatório (máx. 100 caracteres).' }
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

  // Verify department belongs to this company
  const { data: department } = await supabase
    .from('departments')
    .select('id, company_id')
    .eq('id', departmentId)
    .single()

  if (!department) return { success: false, error: 'Departamento não encontrado.' }
  if (department.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('teams')
    .insert({
      company_id: membership.company.id,
      department_id: departmentId,
      name: trimmedName,
      ...(code ? { code } : {}),
    })

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe uma equipe com este código.' }
      }
      return { success: false, error: 'Já existe uma equipe com este nome.' }
    }
    console.error('Failed to create team:', error)
    return { success: false, error: 'Erro ao criar equipe.' }
  }

  return { success: true }
}

// ── Update Team ───────────────────────────────────────────────

export async function updateTeam(
  id: string,
  name: string,
  code?: string,
  active?: boolean
): Promise<DepartmentResult> {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 100) {
    return { success: false, error: 'Nome da equipe é obrigatório (máx. 100 caracteres).' }
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

  // Verify team belongs to this company
  const { data: team } = await supabase
    .from('teams')
    .select('id, company_id')
    .eq('id', id)
    .single()

  if (!team) return { success: false, error: 'Equipe não encontrada.' }
  if (team.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('teams')
    .update({
      name: trimmedName,
      ...(code ? { code } : {}),
      ...(active !== undefined ? { active } : {}),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('code')) {
        return { success: false, error: 'Já existe uma equipe com este código.' }
      }
      return { success: false, error: 'Já existe uma equipe com este nome.' }
    }
    console.error('Failed to update team:', error)
    return { success: false, error: 'Erro ao atualizar equipe.' }
  }

  return { success: true }
}

// ── Toggle Team Active ────────────────────────────────────────

export async function toggleTeamActive(
  id: string,
  active: boolean
): Promise<DepartmentResult> {
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  const { data: team } = await supabase
    .from('teams')
    .select('id, company_id')
    .eq('id', id)
    .single()

  if (!team) return { success: false, error: 'Equipe não encontrada.' }
  if (team.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('teams')
    .update({ active })
    .eq('id', id)

  if (error) {
    console.error('Failed to toggle team:', error)
    return { success: false, error: 'Erro ao alterar status da equipe.' }
  }

  return { success: true }
}

// ── Assign Member to Team ─────────────────────────────────────

export async function assignMemberToTeam(
  memberId: string,
  teamId: string | null
): Promise<DepartmentResult> {
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  // Verify member belongs to this company
  const { data: member } = await supabase
    .from('company_members')
    .select('id, company_id')
    .eq('id', memberId)
    .single()

  if (!member) return { success: false, error: 'Membro não encontrado.' }
  if (member.company_id !== membership.company.id) {
    return { success: false, error: 'Acesso negado.' }
  }

  // If teamId provided, verify team belongs to this company
  if (teamId) {
    const { data: team } = await supabase
      .from('teams')
      .select('id, company_id')
      .eq('id', teamId)
      .single()

    if (!team) return { success: false, error: 'Equipe não encontrada.' }
    if (team.company_id !== membership.company.id) {
      return { success: false, error: 'Acesso negado.' }
    }
  }

  const { error } = await supabase
    .from('company_members')
    .update({ team_id: teamId })
    .eq('id', memberId)

  if (error) {
    console.error('Failed to assign member to team:', error)
    return { success: false, error: 'Erro ao atribuir membro à equipe.' }
  }

  return { success: true }
}

// ── List Departments with Teams ───────────────────────────────

export async function getDepartmentsWithTeams(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  const membership = await getCurrentMembership()
  if (!membership) {
    return { success: false, error: 'Acesso negado.' }
  }

  const supabase = await createClient()

  // Fetch all departments for this company
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*')
    .eq('company_id', membership.company.id)
    .order('name', { ascending: true })

  if (deptError) {
    console.error('Failed to fetch departments:', deptError)
    return { success: false, error: 'Erro ao buscar departamentos.' }
  }

  // Fetch all teams for this company
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('company_id', membership.company.id)
    .order('name', { ascending: true })

  if (teamsError) {
    console.error('Failed to fetch teams:', teamsError)
    return { success: false, error: 'Erro ao buscar equipes.' }
  }

  // Fetch member counts per team
  const { data: memberCounts, error: memberError } = await supabase
    .from('company_members')
    .select('team_id')
    .eq('company_id', membership.company.id)
    .eq('status', 'active')
    .not('team_id', 'is', null)

  if (memberError) {
    console.error('Failed to fetch member counts:', memberError)
    return { success: false, error: 'Erro ao buscar membros das equipes.' }
  }

  // Count members per team
  const teamMemberCount: Record<string, number> = {}
  for (const row of memberCounts ?? []) {
    if (row.team_id) {
      teamMemberCount[row.team_id] = (teamMemberCount[row.team_id] || 0) + 1
    }
  }

  // Build nested structure: departments → teams (with member_count)
  const result = (departments ?? []).map((dept) => ({
    ...dept,
    teams: (teams ?? [])
      .filter((t) => t.department_id === dept.id)
      .map((t) => ({
        ...t,
        member_count: teamMemberCount[t.id] || 0,
      })),
  }))

  return { success: true, data: result }
}
