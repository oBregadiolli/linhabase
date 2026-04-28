'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, isSameDay, addDays, startOfMonth, endOfMonth, formatDuration, getProjectColor, resolveProjectName, type ProjectMap } from '@/lib/utils/time'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

interface MonthViewProps {
  timesheets: Timesheet[]
  projectMap: ProjectMap
  currentDate: Date
  onNewForDate: (date: Date) => void
  onEdit: (id: string) => void
  onDayClick: (date: Date) => void
  onSuccess: () => void
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

type InteractionMode = 'move'

interface DragInfo {
  id: string
  /** ISO date where the card is currently hovering */
  date: string
  originalDate: string
  mode: InteractionMode
  startMin: number
  endMin: number
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function MonthView({ timesheets, projectMap, currentDate, onNewForDate, onEdit, onDayClick, onSuccess }: MonthViewProps) {
  const today    = new Date()
  const firstDay = startOfMonth(currentDate)
  const lastDay  = endOfMonth(currentDate)
  const { toast } = useToast()

  const gridStart = addDays(firstDay, firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay())
  const gridEnd   = addDays(lastDay, lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay())

  const days: Date[] = []
  let d = new Date(gridStart)
  while (d <= gridEnd) { days.push(new Date(d)); d = addDays(d, 1) }

  const tsForDay = useCallback((day: Date) => timesheets.filter(t => t.date === isoDate(day)), [timesheets])

  const handleCellClick = useCallback((day: Date) => {
    onNewForDate(day)
  }, [onNewForDate])

  // ── Shared drag state ─────────────────────────────────────────────────────
  const [drag, setDrag]     = useState<DragInfo | null>(null)
  const [saving, setSaving] = useState(false)

  const dragging  = useRef(false)
  const didMove   = useRef(false)
  const dragRef   = useRef<DragInfo | null>(null)
  const dragTsRef = useRef<Timesheet | null>(null)

  // For move: track pointer start position
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const cellRefs  = useRef<(HTMLDivElement | null)[]>([])

  const daysIso = useMemo(() => days.map(isoDate), [days])

  // ── pointer-down ─────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent, ts: Timesheet) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    dragging.current  = true
    didMove.current   = false
    dragTsRef.current = ts

    const info: DragInfo = {
      id: ts.id,
      date: ts.date,
      originalDate: ts.date,
      mode: 'move',
      startMin: timeToMinutes(ts.start_time),
      endMin:   timeToMinutes(ts.end_time),
    }
    dragRef.current = info
    setDrag(info)

    dragStart.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  // ── pointer-move ─────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return

    const start = dragStart.current
    if (start) {
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove.current = true
    }

    // Hit-test cells to find target day
    let targetIdx = -1
    for (let i = 0; i < cellRefs.current.length; i++) {
      const el = cellRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (e.clientX >= rect.left && e.clientX < rect.right &&
          e.clientY >= rect.top  && e.clientY < rect.bottom) {
        targetIdx = i
        break
      }
    }
    if (targetIdx < 0) return
    const targetIso = daysIso[Math.max(0, Math.min(daysIso.length - 1, targetIdx))]
    const updated = dragRef.current ? { ...dragRef.current, date: targetIso } : null
    dragRef.current = updated
    setDrag(updated)
  }, [daysIso])

  // ── pointer-up ────────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)

    const d  = dragRef.current ?? drag
    const ts = dragTsRef.current
    dragStart.current   = null
    dragTsRef.current   = null
    dragRef.current     = null

    if (!d || !ts) { setDrag(null); return }

    const noChange = !didMove.current || d.date === d.originalDate

    if (noChange) { setDrag(null); return }

    // Overlap check (move only — target day timesheets)
    const targetDayTs = timesheets.filter(t => t.date === d.date)

    const hasOverlap = targetDayTs.some(other => {
      if (other.id === ts.id) return false
      const otherStart = timeToMinutes(other.start_time)
      const otherEnd   = timeToMinutes(other.end_time)
      return d.startMin < otherEnd && d.endMin > otherStart
    })

    if (hasOverlap) {
      setDrag(null)
      toast('Horário já ocupado neste período.', 'info', 2000)
      return
    }


    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('timesheets')
      .update({ date: d.date })
      .eq('id', ts.id)

    setSaving(false)
    setDrag(null)

    if (error) {
      toast('Não foi possível atualizar o apontamento. Tente novamente.', 'error')
      return
    }
    onSuccess()
  }, [drag, onSuccess, timesheets, toast])

  // ── Escape cancels ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dragging.current) {
        dragging.current = false
        setDrag(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* Cursor for body while dragging */
  useEffect(() => {
    if (!drag) return
    document.body.classList.add('cursor-grabbing', 'select-none')
    return () => { document.body.classList.remove('cursor-grabbing', 'select-none') }
  }, [!!drag])

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {saving && <div className="h-0.5 bg-gradient-to-r from-[#3730A3] via-indigo-400 to-[#3730A3] animate-pulse" />}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS.map(w => (
          <div key={w} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{w}</div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 divide-x divide-gray-100"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {days.map((day, i) => {
          const dayTs          = tsForDay(day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday        = isSameDay(day, today)

          return (
            <div
              key={i}
              ref={el => { cellRefs.current[i] = el }}
              className={`min-h-[100px] p-1.5 border-b border-gray-100 flex flex-col gap-1 select-none transition-colors ${
                !isCurrentMonth
                  ? 'bg-gray-50/60'
                  : (drag?.date === isoDate(day) && drag.mode === 'move')
                    ? 'bg-indigo-50/60'
                    : drag
                      ? 'cursor-grabbing'
                      : 'cursor-pointer hover:bg-blue-50/30'
              }`}
              onClick={isCurrentMonth ? (e) => {
                if ((e.target as HTMLElement).closest('button,[data-drag-handle]')) return
                handleCellClick(day)
              } : undefined}
              title={isCurrentMonth ? 'Clique para criar apontamento' : undefined}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#3730A3] text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                  {day.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTs.slice(0, 3).map(t => {
                  const pName        = resolveProjectName(t.project_id, projectMap)
                  const c            = getProjectColor(pName)
                  const isDragging   = drag?.id === t.id

                  return (
                    <div
                      key={t.id}
                      data-drag-handle
                      className={`group relative block w-full rounded text-xs font-medium transition ${
                        isDragging ? 'opacity-70 ring-1 ring-[#3730A3]/30 shadow-md' : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}`, color: c.text }}
                    >
                      {/* Body — move only (no resize handles in month view) */}
                      <div
                        className={`px-1.5 py-0.5 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onPointerDown={e => handlePointerDown(e, t)}
                        onClick={e => {
                          if (!didMove.current && !drag) {
                            e.stopPropagation()
                            onEdit(t.id)
                          }
                        }}
                      >
                        <span className="truncate block">{pName}</span>
                      </div>
                    </div>
                  )
                })}
                {dayTs.length > 3 && (
                  <button onClick={() => onDayClick(day)} className="text-xs text-gray-400 hover:text-[#3730A3] text-left pl-1">
                    +{dayTs.length - 3} mais
                  </button>
                )}
              </div>

              {dayTs.length > 0 && (
                <div className="mt-auto text-[10px] text-gray-400 text-right">
                  {formatDuration(dayTs.reduce((s, t) => s + (t.duration_minutes ?? 0), 0))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
