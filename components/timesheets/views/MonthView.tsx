'use client'

import { useState, useCallback } from 'react'
import type { Timesheet } from '@/lib/types/database.types'
import { isoDate, isSameDay, addDays, startOfMonth, endOfMonth, formatDuration, getProjectColor } from '@/lib/utils/time'
import { Plus } from 'lucide-react'
import QuickCreatePopover from '../QuickCreatePopover'

interface MonthViewProps {
  timesheets: Timesheet[]
  currentDate: Date
  onNewForDate: (date: Date) => void
  onEdit: (id: string) => void
  onDayClick: (date: Date) => void
  onSuccess: () => void
  onMoreOptions?: (isoDate: string) => void
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface PopoverState {
  date: string
  anchorRect: DOMRect
}

export default function MonthView({ timesheets, currentDate, onNewForDate, onEdit, onDayClick, onSuccess, onMoreOptions }: MonthViewProps) {
  const today    = new Date()
  const firstDay = startOfMonth(currentDate)
  const lastDay  = endOfMonth(currentDate)

  const gridStart = addDays(firstDay, firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay())
  const gridEnd   = addDays(lastDay, lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay())

  const days: Date[] = []
  let d = new Date(gridStart)
  while (d <= gridEnd) { days.push(new Date(d)); d = addDays(d, 1) }

  const tsForDay = (day: Date) => timesheets.filter(t => t.date === isoDate(day))

  const [popover, setPopover] = useState<PopoverState | null>(null)

  const handleCellClick = useCallback((day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks on child buttons (timesheets, '+', 'mais')
    if ((e.target as HTMLElement).closest('button')) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const anchor = new DOMRect(rect.left, rect.bottom, rect.width, 0)
    setPopover({ date: isoDate(day), anchorRect: anchor })
  }, [])

  const handleClose   = useCallback(() => setPopover(null), [])
  const handleSuccess = useCallback(() => { setPopover(null); onSuccess() }, [onSuccess])

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEK_DAYS.map(w => (
            <div key={w} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {days.map((day, i) => {
            const dayTs             = tsForDay(day)
            const isCurrentMonth    = day.getMonth() === currentDate.getMonth()
            const isToday           = isSameDay(day, today)

            return (
              <div
                key={i}
                className={`min-h-[100px] p-1.5 border-b border-gray-100 flex flex-col gap-1 select-none ${!isCurrentMonth ? 'bg-gray-50/60' : 'cursor-pointer hover:bg-blue-50/30 transition-colors'}`}
                onClick={isCurrentMonth ? e => handleCellClick(day, e) : undefined}
                title={isCurrentMonth ? 'Clique para criar apontamento' : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#3730A3] text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                    {day.getDate()}
                  </span>
                  {isCurrentMonth && (
                    <button
                      onClick={() => onNewForDate(day)}
                      className="p-0.5 rounded text-gray-300 hover:text-[#3730A3] hover:bg-blue-50 transition"
                      title="Novo apontamento (formulário completo)"
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

      {/* Quick-create popover */}
      {popover && (
        <QuickCreatePopover
          date={popover.date}
          anchorRect={popover.anchorRect}
          onClose={handleClose}
          onSuccess={handleSuccess}
          onMoreOptions={onMoreOptions ?? ((d) => { handleClose(); onNewForDate(new Date(`${d}T12:00:00`)) })}
        />
      )}
    </>
  )
}
