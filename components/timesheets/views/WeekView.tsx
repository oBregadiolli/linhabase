'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, startOfWeek, addDays, isSameDay, formatTime, formatDuration, getProjectColor, resolveProjectName, type ProjectMap } from '@/lib/utils/time'
import { computeLayout } from '@/lib/utils/layout'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

interface WeekViewProps {
  timesheets: Timesheet[]
  projectMap: ProjectMap
  currentDate: Date
  onEdit: (id: string) => void
  onSuccess: () => void
  onNewForDate: (date: string, startTime: string) => void
}

const START_HOUR   = 6
const END_HOUR     = 22
const SLOT_PX      = 64
const DAYS_SHORT   = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S├íb', 'Dom']
const GAP          = 2
const SNAP_MINUTES = 15
const MIN_DURATION = 15

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeStr(min: number) {
  const clamped = Math.max(0, Math.min(min, 23 * 60 + 59))
  const h = Math.floor(clamped / 60) % 24
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/* ÔöÇÔöÇ Interaction mode ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
type InteractionMode = 'move' | 'resize-top' | 'resize-bottom'

interface DragInfo {
  id: string
  startMin: number
  endMin: number
  date: string
  originalDate: string
  mode: InteractionMode
}

export default function WeekView({ timesheets, projectMap, currentDate, onEdit, onSuccess, onNewForDate }: WeekViewProps) {
  const today     = new Date()
  const weekStart = startOfWeek(currentDate)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours     = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const { toast } = useToast()

  /* ÔöÇÔöÇ Drag / Resize state ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
  const [drag, setDrag]     = useState<DragInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const dragging    = useRef(false)
  const dragStartY  = useRef(0)
  const dragStartX  = useRef(0)
  const origStart   = useRef(0)
  const origEnd     = useRef(0)
  const modeRef     = useRef<InteractionMode>('move')
  const dragTsRef   = useRef<Timesheet | null>(null)
  const columnRefs  = useRef<(HTMLDivElement | null)[]>([])
  const didMove     = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent, ts: Timesheet, mode: InteractionMode) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    dragging.current   = true
    didMove.current    = false
    dragStartY.current = e.clientY
    dragStartX.current = e.clientX
    origStart.current  = timeToMinutes(ts.start_time)
    origEnd.current    = timeToMinutes(ts.end_time)
    modeRef.current    = mode
    dragTsRef.current  = ts

    setDrag({
      id: ts.id,
      startMin: origStart.current,
      endMin: origEnd.current,
      date: ts.date,
      originalDate: ts.date,
      mode,
    })

    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return

    const deltaY    = e.clientY - dragStartY.current
    if (Math.abs(deltaY) > 3 || Math.abs(e.clientX - dragStartX.current) > 3) didMove.current = true
    const deltaMins = Math.round((deltaY / SLOT_PX) * 60)
    const snapped   = Math.round(deltaMins / SNAP_MINUTES) * SNAP_MINUTES
    const mode      = modeRef.current

    let newStart = origStart.current
    let newEnd   = origEnd.current

    if (mode === 'move') {
      const duration = origEnd.current - origStart.current
      newStart = origStart.current + snapped
      newEnd   = newStart + duration
      if (newStart < START_HOUR * 60) { newStart = START_HOUR * 60; newEnd = newStart + duration }
      if (newEnd > END_HOUR * 60)     { newEnd = END_HOUR * 60; newStart = newEnd - duration }
    } else if (mode === 'resize-bottom') {
      newEnd = origEnd.current + snapped
      newEnd = Math.max(origStart.current + MIN_DURATION, newEnd)
      newEnd = Math.min(END_HOUR * 60, newEnd)
    } else if (mode === 'resize-top') {
      newStart = origStart.current + snapped
      newStart = Math.min(origEnd.current - MIN_DURATION, newStart)
      newStart = Math.max(START_HOUR * 60, newStart)
    }

    // Horizontal day change ÔÇö only for move
    let targetDate = dragTsRef.current?.date ?? ''
    if (mode === 'move') {
      for (let i = 0; i < columnRefs.current.length; i++) {
        const col = columnRefs.current[i]
        if (!col) continue
        const rect = col.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX < rect.right) {
          targetDate = isoDate(days[i])
          break
        }
      }
    }

    setDrag(prev => prev ? { ...prev, startMin: newStart, endMin: newEnd, date: targetDate } : null)
  }, [days])

  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)

    const d  = drag
    const ts = dragTsRef.current
    if (!d || !ts) { setDrag(null); return }

    if (!didMove.current || (d.startMin === origStart.current && d.endMin === origEnd.current && d.date === d.originalDate)) {
      setDrag(null)
      return
    }

    // ÔöÇÔöÇ Overlap check ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const targetDayTs = timesheets.filter(t => t.date === d.date)
    const hasOverlap = targetDayTs.some(other => {
      if (other.id === ts.id) return false
      const otherStart = timeToMinutes(other.start_time)
      const otherEnd   = timeToMinutes(other.end_time)
      return d.startMin < otherEnd && d.endMin > otherStart
    })

    if (hasOverlap) {
      setDrag(null)
      toast('N├úo ├® poss├¡vel mover: o hor├írio sobrep├Áe outro apontamento.', 'warning')
      return
    }
    // ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('timesheets')
      .update({
        start_time: minutesToTimeStr(d.startMin),
        end_time:   minutesToTimeStr(d.endMin),
        date:       d.date,
        duration_minutes: d.endMin - d.startMin,
      })
      .eq('id', ts.id)

    setSaving(false)
    setDrag(null)
    if (!error) onSuccess()
  }, [drag, onSuccess, timesheets, toast])

  // Escape cancels
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

  /* ÔöÇÔöÇ Cursor on body ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
  useEffect(() => {
    if (!drag) return
    const cls = drag.mode === 'resize-top' ? 'cursor-n-resize'
      : drag.mode === 'resize-bottom' ? 'cursor-s-resize'
      : 'cursor-grabbing'
    document.body.classList.add(cls, 'select-none')
    return () => { document.body.classList.remove(cls, 'select-none') }
  }, [drag?.mode, !!drag])

  /* ÔöÇÔöÇ Click-to-create ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
  const handleColumnClick = useCallback((day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-drag-card]')) return
    if ((e.target as HTMLElement).closest('button')) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const relY    = e.clientY - rect.top
    const minutes = Math.round((relY / SLOT_PX) * 60) + START_HOUR * 60
    const snapped = Math.round(minutes / 15) * 15
    const startTime = minutesToTimeStr(Math.max(START_HOUR * 60, Math.min(snapped, (END_HOUR - 1) * 60)))
    onNewForDate(isoDate(day), startTime)
  }, [onNewForDate])

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {saving && <div className="h-0.5 bg-gradient-to-r from-[#3730A3] via-indigo-400 to-[#3730A3] animate-pulse" />}

      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="py-3 border-r border-gray-100" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const isDragTarget = drag?.date === isoDate(day)
          return (
            <div key={i} className={`py-3 text-center border-r border-gray-100 last:border-r-0 transition-colors duration-150 ${isDragTarget ? 'bg-indigo-50/50' : ''}`}>
              <div className="text-xs font-medium text-gray-400 uppercase">{DAYS_SHORT[i]}</div>
              <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-[#3730A3] text-white' : 'text-gray-700'}`}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
        <div
          className="grid grid-cols-[56px_repeat(7,1fr)]"
          style={{ height: `${(END_HOUR - START_HOUR) * SLOT_PX}px` }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Hour labels */}
          <div className="relative border-r border-gray-100">
            {hours.map(h => (
              <div key={h} className="absolute w-full text-right pr-2 text-xs text-gray-400" style={{ top: `${(h - START_HOUR) * SLOT_PX - 8}px` }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayIso = isoDate(day)
            const dayTs  = timesheets.filter(t => {
              if (drag && t.id === drag.id) return drag.date === dayIso
              return t.date === dayIso
            })
            const blocks = computeLayout(
              drag && drag.date === dayIso
                ? dayTs.map(t => t.id === drag.id ? { ...t, start_time: minutesToTimeStr(drag.startMin), end_time: minutesToTimeStr(drag.endMin) } : t)
                : dayTs
            )
            const isToday      = isSameDay(day, today)
            const isDragTarget = drag?.date === dayIso

            return (
              <div
                key={di}
                ref={el => { columnRefs.current[di] = el }}
                className={`relative border-r border-gray-100 last:border-r-0 ${drag ? '' : 'cursor-crosshair'} transition-colors duration-150 ${
                  isDragTarget ? 'bg-indigo-50/30' : isToday ? 'bg-blue-50/20' : ''
                }`}
                onClick={e => handleColumnClick(day, e)}
                title={drag ? '' : 'Clique para criar apontamento'}
              >
                {/* Hour lines */}
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${(h - START_HOUR) * SLOT_PX}px` }} />
                ))}

                {/* Timesheet blocks */}
                {blocks.map(({ item: t, colIdx, colCount }) => {
                  const isDraggingThis = drag?.id === t.id
                  const displayStart   = isDraggingThis ? drag.startMin : timeToMinutes(t.start_time)
                  const displayEnd     = isDraggingThis ? drag.endMin   : timeToMinutes(t.end_time)

                  const offsetMin   = Math.max(0, displayStart - START_HOUR * 60)
                  const durationMin = Math.min(displayEnd, END_HOUR * 60) - Math.max(displayStart, START_HOUR * 60)
                  if (durationMin <= 0) return null

                  const top     = (offsetMin / 60) * SLOT_PX
                  const height  = Math.max(20, (durationMin / 60) * SLOT_PX)
                  const pName   = resolveProjectName(t.project_id, projectMap)
                  const c       = getProjectColor(pName)
                  const colW    = 100 / colCount
                  const leftPct = colIdx * colW

                  return (
                    <div
                      key={t.id}
                      data-drag-card
                      className={`group absolute rounded-md overflow-visible text-xs font-medium text-left select-none
                        ${isDraggingThis
                          ? 'opacity-90 shadow-lg ring-2 ring-[#3730A3]/40 z-50 scale-[1.02]'
                          : 'hover:shadow-md z-10'}
                        transition-shadow duration-150`}
                      style={{
                        top:    `${top}px`,
                        height: `${height}px`,
                        left:   `calc(${leftPct}% + ${GAP}px)`,
                        width:  `calc(${colW}% - ${GAP * 2}px)`,
                        backgroundColor: c.bg,
                        borderLeft: `3px solid ${c.border}`,
                        color: c.text,
                      }}
                    >
                      {/* ÔöÇÔöÇ Top resize handle ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[6px] cursor-n-resize z-20 group-hover:bg-[#3730A3]/10 rounded-t-md transition-colors"
                        onPointerDown={e => handlePointerDown(e, t, 'resize-top')}
                      >
                        <div className="mx-auto mt-[1px] w-5 h-[2px] rounded-full bg-gray-400/0 group-hover:bg-gray-400/60 transition-colors" />
                      </div>

                      {/* ÔöÇÔöÇ Body (move) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
                      <div
                        className={`absolute inset-0 top-[6px] bottom-[6px] px-1.5 overflow-hidden ${isDraggingThis && drag.mode === 'move' ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onPointerDown={e => handlePointerDown(e, t, 'move')}
                        onClick={e => {
                          if (!didMove.current && !drag) {
                            e.stopPropagation()
                            onEdit(t.id)
                          }
                        }}
                      >
                        <div className="truncate font-semibold leading-tight mt-0.5">{resolveProjectName(t.project_id, projectMap)}</div>
                        {height > 32 && (
                          <div className="truncate opacity-70">
                            {minutesToTimeStr(displayStart)}ÔÇô{minutesToTimeStr(displayEnd)}
                          </div>
                        )}
                      </div>

                      {/* ÔöÇÔöÇ Bottom resize handle ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[6px] cursor-s-resize z-20 group-hover:bg-[#3730A3]/10 rounded-b-md transition-colors"
                        onPointerDown={e => handlePointerDown(e, t, 'resize-bottom')}
                      >
                        <div className="mx-auto w-5 h-[2px] rounded-full bg-gray-400/0 group-hover:bg-gray-400/60 transition-colors absolute bottom-[1px] left-1/2 -translate-x-1/2" />
                      </div>

                      {/* Resize tooltip */}
                      {isDraggingThis && (
                        <div className="absolute -top-6 left-0 z-[60] pointer-events-none bg-gray-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                          {minutesToTimeStr(drag.startMin)}ÔÇô{minutesToTimeStr(drag.endMin)} ┬À {formatDuration(durationMin)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
