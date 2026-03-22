'use client'

import { useState } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { formatDatePtBr, formatTime, formatDuration, statusLabel, statusClass } from '@/lib/utils/time'
import { Pencil, Trash2 } from 'lucide-react'

interface TableViewProps {
  timesheets: Timesheet[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const PAGE_SIZE = 10

export default function TableView({ timesheets, onEdit, onDelete }: TableViewProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const filtered = timesheets.filter(t =>
    t.project.toLowerCase().includes(search.toLowerCase())
  )
  const total  = filtered.length
  const pages  = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paged  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Filtrar por projeto..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#3B82F6]"
        />
        <span className="text-sm text-gray-400 shrink-0">{total} registro{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Data', 'Projeto', 'Início', 'Fim', 'Duração', 'Status', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  {search ? 'Nenhum resultado para essa busca.' : 'Nenhum apontamento neste período.'}
                </td>
              </tr>
            ) : (
              paged.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{formatDatePtBr(t.date)}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-[180px] truncate">{t.project}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTime(t.start_time)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTime(t.end_time)}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{formatDuration(t.duration_minutes)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(t.status)}`}>
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(t.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#3730A3] hover:bg-blue-50 transition"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:border-[#3B82F6] transition">Anterior</button>
          <span className="text-sm text-gray-500">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:border-[#3B82F6] transition">Próxima</button>
        </div>
      )}
    </div>
  )
}
