'use client'

import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, startOfWeek, addDays, isSameDay, formatTime, getProjectColor } from '@/lib/utils/time'
import { computeLayout } from '@/lib/utils/layout'

interface WeekViewProps {
  timesheets: Timesheet[]
  currentDate: Date
  onEdit: (id: string) => void
}

const START_HOUR = 6
const END_HOUR   = 22
const SLOT_PX    = 64
const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const GAP        = 2 // px between side-by-side blocks

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function WeekView({ timesheets, currentDate, onEdit }: WeekViewProps) {
  const today     = new Date()
  const weekStart = startOfWeek(currentDate)
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours     = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="py-3 border-r border-gray-100" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={i} className="py-3 text-center border-r border-gray-100 last:border-r-0">
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
        <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: `${(END_HOUR - START_HOUR) * SLOT_PX}px` }}>
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
            const dayTs  = timesheets.filter(t => t.date === isoDate(day))
            const blocks = computeLayout(dayTs)
            const isToday = isSameDay(day, today)

            return (
              <div key={di} className={`relative border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50/20' : ''}`}>
                {/* Hour lines */}
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t border-gray-100" style={{ top: `${(h - START_HOUR) * SLOT_PX}px` }} />
                ))}

                {/* Timesheet blocks */}
                {blocks.map(({ item: t, colIdx, colCount }) => {
                  const startMin    = timeToMinutes(t.start_time)
                  const endMin      = timeToMinutes(t.end_time)
                  const offsetMin   = Math.max(0, startMin - START_HOUR * 60)
                  const durationMin = Math.min(endMin, END_HOUR * 60) - Math.max(startMin, START_HOUR * 60)
                  if (durationMin <= 0) return null

                  const top       = (offsetMin / 60) * SLOT_PX
                  const height    = Math.max(20, (durationMin / 60) * SLOT_PX)
                  const c         = getProjectColor(t.project)
                  const colW      = 100 / colCount
                  const leftPct   = colIdx * colW

                  return (
                    <button
                      key={t.id}
                      onClick={() => onEdit(t.id)}
                      className="absolute rounded-md px-1.5 overflow-hidden text-xs font-medium transition hover:opacity-75 text-left"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left:  `calc(${leftPct}% + ${GAP}px)`,
                        width: `calc(${colW}% - ${GAP * 2}px)`,
                        backgroundColor: c.bg,
                        borderLeft: `3px solid ${c.border}`,
                        color: c.text,
                      }}
                    >
                      <div className="truncate font-semibold leading-tight mt-0.5">{t.project}</div>
                      {height > 32 && (
                        <div className="truncate opacity-70">{formatTime(t.start_time)}–{formatTime(t.end_time)}</div>
                      )}
                    </button>
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
