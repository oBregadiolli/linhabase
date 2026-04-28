import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin, getCurrentMembership } from '@/lib/supabase/membership'
import DashboardClient from '@/components/timesheets/DashboardClient'
import type { Project } from '@/lib/types/database.types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If user has no company, redirect to onboarding
  const membership = await getCurrentMembership()
  if (!membership) redirect('/onboarding')

  const companyId = membership.company.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle() as { data: { name: string; email: string; avatar_url: string | null } | null }

  const { data: companyProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('active', { ascending: false })
    .order('name', { ascending: true })

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
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={isAdmin}
        companyId={companyId}
        initialProjects={(companyProjects ?? []) as Project[]}
      />
    </Suspense>
  )
}

