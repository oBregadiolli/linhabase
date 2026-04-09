'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createCompanyAction(formData: FormData) {
  const companyName = (formData.get('companyName') as string)?.trim()

  if (!companyName || companyName.length < 2) {
    return { error: 'Nome da empresa deve ter pelo menos 2 caracteres.' }
  }

  if (companyName.length > 100) {
    return { error: 'Nome da empresa deve ter no máximo 100 caracteres.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Usuário não autenticado.' }
  }

  // Check if user already has a company
  const { data: existing } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (existing) {
    redirect('/dashboard')
  }

  // Generate slug from company name
  const slug = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Create company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: companyName,
      owner_id: user.id,
      slug,
      plan: 'free',
    })
    .select('id')
    .single()

  if (companyError) {
    console.error('Failed to create company:', companyError.message, companyError.code, companyError.details, 'user:', user.id)
    return { error: `Erro ao criar empresa: ${companyError.message}` }
  }

  // Create admin membership
  const { error: memberError } = await supabase
    .from('company_members')
    .insert({
      company_id: company.id,
      user_id: user.id,
      email: user.email!,
      role: 'admin',
      status: 'active',
      joined_at: new Date().toISOString(),
    })

  if (memberError) {
    console.error('Failed to create membership:', memberError)
    // Clean up orphan company
    await supabase.from('companies').delete().eq('id', company.id)
    return { error: 'Erro ao configurar permissões. Tente novamente.' }
  }

  redirect('/dashboard')
}
