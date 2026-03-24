'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from '@/lib/utils/time'

import ViewSwitcher, { type View } from './ViewSwitcher'
import PeriodNavigator from './PeriodNavigator'
import TableView from './views/TableView'
import MonthView from './views/MonthView'
import WeekView from './views/WeekView'
import DayView from './views/DayView'
import TimesheetDrawer, { type DrawerState } from './TimesheetDrawer'
import { DashboardSkeleton, TableSkeleton, TimelineSkeleton } from './DashboardSkeletons'
import { Plus, LogOut } from 'lucide-react'

const VALID_VIEWS: View[] = ['table', 'month', 'week', 'day']

function getPeriodRange(view: View, date: Date): { start: Date; end: Date } {
  if (view === 'month' || view === 'table') return { start: startOfMonth(date), end: endOfMonth(date) }
  if (view === 'week') return { start: startOfWeek(date), end: endOfWeek(date) }
  return { start: date, end: date }
}

export default function DashboardClient({ userName }: { userName: string }) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  // ── State from URL ─────────────────────────────────────────────────────────
  const view: View = useMemo(() => {
    const v = searchParams.get('view')
    return VALID_VIEWS.includes(v as View) ? (v as View) : 'month'
  }, [searchParams])

  const currentDate: Date = useMemo(() => {
    const d = searchParams.get('date')
    if (d) { const p = new Date(`${d}T12:00:00`); if (!isNaN(p.getTime())) return p }
    return new Date()
  }, [searchParams])

  const drawerState: DrawerState = useMemo(() => {
    const mode     = searchParams.get('drawer')
    const drawerId = searchParams.get('drawerId')
    const drawDate = searchParams.get('drawDate')
    if (mode === 'new')  return { open: true, mode: 'create', defaultDate: drawDate ?? isoDate(currentDate) }
    if (mode === 'edit' && drawerId) return { open: true, mode: 'edit', timesheetId: drawerId }
    return { open: false }
  }, [searchParams, currentDate])

  // ── URL updater ────────────────────────────────────────────────────────────
  const updateParams = useCallback((patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) v === null ? params.delete(k) : params.set(k, v)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  // ── Navigation ─────────────────────────────────────────────────────────────
  function setView(v: View) { updateParams({ view: v, drawer: null, drawerId: null, drawDate: null }) }

  function navigate(dir: 'prev' | 'next') {
    const d = new Date(currentDate)
    if (view === 'month' || view === 'table') d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
    else if (view === 'week') d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
    else d.setDate(d.getDate() + (dir === 'next' ? 1 : -1))
    updateParams({ date: isoDate(d) })
  }

  function setDate(d: Date) { updateParams({ date: isoDate(d) }) }

  // ── Drawer ─────────────────────────────────────────────────────────────────
  function openNew(defaultDate?: string) {
    updateParams({ drawer: 'new', drawDate: defaultDate ?? null, drawerId: null })
  }
  function openEdit(id: string) {
    updateParams({ drawer: 'edit', drawerId: id, drawDate: null })
  }
  function closeDrawer() {
    updateParams({ drawer: null, drawerId: null, drawDate: null })
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fetchGenRef                 = useRef(0)
  const supabase = useMemo(() => createClient(), [])

  const fetchTimesheets = useCallback(async () => {
    const gen = ++fetchGenRef.current
    setLoading(true)
    setFetchError(null)
    const { start, end } = getPeriodRange(view, currentDate)
    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .gte('date', isoDate(start))
      .lte('date', isoDate(end))
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    if (gen !== fetchGenRef.current) return // stale response — discard
    if (error) setFetchError('Erro ao carregar apontamentos. Verifique sua conexão.')
    else setTimesheets((data as Timesheet[]) ?? [])
    setLoading(false)
  }, [view, currentDate, supabase])

  useEffect(() => { fetchTimesheets() }, [fetchTimesheets])

  function handleDrawerSuccess() { closeDrawer(); fetchTimesheets() }

  // TableView calls onDelete AFTER user confirms — just delete
  async function handleDelete(id: string) {
    await supabase.from('timesheets').delete().eq('id', id)
    setTimesheets(prev => prev.filter(t => t.id !== id))
  }

  const totalMinutes = timesheets.reduce((s, t) => s + (t.duration_minutes ?? 0), 0)

  return (
    <>
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-4">
          <span className="text-lg font-bold text-[#3730A3] mr-auto">LinhaBase</span>

          <ViewSwitcher view={view} onViewChange={setView} />

          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#312E81] transition-colors duration-150"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Apontamento</span>
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
            <span className="text-sm text-gray-500 hidden md:inline">{userName}</span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                title="Sair"
                aria-label="Sair da conta"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
          <PeriodNavigator
            view={view}
            currentDate={currentDate}
            totalMinutes={totalMinutes}
            onPrev={() => navigate('prev')}
            onNext={() => navigate('next')}
            onToday={() => setDate(new Date())}
          />

          {fetchError && !loading && (
            <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <span>{fetchError}</span>
              <button
                onClick={fetchTimesheets}
                className="ml-4 shrink-0 font-medium underline hover:no-underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <>
              {view === 'month'  && <DashboardSkeleton />}
              {view === 'table'  && <TableSkeleton />}
              {(view === 'week' || view === 'day') && <TimelineSkeleton />}
            </>
          ) : (
            <>
              {view === 'table' && (
                <TableView timesheets={timesheets} onEdit={openEdit} onDelete={handleDelete} />
              )}
              {view === 'month' && (
                <MonthView
                  timesheets={timesheets}
                  currentDate={currentDate}
                  onNewForDate={d => openNew(isoDate(d))}
                  onEdit={openEdit}
                  onDayClick={d => { setDate(d); setView('day') }}
                  onSuccess={fetchTimesheets}
                  onMoreOptions={openNew}
                />
              )}
              {view === 'week' && (
                <WeekView timesheets={timesheets} currentDate={currentDate} onEdit={openEdit} onSuccess={fetchTimesheets} onMoreOptions={openNew} />
              )}
              {view === 'day' && (
                <DayView
                  timesheets={timesheets}
                  currentDate={currentDate}
                  onNew={() => openNew(isoDate(currentDate))}
                  onEdit={openEdit}
                  onSuccess={fetchTimesheets}
                  onMoreOptions={openNew}
                />
              )}
            </>
          )}
        </main>
      </div>

      <TimesheetDrawer state={drawerState} onClose={closeDrawer} onSuccess={handleDrawerSuccess} />
    </>
  )
}
