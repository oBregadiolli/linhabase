'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, formatDatePtBr, formatTime, formatDuration, getProjectColor, startOfMonth, endOfMonth } from '@/lib/utils/time'
import { ArrowLeft, Filter, Users, Calendar, ChevronLeft, ChevronRight, Clock, FolderOpen, CheckCircle2, FileText, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { approveTimesheets, rejectTimesheets } from './actions'

interface MemberProfile {
  id: string
  name: string
  email: string
}

interface ProjectSummary {
  id: string
  name: string
  color: string | null
  active: boolean
}

interface AdminTimesheetsClientProps {
  companyName: string
  members: MemberProfile[]
  projects: ProjectSummary[]
  adminName: string
  /** When true, skip the outer wrapper & topbar (rendered by AdminShell) */
  embedded?: boolean
}

type StatusFilter = 'all' | 'draft' | 'submitted' | 'approved'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'submitted', label: 'Enviado' },
  { value: 'approved', label: 'Aprovado' },
]

export default function AdminTimesheetsClient({ companyName, members, projects, adminName, embedded }: AdminTimesheetsClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const fetchGenRef = useRef(0)

  // ── State ─────────────────────────────────────────────────────
  const [timesheets, setTimesheets] = useState<(Timesheet & { user_name?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Approval/rejection state
  const [isPending, startTransition] = useTransition()
  const [approvalMsg, setApprovalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Rejection modal state
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([])
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  // Memoize with string key to avoid Date reference instability
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentMonthKey])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentMonthKey])

  // ── Project lookup map ────────────────────────────────────────
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectSummary>()
    for (const p of projects) map.set(p.id, p)
    return map
  }, [projects])

  function resolveProject(t: Timesheet): { name: string; color: string | null } {
    if (t.project_id) {
      const p = projectMap.get(t.project_id)
      if (p) return { name: p.name, color: p.color }
    }
    return { name: 'Sem projeto', color: null }
  }

  // ── Data fetch ────────────────────────────────────────────────
  const fetchTimesheets = useCallback(async () => {
    const gen = ++fetchGenRef.current
    setLoading(true)
    setFetchError(null)

    let query = supabase
      .from('timesheets')
      .select('*')
      .gte('date', isoDate(monthStart))
      .lte('date', isoDate(monthEnd))
      .order('date', { ascending: false })
      .order('start_time', { ascending: true })

    if (selectedMember !== 'all') query = query.eq('user_id', selectedMember)
    if (selectedProject !== 'all' && selectedProject !== '__no_project__') {
      query = query.eq('project_id', selectedProject)
    }
    if (selectedStatus !== 'all') query = query.eq('status', selectedStatus)

    const { data, error } = await query

    if (gen !== fetchGenRef.current) return
    if (error) {
      setFetchError('Erro ao carregar apontamentos da equipe.')
    } else {
      const enriched = (data ?? []).map(t => {
        const member = members.find(m => m.id === t.user_id)
        return { ...t, user_name: member?.name ?? member?.email ?? 'Desconhecido' }
      })
      setTimesheets(enriched)
    }
    setLoading(false)
    setSelectedIds(new Set()) // clear selection on fetch
  }, [supabase, monthStart, monthEnd, selectedMember, selectedProject, selectedStatus, members])

  useEffect(() => { fetchTimesheets() }, [fetchTimesheets])

  // ── Client-side filter for "sem projeto" ──────────────────────
  const filteredTimesheets = useMemo(() => {
    if (selectedProject === '__no_project__') {
      return timesheets.filter(t => !t.project_id)
    }
    return timesheets
  }, [timesheets, selectedProject])

  // ── Navigation ────────────────────────────────────────────────
  function navigateMonth(dir: 'prev' | 'next') {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
      return d
    })
  }

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const monthLabel = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  // ── Stats ─────────────────────────────────────────────────────
  const totalMinutes = filteredTimesheets.reduce((s, t) => s + (t.duration_minutes ?? 0), 0)
  const totalEntries = filteredTimesheets.length
  const submittedCount = filteredTimesheets.filter(t => t.status === 'submitted').length

  // ── Selection helpers ─────────────────────────────────────────
  const approvableItems = filteredTimesheets.filter(t => t.status === 'submitted')
  const selectedApprovable = approvableItems.filter(t => selectedIds.has(t.id))
  const allApprovableSelected = approvableItems.length > 0 && approvableItems.every(t => selectedIds.has(t.id))

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllApprovable() {
    if (allApprovableSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(approvableItems.map(t => t.id)))
    }
  }

  // ── Approval actions ──────────────────────────────────────────
  function handleApprove(ids: string[]) {
    setApprovalMsg(null)
    startTransition(async () => {
      const result = await approveTimesheets(ids)
      if (result.success) {
        const skippedNote = result.skipped > 0 ? ` (${result.skipped} ignorados)` : ''
        setApprovalMsg({ type: 'success', text: `${result.approved} apontamento(s) aprovado(s)${skippedNote}.` })
        fetchTimesheets()
      } else {
        setApprovalMsg({ type: 'error', text: result.error ?? 'Erro desconhecido.' })
      }
    })
  }

  function openRejectModal(ids: string[]) {
    setRejectTargetIds(ids)
    setRejectReason('')
    setShowRejectModal(true)
  }

  function handleReject() {
    if (!rejectReason.trim()) return
    setApprovalMsg(null)
    setShowRejectModal(false)
    startTransition(async () => {
      const result = await rejectTimesheets(rejectTargetIds, rejectReason.trim())
      if (result.success) {
        const skippedNote = result.skipped > 0 ? ` (${result.skipped} ignorados)` : ''
        setApprovalMsg({ type: 'success', text: `${result.rejected} apontamento(s) rejeitado(s)${skippedNote}.` })
        fetchTimesheets()
      } else {
        setApprovalMsg({ type: 'error', text: result.error ?? 'Erro desconhecido.' })
      }
      setRejectTargetIds([])
      setRejectReason('')
    })
  }

  // Active projects for filter
  const filterProjects = projects.filter(p => p.active)

  // ── Render ────────────────────────────────────────────────────
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
              <h1 className="text-sm font-semibold text-gray-900">Apontamentos da Equipe</h1>
              <p className="text-[11px] text-gray-400">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#3730A3] bg-[#EEF2FF]">
              Apontamentos
            </span>
            <a href="/admin/team" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors">
              Equipe
            </a>
            <a href="/admin/projects" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors">
              Projetos
            </a>
          </div>
        </header>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto relative">
          {(loading || isPending) && (
            <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden">
              <div className="h-full w-1/3 bg-[#3730A3] animate-[slide_1.2s_ease-in-out_infinite]" />
            </div>
          )}

          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Month navigator */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                <button onClick={() => navigateMonth('prev')} className="p-1 rounded hover:bg-gray-100 transition-colors" aria-label="Mês anterior">
                  <ChevronLeft className="h-4 w-4 text-gray-500" />
                </button>
                <div className="flex items-center gap-1.5 min-w-[160px] justify-center">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{monthLabel}</span>
                </div>
                <button onClick={() => navigateMonth('next')} className="p-1 rounded hover:bg-gray-100 transition-colors" aria-label="Próximo mês">
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Member filter */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-6">
                  <option value="all">Todos os membros</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                </select>
              </div>

              {/* Project filter */}
              {projects.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
                  <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-6">
                    <option value="all">Todos os projetos</option>
                    {filterProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="__no_project__">Sem projeto vinculado</option>
                  </select>
                </div>
              )}

              {/* Status filter */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as StatusFilter)} className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-6">
                  {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="text-xs font-medium text-[#3730A3] hover:text-[#312E81] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-3 py-2 rounded-lg transition-colors"
              >
                Mês atual
              </button>
            </div>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryCard icon={<Clock className="h-4 w-4" />} label="Total de Horas" value={formatDuration(totalMinutes)} />
              <SummaryCard icon={<Filter className="h-4 w-4" />} label="Apontamentos" value={String(totalEntries)} />
              <SummaryCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Aguardando Aprovação"
                value={String(submittedCount)}
                highlight={submittedCount > 0}
              />
            </div>

            {/* ── Approval feedback ── */}
            {approvalMsg && (
              <div className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3 text-sm',
                approvalMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700',
              )}>
                <span>{approvalMsg.text}</span>
                <button onClick={() => setApprovalMsg(null)} className="ml-4 shrink-0 font-medium underline hover:no-underline">
                  Fechar
                </button>
              </div>
            )}

            {/* ── Batch approve bar ── */}
            {selectedApprovable.length > 0 && (
              <div className="flex items-center justify-between bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-4 py-3">
                <span className="text-sm font-medium text-[#3730A3]">
                  {selectedApprovable.length} apontamento(s) selecionado(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openRejectModal(selectedApprovable.map(t => t.id))}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-red-600 text-sm font-medium hover:bg-red-50 border border-red-200 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Rejeitar selecionados
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApprovable.map(t => t.id))}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3730A3] text-white text-sm font-medium hover:bg-[#312E81] disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprovar selecionados
                  </button>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {fetchError && !loading && (
              <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <span>{fetchError}</span>
                <button onClick={fetchTimesheets} className="ml-4 shrink-0 font-medium underline hover:no-underline">Tentar novamente</button>
              </div>
            )}

            {/* ── Table ── */}
            {!loading && filteredTimesheets.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Filter className="h-8 w-8 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">Nenhum apontamento encontrado</p>
                  <p className="text-xs text-gray-400">
                    {selectedMember !== 'all' || selectedProject !== 'all' || selectedStatus !== 'all'
                      ? 'Tente alterar os filtros ou o período.'
                      : 'Nenhum apontamento neste período.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        {/* Select all approvable */}
                        <th className="px-3 py-3 w-10">
                          {approvableItems.length > 0 && (
                            <input
                              type="checkbox"
                              checked={allApprovableSelected}
                              onChange={toggleAllApprovable}
                              className="h-4 w-4 rounded border-gray-300 text-[#3730A3] focus:ring-[#3730A3] cursor-pointer"
                              title="Selecionar todos enviados"
                            />
                          )}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Membro</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Data</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Horário</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Duração</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Projeto</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Descrição</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTimesheets.map(t => {
                        const proj = resolveProject(t)
                        const displayColor = proj.color
                          ? { bg: proj.color + '18', text: proj.color, border: proj.color }
                          : getProjectColor(proj.name)
                        const isSubmitted = t.status === 'submitted'
                        const isSelected = selectedIds.has(t.id)
                        return (
                          <tr key={t.id} className={cn('hover:bg-gray-50/50 transition-colors', isSelected && 'bg-[#EEF2FF]/40')}>
                            {/* Checkbox */}
                            <td className="px-3 py-3">
                              {isSubmitted ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleOne(t.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-[#3730A3] focus:ring-[#3730A3] cursor-pointer"
                                />
                              ) : (
                                <span className="block h-4 w-4" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <MemberAvatar name={t.user_name ?? ''} />
                                <span className="text-gray-800 font-medium truncate max-w-[140px]">{t.user_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDatePtBr(t.date)}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                              {formatTime(t.start_time)} – {formatTime(t.end_time)}
                            </td>
                            <td className="px-4 py-3 text-gray-800 font-semibold whitespace-nowrap">{formatDuration(t.duration_minutes)}</td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: displayColor.bg,
                                  color: displayColor.text,
                                  borderLeft: `3px solid ${displayColor.border}`,
                                }}
                              >
                                {proj.color && (
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                                )}
                                {proj.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]" title={t.description ?? ''}>
                              {t.description || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={t.status} />
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              {isSubmitted && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleApprove([t.id])}
                                    disabled={isPending}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition-colors"
                                    title="Aprovar este apontamento"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Aprovar
                                  </button>
                                  <button
                                    onClick={() => openRejectModal([t.id])}
                                    disabled={isPending}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-colors"
                                    title="Rejeitar este apontamento"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Rejeitar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Reject reason modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-gray-900">Rejeitar apontamento{rejectTargetIds.length > 1 ? 's' : ''}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {rejectTargetIds.length === 1
                  ? 'O apontamento voltará para rascunho e o usuário poderá corrigi-lo.'
                  : `${rejectTargetIds.length} apontamentos voltarão para rascunho.`}
              </p>
            </div>
            <div className="px-6 pb-4">
              <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                Motivo da rejei\u00e7\u00e3o <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Descreva o motivo para que o usu\u00e1rio possa corrigir..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3] resize-none"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Auxiliary components ───────────────────────────────────────

function SummaryCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'bg-white rounded-xl border px-4 py-3 flex items-center gap-3',
      highlight ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200',
    )}>
      <div className={cn(
        'h-9 w-9 rounded-lg flex items-center justify-center',
        highlight ? 'bg-amber-100 text-amber-600' : 'bg-[#EEF2FF] text-[#3730A3]',
      )}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className={cn('text-lg font-bold', highlight ? 'text-amber-700' : 'text-gray-900')}>{value}</p>
      </div>
    </div>
  )
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div className="h-7 w-7 rounded-full bg-[#3730A3] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
      {initials}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Rascunho', cls: 'bg-gray-100 text-gray-600' },
    submitted: { label: 'Enviado', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    approved: { label: 'Aprovado', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  }
  const c = config[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', c.cls)}>
      {c.label}
    </span>
  )
}
