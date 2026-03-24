'use client'

import { useState, useCallback } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, formatTime, formatDuration, getProjectColor } from '@/lib/utils/time'
import { computeLayout } from '@/lib/utils/layout'
import { Plus } from 'lucide-react'
import QuickCreatePopover from '../QuickCreatePopover'

interface DayViewProps {
  timesheets: Timesheet[]
  currentDate: Date
  onNew: () => void
  onEdit: (id: string) => void
  onSuccess: () => void
  onMoreOptions?: (isoDate: string) => void
}

const START_HOUR = 6
const END_HOUR   = 22
const SLOT_PX    = 64
const GAP        = 3 // px between side-by-side blocks

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeStr(min: number) {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

interface PopoverState {
  anchorRect: DOMRect
  startTime: string
}

export default function DayView({ timesheets, currentDate, onNew, onEdit, onSuccess, onMoreOptions }: DayViewProps) {
  const dayTs    = timesheets.filter(t => t.date === isoDate(currentDate))
  const blocks   = computeLayout(dayTs)
  const totalMin = dayTs.reduce((s, t) => s + (t.duration_minutes ?? 0), 0)
  const hours    = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  const [popover, setPopover] = useState<PopoverState | null>(null)

  const handleColumnClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks on timesheet blocks (buttons)
    if ((e.target as HTMLElement).closest('button')) return
    const rect    = e.currentTarget.getBoundingClientRect()
    const relY    = e.clientY - rect.top
    const minutes = Math.round((relY / SLOT_PX) * 60) + START_HOUR * 60
    const snapped = Math.round(minutes / 15) * 15 // snap to 15-min grid
    const startTime = minutesToTimeStr(Math.max(START_HOUR * 60, Math.min(snapped, (END_HOUR - 1) * 60)))
    // Use a fake DOMRect anchored at the click point
    const anchor = new DOMRect(e.clientX - 8, e.clientY, 16, 0)
    setPopover({ anchorRect: anchor, startTime })
  }, [])

  const handleClose = useCallback(() => setPopover(null), [])
  const handleSuccess = useCallback(() => { setPopover(null); onSuccess() }, [onSuccess])

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-700">
            {dayTs.length} apontamento{dayTs.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Total: <span className="font-bold text-[#3730A3]">{formatDuration(totalMin)}</span>
            </span>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#312E81] transition"
            >
              <Plus className="h-4 w-4" /> Novo
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          <div className="grid grid-cols-[56px_1fr]" style={{ height: `${(END_HOUR - START_HOUR) * SLOT_PX}px` }}>
            {/* Hour labels */}
            <div className="relative border-r border-gray-100">
              {hours.map(h => (
                <div key={h} className="absolute w-full text-right pr-2 text-xs text-gray-400" style={{ top: `${(h - START_HOUR) * SLOT_PX - 8}px` }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Single day column — click anywhere to quick-create */}
            <div
              className="relative cursor-crosshair"
              onClick={handleColumnClick}
              title="Clique para criar apontamento"
            >
              {/* Hour lines */}
              {hours.map(h => (
                <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${(h - START_HOUR) * SLOT_PX}px` }} />
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
                const offsetMin   = Math.max(0, startMin - START_HOUR * 60)
                const durationMin = Math.min(endMin, END_HOUR * 60) - Math.max(startMin, START_HOUR * 60)
                if (durationMin <= 0) return null

                const top     = (offsetMin / 60) * SLOT_PX
                const height  = Math.max(24, (durationMin / 60) * SLOT_PX)
                const c       = getProjectColor(t.project)
                const colW    = 100 / colCount
                const leftPct = colIdx * colW

                return (
                  <button
                    key={t.id}
                    onClick={() => onEdit(t.id)}
                    className="absolute rounded-lg px-3 py-2 transition hover:opacity-75 text-left shadow-sm"
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
                    {height > 36 && (
                      <p className="text-xs mt-0.5" style={{ color: c.text, opacity: 0.75 }}>
                        {formatTime(t.start_time)} – {formatTime(t.end_time)} · {formatDuration(t.duration_minutes)}
                      </p>
                    )}
                    {height > 56 && t.description && (
                      <p className="text-xs mt-1 truncate" style={{ color: c.text, opacity: 0.6 }}>{t.description}</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick-create popover */}
      {popover && (
        <QuickCreatePopover
          date={isoDate(currentDate)}
          startTime={popover.startTime}
          anchorRect={popover.anchorRect}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onMoreOptions={onMoreOptions ?? (() => { handleClose(); onNew() })}
        />
      )}
    </>
  )
}
