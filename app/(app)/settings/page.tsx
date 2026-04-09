import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get company info
  const { data: membership } = await supabase
    .from('company_members')
    .select('role, company_id, companies:company_id(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  const companyName = (membership as any)?.companies?.name ?? null
  const companyRole = membership?.role ?? null

  // Check if user is admin
  const isAdmin = companyRole === 'admin' || companyRole === 'owner'

  return (
    <SettingsClient
      profile={{
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
      }}
      companyName={companyName}
      companyRole={companyRole}
      isAdmin={isAdmin}
      userEmail={user.email ?? profile.email}
    />
  )
}
