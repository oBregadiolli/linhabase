'use client'

import { useState } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { formatDatePtBr, formatTime, formatDuration, statusLabel } from '@/lib/utils/time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, Info } from 'lucide-react'

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface TableViewProps {
  timesheets: Timesheet[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const PAGE_SIZE = 10

function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'approved') return 'default'
  if (status === 'submitted') return 'secondary'
  return 'outline'
}

export default function TableView({ timesheets, onEdit, onDelete }: TableViewProps) {
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [infoId, setInfoId]       = useState<string | null>(null)

  const filtered = timesheets.filter(t =>
    t.project.toLowerCase().includes(search.toLowerCase())
  )
  const total  = filtered.length
  const pages  = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const confirmTarget = timesheets.find(t => t.id === confirmId)

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Filtrar por projeto..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm
                       ring-offset-background placeholder:text-muted-foreground
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filtrar por projeto"
          />
          <span className="text-sm text-muted-foreground shrink-0" aria-live="polite">
            {total} registro{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm" role="table" aria-label="Apontamentos">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['Data', 'Projeto', 'Início', 'Fim', 'Duração', 'Status', 'Ações'].map(h => (
                  <th key={h} scope="col" className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? 'Nenhum resultado para essa busca.' : 'Nenhum apontamento neste período.'}
                  </td>
                </tr>
              ) : (
                paged.map(t => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors duration-150">
                    <td className="px-4 py-3 font-medium whitespace-nowrap tabular-nums">{formatDatePtBr(t.date)}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate" title={t.project}>{t.project}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">{formatTime(t.start_time)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">{formatTime(t.end_time)}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap tabular-nums">{formatDuration(t.duration_minutes)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => onEdit(t.id)}
                          aria-label={`Editar ${t.project}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmId(t.id)}
                          aria-label={`Excluir ${t.project}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {/* Info button */}
                        <div className="relative">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-sky-600 hover:bg-sky-50"
                            onClick={() => setInfoId(infoId === t.id ? null : t.id)}
                            aria-label={`Informações de ${t.project}`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                          {infoId === t.id && (
                            <div
                              className="absolute right-0 top-9 z-50 w-64 rounded-lg border border-border bg-background shadow-lg p-3 space-y-2 text-xs"
                              onClick={e => e.stopPropagation()}
                            >
                              <p className="font-semibold text-foreground mb-1">Histórico do apontamento</p>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-start gap-2 text-muted-foreground">
                                  <span className="shrink-0 mt-0.5">🕐</span>
                                  <div>
                                    <span className="block text-[10px] uppercase tracking-wide font-medium">Criado em</span>
                                    <span className="text-foreground font-medium">{fmtTimestamp(t.created_at)}</span>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-muted-foreground">
                                  <span className="shrink-0 mt-0.5">✏️</span>
                                  <div>
                                    <span className="block text-[10px] uppercase tracking-wide font-medium">Última edição</span>
                                    <span className="text-foreground font-medium">
                                      {t.updated_at !== t.created_at
                                        ? fmtTimestamp(t.updated_at)
                                        : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                className="mt-1 w-full text-center text-[10px] text-muted-foreground hover:text-foreground"
                                onClick={() => setInfoId(null)}
                              >
                                Fechar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">{page} / {pages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
              Próxima
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={confirmId !== null} onOpenChange={open => { if (!open) setConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir apontamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá o registro de{' '}
              <strong>{confirmTarget?.project}</strong> em{' '}
              <strong>{confirmTarget ? formatDatePtBr(confirmTarget.date) : ''}</strong> permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmId) { onDelete(confirmId); setConfirmId(null) } }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
