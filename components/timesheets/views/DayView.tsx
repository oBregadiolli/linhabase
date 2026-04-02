'use client'

import { useState, useCallback } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, formatTime, formatDuration, getProjectColor } from '@/lib/utils/time'
import { computeLayout } from '@/lib/utils/layout'
import { Plus } from 'lucide-react'

interface DayViewProps {
  timesheets: Timesheet[]
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
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeStr(min: number) {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function fmtHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

export default function DayView({ timesheets, currentDate, onNew, onEdit, onNewForDate }: DayViewProps) {
  const [zoom, setZoom]           = useState<ZoomValue>(60)
  const [startHour, setStartHour] = useState(6)
  const [endHour, setEndHour]     = useState(22)

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

  const handleColumnClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    const rect   = e.currentTarget.getBoundingClientRect()
    const relY   = e.clientY - rect.top
    const relMin = (relY / pxPerHour) * 60 + startHour * 60
    const snapped  = Math.round(relMin / zoom) * zoom
    const clamped  = Math.max(startHour * 60, Math.min(snapped, (endHour - 1) * 60))
    onNewForDate(isoDate(currentDate), minutesToTimeStr(clamped))
  }, [onNewForDate, currentDate, pxPerHour, zoom, startHour, endHour])

  function handleStartHour(v: number) {
    setStartHour(Math.min(v, endHour - 1))
  }
  function handleEndHour(v: number) {
    setEndHour(Math.max(v, startHour + 1))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-3 flex-wrap">
        <div className="text-sm font-semibold text-gray-700">
          {dayTs.length} apontamento{dayTs.length !== 1 ? 's' : ''}
        </div>

        {/* Controls group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom pill selector */}
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

          {/* Hour range selectors */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-medium text-gray-400 hidden sm:inline">Exibir</span>
            <select
              value={startHour}
              onChange={e => handleStartHour(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#3730A3] cursor-pointer hover:border-gray-300 transition-colors"
              aria-label="Hora inicial"
            >
              {HOUR_OPTIONS.filter(h => h < endHour).map(h => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
            <span className="text-gray-300 font-medium">→</span>
            <select
              value={endHour}
              onChange={e => handleEndHour(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#3730A3] cursor-pointer hover:border-gray-300 transition-colors"
              aria-label="Hora final"
            >
              {HOUR_OPTIONS.filter(h => h > startHour).map(h => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Total: <span className="font-bold text-[#3730A3]">{formatDuration(totalMin)}</span>
          </span>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#312E81] active:scale-[0.97] transition-all duration-150 select-none"
          >
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────── */}
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
                <div
                  key={minutes}
                  className="absolute w-full text-right pr-2"
                  style={{ top: `${top - 8}px` }}
                >
                  {isHour ? (
                    <span className="text-xs font-medium text-gray-500">
                      {String(h).padStart(2, '0')}:00
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300">
                      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Day column */}
          <div
            className="relative cursor-crosshair"
            onClick={handleColumnClick}
            title="Clique para criar apontamento"
          >
            {/* Grid lines */}
            {ticks.map(({ minutes, isHour }) => (
              <div
                key={minutes}
                className={`absolute w-full ${isHour ? 'border-t border-gray-200' : 'border-t border-gray-100 border-dashed'}`}
                style={{ top: `${(minutes / 60) * pxPerHour}px` }}
              />
            ))}

            {/* Empty state */}
            {dayTs.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-300 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Clique em qualquer horário para adicionar</p>
              </div>
            )}

            {/* Timesheet blocks */}
            {blocks.map(({ item: t, colIdx, colCount }) => {
              const startMin    = timeToMinutes(t.start_time)
              const endMin      = timeToMinutes(t.end_time)
              const offsetMin   = Math.max(0, startMin - startHour * 60)
              const durationMin = Math.min(endMin, endHour * 60) - Math.max(startMin, startHour * 60)
              if (durationMin <= 0) return null

              const top     = (offsetMin / 60) * pxPerHour
              const height  = Math.max(20, (durationMin / 60) * pxPerHour)
              const c       = getProjectColor(t.project)
              const colW    = 100 / colCount
              const leftPct = colIdx * colW

              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t.id)}
                  className="absolute rounded-lg px-3 py-2 transition-all duration-100 hover:opacity-75 active:scale-[0.98] text-left shadow-sm"
                  style={{
                    top:    `${top}px`,
                    height: `${height}px`,
                    left:   `calc(${leftPct}% + ${GAP}px)`,
                    width:  `calc(${colW}% - ${GAP * 2}px)`,
                    backgroundColor: c.bg,
                    borderLeft: `4px solid ${c.border}`,
                  }}
                >
                  <p className="text-sm font-bold truncate" style={{ color: c.text }}>{t.project}</p>
                  {height > 30 && (
                    <p className="text-xs mt-0.5" style={{ color: c.text, opacity: 0.75 }}>
                      {formatTime(t.start_time)} – {formatTime(t.end_time)} · {formatDuration(t.duration_minutes)}
                    </p>
                  )}
                  {height > 54 && t.description && (
                    <p className="text-xs mt-1 truncate" style={{ color: c.text, opacity: 0.6 }}>{t.description}</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
