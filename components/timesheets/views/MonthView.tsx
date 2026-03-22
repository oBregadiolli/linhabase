'use client'

import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, isSameDay, addDays, startOfMonth, endOfMonth, formatDuration, getProjectColor } from '@/lib/utils/time'
import { Plus } from 'lucide-react'

interface MonthViewProps {
  timesheets: Timesheet[]
  currentDate: Date
  onNewForDate: (date: Date) => void
  onEdit: (id: string) => void
  onDayClick: (date: Date) => void
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function MonthView({ timesheets, currentDate, onNewForDate, onEdit, onDayClick }: MonthViewProps) {
  const today    = new Date()
  const firstDay = startOfMonth(currentDate)
  const lastDay  = endOfMonth(currentDate)

  const gridStart = addDays(firstDay, firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay())
  const gridEnd   = addDays(lastDay, lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay())

  const days: Date[] = []
  let d = new Date(gridStart)
  while (d <= gridEnd) { days.push(new Date(d)); d = addDays(d, 1) }

  const tsForDay = (day: Date) => timesheets.filter(t => t.date === isoDate(day))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS.map(w => (
          <div key={w} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day, i) => {
          const dayTs = tsForDay(day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday        = isSameDay(day, today)

          return (
            <div key={i} className={`min-h-[100px] p-1.5 border-b border-gray-100 flex flex-col gap-1 ${!isCurrentMonth ? 'bg-gray-50/60' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#3730A3] text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                  {day.getDate()}
                </span>
                {isCurrentMonth && (
                  <button
                    onClick={() => onNewForDate(day)}
                    className="p-0.5 rounded text-gray-300 hover:text-[#3730A3] hover:bg-blue-50 transition"
                    title="Novo apontamento"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTs.slice(0, 3).map(t => {
                  const c = getProjectColor(t.project)
                  return (
                    <button
                      key={t.id}
                      onClick={() => onEdit(t.id)}
                      className="block w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate transition opacity-90 hover:opacity-100"
                      style={{ backgroundColor: c.bg, color: c.text, borderLeft: `3px solid ${c.border}` }}
                    >
                      {t.project}
                    </button>
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
