'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, FolderOpen, Plus, Pencil, Power, PowerOff,
  XCircle, Check, X, Palette, Search, MoreVertical,
  Calendar, Hash, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project, Client } from '@/lib/types/database.types'
import { createProject, updateProject, toggleProjectActive } from './actions'

// ── Preset colors ─────────────────────────────────────────────
const COLOR_PRESETS = [
  '#1D4ED8', '#0891B2', '#059669', '#CA8A04',
  '#DC2626', '#DB2777', '#7C3AED', '#EA580C',
  '#475569', '#0D9488',
]

interface ProjectsClientProps {
  companyName: string
  projects: Project[]
  clients?: Client[]
  /** When true, skip the outer wrapper & topbar (rendered by AdminShell) */
  embedded?: boolean
}

export default function ProjectsClient({ companyName, projects: initialProjects, clients, embedded }: ProjectsClientProps) {
  const router = useRouter()
  const [projectList, setProjectList] = useState(initialProjects)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    setProjectList(initialProjects)
  }, [initialProjects])

  const activeProjects = projectList.filter(p => p.active)
  const inactiveProjects = projectList.filter(p => !p.active)

  // Filtered projects
  const filteredProjects = projectList.filter(p => {
    const matchesSearch = search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && p.active) ||
      (filterStatus === 'inactive' && !p.active)
    return matchesSearch && matchesStatus
  })

  function closeModals() {
    setShowCreateModal(false)
    setEditingProject(null)
  }

  function applyProjectUpdate(updated: Project, mode: 'create' | 'update') {
    setProjectList(prev =>
      mode === 'create' ? [...prev, updated] : prev.map(p => (p.id === updated.id ? updated : p))
    )
    closeModals()
    if (!embedded) router.refresh()
  }

  function applyProjectToggle(updated: Project) {
    setProjectList(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    if (!embedded) router.refresh()
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
              <ArrowLeft className="h-4.5 w-4.5" />
            </a>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Projetos</h1>
              <p className="text-[11px] text-gray-400">{companyName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Projeto</span>
          </button>
        </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FolderOpen className="h-5 w-5 text-[#1D4ED8]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{projectList.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Power className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Ativos</p>
                  <p className="text-2xl font-bold text-emerald-600">{activeProjects.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <PowerOff className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Inativos</p>
                  <p className="text-2xl font-bold text-gray-400">{inactiveProjects.length}</p>
                </div>
              </div>
            </div>

            {/* Toolbar: Search + Filter + New */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar projeto..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#1D4ED8] transition-colors"
                />
              </div>

              {/* Status filter pills */}
              <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
                {(['all', 'active', 'inactive'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer',
                      filterStatus === status
                        ? 'bg-white text-[#1D4ED8] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700',
                    )}
                  >
                    {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : 'Inativos'}
                  </button>
                ))}
              </div>

              {/* New Project button (embedded) */}
              {embedded && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors duration-150 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Novo Projeto
                </button>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Projeto
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Código
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Cor
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Criado em
                    </th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium">
                          {search ? 'Nenhum projeto encontrado.' : 'Nenhum projeto cadastrado.'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {search ? 'Tente outro termo de busca.' : 'Clique em "Novo Projeto" para começar.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map(project => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        onEdit={() => setEditingProject(project)}
                        onToggle={applyProjectToggle}
                      />
                    ))
                  )}
                </tbody>
              </table>

              {/* Footer */}
              {filteredProjects.length > 0 && (
                <div className="px-5 py-2.5 bg-gray-50/60 border-t border-gray-100 text-[11px] text-gray-400">
                  {filteredProjects.length} {filteredProjects.length === 1 ? 'projeto' : 'projetos'}
                  {filterStatus !== 'all' && ` (filtro: ${filterStatus === 'active' ? 'ativos' : 'inativos'})`}
                  {search && ` · busca: "${search}"`}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ProjectModal onClose={() => setShowCreateModal(false)} onSuccess={applyProjectUpdate} mode="create" clients={clients} />
      )}
      {editingProject && (
        <ProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={applyProjectUpdate}
          mode="update"
          clients={clients}
        />
      )}
    </div>
  )
}

// ── Project Row (table) ───────────────────────────────────────

