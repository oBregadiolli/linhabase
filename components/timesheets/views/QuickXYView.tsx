'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isoDate, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from '@/lib/utils/time'
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project, Timesheet } from '@/lib/types/database.types'

interface QuickXYViewProps {
  userId: string
  projects: Project[]
  currentDate: Date
  onNavigate: (dir: 'prev' | 'next') => void
  onTimesheetAdded: () => void
  openEditDialog: (id: string) => void
}

function getDaysInRange(start: Date, end: Date): string[] {
  const days: string[] = []
  const d = new Date(start)
  while (d <= end) { days.push(isoDate(d)); d.setDate(d.getDate() + 1) }
  return days
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.getDay() === 0 || d.getDay() === 6
}

function isToday(dateStr: string): boolean {
  return dateStr === isoDate(new Date())
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function formatDayName(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

function minutesToHours(min: number): string {
  if (!min) return '-'
  return (min / 60).toFixed(2).replace('.', ',')
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ── Inline entry cell ─────────────────────────────────────────────────────────
function QuickEntry({
  date,
  project,
  existingMinutes,
  userId,
  companyId,
  onSuccess,
  onEdit,
  existingId,
}: {
  date: string
  project: Project
  existingMinutes: number
  userId: string
  companyId: string | null
  onSuccess: () => void
  onEdit: (id: string) => void
  existingId: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function handleSave() {
    const h = parseFloat(hours.replace(',', '.'))
    if (isNaN(h) || h <= 0 || h > 24) { setEditing(false); return }

    setSaving(true)
    const startTime = '08:00:00'
    const totalMinutes = Math.round(h * 60)
    const endHour = Math.floor((totalMinutes + 8 * 60) / 60) % 24
    const endMin = (totalMinutes + 8 * 60) % 60
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`

    if (existingId) {
      await supabase.from('timesheets').update({
        start_time: startTime,
        end_time: endTime,
        duration_minutes: totalMinutes,
        updated_at: new Date().toISOString(),
      }).eq('id', existingId)
    } else {
      await supabase.from('timesheets').insert({
        user_id: userId,
        company_id: companyId,
        project_id: project.id,
        date,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: totalMinutes,
        status: 'draft',
      })
    }

    setSaving(false)
    setEditing(false)
    setHours('')
    onSuccess()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setHours('') }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-1">
        <input
          ref={inputRef}
          type="text"
          value={hours}
          onChange={e => setHours(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="h"
          className="w-12 text-center text-xs border border-[#1D4ED8] rounded py-1 outline-none bg-white"
        />
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
        ) : (
          <>
            <button onClick={handleSave} className="text-emerald-600 hover:text-emerald-700 cursor-pointer">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setEditing(false); setHours('') }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    )
  }

  if (existingMinutes > 0) {
    return (
      <button
        onClick={() => existingId ? onEdit(existingId) : setEditing(true)}
        className="w-full h-full flex items-center justify-center font-semibold text-[#1D4ED8] hover:bg-blue-50 transition-colors cursor-pointer rounded"
        title="Clique para editar"
      >
        {minutesToHours(existingMinutes)}
      </button>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full h-full flex items-center justify-center text-gray-300 hover:text-[#1D4ED8] hover:bg-blue-50 transition-colors cursor-pointer rounded group"
      title="Clique para apontar"
    >
      <span className="opacity-0 group-hover:opacity-100 text-[10px] font-medium">+</span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuickXYView({
  userId, projects, currentDate, onNavigate, onTimesheetAdded, openEditDialog,
}: QuickXYViewProps) {
  const supabase = useMemo(() => createClient(), [])
  const [period, setPeriod] = useState<'month' | 'week'>('month')
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const fetchGenRef = useRef(0)

  // Get company ID once
  useEffect(() => {
    supabase.from('company_members').select('company_id')
      .eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle()
      .then(({ data }) => setCompanyId(data?.company_id ?? null))
  }, [supabase, userId])

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (period === 'week') return { rangeStart: startOfWeek(currentDate), rangeEnd: endOfWeek(currentDate) }
    return { rangeStart: startOfMonth(currentDate), rangeEnd: endOfMonth(currentDate) }
  }, [period, currentDate])

  const days = useMemo(() => getDaysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  const periodLabel = period === 'month'
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
        return `${fmt(rangeStart)} – ${fmt(rangeEnd)}/${rangeEnd.getFullYear()}`
      })()

  const fetchData = useCallback(async () => {
    const gen = ++fetchGenRef.current
    setLoading(true)
    const { data } = await supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId)
      .gte('date', isoDate(rangeStart))
      .lte('date', isoDate(rangeEnd))
      .order('date', { ascending: true })
    if (gen !== fetchGenRef.current) return
    setTimesheets((data ?? []) as Timesheet[])
    setLoading(false)
  }, [supabase, userId, rangeStart, rangeEnd])

  useEffect(() => { fetchData() }, [fetchData])

  // Build lookup: project_id → date → { minutes, id }
  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, { minutes: number; id: string }>>()
    for (const t of timesheets) {
      if (!t.project_id) continue
      if (!m.has(t.project_id)) m.set(t.project_id, new Map())
      const prev = m.get(t.project_id)!.get(t.date)
      m.get(t.project_id)!.set(t.date, {
        minutes: (prev?.minutes ?? 0) + (t.duration_minutes ?? 0),
        id: prev?.id ?? t.id,
      })
    }
    return m
  }, [timesheets])

  // Column totals
  const colTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const [, dayMap] of matrix) {
      for (const [date, { minutes }] of dayMap) {
        totals.set(date, (totals.get(date) ?? 0) + minutes)
      }
    }
    return totals
  }, [matrix])

  const grandTotal = useMemo(() => {
    let t = 0; for (const v of colTotals.values()) t += v; return t
  }, [colTotals])

  // Only show projects that are active
  const activeProjects = projects.filter(p => p.active)

  function handleSuccess() {
    fetchData()
    onTimesheetAdded()
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 bg-white border-b border-gray-100">
        {/* Period toggle */}
        <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
          {(['month', 'week'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
                period === p ? 'bg-white text-[#1D4ED8] shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {p === 'month' ? 'Mensal' : 'Semanal'}
            </button>
          ))}
        </div>

        {/* Navigator */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
          <button onClick={() => onNavigate('prev')} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">{periodLabel}</span>
          <button onClick={() => onNavigate('next')} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}

        <p className="text-[11px] text-gray-400 ml-auto">Clique numa célula para apontar horas</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px] border-r border-gray-200 min-w-[140px]">
                Projeto
              </th>
              {days.map(day => (
                <th
                  key={day}
                  className={cn(
                    'px-1 py-2 text-center border-r border-gray-100 min-w-[56px]',
                    isWeekend(day) ? 'bg-gray-100/80 text-gray-400' : 'text-gray-600',
                    isToday(day) && 'bg-blue-50 text-[#1D4ED8]',
                  )}
                >
                  <div className="text-[10px] font-medium leading-tight">{formatDayName(day)}</div>
                  <div className={cn('text-[10px] mt-0.5', isToday(day) ? 'font-bold' : '')}>{formatDate(day)}</div>
                </th>
              ))}
              <th className="sticky right-0 z-20 bg-gray-50 px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px] border-l border-gray-200 min-w-[60px]">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {activeProjects.length === 0 ? (
              <tr>
                <td colSpan={days.length + 2} className="text-center py-12 text-sm text-gray-400">
                  Nenhum projeto ativo.
                </td>
              </tr>
            ) : (
              <>
                {activeProjects.map((proj, idx) => {
                  const dayMap = matrix.get(proj.id)
                  const rowTotal = dayMap ? Array.from(dayMap.values()).reduce((s, v) => s + v.minutes, 0) : 0

                  return (
                    <tr
                      key={proj.id}
                      className={cn(
                        'border-b border-gray-50 hover:bg-blue-50/20 transition-colors',
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20',
                      )}
                    >
                      {/* Project name */}
                      <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#94a3b8' }} />
                          <span className="font-medium text-gray-800 truncate max-w-[110px]" title={proj.name}>{proj.name}</span>
                        </div>
                      </td>

                      {/* Day cells — interactive */}
                      {days.map(day => {
                        const entry = dayMap?.get(day)
                        return (
                          <td
                            key={day}
                            className={cn(
                              'border-r border-gray-50 h-10 p-0',
                              isWeekend(day) && 'bg-gray-50/50',
                              isToday(day) && 'bg-blue-50/40',
                            )}
                          >
                            <QuickEntry
                              date={day}
                              project={proj}
                              existingMinutes={entry?.minutes ?? 0}
                              existingId={entry?.id ?? null}
                              userId={userId}
                              companyId={companyId}
                              onSuccess={handleSuccess}
                              onEdit={openEditDialog}
                            />
                          </td>
                        )
                      })}

                      {/* Row total */}
                      <td className={cn(
                        'sticky right-0 z-10 bg-inherit border-l border-gray-200 px-3 py-2 text-center font-bold tabular-nums',
                        rowTotal > 0 ? 'text-[#1D4ED8]' : 'text-gray-300',
                      )}>
                        {minutesToHours(rowTotal)}
                      </td>
                    </tr>
                  )
                })}

                {/* Totals row */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </td>
                  {days.map(day => {
                    const total = colTotals.get(day) ?? 0
                    return (
                      <td
                        key={day}
                        className={cn(
                          'border-r border-gray-100 px-1 py-2 text-center tabular-nums',
                          isWeekend(day) && 'bg-gray-100/60',
                          isToday(day) && 'bg-blue-100/50',
                          total > 0 ? 'text-gray-900' : 'text-gray-300',
                        )}
                      >
                        {minutesToHours(total)}
                      </td>
                    )
                  })}
                  <td className="sticky right-0 z-10 bg-gray-50 border-l border-gray-200 px-3 py-2 text-center tabular-nums text-[#1D4ED8]">
                    {minutesToHours(grandTotal)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 px-4 py-2 border-t border-gray-100 bg-white">
        <span className="flex items-center gap-1"><span className="h-2.5 w-7 rounded bg-gray-100 border border-gray-200" />Final de semana</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-7 rounded bg-blue-50 border border-blue-200" />Hoje</span>
        <span>Valores em horas decimais · clique numa célula para apontar</span>
      </div>
    </div>
  )
}
