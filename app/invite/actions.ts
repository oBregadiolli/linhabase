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
