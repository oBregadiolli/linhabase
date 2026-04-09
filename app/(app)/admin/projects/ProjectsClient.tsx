'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, FolderOpen, Plus, Pencil, Power, PowerOff,
  XCircle, Check, X, Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types/database.types'
import { createProject, updateProject, toggleProjectActive } from './actions'

// ── Preset colors ─────────────────────────────────────────────
const COLOR_PRESETS = [
  '#3730A3', '#0891B2', '#059669', '#CA8A04',
  '#DC2626', '#DB2777', '#7C3AED', '#EA580C',
  '#475569', '#0D9488',
]

interface ProjectsClientProps {
  companyName: string
  projects: Project[]
}

export default function ProjectsClient({ companyName, projects }: ProjectsClientProps) {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const activeProjects = projects.filter(p => p.active)
  const inactiveProjects = projects.filter(p => !p.active)

  function handleRefresh() {
    setShowCreateModal(false)
    setEditingProject(null)
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="shrink-0 flex items-center justify-between gap-4 bg-white border-b border-gray-200 px-6 h-14">
          <div className="flex items-center gap-3">
            <a
              href="/admin/timesheets"
              className="p-1.5 rounded-md text-gray-400 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors duration-150"
              title="Voltar"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </a>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Projetos</h1>
              <p className="text-[11px] text-gray-400">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Nav links */}
            <a href="/admin/timesheets" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors">
              Apontamentos
            </a>
            <a href="/admin/team" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors">
              Equipe
            </a>
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#3730A3] bg-[#EEF2FF]">
              Projetos
            </span>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#312E81] transition-colors duration-150"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Projeto</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Total" value={projects.length} />
              <StatCard label="Ativos" value={activeProjects.length} accent="emerald" />
              <StatCard label="Inativos" value={inactiveProjects.length} accent="gray" />
            </div>

            {/* Active projects */}
            <Section
              title="Projetos Ativos"
              count={activeProjects.length}
              emptyText="Nenhum projeto ativo. Crie o primeiro!"
            >
              {activeProjects.map(project => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onEdit={() => setEditingProject(project)}
                  onRefresh={handleRefresh}
                />
              ))}
            </Section>

            {/* Inactive projects */}
            {inactiveProjects.length > 0 && (
              <Section
                title="Projetos Inativos"
                count={inactiveProjects.length}
              >
                {inactiveProjects.map(project => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onEdit={() => setEditingProject(project)}
                    onRefresh={handleRefresh}
                  />
                ))}
              </Section>
            )}

          </div>
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ProjectModal onClose={() => setShowCreateModal(false)} onSuccess={handleRefresh} />
      )}
      {editingProject && (
        <ProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const colors = {
    emerald: 'text-emerald-600',
    gray: 'text-gray-400',
    default: 'text-gray-900',
  }
  const textColor = colors[(accent as keyof typeof colors) ?? 'default']

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={cn('text-2xl font-bold mt-0.5', textColor)}>{value}</p>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────

function Section({
  title, count, emptyText, children,
}: {
  title: string; count: number; emptyText?: string; children?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
      </div>
      {count === 0 && emptyText ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-gray-50">{children}</div>
      )}
    </div>
  )
}

// ── Project Row ───────────────────────────────────────────────

function ProjectRow({
  project, onEdit, onRefresh,
}: {
  project: Project; onEdit: () => void; onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleProjectActive(project.id, !project.active)
      if (result.success) {
        onRefresh()
      } else {
        setError(result.error ?? 'Erro ao alterar status.')
      }
    })
  }

  const createdDate = new Date(project.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Color dot */}
        <div
          className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
          style={{ backgroundColor: project.color || '#94a3b8' }}
        >
          <FolderOpen className="h-4 w-4 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium truncate',
            project.active ? 'text-gray-900' : 'text-gray-400 line-through'
          )}>
            {project.name}
          </p>
          <p className="text-[11px] text-gray-400">
            Criado em {createdDate}
          </p>
        </div>

        {/* Status badge */}
        <span className={cn(
          'text-[11px] font-medium rounded-full px-2 py-0.5',
          project.active
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-gray-100 text-gray-400'
        )}>
          {project.active ? 'Ativo' : 'Inativo'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            title="Editar"
            className="p-1.5 rounded-md text-gray-400 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleToggle}
            title={project.active ? 'Inativar' : 'Ativar'}
            className={cn(
              'p-1.5 rounded-md transition-colors disabled:opacity-40',
              project.active
                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
            )}
            disabled={isPending}
          >
            {project.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ── Project Modal (create / edit) ─────────────────────────────

function ProjectModal({
  project, onClose, onSuccess,
}: {
  project?: Project; onClose: () => void; onSuccess: () => void
}) {
  const isEdit = !!project
  const [name, setName] = useState(project?.name ?? '')
  const [color, setColor] = useState(project?.color ?? COLOR_PRESETS[0])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = isEdit
        ? await updateProject(project!.id, name, color)
        : await createProject(name, color)

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

      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          {isEdit ? 'Atualize o nome e a cor do projeto.' : 'Defina o nome e a cor para identificar o projeto.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              id="project-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Desenvolvimento Frontend"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730A3]/30 focus:border-[#3730A3] transition-colors"
              disabled={isPending}
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Cor
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-lg transition-all duration-150 flex items-center justify-center',
                    color === c ? 'ring-2 ring-offset-2 ring-[#3730A3] scale-110' : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
            {/* Custom color input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={color || '#3730A3'}
                onChange={e => setColor(e.target.value)}
                className="h-8 w-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <span className="text-xs text-gray-400">Ou escolha uma cor personalizada</span>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
            <div
              className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
              style={{ backgroundColor: color || '#94a3b8' }}
            >
              <FolderOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">
              {name || 'Nome do projeto'}
            </span>
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
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3730A3] text-white text-sm font-semibold hover:bg-[#312E81] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
