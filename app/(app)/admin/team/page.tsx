import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/supabase/membership'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const membership = await getCurrentMembership()
  if (!membership) return null // Guard in layout handles redirect

  const supabase = await createClient()
  const companyId = membership.company.id

  // Fetch members and invitations in parallel
  const [{ data: members }, { data: invitations }, { data: revokedInvitations }] = await Promise.all([
    supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId)
      .order('status', { ascending: true })
      .order('email', { ascending: true }),
    supabase
      .from('invitations')
      .select('*')
      .eq('company_id', companyId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('invitations')
      .select('*')
      .eq('company_id', companyId)
      .not('revoked_at', 'is', null)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  // Enrich members with profile names
  const memberIds = (members ?? [])
    .map(m => m.user_id)
    .filter((id): id is string => id !== null)

  let profileMap: Record<string, { name: string; email: string }> = {}

  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', memberIds)

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map(p => [p.id, { name: p.name, email: p.email }])
      )
    }
  }

  const enrichedMembers = (members ?? []).map(m => ({
    ...m,
    profile_name: m.user_id ? profileMap[m.user_id]?.name ?? null : null,
  }))

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
      </div>
    }>
      <TeamClient
        companyName={membership.company.name}
        members={enrichedMembers}
        pendingInvitations={invitations ?? []}
        revokedInvitations={revokedInvitations ?? []}
      />
    </Suspense>
  )
}
