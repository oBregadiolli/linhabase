'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ClipboardList, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userName: string
  userEmail?: string
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Apontamentos',
      href: '/dashboard',
      icon: ClipboardList,
      active: pathname.startsWith('/dashboard'),
    },
  ]

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]',
      )}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-14 px-4 border-b border-gray-200 overflow-hidden',
          collapsed ? 'justify-center' : 'justify-start gap-2',
        )}
      >
        <span className="h-7 w-7 rounded-lg bg-[#3730A3] flex items-center justify-center shrink-0">
          <ClipboardList className="h-4 w-4 text-white" />
        </span>
        {!collapsed && (
          <span className="text-base font-bold text-[#3730A3] whitespace-nowrap">LinhaBase</span>
        )}
      </div>

      {/* ── Collapse toggle ──────────────────────────── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-[52px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm text-gray-500 hover:text-[#3730A3] hover:border-[#3730A3] transition-colors duration-150"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* ── Nav items ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {/* Section label */}
        {!collapsed && (
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Principal
          </p>
        )}

        {navItems.map(({ label, href, icon: Icon, active }) => (
          <a
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150',
              active
                ? 'bg-[#EEF2FF] text-[#3730A3]'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-[#3730A3]' : 'text-gray-400')} />
            {!collapsed && <span className="truncate">{label}</span>}
          </a>
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-gray-100" />

        {/* Settings — placeholder */}
        {!collapsed && (
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Sistema
          </p>
        )}
        <button
          disabled
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium opacity-50 cursor-not-allowed',
            'text-gray-400',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Configurações (em breve)' : undefined}
        >
          <Settings className="h-4.5 w-4.5 shrink-0 text-gray-400" />
          {!collapsed && (
            <span className="truncate flex items-center gap-2">
              Configurações
              <span className="text-[10px] bg-gray-100 text-gray-400 rounded px-1.5 py-0.5 font-semibold tracking-wide">
                Em breve
              </span>
            </span>
          )}
        </button>
      </nav>

      {/* ── Profile card ──────────────────────────────── */}
      <div className={cn('border-t border-gray-200 p-3', collapsed ? 'flex justify-center' : '')}>
        {collapsed ? (
          /* Collapsed: just avatar */
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              title={`Sair (${userName})`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3730A3] text-white text-xs font-bold hover:opacity-80 transition-opacity"
            >
              {initials(userName)}
            </button>
          </form>
        ) : (
          /* Expanded: full card */
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#3730A3] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
              {userEmail && (
                <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
              )}
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                title="Sair"
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                aria-label="Sair da conta"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  )
}
