'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isoDate, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from '@/lib/utils/time'
import { ChevronLeft, ChevronRight, Calendar, Loader2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

interface XYClientProps {
  companyName: string
  members: MemberProfile[]
  projects: ProjectSummary[]
  embedded?: boolean
}

interface TimesheetRow {
  date: string
  start_time: string
  end_time: string
  duration_minutes: number | null
  project_id: string | null
  user_id: string
}

type XYPeriod = 'month' | 'week'

// ── Helpers ──────────────────────────────────────────────────────

function getDaysInRange(start: Date, end: Date): string[] {
  const days: string[] = []
  const d = new Date(start)
  while (d <= end) {
    days.push(isoDate(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function formatDayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

function formatDayOfWeekFull(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  const name = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function minutesToDecimalHours(minutes: number): string {
  if (minutes === 0) return '-'
  const hours = minutes / 60
  return hours.toFixed(2).replace('.', ',')
}

function getWeekLabel(start: Date, end: Date): string {
  const sDay = start.getDate().toString().padStart(2, '0')
  const sMonth = (start.getMonth() + 1).toString().padStart(2, '0')
  const eDay = end.getDate().toString().padStart(2, '0')
  const eMonth = (end.getMonth() + 1).toString().padStart(2, '0')
  const year = end.getFullYear()
  return `${sDay}/${sMonth} – ${eDay}/${eMonth}/${year}`
}

// ── Component ────────────────────────────────────────────────────

export default function XYClient({ companyName, members, projects, embedded }: XYClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const fetchGenRef = useRef(0)

  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filterMember, setFilterMember] = useState<string>('all')
  const [period, setPeriod] = useState<XYPeriod>('month')

  // ── Period boundaries ─────────────────────────────────────────
  const periodKey = `${period}-${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (period === 'week') {
      return { rangeStart: startOfWeek(currentDate), rangeEnd: endOfWeek(currentDate) }
    }
    return { rangeStart: startOfMonth(currentDate), rangeEnd: endOfMonth(currentDate) }
  }, [periodKey])

  // All days in the range
  const days = useMemo(() => getDaysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  // Period label
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const periodLabel = period === 'month'
    ? `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : getWeekLabel(rangeStart, rangeEnd)

  // ── Data fetch ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const gen = ++fetchGenRef.current
    setLoading(true)

    let query = supabase
      .from('timesheets')
      .select('date, start_time, end_time, duration_minutes, project_id, user_id')
      .gte('date', isoDate(rangeStart))
      .lte('date', isoDate(rangeEnd))
      .order('date', { ascending: true })

    if (filterMember !== 'all') {
      query = query.eq('user_id', filterMember)
    }

    const { data, error } = await query

    if (gen !== fetchGenRef.current) return
    if (!error && data) {
      setTimesheets(data as TimesheetRow[])
    }
    setLoading(false)
  }, [supabase, rangeStart, rangeEnd, filterMember])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Build the matrix ──────────────────────────────────────────
  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, number>>()
    for (const t of timesheets) {
      const projKey = t.project_id ?? '__no_project__'
      if (!m.has(projKey)) m.set(projKey, new Map())
      const dayMap = m.get(projKey)!
      const prev = dayMap.get(t.date) ?? 0
      dayMap.set(t.date, prev + (t.duration_minutes ?? 0))
    }
    return m
  }, [timesheets])

  // Project rows
  const projectRows = useMemo(() => {
    const rows: { id: string; name: string; color: string | null }[] = []
    for (const p of projects) {
      if (matrix.has(p.id)) rows.push({ id: p.id, name: p.name, color: p.color })
    }
    for (const p of projects) {
      if (!matrix.has(p.id) && p.active) rows.push({ id: p.id, name: p.name, color: p.color })
    }
    if (matrix.has('__no_project__')) {
      rows.push({ id: '__no_project__', name: 'Sem projeto', color: null })
    }
    return rows
  }, [projects, matrix])

  // Column totals
  const columnTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const [, dayMap] of matrix) {
      for (const [date, minutes] of dayMap) {
        totals.set(date, (totals.get(date) ?? 0) + minutes)
      }
    }
    return totals
  }, [matrix])

  function getRowTotal(projId: string): number {
    const dayMap = matrix.get(projId)
    if (!dayMap) return 0
    let total = 0
    for (const v of dayMap.values()) total += v
    return total
  }

  const grandTotal = useMemo(() => {
    let total = 0
    for (const v of columnTotals.values()) total += v
    return total
  }, [columnTotals])

  // ── Navigation ────────────────────────────────────────────────
  function navigate(dir: 'prev' | 'next') {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (period === 'month') {
        d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
      } else {
        d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
      }
      return d
    })
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function isWeekend(dateStr: string): boolean {
    const d = new Date(`${dateStr}T12:00:00`)
    const dow = d.getDay()
    return dow === 0 || dow === 6
  }

  function isToday(dateStr: string): boolean {
    return dateStr === isoDate(new Date())
  }

  // Weekly view uses wider columns
  const isWeekly = period === 'week'

  return (
    <div className={embedded ? 'flex flex-col flex-1 min-w-0 overflow-hidden' : 'flex h-screen bg-[#F3F4F6] overflow-hidden'}>
      <div className={embedded ? 'flex flex-col flex-1 min-w-0 overflow-hidden' : 'flex flex-col flex-1 min-w-0 overflow-hidden'}>

        <main className="flex-1 overflow-auto relative">
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden">
              <div className="h-full w-1/3 bg-[#1D4ED8] animate-[slide_1.2s_ease-in-out_infinite]" />
            </div>
          )}

          <div className="max-w-full w-full mx-auto px-4 sm:px-6 py-6 space-y-4">

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-3">

              {/* Period toggle */}
              <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
                <button
                  onClick={() => setPeriod('month')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer',
                    period === 'month'
                      ? 'bg-white text-[#1D4ED8] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setPeriod('week')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer',
                    period === 'week'
                      ? 'bg-white text-[#1D4ED8] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  Semanal
                </button>
              </div>

              {/* Period navigator */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                <button onClick={() => navigate('prev')} className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer" aria-label="Período anterior">
                  <ChevronLeft className="h-4 w-4 text-gray-500" />
                </button>
                <div className="flex items-center gap-1.5 min-w-[180px] justify-center">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{periodLabel}</span>
                </div>
                <button onClick={() => navigate('next')} className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer" aria-label="Próximo período">
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Member filter */}
              <Select value={filterMember} onValueChange={(v) => { if (v !== null) setFilterMember(v) }}>
                <SelectTrigger className="w-auto min-w-[180px] bg-white border-gray-200 text-sm font-medium text-gray-700 gap-1.5 h-auto py-1.5 px-3 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {filterMember === 'all'
                      ? 'Todos os membros'
                      : (members.find(m => m.id === filterMember)?.name || members.find(m => m.id === filterMember)?.email || 'Membro')}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os membros</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            {/* ── XY Table ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider min-w-[140px] text-[10px]">
                        Projeto
                      </th>
                      {days.map(day => (
                        <th
                          key={day}
                          className={cn(
                            'border-b border-r border-gray-100 px-1 py-1.5 text-center font-medium whitespace-nowrap',
                            isWeekly ? 'min-w-[100px]' : 'min-w-[52px]',
                            isWeekend(day) ? 'bg-gray-100/80 text-gray-400' : 'text-gray-600',
                            isToday(day) && 'bg-blue-50 text-[#1D4ED8]',
                          )}
                        >
                          {isWeekly ? (
                            <>
                              <div className="text-[11px] font-semibold leading-tight">{formatDayOfWeekFull(day)}</div>
                              <div className={cn(
                                'text-[10px] leading-tight mt-0.5',
                                isToday(day) ? 'font-bold' : 'font-medium',
                              )}>
                                {formatDateShort(day)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10px] leading-tight">{formatDayOfWeek(day)}</div>
                              <div className={cn(
                                'text-[10px] leading-tight mt-0.5',
                                isToday(day) ? 'font-bold' : 'font-medium',
                              )}>
                                {formatDateShort(day)}
                              </div>
                            </>
                          )}
                        </th>
                      ))}
                      <th className="sticky right-0 z-20 bg-gray-50 border-b border-l border-gray-200 px-3 py-2 text-center font-semibold text-gray-500 uppercase tracking-wider min-w-[64px] text-[10px]">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && timesheets.length === 0 ? (
                      <tr>
                        <td colSpan={days.length + 2} className="text-center py-12">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
                          <p className="text-xs text-gray-400 mt-2">Carregando dados...</p>
                        </td>
                      </tr>
                    ) : projectRows.length === 0 ? (
                      <tr>
                        <td colSpan={days.length + 2} className="text-center py-12">
                          <p className="text-sm text-gray-500">Nenhum projeto com apontamentos neste período.</p>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {projectRows.map((proj, idx) => {
                          const dayMap = matrix.get(proj.id)
                          const rowTotal = getRowTotal(proj.id)

                          return (
                            <tr
                              key={proj.id}
                              className={cn(
                                'hover:bg-blue-50/30 transition-colors',
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                              )}
                            >
                              {/* Project name */}
                              <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: proj.color || '#94a3b8' }}
                                  />
                                  <span className="font-medium text-gray-800 truncate max-w-[120px]" title={proj.name}>
                                    {proj.name}
                                  </span>
                                </div>
                              </td>

                              {/* Day cells */}
                              {days.map(day => {
                                const minutes = dayMap?.get(day) ?? 0
                                const hasValue = minutes > 0

                                return (
                                  <td
                                    key={day}
                                    className={cn(
                                      'border-r border-gray-50 px-1 py-2.5 text-center tabular-nums',
                                      isWeekly && 'text-sm',
                                      isWeekend(day) && 'bg-gray-50/50',
                                      isToday(day) && 'bg-blue-50/50',
                                      hasValue ? 'text-gray-900 font-semibold' : 'text-gray-300',
                                    )}
                                  >
                                    {minutesToDecimalHours(minutes)}
                                  </td>
                                )
                              })}

                              {/* Row total */}
                              <td className={cn(
                                'sticky right-0 z-10 bg-inherit border-l border-gray-200 px-3 py-2.5 text-center tabular-nums font-bold',
                                isWeekly && 'text-sm',
                                rowTotal > 0 ? 'text-[#1D4ED8]' : 'text-gray-300',
                              )}>
                                {minutesToDecimalHours(rowTotal)}
                              </td>
                            </tr>
                          )
                        })}

                        {/* ── Totals row ── */}
                        <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                          <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 px-3 py-2.5 text-gray-600 uppercase tracking-wider text-[10px]">
                            Total
                          </td>
                          {days.map(day => {
                            const total = columnTotals.get(day) ?? 0
                            return (
                              <td
                                key={day}
                                className={cn(
                                  'border-r border-gray-100 px-1 py-2.5 text-center tabular-nums',
                                  isWeekly && 'text-sm',
                                  isWeekend(day) && 'bg-gray-100/60',
                                  isToday(day) && 'bg-blue-100/50',
                                  total > 0 ? 'text-gray-900' : 'text-gray-300',
                                )}
                              >
                                {minutesToDecimalHours(total)}
                              </td>
                            )
                          })}
                          <td className={cn(
                            'sticky right-0 z-10 bg-gray-50 border-l border-gray-200 px-3 py-2.5 text-center tabular-nums text-[#1D4ED8]',
                            isWeekly && 'text-sm',
                          )}>
                            {minutesToDecimalHours(grandTotal)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-gray-400 px-1">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-7 rounded bg-gray-100 border border-gray-200" />
                Final de semana
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-7 rounded bg-blue-50 border border-blue-200" />
                Hoje
              </span>
              <span>Valores em horas decimais</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
