'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  DollarSign, Plus, Pencil, Trash2, Calendar,
  XCircle, Check, X, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMemberRates, createMemberRate, updateMemberRate, deleteMemberRate } from './rates-actions'

// ── Types ─────────────────────────────────────────────────────

interface MemberRate {
  id: string
  company_id: string
  user_id: string
  start_date: string
  end_date: string | null
  sale_rate: number
  cost_rate: number
  created_at: string
}

interface MemberRatesPanelProps {
  userId: string
  memberName: string
  companyId: string
}

// ── Helpers ───────────────────────────────────────────────────

function formatDateBR(dateStr: string): string {
  try {
    // Parse as local date (yyyy-mm-dd → dd/mm/yyyy)
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

function calcMargin(cost: number, sale: number): number | null {
  if (!sale || sale <= 0) return null
  return ((sale - cost) / sale) * 100
}

function marginColor(margin: number | null): string {
  if (margin === null) return 'text-gray-400'
  if (margin >= 30) return 'text-emerald-600'
  if (margin >= 15) return 'text-amber-600'
  return 'text-red-600'
}

function marginBgColor(margin: number | null): string {
  if (margin === null) return 'bg-gray-200'
  if (margin >= 30) return 'bg-emerald-500'
  if (margin >= 15) return 'bg-amber-500'
  return 'bg-red-500'
}

function marginBadgeColor(margin: number | null): string {
  if (margin === null) return 'bg-gray-50 text-gray-400'
  if (margin >= 30) return 'bg-emerald-50 text-emerald-700'
  if (margin >= 15) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Main Component ────────────────────────────────────────────

export default function MemberRatesPanel({ userId, memberName, companyId }: MemberRatesPanelProps) {
  const [rates, setRates] = useState<MemberRate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRate, setEditingRate] = useState<MemberRate | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Fetch rates on mount ──────────────────────────────────
  useEffect(() => {
    loadRates()
  }, [userId])

  async function loadRates() {
    setLoading(true)
    try {
      const result = await getMemberRates(userId)
      if (result.success && result.data) {
        setRates(result.data)
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  // ── Handlers ──────────────────────────────────────────────

  function handleOpenCreate() {
    setEditingRate(null)
    setShowModal(true)
  }

  function handleOpenEdit(rate: MemberRate) {
    setEditingRate(rate)
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditingRate(null)
  }

  function handleSaved() {
    handleCloseModal()
    loadRates()
  }

  function handleDeleteClick(rateId: string) {
    setDeleteError(null)
    setShowDeleteConfirm(rateId)
  }

  function handleCancelDelete() {
    setShowDeleteConfirm(null)
    setDeleteError(null)
  }

  function handleConfirmDelete(rateId: string) {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteMemberRate(rateId)
      if (result.success) {
        setShowDeleteConfirm(null)
        loadRates()
      } else {
        setDeleteError(result.error ?? 'Erro ao excluir taxa.')
      }
    })
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-[#3730A3]">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Taxas de Custo/Venda
            </h3>
            <p className="text-[10px] text-gray-400">{memberName}</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#312E81] transition-colors duration-150 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Taxa
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 text-gray-300 animate-spin" />
        </div>
      ) : rates.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-3">
            <DollarSign className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-400 font-medium">Nenhuma taxa cadastrada</p>
          <p className="text-[11px] text-gray-300 mt-1">
            Clique em &quot;Nova Taxa&quot; para começar.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">
                  Data Início
                </th>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">
                  Data Fim
                </th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">
                  Custo/h (R$)
                </th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">
                  Venda/h (R$)
                </th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5">
                  Margem (%)
                </th>
                <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-2.5 w-20">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rates.map((rate) => {
                const margin = calcMargin(rate.cost_rate, rate.sale_rate)
                const isBeingDeleted = showDeleteConfirm === rate.id

                return (
                  <tr
                    key={rate.id}
                    className={cn(
                      'group hover:bg-gray-50/50 transition-colors',
                      isBeingDeleted && 'bg-red-50/40'
                    )}
                  >
                    {/* Data Início */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-gray-300" />
                        <span className="text-sm text-gray-700">{formatDateBR(rate.start_date)}</span>
                      </div>
                    </td>

                    {/* Data Fim */}
                    <td className="px-4 py-3">
                      {rate.end_date ? (
                        <span className="text-sm text-gray-700">{formatDateBR(rate.end_date)}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          Vigente
                        </span>
                      )}
                    </td>

                    {/* Custo/h */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-800 tabular-nums">
                        {formatCurrency(rate.cost_rate)}
                      </span>
                    </td>

                    {/* Venda/h */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-800 tabular-nums">
                        {formatCurrency(rate.sale_rate)}
                      </span>
                    </td>

                    {/* Margem */}
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums',
                        marginBadgeColor(margin)
                      )}>
                        {margin !== null ? `${margin.toFixed(1)}%` : '—'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      {isBeingDeleted ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleConfirmDelete(rate.id)}
                            disabled={isPending}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40"
                            title="Confirmar exclusão"
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelDelete}
                            disabled={isPending}
                            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-40"
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(rate)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-[#3730A3] hover:bg-[#EEF2FF] transition-colors"
                            title="Editar taxa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(rate.id)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Excluir taxa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Delete error */}
          {deleteError && (
            <div className="mx-4 mb-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Rate Modal (Create / Edit) ─────────────────────── */}
      {showModal && (
        <RateModal
          userId={userId}
          companyId={companyId}
          editingRate={editingRate}
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ── Rate Modal ────────────────────────────────────────────────

interface RateModalProps {
  userId: string
  companyId: string
  editingRate: MemberRate | null
  onClose: () => void
  onSaved: () => void
}

function RateModal({ userId, companyId, editingRate, onClose, onSaved }: RateModalProps) {
  const isEditing = !!editingRate

  const [startDate, setStartDate] = useState(editingRate?.start_date ?? '')
  const [endDate, setEndDate] = useState(editingRate?.end_date ?? '')
  const [costRate, setCostRate] = useState(editingRate ? String(editingRate.cost_rate) : '')
  const [saleRate, setSaleRate] = useState(editingRate ? String(editingRate.sale_rate) : '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Margin preview ──────────────────────────────────────
  const costNum = parseFloat(costRate) || 0
  const saleNum = parseFloat(saleRate) || 0
  const previewMargin = calcMargin(costNum, saleNum)

  // ── Submit ──────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!startDate) {
      setError('Data de início é obrigatória.')
      return
    }

    if (costNum < 0) {
      setError('Custo/hora deve ser maior ou igual a zero.')
      return
    }

    if (saleNum < 0) {
      setError('Venda/hora deve ser maior ou igual a zero.')
      return
    }

    if (endDate && endDate < startDate) {
      setError('Data fim deve ser posterior à data de início.')
      return
    }

    startTransition(async () => {
      let result: { success: boolean; error?: string }

      if (isEditing && editingRate) {
        result = await updateMemberRate(
          editingRate.id,
          startDate,
          endDate || null,
          saleNum,
          costNum
        )
      } else {
        result = await createMemberRate(
          userId,
          startDate,
          endDate || null,
          saleNum,
          costNum
        )
      }

      if (result.success) {
        onSaved()
      } else {
        setError(result.error ?? 'Erro ao salvar taxa.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? 'Editar Taxa' : 'Nova Taxa'}
            </h2>
            <p className="text-sm text-gray-500">
              {isEditing
                ? 'Altere os valores da taxa de custo e venda.'
                : 'Defina as taxas de custo e venda por hora.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Data Início */}
            <div>
              <label htmlFor="rate-start" className="block text-sm font-medium text-gray-700 mb-1">
                Data Início <span className="text-red-400">*</span>
              </label>
              <input
                id="rate-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3730A3]/30 focus:border-[#3730A3] transition-colors"
                disabled={isPending}
              />
            </div>

            {/* Data Fim */}
            <div>
              <label htmlFor="rate-end" className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                id="rate-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3730A3]/30 focus:border-[#3730A3] transition-colors"
                disabled={isPending}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Deixe vazio para vigência indefinida
              </p>
            </div>
          </div>

          {/* Rate fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Custo/hora */}
            <div>
              <label htmlFor="rate-cost" className="block text-sm font-medium text-gray-700 mb-1">
                Custo/hora <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                  R$
                </span>
                <input
                  id="rate-cost"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={costRate}
                  onChange={(e) => setCostRate(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3730A3]/30 focus:border-[#3730A3] transition-colors tabular-nums"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Venda/hora */}
            <div>
              <label htmlFor="rate-sale" className="block text-sm font-medium text-gray-700 mb-1">
                Venda/hora <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                  R$
                </span>
                <input
                  id="rate-sale"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={saleRate}
                  onChange={(e) => setSaleRate(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3730A3]/30 focus:border-[#3730A3] transition-colors tabular-nums"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Margin preview */}
          {(costNum > 0 || saleNum > 0) && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Prévia da Margem</span>
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  marginColor(previewMargin)
                )}>
                  {previewMargin !== null ? `${previewMargin.toFixed(1)}%` : '—'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    marginBgColor(previewMargin)
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, previewMargin ?? 0))}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">0%</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-red-400">{'< 15%'}</span>
                  <span className="text-[10px] text-amber-400">{'15-30%'}</span>
                  <span className="text-[10px] text-emerald-400">{'>= 30%'}</span>
                </div>
                <span className="text-[10px] text-gray-400">100%</span>
              </div>
            </div>
          )}

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
              disabled={isPending || !startDate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3730A3] text-white text-sm font-semibold hover:bg-[#312E81] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isPending
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar'
                  : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
