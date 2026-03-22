'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { View } from './ViewSwitcher'
import { periodLabel, formatDuration } from '@/lib/utils/time'

interface PeriodNavigatorProps {
  view: View
  currentDate: Date
  totalMinutes: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export default function PeriodNavigator({
  view,
  currentDate,
  totalMinutes,
  onPrev,
  onNext,
  onToday,
}: PeriodNavigatorProps) {
  const label = periodLabel(view, currentDate)

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="text-base font-semibold text-gray-700 min-w-[220px] text-center select-none">
          {label}
        </span>

        <button
          onClick={onNext}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <button
          onClick={onToday}
          className="ml-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#3B82F6] hover:text-[#3730A3] transition"
        >
          Hoje
        </button>
      </div>

      <div className="text-sm font-medium text-gray-500">
        Total:{' '}
        <span className="text-[#3730A3] font-bold text-base">
          {formatDuration(totalMinutes)}
        </span>
      </div>
    </div>
  )
}
