'use server'

import { createClient } from '@/lib/supabase/server'

export interface AcceptResult {
  success: boolean
  companyName?: string
  error?: string
}

/**
 * Server Action: accept an invitation by token.
 *
 * Delegates entirely to the SECURITY DEFINER RPC function
 * `accept_invitation` which performs atomic validation and
 * updates in a single database transaction.
 *
 * This action only:
 * 1. Validates the user is authenticated
 * 2. Calls the RPC
 * 3. Returns the result
 */
export async function acceptInvitationAction(token: string): Promise<AcceptResult> {
  if (!token?.trim()) {
    return { success: false, error: 'Token inválido.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Você precisa estar autenticado para aceitar o convite.' }
  }

  const { data, error } = await supabase.rpc('accept_invitation', {
    token_input: token.trim(),
  })

  if (error) {
    return { success: false, error: 'Erro ao processar convite. Tente novamente.' }
  }

  const result = data as Record<string, unknown>

  if (result.status === 'success') {
    return {
      success: true,
      companyName: result.company_name as string,
    }
  }

  return {
    success: false,
    error: (result.message as string) ?? 'Erro desconhecido.',
  }
}

/**
 * Server Action: register a new account AND accept the invitation in one step.
 * Used when the invited user doesn't have an account yet.
 */
export async function registerAndAcceptAction(formData: FormData): Promise<AcceptResult> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const token = (formData.get('token') as string)?.trim()

  if (!name || !email || !password || !token) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Senha deve ter pelo menos 8 caracteres.' }
  }

  const supabase = await createClient()

  // 1. Create account
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      return { success: false, error: 'Este email já possui conta. Faça login para aceitar o convite.' }
    }
    console.error('Sign up error:', signUpError)
    return { success: false, error: `Erro ao criar conta: ${signUpError.message}` }
  }

  // 2. Accept the invitation (user is now authenticated via signUp)
  const { data, error: rpcError } = await supabase.rpc('accept_invitation', {
    token_input: token,
  })

  if (rpcError) {
    console.error('Accept invitation error:', rpcError)
    return { success: false, error: 'Conta criada, mas erro ao aceitar convite. Faça login e tente novamente.' }
  }

  const result = data as Record<string, unknown>

  if (result.status === 'success') {
    return {
      success: true,
      companyName: result.company_name as string,
    }
  }

  return {
    success: false,
    error: (result.message as string) ?? 'Erro desconhecido.',
  }
}
