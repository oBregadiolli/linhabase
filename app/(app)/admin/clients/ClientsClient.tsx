'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Plus, Pencil, Power, PowerOff,
  XCircle, Check, X, Search, Hash, Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClientRecord, updateClientRecord, toggleClientActive, type ClientRow } from './actions'

interface ClientsClientProps {
  companyName: string
  clients: ClientRow[]
  /** When true, skip the outer wrapper & topbar (rendered by AdminShell) */
  embedded?: boolean
}

export default function ClientsClient({ companyName, clients: initialClients, embedded }: ClientsClientProps) {
  const router = useRouter()
  const [clientList, setClientList] = useState(initialClients)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    setClientList(initialClients)
  }, [initialClients])

  const activeClients = clientList.filter(c => c.active)
  const inactiveClients = clientList.filter(c => !c.active)

  // Filtered clients
  const filteredClients = clientList.filter(c => {
    const matchesSearch = search === '' ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && c.active) ||
      (filterStatus === 'inactive' && !c.active)
    return matchesSearch && matchesStatus
  })

  function closeModals() {
    setShowCreateModal(false)
    setEditingClient(null)
  }

  function applyClientUpdate(updated: ClientRow, mode: 'create' | 'update') {
    setClientList(prev =>
      mode === 'create' ? [...prev, updated] : prev.map(c => (c.id === updated.id ? updated : c))
    )
    closeModals()
    if (!embedded) router.refresh()
  }

  function applyClientToggle(updated: ClientRow) {
    setClientList(prev => prev.map(c => (c.id === updated.id ? updated : c)))
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
              <Building2 className="h-4.5 w-4.5" />
            </a>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Clientes</h1>
              <p className="text-[11px] text-gray-400">{companyName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
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
                  <Building2 className="h-5 w-5 text-[#1D4ED8]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{clientList.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Power className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Ativos</p>
                  <p className="text-2xl font-bold text-emerald-600">{activeClients.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <PowerOff className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Inativos</p>
                  <p className="text-2xl font-bold text-gray-400">{inactiveClients.length}</p>
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
                  placeholder="Buscar cliente..."
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

              {/* New Client button (embedded) */}
              {embedded && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors duration-150 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Novo Cliente
                </button>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Código
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
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-medium">
                          {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {search ? 'Tente outro termo de busca.' : 'Clique em "Novo Cliente" para começar.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(client => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        onEdit={() => setEditingClient(client)}
                        onToggle={applyClientToggle}
                      />
                    ))
                  )}
                </tbody>
              </table>

              {/* Footer */}
              {filteredClients.length > 0 && (
                <div className="px-5 py-2.5 bg-gray-50/60 border-t border-gray-100 text-[11px] text-gray-400">
                  {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
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
        <ClientModal onClose={() => setShowCreateModal(false)} onSuccess={applyClientUpdate} mode="create" />
      )}
      {editingClient && (
        <ClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSuccess={applyClientUpdate}
          mode="update"
        />
      )}
    </div>
  )
}

// ── Client Row (table) ────────────────────────────────────────

function ClientRow({
  client, onEdit, onToggle,
}: {
  client: ClientRow; onEdit: () => void; onToggle: (updated: ClientRow) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleClientActive(client.id, !client.active)
      if (result.success && result.data) {
        onToggle(result.data)
      } else {
        setError(result.error ?? 'Erro ao alterar status.')
      }
    })
  }

  const createdDate = new Date(client.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <>
      <tr className={cn(
        'group hover:bg-blue-50/30 transition-colors',
        !client.active && 'opacity-60',
      )}>
        {/* Client description + icon */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center bg-[#3730A3]/10">
              <Building2 className="h-4 w-4 text-[#3730A3]" />
            </div>
            <div className="min-w-0">
              <p className={cn(
                'font-medium truncate',
                client.active ? 'text-gray-900' : 'text-gray-500'
              )}>
                {client.description}
              </p>
            </div>
          </div>
        </td>

        {/* Code */}
        <td className="px-4 py-3.5 hidden sm:table-cell">
          <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 bg-gray-50 rounded-md px-2 py-1 ring-1 ring-gray-200/60">
            <Hash className="h-3 w-3 text-gray-400 shrink-0" />
            {client.code}
          </span>
        </td>

        {/* Status */}
        <td className="px-4 py-3.5">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1',
            client.active
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
              : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200/60'
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              client.active ? 'bg-emerald-500' : 'bg-gray-400'
            )} />
            {client.active ? 'Ativo' : 'Inativo'}
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
              title={client.active ? 'Inativar' : 'Ativar'}
              className={cn(
                'p-2 rounded-lg transition-colors disabled:opacity-40 cursor-pointer',
                client.active
                  ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
              )}
              disabled={isPending}
            >
              {client.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {error && (
        <tr>
          <td colSpan={5} className="px-5 py-2">
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

// ── Client Modal (create / edit) ──────────────────────────────

function ClientModal({
  client, onClose, onSuccess, mode,
}: {
  client?: ClientRow
  onClose: () => void
  onSuccess: (updated: ClientRow, mode: 'create' | 'update') => void
  mode: 'create' | 'update'
}) {
  const isEdit = mode === 'update'
  const [description, setDescription] = useState(client?.description ?? '')
  const [code, setCode] = useState(client?.code ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const trimmedCode = code.trim() || undefined
      const result = isEdit
        ? await updateClientRecord(client!.id, description, trimmedCode)
        : await createClientRecord(description, trimmedCode)

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
              {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Atualize a descrição e código do cliente.' : 'Defina a descrição e código para identificar o cliente.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 space-y-5">
            {/* Description */}
            <div>
              <label htmlFor="client-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Descrição do cliente
              </label>
              <textarea
                id="client-description"
                required
                maxLength={200}
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Empresa ABC Ltda"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] transition-colors resize-none"
                disabled={isPending}
                autoFocus
              />
            </div>

            {/* Code */}
            <div>
              <label htmlFor="client-code" className="block text-sm font-medium text-gray-700 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Código
                </div>
              </label>
              <input
                id="client-code"
                type="text"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder={isEdit ? client?.code : 'Gerado automaticamente'}
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
                <Building2 className="h-4 w-4 text-[#3730A3]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {description || 'Descrição do cliente'}
                </p>
                <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">
                  {code || (isEdit ? client?.code : 'AUTO')}
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 ring-1 ring-emerald-200/60 shrink-0">
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
              disabled={isPending || !description.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isPending ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