function ProjectRow({
  project, onEdit, onToggle,
}: {
  project: Project; onEdit: () => void; onToggle: (updated: Project) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleProjectActive(project.id, !project.active)
      if (result.success && result.data) {
        onToggle(result.data)
      } else {
        setError(result.error ?? 'Erro ao alterar status.')
      }
    })
  }

  const createdDate = new Date(project.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <>
      <tr className={cn(
        'group hover:bg-blue-50/30 transition-colors',
        !project.active && 'opacity-60',
      )}>
        {/* Project name + color */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
              style={{ backgroundColor: project.color || '#94a3b8' }}
            >
              <FolderOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className={cn(
                'font-medium truncate',
                project.active ? 'text-gray-900' : 'text-gray-500'
              )}>
                {project.name}
              </p>
              {project.client_id && (
                <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  Cliente vinculado
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Code */}
        <td className="px-4 py-3.5 hidden sm:table-cell">
          <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 bg-gray-50 rounded-md px-2 py-1 ring-1 ring-gray-200/60">
            <Hash className="h-3 w-3 text-gray-400 shrink-0" />
            {project.code}
          </span>
        </td>

        {/* Color swatch */}
        <td className="px-4 py-3.5 hidden sm:table-cell">
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border border-gray-100 shadow-sm shrink-0"
              style={{ backgroundColor: project.color || '#94a3b8' }}
            />
            <span className="text-xs text-gray-400 font-mono uppercase">
              {project.color || '#94a3b8'}
            </span>
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3.5">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1',
            project.active
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
              : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200/60'
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              project.active ? 'bg-emerald-500' : 'bg-gray-400'
            )} />
            {project.active ? 'Ativo' : 'Inativo'}
          </span>
        </td>

        {/* Created date */}
        <td className="px-4 py-3.5 hidden md:table-cell">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {createdDate}
          </div>
        </td>

        {/* Actions */}
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              title="Editar"
              className="p-2 rounded-lg text-gray-400 hover:text-[#1D4ED8] hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleToggle}
              title={project.active ? 'Inativar' : 'Ativar'}
              className={cn(
                'p-2 rounded-lg transition-colors disabled:opacity-40 cursor-pointer',
                project.active
                  ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
              )}
              disabled={isPending}
            >
              {project.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {error && (
        <tr>
          <td colSpan={6} className="px-5 py-2">
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Project Modal (create / edit) ─────────────────────────────

function ProjectModal({
  project, onClose, onSuccess, mode, clients,
}: {
  project?: Project
  onClose: () => void
  onSuccess: (updated: Project, mode: 'create' | 'update') => void
  mode: 'create' | 'update'
  clients?: Client[]
}) {
  const isEdit = mode === 'update'
  const [name, setName] = useState(project?.name ?? '')
  const [code, setCode] = useState(project?.code ?? '')
  const [color, setColor] = useState(project?.color ?? COLOR_PRESETS[0])
  const [clientId, setClientId] = useState<string>(project?.client_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const trimmedCode = code.trim() || undefined
      const selectedClient = clientId || null
      const result = isEdit
        ? await updateProject(project!.id, name, color, trimmedCode, selectedClient)
        : await createProject(name, color, trimmedCode, selectedClient)

      if (result.success && result.data) {
        onSuccess(result.data, isEdit ? 'update' : 'create')
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
              {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Atualize o nome, código e cor do projeto.' : 'Defina o nome, código e cor para identificar o projeto.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do projeto
              </label>
              <input
                id="project-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Desenvolvimento Frontend"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors"
                disabled={isPending}
                autoFocus
              />
            </div>

            {/* Code */}
            <div>
              <label htmlFor="project-code" className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Código
                </div>
              </label>
              <input
                id="project-code"
                type="text"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder={isEdit ? project?.code : 'Gerado automaticamente'}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 font-mono uppercase placeholder:text-gray-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors"
                disabled={isPending}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Máx. 8 caracteres alfanuméricos. Deixe vazio para gerar automaticamente.
              </p>
            </div>

            {/* Client */}
            {clients && clients.length > 0 && (
              <div>
                <label htmlFor="project-client" className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Cliente (opcional)
                  </div>
                </label>
                <select
                  id="project-client"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors bg-white"
                  disabled={isPending}
                >
                  <option value="">Sem cliente</option>
                  {clients.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  Cor de identificação
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-8 w-8 rounded-lg transition-all duration-150 flex items-center justify-center cursor-pointer',
                      color === c ? 'ring-2 ring-offset-2 ring-[#1D4ED8] scale-110' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <input
                  type="color"
                  value={color || '#1D4ED8'}
                  onChange={e => setColor(e.target.value)}
                  className="h-8 w-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-400">Ou escolha uma cor personalizada</span>
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
              <div
                className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
                style={{ backgroundColor: color || '#94a3b8' }}
              >
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {name || 'Nome do projeto'}
                </p>
                <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">
                  {code || (isEdit ? project?.code : 'AUTO')} · {color || '#94a3b8'}
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 ring-1 ring-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Preview
              </span>
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
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
