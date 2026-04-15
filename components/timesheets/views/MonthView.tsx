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

const WEEK_DAYS    = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const SNAP_MINUTES = 15
const MIN_DURATION = 15

type InteractionMode = 'move' | 'resize-top' | 'resize-bottom'

interface DragInfo {
  id: string
  /** ISO date where the card is currently hovering */
  date: string
  originalDate: string
  mode: InteractionMode
  /** minutes-since-midnight (only meaningful for resize modes) */
  startMin: number
  endMin: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeStr(min: number) {
  const clamped = clamp(min, 0, 23 * 60 + 59)
  const h = Math.floor(clamped / 60) % 24
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatDurationMin(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
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

  const dragging    = useRef(false)
  const didMove     = useRef(false)
  const dragRef     = useRef<DragInfo | null>(null)
  const dragTsRef   = useRef<Timesheet | null>(null)
  const modeRef     = useRef<InteractionMode>('move')

  // For move: track pointer start position to detect which cell we're over
  const dragStart   = useRef<{ x: number; y: number } | null>(null)
  const cellRefs    = useRef<(HTMLDivElement | null)[]>([])

  // For resize: track pointer start Y and original times
  const resizeStartY  = useRef(0)
  const origStartMin  = useRef(0)
  const origEndMin    = useRef(0)

  // Pixels per minute for resize. We use 100px per 60 min (≈ cell height heuristic).
  // We'll refine this by measuring cell height dynamically.
  const cellHeightRef = useRef(100)

  const daysIso = useMemo(() => days.map(isoDate), [days])

  // ── pointer-down ─────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent, ts: Timesheet, mode: InteractionMode) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    dragging.current   = true
    didMove.current    = false
    modeRef.current    = mode
    dragTsRef.current  = ts

    origStartMin.current = timeToMinutes(ts.start_time)
    origEndMin.current   = timeToMinutes(ts.end_time)
    resizeStartY.current = e.clientY

    const info: DragInfo = {
      id: ts.id,
      date: ts.date,
      originalDate: ts.date,
      mode,
      startMin: origStartMin.current,
      endMin:   origEndMin.current,
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

    const mode = modeRef.current

    if (mode === 'move') {
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
      const targetIso = daysIso[clamp(targetIdx, 0, daysIso.length - 1)]
      const updated = dragRef.current ? { ...dragRef.current, date: targetIso } : null
      dragRef.current = updated
      setDrag(updated)

    } else {
      // Resize: compute delta in minutes proportional to vertical movement
      const deltaY    = e.clientY - resizeStartY.current
      const pxPerMin  = cellHeightRef.current / 60
      const deltaMins = Math.round(deltaY / pxPerMin)
      const snapped   = Math.round(deltaMins / SNAP_MINUTES) * SNAP_MINUTES

      let newStart = origStartMin.current
      let newEnd   = origEndMin.current

      if (mode === 'resize-bottom') {
        newEnd = origEndMin.current + snapped
        newEnd = Math.max(origStartMin.current + MIN_DURATION, Math.min(23 * 60, newEnd))
      } else if (mode === 'resize-top') {
        newStart = origStartMin.current + snapped
        newStart = Math.min(origEndMin.current - MIN_DURATION, Math.max(0, newStart))
      }

      const updated = dragRef.current ? { ...dragRef.current, startMin: newStart, endMin: newEnd } : null
      dragRef.current = updated
      setDrag(updated)
    }
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

    const noChange =
      !didMove.current ||
      (d.mode === 'move' && d.date === d.originalDate) ||
      (d.mode !== 'move' && d.startMin === origStartMin.current && d.endMin === origEndMin.current)

    if (noChange) { setDrag(null); return }

    // ── Overlap check ─────────────────────────────────────────────────────
    const targetDate = d.mode === 'move' ? d.date : d.originalDate
    const targetDayTs = timesheets.filter(t => t.date === targetDate)

    const checkStart = d.startMin
    const checkEnd   = d.endMin

    const hasOverlap = targetDayTs.some(other => {
      if (other.id === ts.id) return false
      const otherStart = timeToMinutes(other.start_time)
      const otherEnd   = timeToMinutes(other.end_time)
      return checkStart < otherEnd && checkEnd > otherStart
    })

    if (hasOverlap) {
      setDrag(null)
      toast('Horário já ocupado neste período.', 'info', 2000)
      return
    }
    // ─────────────────────────────────────────────────────────────────────

    setSaving(true)
    const supabase = createClient()

    const updatePayload: Record<string, unknown> = {}
    if (d.mode === 'move') {
      updatePayload.date = d.date
    } else {
      updatePayload.start_time      = minutesToTimeStr(d.startMin)
      updatePayload.end_time        = minutesToTimeStr(d.endMin)
      updatePayload.duration_minutes = d.endMin - d.startMin
    }

    const { error } = await supabase
      .from('timesheets')
      .update(updatePayload)
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
    const cls = drag.mode === 'resize-top'    ? 'cursor-n-resize'
              : drag.mode === 'resize-bottom' ? 'cursor-s-resize'
              : 'cursor-grabbing'
    document.body.classList.add(cls, 'select-none')
    return () => { document.body.classList.remove(cls, 'select-none') }
  }, [drag?.mode, !!drag])

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
              ref={el => {
                cellRefs.current[i] = el
                // Measure cell height for resize pixel-to-minute conversion
                if (el) cellHeightRef.current = el.getBoundingClientRect().height || 100
              }}
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
                  const displayStart = isDragging ? drag!.startMin : timeToMinutes(t.start_time)
                  const displayEnd   = isDragging ? drag!.endMin   : timeToMinutes(t.end_time)
                  const durationMin  = displayEnd - displayStart

                  return (
                    <div
                      key={t.id}
                      data-drag-handle
                      className={`group relative block w-full rounded text-xs font-medium transition ${
                        isDragging ? 'opacity-70 ring-1 ring-[#3730A3]/30 shadow-md' : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}`, color: c.text }}
                    >
                      {/* Top resize handle */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[5px] cursor-n-resize z-10 group-hover:bg-[#3730A3]/10 rounded-t transition-colors"
                        onPointerDown={e => handlePointerDown(e, t, 'resize-top')}
                      />

                      {/* Body (move + click to edit) */}
                      <div
                        className={`px-1.5 py-0.5 ${isDragging && drag?.mode === 'move' ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onPointerDown={e => handlePointerDown(e, t, 'move')}
                        onClick={e => {
                          if (!didMove.current && !drag) {
                            e.stopPropagation()
                            onEdit(t.id)
                          }
                        }}
                      >
                        <span className="truncate block">{pName}</span>
                        {isDragging && drag!.mode !== 'move' && (
                          <span className="text-[10px] opacity-70 block">
                            {minutesToTimeStr(displayStart)}–{minutesToTimeStr(displayEnd)}
                          </span>
                        )}
                      </div>

                      {/* Bottom resize handle */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[5px] cursor-s-resize z-10 group-hover:bg-[#3730A3]/10 rounded-b transition-colors"
                        onPointerDown={e => handlePointerDown(e, t, 'resize-bottom')}
                      />

                      {/* Tooltip during resize */}
                      {isDragging && drag!.mode !== 'move' && (
                        <div className="absolute -top-7 left-0 z-50 pointer-events-none bg-gray-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                          {minutesToTimeStr(displayStart)}–{minutesToTimeStr(displayEnd)} · {formatDurationMin(durationMin)}
                        </div>
                      )}
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
