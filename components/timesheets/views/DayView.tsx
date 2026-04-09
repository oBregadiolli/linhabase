'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, formatTime, formatDuration, getProjectColor, resolveProjectName, type ProjectMap } from '@/lib/utils/time'
import { computeLayout } from '@/lib/utils/layout'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Plus } from 'lucide-react'

interface DayViewProps {
  timesheets: Timesheet[]
  projectMap: ProjectMap
  currentDate: Date
  onNew: () => void
  onEdit: (id: string) => void
  onSuccess: () => void
  onNewForDate: (date: string, startTime: string) => void
}

const ZOOM_OPTIONS = [
  { label: '15 min', value: 15,  pxPerHour: 240 },
  { label: '30 min', value: 30,  pxPerHour: 120 },
  { label: '1h',     value: 60,  pxPerHour: 64  },
  { label: '2h',     value: 120, pxPerHour: 32  },
] as const

type ZoomValue = (typeof ZOOM_OPTIONS)[number]['value']

const GAP = 3
const SNAP_MINUTES = 15
const MIN_DURATION = 15 // minimum card duration in minutes
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

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

function fmtHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

/* ÔöÇÔöÇ Interaction mode ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
type InteractionMode = 'move' | 'resize-top' | 'resize-bottom'

interface DragInfo {
  id: string
  startMin: number
  endMin: number
  mode: InteractionMode
}

export default function DayView({ timesheets, projectMap, currentDate, onNew, onEdit, onSuccess, onNewForDate }: DayViewProps) {
  const [zoom, setZoom]           = useState<ZoomValue>(60)
  const [startHour, setStartHour] = useState(6)
  const [endHour, setEndHour]     = useState(22)
  const { toast }                 = useToast()

  const { pxPerHour } = ZOOM_OPTIONS.find(o => o.value === zoom)!
  const totalHours    = Math.max(1, endHour - startHour)
  const gridHeight    = totalHours * pxPerHour

  const ticks: { minutes: number; isHour: boolean }[] = []
  for (let m = 0; m < totalHours * 60; m += zoom) {
    ticks.push({ minutes: m, isHour: m % 60 === 0 })
  }

  const dayTs    = timesheets.filter(t => t.date === isoDate(currentDate))
  const blocks   = computeLayout(dayTs)
  const totalMin = dayTs.reduce((s, t) => s + (t.duration_minutes ?? 0), 0)

  /* ÔöÇÔöÇ Drag / Resize State ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
  const [drag, setDrag]     = useState<DragInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const dragging    = useRef(false)
  const dragStartY  = useRef(0)
  const origStart   = useRef(0)
  const origEnd     = useRef(0)
  const modeRef     = useRef<InteractionMode>('move')
  const dragTsRef   = useRef<Timesheet | null>(null)
  const didMove     = useRef(false)

  /* ÔöÇÔöÇ Pointer handlers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
  const handlePointerDown = useCallback((e: React.PointerEvent, ts: Timesheet, mode: InteractionMode) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    dragging.current   = true
    didMove.current    = false
    dragStartY.current = e.clientY
    origStart.current  = timeToMinutes(ts.start_time)
    origEnd.current    = timeToMinutes(ts.end_time)
    modeRef.current    = mode
    dragTsRef.current  = ts

    setDrag({
      id: ts.id,
      startMin: origStart.current,
      endMin: origEnd.current,
      mode,
    })

    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return

    const deltaY    = e.clientY - dragStartY.current
    if (Math.abs(deltaY) > 3) didMove.current = true
    const deltaMins = Math.round((deltaY / pxPerHour) * 60)
    const snapped   = Math.round(deltaMins / SNAP_MINUTES) * SNAP_MINUTES

    const mode = modeRef.current

    if (mode === 'move') {
      const duration = origEnd.current - origStart.current
      let newStart   = origStart.current + snapped
      let newEnd     = newStart + duration
      if (newStart < startHour * 60) { newStart = startHour * 60; newEnd = newStart + duration }
      if (newEnd > endHour * 60)     { newEnd = endHour * 60; newStart = newEnd - duration }
      setDrag(prev => prev ? { ...prev, startMin: newStart, endMin: newEnd } : null)
    } else if (mode === 'resize-bottom') {
      let newEnd = origEnd.current + snapped
      newEnd = Math.max(origStart.current + MIN_DURATION, newEnd)
      newEnd = Math.min(endHour * 60, newEnd)
      setDrag(prev => prev ? { ...prev, endMin: newEnd } : null)
    } else if (mode === 'resize-top') {
      let newStart = origStart.current + snapped
      newStart = Math.min(origEnd.current - MIN_DURATION, newStart)
      newStart = Math.max(startHour * 60, newStart)
      setDrag(prev => prev ? { ...prev, startMin: newStart } : null)
    }
  }, [pxPerHour, startHour, endHour])

  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)

    const d  = drag
    const ts = dragTsRef.current
    if (!d || !ts) { setDrag(null); return }

    // If nothing changed or no real movement, just cancel
    if (!didMove.current || (d.startMin === origStart.current && d.endMin === origEnd.current)) {
      setDrag(null)
      return
    }

    // ÔöÇÔöÇ Overlap check ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const hasOverlap = dayTs.some(other => {
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
        duration_minutes: d.endMin - d.startMin,
      })
      .eq('id', ts.id)

    setSaving(false)
    setDrag(null)
    if (!error) onSuccess()
  }, [drag, onSuccess, dayTs, toast])

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

  /* ÔöÇÔöÇ Click-to-create ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
  const handleColumnClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-drag-card]')) return
    if ((e.target as HTMLElement).closest('button')) return
    const rect   = e.currentTarget.getBoundingClientRect()
    const relY   = e.clientY - rect.top
    const relMin = (relY / pxPerHour) * 60 + startHour * 60
    const snapped  = Math.round(relMin / zoom) * zoom
    const clamped  = Math.max(startHour * 60, Math.min(snapped, (endHour - 1) * 60))
    onNewForDate(isoDate(currentDate), minutesToTimeStr(clamped))
  }, [onNewForDate, currentDate, pxPerHour, zoom, startHour, endHour])

  function handleStartHour(v: number) { setStartHour(Math.min(v, endHour - 1)) }
  function handleEndHour(v: number)   { setEndHour(Math.max(v, startHour + 1)) }

  /* ÔöÇÔöÇ Cursor for body while dragging ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */
  useEffect(() => {
    if (!drag) return
    const cls = drag.mode === 'resize-top' ? 'cursor-n-resize'
      : drag.mode === 'resize-bottom' ? 'cursor-s-resize'
      : 'cursor-grabbing'
    document.body.classList.add(cls, 'select-none')
    return () => { document.body.classList.remove(cls, 'select-none') }
  }, [drag?.mode, !!drag])

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ÔöÇÔöÇ Header ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-3 flex-wrap">
        <div className="text-sm font-semibold text-gray-700">
          {dayTs.length} apontamento{dayTs.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {ZOOM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setZoom(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 select-none ${
                  zoom === opt.value
                    ? 'bg-white text-[#3730A3] shadow-sm active:bg-indigo-50 active:scale-[0.96]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/60 active:bg-gray-200 active:scale-[0.96]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-medium text-gray-400 hidden sm:inline">Exibir</span>
            <select value={startHour} onChange={e => handleStartHour(Number(e.target.value))} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#3730A3] cursor-pointer hover:border-gray-300 transition-colors" aria-label="Hora inicial">
              {HOUR_OPTIONS.filter(h => h < endHour).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
            </select>
            <span className="text-gray-300 font-medium">ÔåÆ</span>
            <select value={endHour} onChange={e => handleEndHour(Number(e.target.value))} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#3730A3] cursor-pointer hover:border-gray-300 transition-colors" aria-label="Hora final">
              {HOUR_OPTIONS.filter(h => h > startHour).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Total: <span className="font-bold text-[#3730A3]">{formatDuration(totalMin)}</span>
          </span>
          <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#312E81] active:scale-[0.97] transition-all duration-150 select-none">
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>
      </div>

      {saving && <div className="h-0.5 bg-gradient-to-r from-[#3730A3] via-indigo-400 to-[#3730A3] animate-pulse" />}

      {/* ÔöÇÔöÇ Timeline ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
      <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
        <div className="grid grid-cols-[56px_1fr]" style={{ height: `${gridHeight}px` }}>
          {/* Hour/tick labels */}
          <div className="relative border-r border-gray-100">
            {ticks.map(({ minutes, isHour }) => {
              const absMin = startHour * 60 + minutes
              const h = Math.floor(absMin / 60)
              const m = absMin % 60
              const top = (minutes / 60) * pxPerHour
              return (
                <div key={minutes} className="absolute w-full text-right pr-2" style={{ top: `${top - 8}px` }}>
                  {isHour
                    ? <span className="text-xs font-medium text-gray-500">{String(h).padStart(2, '0')}:00</span>
                    : <span className="text-[10px] text-gray-300">{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</span>
                  }
                </div>
              )
            })}
          </div>

          {/* Day column */}
          <div
            className={`relative ${drag ? '' : 'cursor-crosshair'}`}
            onClick={handleColumnClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            title={drag ? '' : 'Clique para criar apontamento'}
          >
            {/* Grid lines */}
            {ticks.map(({ minutes, isHour }) => (
              <div key={minutes} className={`absolute w-full ${isHour ? 'border-t border-gray-200' : 'border-t border-gray-100 border-dashed'}`} style={{ top: `${(minutes / 60) * pxPerHour}px` }} />
            ))}

            {/* Empty state */}
            {dayTs.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-300 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Clique em qualquer hor├írio para adicionar</p>
              </div>
            )}

            {/* Timesheet blocks */}
            {blocks.map(({ item: t, colIdx, colCount }) => {
              const isDragging   = drag?.id === t.id
              const displayStart = isDragging ? drag.startMin : timeToMinutes(t.start_time)
              const displayEnd   = isDragging ? drag.endMin   : timeToMinutes(t.end_time)

              const offsetMin   = Math.max(0, displayStart - startHour * 60)
              const durationMin = Math.min(displayEnd, endHour * 60) - Math.max(displayStart, startHour * 60)
              if (durationMin <= 0) return null

              const top     = (offsetMin / 60) * pxPerHour
              const height  = Math.max(20, (durationMin / 60) * pxPerHour)
              const pName   = resolveProjectName(t.project_id, projectMap)
              const c       = getProjectColor(pName)
              const colW    = 100 / colCount
              const leftPct = colIdx * colW

              return (
                <div
                  key={t.id}
                  data-drag-card
                  className={`group absolute rounded-lg text-left select-none
                    ${isDragging
                      ? 'opacity-90 shadow-lg ring-2 ring-[#3730A3]/40 z-50 scale-[1.01]'
                      : 'hover:shadow-md z-10'}
                    transition-shadow duration-150`}
                  style={{
                    top:    `${top}px`,
                    height: `${height}px`,
                    left:   `calc(${leftPct}% + ${GAP}px)`,
                    width:  `calc(${colW}% - ${GAP * 2}px)`,
                    backgroundColor: c.bg,
                    borderLeft: `4px solid ${c.border}`,
                  }}
                >
                  {/* ÔöÇÔöÇ Top resize handle ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
                  <div
                    className="absolute top-0 left-0 right-0 h-2 cursor-n-resize z-20 group-hover:bg-[#3730A3]/10 rounded-t-lg transition-colors"
                    onPointerDown={e => handlePointerDown(e, t, 'resize-top')}
                  >
                    <div className="mx-auto mt-[2px] w-8 h-[3px] rounded-full bg-gray-400/0 group-hover:bg-gray-400/50 transition-colors" />
                  </div>

                  {/* ÔöÇÔöÇ Main body (move handle) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
                  <div
                    className={`absolute inset-0 top-2 bottom-2 px-3 py-1 ${isDragging && drag.mode === 'move' ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onPointerDown={e => handlePointerDown(e, t, 'move')}
                    onClick={e => {
                      if (!didMove.current && !drag) {
                        e.stopPropagation()
                        onEdit(t.id)
                      }
                    }}
                  >
                    <p className="text-sm font-bold truncate" style={{ color: c.text }}>{pName}</p>
                    {height > 30 && (
                      <p className="text-xs mt-0.5" style={{ color: c.text, opacity: 0.75 }}>
                        {minutesToTimeStr(displayStart)} ÔÇô {minutesToTimeStr(displayEnd)} ┬À {formatDuration(durationMin)}
                      </p>
                    )}
                    {height > 54 && t.description && (
                      <p className="text-xs mt-1 truncate" style={{ color: c.text, opacity: 0.6 }}>{t.description}</p>
                    )}
                  </div>

                  {/* ÔöÇÔöÇ Bottom resize handle ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize z-20 group-hover:bg-[#3730A3]/10 rounded-b-lg transition-colors"
                    onPointerDown={e => handlePointerDown(e, t, 'resize-bottom')}
                  >
                    <div className="mx-auto mb-[2px] w-8 h-[3px] rounded-full bg-gray-400/0 group-hover:bg-gray-400/50 transition-colors absolute bottom-0 left-1/2 -translate-x-1/2" />
                  </div>
                </div>
              )
            })}

            {/* Drag/resize time tooltip */}
            {drag && (
              <div
                className="absolute z-[60] pointer-events-none bg-gray-900 text-white text-[11px] font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
                style={{
                  top: `${Math.max(0, ((drag.startMin - startHour * 60) / 60) * pxPerHour - 28)}px`,
                  left: '8px',
                }}
              >
                {minutesToTimeStr(drag.startMin)} ÔÇô {minutesToTimeStr(drag.endMin)} ┬À {formatDuration(drag.endMin - drag.startMin)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
