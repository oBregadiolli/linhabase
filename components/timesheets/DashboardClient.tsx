'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Plus, LogOut, Trash2 } from 'lucide-react'

interface DashboardClientProps {
  userName: string
}

function getPeriodRange(view: View, date: Date): { start: Date; end: Date } {
  if (view === 'month' || view === 'table') return { start: startOfMonth(date), end: endOfMonth(date) }
  if (view === 'week') return { start: startOfWeek(date), end: endOfWeek(date) }
  return { start: date, end: date }
}

export default function DashboardClient({ userName }: DashboardClientProps) {
  const [view, setView]                       = useState<View>('month')
  const [currentDate, setCurrentDate]         = useState(new Date())
  const [timesheets, setTimesheets]           = useState<Timesheet[]>([])
  const [loading, setLoading]                 = useState(true)
  const [drawer, setDrawer]                   = useState<DrawerState>({ open: false })
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchTimesheets = useCallback(async () => {
    setLoading(true)
    const { start, end } = getPeriodRange(view, currentDate)
    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .gte('date', isoDate(start))
      .lte('date', isoDate(end))
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    if (!error && data) setTimesheets(data as Timesheet[])
    setLoading(false)
  }, [view, currentDate, supabase])

  useEffect(() => { fetchTimesheets() }, [fetchTimesheets])

  // Drawer helpers
  function openNew(defaultDate?: string) {
    setDrawer({ open: true, mode: 'create', defaultDate })
  }
  function openEdit(timesheetId: string) {
    setDrawer({ open: true, mode: 'edit', timesheetId })
  }
  function closeDrawer() {
    setDrawer({ open: false })
  }
  function handleDrawerSuccess() {
    closeDrawer()
    fetchTimesheets()
  }

  // Period navigation
  function navigate(dir: 'prev' | 'next') {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (view === 'month' || view === 'table') d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1))
      else if (view === 'week') d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
      else d.setDate(d.getDate() + (dir === 'next' ? 1 : -1))
      return d
    })
  }

  // Inline delete (from table) — abre o AlertDialog de confirmação
  function handleDelete(id: string) {
    setPendingDeleteId(id)
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    await supabase.from('timesheets').delete().eq('id', pendingDeleteId)
    setTimesheets(prev => prev.filter(t => t.id !== pendingDeleteId))
    setPendingDeleteId(null)
  }

  const totalMinutes = timesheets.reduce((s, t) => s + (t.duration_minutes ?? 0), 0)

  return (
    <>
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-4">
          <span className="text-lg font-bold text-[#3730A3] mr-auto">LinhaBase</span>

          <ViewSwitcher view={view} onViewChange={setView} />

          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#312E81] transition"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Apontamento</span>
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
            <span className="text-sm text-gray-500 hidden md:inline">{userName}</span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Sair">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
          <PeriodNavigator
            view={view}
            currentDate={currentDate}
            totalMinutes={totalMinutes}
            onPrev={() => navigate('prev')}
            onNext={() => navigate('next')}
            onToday={() => setCurrentDate(new Date())}
          />

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="h-8 w-8 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
                <span className="text-sm">Carregando apontamentos...</span>
              </div>
            </div>
          ) : (
            <>
              {view === 'table' && (
                <TableView
                  timesheets={timesheets}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              )}
              {view === 'month' && (
                <MonthView
                  timesheets={timesheets}
                  currentDate={currentDate}
                  onNewForDate={date => openNew(isoDate(date))}
                  onEdit={openEdit}
                  onDayClick={d => { setCurrentDate(d); setView('day') }}
                />
              )}
              {view === 'week' && (
                <WeekView
                  timesheets={timesheets}
                  currentDate={currentDate}
                  onEdit={openEdit}
                />
              )}
              {view === 'day' && (
                <DayView
                  timesheets={timesheets}
                  currentDate={currentDate}
                  onNew={() => openNew(isoDate(currentDate))}
                  onEdit={openEdit}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Drawer */}
      <TimesheetDrawer
        state={drawer}
        onClose={closeDrawer}
        onSuccess={handleDrawerSuccess}
      />

      {/* AlertDialog — confirmação de exclusão (TableView) */}
      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-title"
          aria-describedby="del-desc"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPendingDeleteId(null)}
          />

          {/* Card */}
          <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 id="del-title" className="text-base font-semibold text-gray-900">
              Excluir apontamento
            </h3>
            <p id="del-desc" className="mt-2 text-sm text-gray-500 leading-relaxed">
              Tem certeza que deseja excluir este apontamento? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
