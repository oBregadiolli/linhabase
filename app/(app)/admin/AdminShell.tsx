'use client'

import { useState, useMemo, lazy, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { FileText, Users, FolderOpen, Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompanyMember, Invitation, Project } from '@/lib/types/database.types'
import Sidebar from '@/components/timesheets/Sidebar'

// Lazy-load heavy tab components — only downloaded when first accessed
const AdminTimesheetsClient = lazy(() => import('./timesheets/AdminTimesheetsClient'))
const TeamClient = lazy(() => import('./team/TeamClient'))
const ProjectsClient = lazy(() => import('./projects/ProjectsClient'))
const XYClient = lazy(() => import('./xy/XYClient'))

// ── Types ───────────────────────────────────────────────────────

interface MemberProfile {
  id: string
  name: string
  email: string
}

interface EnrichedMember extends CompanyMember {
  profile_name: string | null
}

type AdminTab = 'timesheets' | 'team' | 'projects' | 'xy'

const TABS: { key: AdminTab; label: string; icon: typeof FileText }[] = [
  { key: 'timesheets', label: 'Apontamentos', icon: FileText },
  { key: 'team',       label: 'Equipe',       icon: Users },
  { key: 'projects',   label: 'Projetos',     icon: FolderOpen },
  { key: 'xy',         label: 'XY',           icon: Grid3X3 },
]

// ── Props ───────────────────────────────────────────────────────

interface AdminShellProps {
  companyName: string
  adminName: string
  adminEmail: string
  adminAvatarUrl?: string | null
  // Timesheets tab
  members: MemberProfile[]
  projects: Project[]
  // Team tab
  teamMembers: EnrichedMember[]
  pendingInvitations: Invitation[]
  revokedInvitations: Invitation[]
}

// ── Tab spinner ─────────────────────────────────────────────────
function TabSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[40vh]">
      <div className="h-6 w-6 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────

export default function AdminShell({
  companyName,
  adminName,
  adminEmail,
  adminAvatarUrl,
  members,
  projects,
  teamMembers,
  pendingInvitations,
  revokedInvitations,
}: AdminShellProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Active tab from URL or default
  const activeTab: AdminTab = useMemo(() => {
    const t = searchParams.get('tab')
    if (t === 'team' || t === 'projects' || t === 'timesheets' || t === 'xy') return t
    return 'timesheets'
  }, [searchParams])

  function setTab(tab: AdminTab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">

      {/* ── Sidebar (same as dashboard) ──────────────────────── */}
      <Sidebar userName={adminName} userEmail={adminEmail} avatarUrl={adminAvatarUrl} isAdmin={true} />

      {/* ── Main content area ────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Topbar with pill tabs ───────────────────────────── */}
        <header className="shrink-0 flex items-center justify-between gap-4 bg-white border-b border-gray-200 px-6 h-14">
          <div>
            <h1 className="text-sm font-bold text-gray-900">Administração</h1>
            <p className="text-xs text-gray-400">{companyName}</p>
          </div>

          {/* ── Pill nav tabs ──────────────────────────────────── */}
          <nav className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 select-none cursor-pointer',
                  activeTab === key
                    ? 'bg-white text-[#3730A3] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* ── Tab content ────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<TabSpinner />}>
            {activeTab === 'timesheets' && (
              <AdminTimesheetsClient
                companyName={companyName}
                members={members}
                projects={projects}
                adminName={adminEmail}
                embedded
              />
            )}
            {activeTab === 'team' && (
              <TeamClient
                companyName={companyName}
                members={teamMembers}
                pendingInvitations={pendingInvitations}
                revokedInvitations={revokedInvitations}
                embedded
              />
            )}
            {activeTab === 'projects' && (
              <ProjectsClient
                companyName={companyName}
                projects={projects}
                embedded
              />
            )}
            {activeTab === 'xy' && (
              <XYClient
                companyName={companyName}
                members={members}
                projects={projects}
                embedded
              />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
