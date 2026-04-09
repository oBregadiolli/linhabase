import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership, getCompanyMemberIds } from '@/lib/supabase/membership'
import AdminTimesheetsClient from './AdminTimesheetsClient'

export default async function AdminTimesheetsPage() {
  const supabase = await createClient()
  const membership = await getCurrentMembership()

  // Guard already handled by layout, but be defensive
  if (!membership) return null

  const companyId = membership.company.id
  const memberIds = await getCompanyMemberIds(companyId)

  // Fetch member profiles for the filter dropdown
  const { data: memberProfiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', memberIds)
    .order('name', { ascending: true })

  // Fetch company projects for the project filter
  const { data: companyProjects } = await supabase
    .from('projects')
    .select('id, name, color, active')
    .eq('company_id', companyId)
    .order('active', { ascending: false })
    .order('name', { ascending: true })

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
      </div>
    }>
      <AdminTimesheetsClient
        companyName={membership.company.name}
        members={memberProfiles ?? []}
        projects={companyProjects ?? []}
        adminName={membership.member.email}
      />
    </Suspense>
  )
}
