import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/supabase/membership'
import DashboardClient from '@/components/timesheets/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .maybeSingle() as { data: { name: string; email: string } | null }

  const isAdmin = await isCurrentUserAdmin()

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
      </div>
    }>
      <DashboardClient
        userId={user.id}
        userName={profile?.name || user.email || ''}
        userEmail={profile?.email || user.email || ''}
        isAdmin={isAdmin}
      />
    </Suspense>
  )
}

