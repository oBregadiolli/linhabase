'use client'

import { LayoutList, CalendarDays, CalendarRange, Calendar } from 'lucide-react'

export type View = 'table' | 'month' | 'week' | 'day'

interface ViewSwitcherProps {
  view: View
  onViewChange: (v: View) => void
}

const VIEWS: { key: View; label: string; Icon: React.ElementType }[] = [
  { key: 'table',  label: 'Tabela',  Icon: LayoutList },
  { key: 'month',  label: 'Mês',     Icon: CalendarDays },
  { key: 'week',   label: 'Semana',  Icon: CalendarRange },
  { key: 'day',    label: 'Dia',     Icon: Calendar },
]

export default function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
      {VIEWS.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 select-none',
            view === key
              ? 'bg-white text-[#3730A3] shadow-sm active:bg-indigo-50 active:scale-[0.97]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/60 active:bg-gray-200 active:scale-[0.97]',
          ].join(' ')}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
