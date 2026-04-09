import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'
import OnboardingClient from './OnboardingClient'

export const metadata = {
  title: 'LinhaBase — Configurar Empresa',
  description: 'Crie sua empresa para começar a usar o LinhaBase.',
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If user already has a company, skip onboarding
  const membership = await getCurrentMembership()
  if (membership) redirect('/dashboard')

  // Get user name from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  const userName = (profile as { name?: string } | null)?.name || user.email || ''

  return <OnboardingClient userName={userName} />
}
