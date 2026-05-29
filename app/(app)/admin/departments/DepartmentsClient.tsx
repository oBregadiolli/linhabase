'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Network, Users, UserCheck, Plus, Pencil, Power, PowerOff,
  XCircle, Check, X, Search, Hash, ChevronDown, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createDepartment, updateDepartment, toggleDepartmentActive,
  createTeam, updateTeam, toggleTeamActive
} from './actions'

// ── Local types ───────────────────────────────────────────────
interface Team {
  id: string
  company_id: string
  department_id: string
  code: string
  name: string
  active: boolean
  created_at: string
  member_count: number
}

interface Department {
  id: string
  company_id: string
  code: string
  name: string
  active: boolean
  created_at: string
  teams: Team[]
}

interface DepartmentsClientProps {
  companyName: string
  departments: Department[]
  /** When true, skip the outer wrapper & topbar (rendered by AdminShell) */
  embedded?: boolean
}

export default function DepartmentsClient({ companyName, departments, embedded }: DepartmentsClientProps) {
  const router = useRouter()
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  // Team modal state
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<{ team?: Team; departmentId: string; departmentName: string } | null>(null)

  // Stats
  const totalDepartments = departments.length
  const totalTeams = departments.reduce((sum, d) => sum + d.teams.length, 0)
  const totalMembers = departments.reduce(
    (sum, d) => sum + d.teams.reduce((tSum, t) => tSum + t.member_count, 0), 0
  )

  // Filtered departments
  const filteredDepartments = departments.filter(d => {
    if (search === '') return true
    const q = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      d.code?.toLowerCase().includes(q) ||
      d.teams.some(t => t.name.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q))
    )
  })

  function toggleExpanded(id: string) {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleRefresh() {
    setShowDeptModal(false)
    setEditingDept(null)
    setShowTeamModal(false)
    setEditingTeam(null)
    router.refresh()
  }

  function openCreateTeam(departmentId: string, departmentName: string) {
    setEditingTeam({ departmentId, departmentName })
    setShowTeamModal(true)
  }

  function openEditTeam(team: Team, departmentId: string, departmentName: string) {
    setEditingTeam({ team, departmentId, departmentName })
    setShowTeamModal(true)
  }

  return (
    <div className={embedded ? 'flex flex-col flex-1 min-w-0 overflow-hidden' : 'flex h-screen bg-[#F3F4F6] overflow-hidden'}>
      <div className={embedded ? 'flex flex-col flex-1 min-w-0 overflow-hidden' : 'flex flex-col flex-1 min-w-0 overflow-hidden'}>

        {/* Topbar — hidden when embedded in AdminShell */}
        {!embedded && (
        <header className="shrink-0 flex items-center justify-between gap-4 bg-white border-b border-gray-200 px-6 h-14">
          <div className="flex items-center gap-3">
            <a
              href="/admin/timesheets"
              className="p-1.5 rounded-md text-gray-400 hover:text-[#1D4ED8] hover:bg-blue-50 transition-colors duration-150"
              title="Voltar"
            >
              <Network className="h-4.5 w-4.5" />
            </a>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Departamentos</h1>
              <p className="text-[11px] text-gray-400">{companyName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDeptModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Departamento</span>
          </button>
        </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Network className="h-5 w-5 text-[#3730A3]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Departamentos</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDepartments}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-[#1D4ED8]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Equipes</p>
                  <p className="text-2xl font-bold text-gray-900">{totalTeams}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Membros Alocados</p>
                  <p className="text-2xl font-bold text-emerald-600">{totalMembers}</p>
                </div>
              </div>
            </div>

            {/* Toolbar: Search + New */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar departamento ou equipe..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#1D4ED8] transition-colors"
                />
              </div>

              {/* New Department button (embedded) */}
              {embedded && (
                <button
                  onClick={() => setShowDeptModal(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors duration-150 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Novo Departamento
                </button>
              )}
            </div>

            {/* Department Cards */}
            {filteredDepartments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center">
                <Network className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">
                  {search ? 'Nenhum departamento encontrado.' : 'Nenhum departamento cadastrado.'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {search ? 'Tente outro termo de busca.' : 'Clique em "Novo Departamento" para começar.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDepartments.map(dept => (
                  <DepartmentCard
                    key={dept.id}
                    department={dept}
                    expanded={expandedDepts.has(dept.id)}
                    onToggleExpand={() => toggleExpanded(dept.id)}
                    onEdit={() => setEditingDept(dept)}
                    onRefresh={handleRefresh}
                    onCreateTeam={() => openCreateTeam(dept.id, dept.name)}
                    onEditTeam={(team) => openEditTeam(team, dept.id, dept.name)}
                  />
                ))}

                {/* Footer */}
                <div className="px-2 py-1 text-[11px] text-gray-400">
                  {filteredDepartments.length} {filteredDepartments.length === 1 ? 'departamento' : 'departamentos'}
                  {search && ` · busca: "${search}"`}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Department Modals */}
      {showDeptModal && (
        <DepartmentModal onClose={() => setShowDeptModal(false)} onSuccess={handleRefresh} />
      )}
      {editingDept && (
        <DepartmentModal
          department={editingDept}
          onClose={() => setEditingDept(null)}
          onSuccess={handleRefresh}
        />
      )}

      {/* Team Modals */}
      {showTeamModal && editingTeam && !editingTeam.team && (
        <TeamModal
          departmentId={editingTeam.departmentId}
          departmentName={editingTeam.departmentName}
          onClose={() => { setShowTeamModal(false); setEditingTeam(null) }}
          onSuccess={handleRefresh}
        />
      )}
      {editingTeam?.team && (
        <TeamModal
          team={editingTeam.team}
          departmentId={editingTeam.departmentId}
          departmentName={editingTeam.departmentName}
          onClose={() => setEditingTeam(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  )
}

// ── Department Card (accordion) ───────────────────────────────

function DepartmentCard({
  department, expanded, onToggleExpand, onEdit, onRefresh, onCreateTeam, onEditTeam,
}: {
  department: Department
  expanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onRefresh: () => void
  onCreateTeam: () => void
  onEditTeam: (team: Team) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggleActive() {
    setError(null)
    startTransition(async () => {
      const result = await toggleDepartmentActive(department.id, !department.active)
      if (result.success) {
        onRefresh()
      } else {
        setError(result.error ?? 'Erro ao alterar status.')
      }
    })
  }

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow duration-200',
      expanded && 'shadow-sm',
      !department.active && 'opacity-60',
    )}>
      {/* Header */}
      <div
        className="group flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onToggleExpand}
      >
        {/* Chevron */}
        <div className="shrink-0">
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            !expanded && '-rotate-90',
          )} />
        </div>

        {/* Icon */}
        <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center bg-[#3730A3]/10">
          <Network className="h-4 w-4 text-[#3730A3]" />
        </div>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className={cn(
            'font-medium truncate',
            department.active ? 'text-gray-900' : 'text-gray-500',
          )}>
            {department.name}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {department.teams.length} {department.teams.length === 1 ? 'equipe' : 'equipes'}
          </p>
        </div>

        {/* Code badge */}
        <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 bg-gray-50 rounded-md px-2 py-1 ring-1 ring-gray-200/60 shrink-0">
          <Hash className="h-3 w-3 text-gray-400 shrink-0" />
          {department.code}
        </span>

        {/* Status badge */}
        <span className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 shrink-0',
          department.active
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
            : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200/60'
        )}>
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            department.active ? 'bg-emerald-500' : 'bg-gray-400'
          )} />
          {department.active ? 'Ativo' : 'Inativo'}
        </span>

        {/* Actions */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            title="Editar"
            className="p-2 rounded-lg text-gray-400 hover:text-[#1D4ED8] hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleToggleActive}
            title={department.active ? 'Inativar' : 'Ativar'}
            className={cn(
              'p-2 rounded-lg transition-colors disabled:opacity-40 cursor-pointer',
              department.active
                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
            )}
            disabled={isPending}
          >
            {department.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Expanded content */}
      <div className={cn(
        'overflow-hidden transition-all duration-200',
        expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
      )}>
        <div className="border-t border-gray-100 bg-gray-50/30">
          {/* Add team button */}
          <div className="px-5 py-3 border-b border-gray-100">
            <button
              onClick={onCreateTeam}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-[#1D4ED8] hover:border-[#1D4ED8]/30 hover:bg-blue-50/50 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Equipe
            </button>
          </div>

          {/* Teams list */}
          {department.teams.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Users className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
              <p className="text-xs text-gray-400">Nenhuma equipe neste departamento.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {department.teams.map(team => (
                <TeamRow
                  key={team.id}
                  team={team}
                  onEdit={() => onEditTeam(team)}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Team Row (sub-row inside department) ──────────────────────

function TeamRow({
  team, onEdit, onRefresh,
}: {
  team: Team; onEdit: () => void; onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleTeamActive(team.id, !team.active)
      if (result.success) {
        onRefresh()
      } else {
        setError(result.error ?? 'Erro ao alterar status.')
      }
    })
  }

  return (
    <>
      <div className={cn(
        'group flex items-center gap-3 px-5 py-3 pl-14 hover:bg-blue-50/30 transition-colors',
        !team.active && 'opacity-60',
      )}>
        {/* Icon */}
        <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center bg-blue-50">
          <Users className="h-3.5 w-3.5 text-[#1D4ED8]" />
        </div>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-sm font-medium truncate',
            team.active ? 'text-gray-900' : 'text-gray-500',
          )}>
            {team.name}
          </p>
        </div>

        {/* Code badge */}
        <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 bg-gray-50 rounded-md px-2 py-1 ring-1 ring-gray-200/60 shrink-0">
          <Hash className="h-3 w-3 text-gray-400 shrink-0" />
          {team.code}
        </span>

        {/* Member count badge */}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-2.5 py-1 ring-1 ring-gray-200/60 shrink-0">
          <UserCheck className="h-3 w-3 text-gray-400 shrink-0" />
          {team.member_count} {team.member_count === 1 ? 'membro' : 'membros'}
        </span>

        {/* Status badge */}
        <span className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 shrink-0',
          team.active
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
            : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200/60'
        )}>
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            team.active ? 'bg-emerald-500' : 'bg-gray-400'
          )} />
          {team.active ? 'Ativo' : 'Inativo'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onEdit}
            title="Editar"
            className="p-2 rounded-lg text-gray-400 hover:text-[#1D4ED8] hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleToggle}
            title={team.active ? 'Inativar' : 'Ativar'}
            className={cn(
              'p-2 rounded-lg transition-colors disabled:opacity-40 cursor-pointer',
              team.active
                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
            )}
            disabled={isPending}
          >
            {team.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-5 pl-14 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </>
  )
}

// ── Department Modal (create / edit) ──────────────────────────

function DepartmentModal({
  department, onClose, onSuccess,
}: {
  department?: Department; onClose: () => void; onSuccess: () => void
}) {
  const isEdit = !!department
  const [name, setName] = useState(department?.name ?? '')
  const [code, setCode] = useState(department?.code ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const trimmedCode = code.trim() || undefined
      const result = isEdit
        ? await updateDepartment(department!.id, name, trimmedCode)
        : await createDepartment(name, trimmedCode)

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? 'Erro desconhecido.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Editar Departamento' : 'Novo Departamento'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Atualize o nome e código do departamento.' : 'Defina o nome e código para identificar o departamento.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="dept-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do departamento
              </label>
              <input
                id="dept-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Engenharia de Software"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors"
                disabled={isPending}
                autoFocus
              />
            </div>

            {/* Code */}
            <div>
              <label htmlFor="dept-code" className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Código
                </div>
              </label>
              <input
                id="dept-code"
                type="text"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder={isEdit ? department?.code : 'Gerado automaticamente'}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 font-mono uppercase placeholder:text-gray-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors"
                disabled={isPending}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Máx. 8 caracteres alfanuméricos. Deixe vazio para gerar automaticamente.
              </p>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center bg-[#3730A3]/10">
                <Network className="h-4 w-4 text-[#3730A3]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {name || 'Nome do departamento'}
                </p>
                <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">
                  {code || (isEdit ? department?.code : 'AUTO')}
                </p>
              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 mt-4 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isPending ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Departamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Team Modal (create / edit) ────────────────────────────────

function TeamModal({
  team, departmentId, departmentName, onClose, onSuccess,
}: {
  team?: Team
  departmentId: string
  departmentName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!team
  const [name, setName] = useState(team?.name ?? '')
  const [code, setCode] = useState(team?.code ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const trimmedCode = code.trim() || undefined
      const result = isEdit
        ? await updateTeam(team!.id, name, trimmedCode)
        : await createTeam(departmentId, name, trimmedCode)

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? 'Erro desconhecido.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Editar Equipe' : 'Nova Equipe'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
            <Network className="h-3.5 w-3.5 text-[#3730A3] shrink-0" />
            <span className="truncate">{departmentName}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Atualize o nome e código da equipe.' : 'Defina o nome e código para identificar a equipe.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome da equipe
              </label>
              <input
                id="team-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Frontend"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors"
                disabled={isPending}
                autoFocus
              />
            </div>

            {/* Code */}
            <div>
              <label htmlFor="team-code" className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Código
                </div>
              </label>
              <input
                id="team-code"
                type="text"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder={isEdit ? team?.code : 'Gerado automaticamente'}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 font-mono uppercase placeholder:text-gray-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors"
                disabled={isPending}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Máx. 8 caracteres alfanuméricos. Deixe vazio para gerar automaticamente.
              </p>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center bg-blue-50">
                <Users className="h-4 w-4 text-[#1D4ED8]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {name || 'Nome da equipe'}
                </p>
                <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">
                  {code || (isEdit ? team?.code : 'AUTO')}
                </p>
              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 mt-4 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isPending ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Equipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
