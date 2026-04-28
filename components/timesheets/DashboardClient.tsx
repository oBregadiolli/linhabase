'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Timesheet, Project } from '@/lib/types/database.types'
import { isoDate, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from '@/lib/utils/time'

import ViewSwitcher, { type View } from './ViewSwitcher'
import PeriodNavigator from './PeriodNavigator'
import Sidebar from './Sidebar'
import TableView from './views/TableView'
import MonthView from './views/MonthView'
import WeekView from './views/WeekView'
import DayView from './views/DayView'
import QuickXYView from './views/QuickXYView'
import TimesheetDialog, { type DialogState } from './TimesheetDialog'
import { DashboardSkeleton, TableSkeleton, TimelineSkeleton } from './DashboardSkeletons'
import { Plus } from 'lucide-react'
import { submitTimesheet } from '@/app/(app)/dashboard/actions'

const VALID_VIEWS: View[] = ['table', 'month', 'week', 'day', 'xy']

function getPeriodRange(view: View, date: Date): { start: Date; end: Date } {
  if (view === 'month' || view === 'table') return { start: startOfMonth(date), end: endOfMonth(date) }
  if (view === 'week') return { start: startOfWeek(date), end: endOfWeek(date) }
  return { start: date, end: date }
}

interface DashboardClientProps {
  userId: string
  userName: string
  userEmail?: string
  avatarUrl?: string | null
  isAdmin?: boolean
  companyId: string
  initialProjects: Project[]
}

function parseViewFromSearch(search: string): View {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const v = params.get('view')
  return VALID_VIEWS.includes(v as View) ? (v as View) : 'month'
}

function parseDateFromSearch(search: string): Date {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const d = params.get('date')
  if (d) {
    const p = new Date(`${d}T12:00:00`)
    if (!isNaN(p.getTime())) return p
  }
  return new Date()
}

export default function DashboardClient({ userId, userName, userEmail, avatarUrl, isAdmin, companyId, initialProjects }: DashboardClientProps) {
  const searchParams = useSearchParams()
  const pathname     = usePathname()

  // ── State from URL ─────────────────────────────────────────────────────────
  const urlView: View = useMemo(() => {
    const v = searchParams.get('view')
    return VALID_VIEWS.includes(v as View) ? (v as View) : 'month'
  }, [searchParams])

  const urlDate: Date = useMemo(() => {
    const d = searchParams.get('date')
    if (d) { const p = new Date(`${d}T12:00:00`); if (!isNaN(p.getTime())) return p }
    return new Date()
  }, [searchParams])

  // Local state to prevent Next router navigation on tab/date changes.
  const [view, setViewState] = useState<View>(() => (typeof window === 'undefined' ? urlView : parseViewFromSearch(window.location.search)))
  const [currentDate, setCurrentDateState] = useState<Date>(() => (typeof window === 'undefined' ? urlDate : parseDateFromSearch(window.location.search)))

  useEffect(() => {
    setViewState(urlView)
    setCurrentDateState(urlDate)
  }, [urlView, urlDate])

  useEffect(() => {
    // Back/forward support when we manage history ourselves
    function onPopState() {
      setViewState(parseViewFromSearch(window.location.search))
      setCurrentDateState(parseDateFromSearch(window.location.search))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const updateParamsClientSide = useCallback((patch: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search)
    params.delete('dialog'); params.delete('dialogId'); params.delete('dialogDate'); params.delete('dialogStart')
    for (const [k, v] of Object.entries(patch)) v === null ? params.delete(k) : params.set(k, v)
    const qs = params.toString()
    const nextUrl = `${pathname}${qs ? `?${qs}` : ''}`
    window.history.replaceState(null, '', nextUrl)
  }, [pathname])

  // ── Navigation ─────────────────────────────────────────────────────────────
  function setView(v: View) {
    setViewState(v)
    updateParamsClientSide({ view: v })
  }

  function navigate(dir: 'prev' | 'next') {
    const d = new Date(currentDate)
    if (view === 'month' || view === 'table') d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
    else if (view === 'week') d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
    else d.setDate(d.getDate() + (dir === 'next' ? 1 : -1))
    setCurrentDateState(d)
    updateParamsClientSide({ date: isoDate(d) })
  }

  function setDate(d: Date) {
    setCurrentDateState(d)
    updateParamsClientSide({ date: isoDate(d) })
  }

  function navigateXY(dir: 'prev' | 'next', period: 'month' | 'week') {
    const d = new Date(currentDate)
    if (period === 'month') d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
    else d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
    setCurrentDateState(d)
    updateParamsClientSide({ date: isoDate(d) })
  }

  // ── Dialog ─────────────────────────────────────────────────────────────────
  const [dialogState, setDialogState] = useState<DialogState>(() => {
    const mode = searchParams.get('dialog')
    const dialogId = searchParams.get('dialogId')
    const dialogDate = searchParams.get('dialogDate')
    const dialogStart = searchParams.get('dialogStart')
    if (mode === 'new') return { open: true, mode: 'create', defaultDate: dialogDate ?? isoDate(currentDate), defaultStartTime: dialogStart ?? undefined }
    if (mode === 'edit' && dialogId) return { open: true, mode: 'edit', timesheetId: dialogId }
    return { open: false }
  })

  function syncDialogUrl(patch: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(patch)) v === null ? params.delete(k) : params.set(k, v)
    const qs = params.toString()
    window.history.replaceState(null, '', `${pathname}${qs ? `?${qs}` : ''}`)
  }

  function openNew(defaultDate?: string, defaultStartTime?: string) {
    setDialogState({ open: true, mode: 'create', defaultDate, defaultStartTime })
    syncDialogUrl({ dialog: 'new', dialogDate: defaultDate ?? null, dialogStart: defaultStartTime ?? null, dialogId: null })
  }
  function openEdit(id: string) {
    setDialogState({ open: true, mode: 'edit', timesheetId: id })
    syncDialogUrl({ dialog: 'edit', dialogId: id, dialogDate: null, dialogStart: null })
  }
  function closeDialog() {
    setDialogState({ open: false })
    syncDialogUrl({ dialog: null, dialogId: null, dialogDate: null, dialogStart: null })
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [loading, setLoading]       = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fetchGenRef                 = useRef(0)
  const supabase = useMemo(() => createClient(), [])

  // ── Company projects (server-provided to avoid RLS surprises on the client) ──
  const [projects] = useState<Project[]>(initialProjects)

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>()
    for (const p of projects) map.set(p.id, { name: p.name, color: p.color })
    return map
  }, [projects])

  const fetchTimesheets = useCallback(async () => {
    const gen = ++fetchGenRef.current
    setLoading(true)
    setFetchError(null)
    const { start, end } = getPeriodRange(view, currentDate)
    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('user_id', userId)          // ← explicit: personal dashboard only
      .gte('date', isoDate(start))
      .lte('date', isoDate(end))
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    if (gen !== fetchGenRef.current) return
    if (error) setFetchError('Erro ao carregar apontamentos. Verifique sua conexão.')
    else setTimesheets((data as Timesheet[]) ?? [])
    setLoading(false)
    setInitialLoad(false)
  }, [view, currentDate, supabase, userId])

  useEffect(() => { fetchTimesheets() }, [fetchTimesheets])

  function handleDialogSuccess() { closeDialog(); fetchTimesheets() }

  async function handleDelete(id: string) {
    await supabase.from('timesheets').delete().eq('id', id)
    setTimesheets(prev => prev.filter(t => t.id !== id))
  }

  async function handleSubmit(id: string) {
    const result = await submitTimesheet(id)
    if (result.success) {
      fetchTimesheets()
    } else {
      setFetchError(result.error ?? 'Erro ao enviar apontamento.')
    }
  }

  const totalMinutes = timesheets.reduce((s, t) => s + (t.duration_minutes ?? 0), 0)

  return (
    <>
      {/* Root layout: sidebar + main */}
      <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">

        <Sidebar userName={userName} userEmail={userEmail} avatarUrl={avatarUrl} isAdmin={isAdmin} />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Top bar */}
          <header className="shrink-0 flex items-center justify-between gap-4 bg-white border-b border-gray-200 px-6 h-14">
            <ViewSwitcher view={view} onViewChange={setView} />
            {view !== 'xy' && (
              <button
                onClick={() => openNew()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#312E81] transition-colors duration-150"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Apontamento</span>
              </button>
            )}
          </header>

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto relative">
            {/* Subtle refresh bar — only on subsequent loads, not initial */}
            {loading && !initialLoad && (
              <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden">
                <div className="h-full w-1/3 bg-[#3730A3] animate-[slide_1.2s_ease-in-out_infinite]" />
              </div>
            )}
            <div className={view === 'xy' ? 'flex-1 flex flex-col min-w-0 overflow-auto' : 'max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4'}>
              {view !== 'xy' && (
                <PeriodNavigator
                  view={view}
                  currentDate={currentDate}
                  totalMinutes={totalMinutes}
                  onPrev={() => navigate('prev')}
                  onNext={() => navigate('next')}
                  onToday={() => setDate(new Date())}
                />
              )}

              {fetchError && !loading && (
                <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <span>{fetchError}</span>
                  <button onClick={fetchTimesheets} className="ml-4 shrink-0 font-medium underline hover:no-underline">
                    Tentar novamente
                  </button>
                </div>
              )}

              {loading && initialLoad ? (
                <>
                  {view === 'month'  && <DashboardSkeleton />}
                  {view === 'table'  && <TableSkeleton />}
                  {(view === 'week' || view === 'day') && <TimelineSkeleton />}
                </>
              ) : (
                <>
                  {view === 'table' && (
                    <TableView timesheets={timesheets} projectMap={projectMap} onEdit={openEdit} onDelete={handleDelete} onSubmit={handleSubmit} />
                  )}
                  {view === 'month' && (
                    <MonthView
                      timesheets={timesheets}
                      projectMap={projectMap}
                      currentDate={currentDate}
                      onNewForDate={d => openNew(isoDate(d))}
                      onEdit={openEdit}
                      onDayClick={d => { setDate(d); setView('day') }}
                      onSuccess={fetchTimesheets}
                    />
                  )}
                  {view === 'week' && (
                    <WeekView
                      timesheets={timesheets}
                      projectMap={projectMap}
                      currentDate={currentDate}
                      onEdit={openEdit}
                      onSuccess={fetchTimesheets}
                      onNewForDate={(d, t) => openNew(d, t)}
                    />
                  )}
                  {view === 'day' && (
                    <DayView
                      timesheets={timesheets}
                      projectMap={projectMap}
                      currentDate={currentDate}
                      onNew={() => openNew(isoDate(currentDate))}
                      onEdit={openEdit}
                      onSuccess={fetchTimesheets}
                      onNewForDate={(d, t) => openNew(d, t)}
                    />
                  )}
                  {view === 'xy' && (
                    <QuickXYView
                      userId={userId}
                      projects={projects}
                      currentDate={currentDate}
                      onNavigate={navigateXY}
                      onTimesheetAdded={fetchTimesheets}
                      openEditDialog={openEdit}
                    />
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <TimesheetDialog
        state={dialogState}
        onClose={closeDialog}
        onSuccess={handleDialogSuccess}
        projects={projects}
        companyId={companyId}
      />
    </>
  )
}
