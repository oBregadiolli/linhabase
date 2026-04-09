'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Mail, UserPlus, Clock, CheckCircle2, XCircle, Shield, User, Copy, RefreshCw, Ban, Check, AlertTriangle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompanyMember, Invitation } from '@/lib/types/database.types'
import { createInvitation, revokeInvitation, resendInvitation } from './actions'
import type { InviteResult } from './actions'

interface EnrichedMember extends CompanyMember {
  profile_name: string | null
}

interface TeamClientProps {
  companyName: string
  members: EnrichedMember[]
  pendingInvitations: Invitation[]
  revokedInvitations: Invitation[]
  /** When true, skip the outer wrapper & topbar (rendered by AdminShell) */
  embedded?: boolean
}

export default function TeamClient({ companyName, members, pendingInvitations, revokedInvitations, embedded }: TeamClientProps) {
  const router = useRouter()
  const [showInviteForm, setShowInviteForm] = useState(false)

  const activeMembers = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')
  const inactiveMembers = members.filter(m => m.status === 'inactive')

  // Split pending invitations into active vs expired
  const activePending = pendingInvitations.filter(inv => new Date(inv.expires_at) >= new Date())
  const expiredInvitations = pendingInvitations.filter(inv => new Date(inv.expires_at) < new Date())

  return (
    <div className={embedded ? 'flex flex-col flex-1 min-w-0 overflow-hidden' : 'flex h-screen bg-[#F3F4F6] overflow-hidden'}>
      <div className={embedded ? 'flex flex-col flex-1 min-w-0 overflow-hidden' : 'flex flex-col flex-1 min-w-0 overflow-hidden'}>

        {/* Topbar — hidden when embedded in AdminShell */}
        {!embedded && (
        <header className="shrink-0 flex items-center justify-between gap-4 bg-white border-b border-gray-200 px-6 h-14">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="p-1.5 rounded-md text-gray-400 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors duration-150"
              title="Voltar ao dashboard"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </a>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Gestão de Equipe</h1>
              <p className="text-[11px] text-gray-400">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/timesheets" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors">
              Apontamentos
            </a>
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#3730A3] bg-[#EEF2FF]">
              Equipe
            </span>
            <a href="/admin/projects" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors">
              Projetos
            </a>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowInviteForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#312E81] transition-colors duration-150 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Convidar</span>
            </button>
          </div>
        </header>
        )}

        {/* Invite button when embedded (topbar handled by AdminShell) */}
        {embedded && (
          <div className="shrink-0 flex items-center justify-end bg-white border-b border-gray-100 px-6 py-2">
            <button
              onClick={() => setShowInviteForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#312E81] transition-colors duration-150 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Convidar
            </button>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryCard
                icon={<Users className="h-4 w-4" />}
                label="Membros Ativos"
                value={String(activeMembers.length)}
              />
              <SummaryCard
                icon={<Clock className="h-4 w-4" />}
                label="Convites Pendentes"
                value={String(activePending.length)}
              />
              <SummaryCard
                icon={<Mail className="h-4 w-4" />}
                label="Total de Convites"
                value={String(pendingInvitations.length + revokedInvitations.length)}
              />
            </div>

            {/* ── Active members ──────────────────────────── */}
            <Section title="Membros Ativos" count={activeMembers.length}>
              {activeMembers.length === 0 ? (
                <EmptyState text="Nenhum membro ativo." />
              ) : (
                <div className="divide-y divide-gray-50">
                  {activeMembers.map(m => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Pending members ─────────────────────────── */}
            <Section title="Aguardando Aceite" count={pendingMembers.length}>
              {pendingMembers.length === 0 ? (
                <EmptyState text="Nenhum convite pendente." />
              ) : (
                <div className="divide-y divide-gray-50">
                  {pendingMembers.map(m => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </div>
              )}
            </Section>

            {/* ── Active pending invitations ────────────────── */}
            {activePending.length > 0 && (
              <Section title="Convites Enviados" count={activePending.length}>
                <div className="divide-y divide-gray-50">
                  {activePending.map(inv => (
                    <InvitationRow key={inv.id} invitation={inv} onRefresh={() => router.refresh()} />
                  ))}
                </div>
              </Section>
            )}

            {/* ── Expired invitations ──────────────────────── */}
            {expiredInvitations.length > 0 && (
              <Section title="Convites Expirados" count={expiredInvitations.length}>
                <div className="divide-y divide-gray-50">
                  {expiredInvitations.map(inv => (
                    <InvitationRow key={inv.id} invitation={inv} onRefresh={() => router.refresh()} />
                  ))}
                </div>
              </Section>
            )}

            {/* ── Revoked invitations ──────────────────────── */}
            {revokedInvitations.length > 0 && (
              <Section title="Convites Revogados" count={revokedInvitations.length}>
                <div className="divide-y divide-gray-50">
                  {revokedInvitations.map(inv => (
                    <InvitationRow key={inv.id} invitation={inv} onRefresh={() => router.refresh()} />
                  ))}
                </div>
              </Section>
            )}

            {/* ── Inactive members ────────────────────────── */}
            {inactiveMembers.length > 0 && (
              <Section title="Membros Inativos" count={inactiveMembers.length}>
                <div className="divide-y divide-gray-50">
                  {inactiveMembers.map(m => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        </main>
      </div>

      {/* ── Invite Modal ─────────────────────────────── */}
      {showInviteForm && (
        <InviteModal
          onClose={() => setShowInviteForm(false)}
          onSuccess={() => {
            setShowInviteForm(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
        <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
      </div>
      {children}
    </div>
  )
}

// ── Member row ────────────────────────────────────────────────

function MemberRow({ member }: { member: EnrichedMember }) {
  const displayName = member.profile_name || member.email
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
      {/* Avatar */}
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0",
        member.status === 'active' ? 'bg-[#3730A3]' : member.status === 'pending' ? 'bg-amber-400' : 'bg-gray-300',
      )}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{displayName}</p>
        {member.profile_name && (
          <p className="text-[11px] text-gray-400 truncate">{member.email}</p>
        )}
      </div>

      {/* Role badge */}
      <RoleBadge role={member.role} />

      {/* Status badge */}
      <StatusBadge status={member.status} />

      {/* Date */}
      <span className="text-[11px] text-gray-400 hidden sm:block whitespace-nowrap">
        {member.status === 'active' && member.joined_at
          ? `Ativo desde ${formatDateShort(member.joined_at)}`
          : member.status === 'pending'
            ? `Convidado em ${formatDateShort(member.invited_at)}`
            : ''}
      </span>
    </div>
  )
}

// ── Invitation row (with actions) ─────────────────────────────

function InvitationRow({ invitation, onRefresh }: { invitation: Invitation; onRefresh: () => void }) {
  const isExpired = new Date(invitation.expires_at) < new Date()
  const isRevoked = !!invitation.revoked_at
  const [isPending, startTransition] = useTransition()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function getInviteStatus(): 'pending' | 'expired' | 'revoked' {
    if (isRevoked) return 'revoked'
    if (isExpired) return 'expired'
    return 'pending'
  }

  const status = getInviteStatus()

  function handleCopyLink() {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/invite?token=${invitation.token}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(invitation.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function handleRevoke() {
    setError(null)
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id)
      if (result.success) {
        onRefresh()
      } else {
        setError(result.error ?? 'Erro ao revogar.')
      }
    })
  }

  function handleResend() {
    setError(null)
    startTransition(async () => {
      const result = await resendInvitation(invitation.id)
      if (result.success) {
        if (result.warning) {
          setError(result.warning)
        }
        onRefresh()
      } else {
        setError(result.error ?? 'Erro ao reenviar.')
      }
    })
  }

  const statusConfig = {
    pending: { bg: 'bg-amber-50 text-amber-500', badgeCls: 'bg-amber-50 text-amber-700', label: 'Pendente' },
    expired: { bg: 'bg-red-100 text-red-500', badgeCls: 'bg-red-50 text-red-600', label: 'Expirado' },
    revoked: { bg: 'bg-gray-100 text-gray-400', badgeCls: 'bg-gray-100 text-gray-500', label: 'Revogado' },
  }

  const sc = statusConfig[status]

  return (
    <div className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", sc.bg)}>
          <Mail className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{invitation.email}</p>
          <p className="text-[11px] text-gray-400">
            {status === 'expired'
              ? `Expirou em ${formatDateShort(invitation.expires_at)}`
              : status === 'revoked'
                ? `Revogado em ${formatDateShort(invitation.revoked_at!)}`
                : `Válido até ${formatDateShort(invitation.expires_at)}`}
          </p>
        </div>
        <RoleBadge role={invitation.role as 'admin' | 'member'} />
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", sc.badgeCls)}>
          {sc.label}
        </span>

        {/* ── Action buttons ─────────── */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Copy link — only for pending */}
          {status === 'pending' && (
            <button
              onClick={handleCopyLink}
              title="Copiar link de convite"
              className="p-1.5 rounded-md text-gray-400 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors"
              disabled={isPending}
            >
              {copiedId === invitation.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Resend — for expired or revoked */}
          {(status === 'expired' || status === 'revoked') && (
            <button
              onClick={handleResend}
              title="Reenviar convite (gera novo token)"
              className="p-1.5 rounded-md text-gray-400 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors disabled:opacity-40"
              disabled={isPending}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
            </button>
          )}

          {/* Revoke — only for pending */}
          {status === 'pending' && (
            <button
              onClick={handleRevoke}
              title="Revogar convite"
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              disabled={isPending}
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error feedback */}
      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ── Invite Modal ──────────────────────────────────────────────

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [successState, setSuccessState] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setWarning(null)

    startTransition(async () => {
      const result = await createInvitation(email, role)
      if (result.success) {
        if (result.warning) {
          // Invite created but email failed — show warning then close
          setWarning(result.warning)
          setSuccessState(true)
          setTimeout(() => onSuccess(), 3000)
        } else {
          // Full success — email sent
          setSuccessState(true)
          setTimeout(() => onSuccess(), 1500)
        }
      } else {
        setError(result.error ?? 'Erro desconhecido.')
      }
    })
  }

  if (successState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6 text-center">
          {warning ? (
            <>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-3">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Convite criado</h2>
              <p className="text-sm text-amber-600 mb-2">{warning}</p>
              <p className="text-xs text-gray-400">O link pode ser copiado manualmente na lista de convites.</p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mx-auto mb-3">
                <Send className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Convite enviado!</h2>
              <p className="text-sm text-gray-500">Email de convite enviado para <strong className="text-gray-700">{email}</strong>.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Convidar Membro</h2>
        <p className="text-sm text-gray-500 mb-5">
          Um email de convite será enviado automaticamente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@empresa.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730A3]/30 focus:border-[#3730A3] transition-colors"
              disabled={isPending}
              autoFocus
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
              Papel
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={e => setRole(e.target.value as 'admin' | 'member')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3730A3]/30 focus:border-[#3730A3] transition-colors"
              disabled={isPending}
            >
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3730A3] text-white text-sm font-semibold hover:bg-[#312E81] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isPending ? 'Enviando...' : 'Convidar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Small components ──────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#3730A3]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: 'admin' | 'member' | string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
      role === 'admin' ? 'bg-[#EEF2FF] text-[#3730A3]' : 'bg-gray-100 text-gray-600',
    )}>
      {role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {role === 'admin' ? 'Admin' : 'Membro'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    active: { cls: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Ativo' },
    pending: { cls: 'bg-amber-50 text-amber-700', icon: <Clock className="h-3 w-3" />, label: 'Pendente' },
    inactive: { cls: 'bg-gray-100 text-gray-500', icon: <XCircle className="h-3 w-3" />, label: 'Inativo' },
  }
  const c = config[status] ?? config.inactive
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", c.cls)}>
      {c.icon}
      {c.label}
    </span>
  )
}

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}
