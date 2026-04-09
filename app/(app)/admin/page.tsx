import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership, getCompanyMemberIds } from '@/lib/supabase/membership'
import type { CompanyMember, Invitation, Project } from '@/lib/types/database.types'
import AdminShell from './AdminShell'

/**
 * Unified admin page — loads ALL data once, delegates tab switching to AdminShell (client).
 * This eliminates repetitive server round-trips when navigating between admin tabs.
 *
 * URL contract:
 *   /admin               → defaults to timesheets tab
 *   /admin?tab=timesheets
 *   /admin?tab=team
 *   /admin?tab=projects
 *   /admin/timesheets    → redirect here (via page.tsx stubs)
 *   /admin/team          → redirect here
 *   /admin/projects      → redirect here
 */

interface EnrichedMember extends CompanyMember {
  profile_name: string | null
}

export default async function AdminPage() {
  const supabase = await createClient()
  const membership = await getCurrentMembership()

  // Guard (layout also checks, but be defensive)
  if (!membership) return null

  const companyId = membership.company.id
  const memberIds = await getCompanyMemberIds(companyId)

  // ── Parallel data fetch (single await, one round-trip) ────────
  const [
    { data: memberProfiles },
    { data: rawMembers },
    { data: pendingInvitations },
    { data: revokedInvitations },
    { data: companyProjects },
  ] = await Promise.all([
    // Timesheets: member profiles for filter dropdown
    supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('id', memberIds)
      .order('name', { ascending: true }),

    // Team: full members list
    supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId)
      .order('status', { ascending: true })
      .order('email', { ascending: true }),

    // Team: pending invitations
    supabase
      .from('invitations')
      .select('*')
      .eq('company_id', companyId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),

    // Team: revoked invitations
    supabase
      .from('invitations')
      .select('*')
      .eq('company_id', companyId)
      .not('revoked_at', 'is', null)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),

    // Projects: all company projects
    supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .order('active', { ascending: false })
      .order('name', { ascending: true }),
  ])

  // Build profile map for team enrichment
  const profileMap: Record<string, { name: string; email: string }> = {}
  if (memberProfiles) {
    for (const p of memberProfiles) {
      profileMap[p.id] = { name: p.name, email: p.email }
    }
  }

  const enrichedMembers: EnrichedMember[] = (rawMembers ?? []).map(m => ({
    ...m,
    profile_name: m.user_id ? profileMap[m.user_id]?.name ?? null : null,
  }))

  // Get admin profile for the sidebar
  const { data: { user } } = await supabase.auth.getUser()
  const adminProfile = memberProfiles?.find(p => p.id === user?.id)

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
      </div>
    }>
      <AdminShell
        companyName={membership.company.name}
        adminName={adminProfile?.name ?? membership.member.email}
        adminEmail={membership.member.email}
        adminAvatarUrl={adminProfile?.avatar_url ?? null}
        // Timesheets data
        members={memberProfiles ?? []}
        projects={(companyProjects ?? []) as Project[]}
        // Team data
        teamMembers={enrichedMembers}
        pendingInvitations={(pendingInvitations ?? []) as Invitation[]}
        revokedInvitations={(revokedInvitations ?? []) as Invitation[]}
      />
    </Suspense>
  )
}
