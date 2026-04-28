import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const membership = await getCurrentMembership()
    redirect(membership ? '/dashboard' : '/onboarding')
  } else {
    redirect('/login')
  }
}
