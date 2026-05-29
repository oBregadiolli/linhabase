'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { FolderOpen, Search, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types/database.types'

// ── Props ────────────────────────────────────────────────────────
interface ProjectSearchComboboxProps {
  projects: Project[]
  value: string // selected project ID
  onChange: (projectId: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean // shows red border
  className?: string
}

// ── Highlight helper ─────────────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ── Color dot ────────────────────────────────────────────────────
function ColorDot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? '#94a3b8' }}
      aria-hidden="true"
    />
  )
}

// ── Component ────────────────────────────────────────────────────
export default function ProjectSearchCombobox({
  projects,
  value,
  onChange,
  placeholder = 'Selecionar projeto…',
  disabled = false,
  error = false,
  className,
}: ProjectSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // ── Selected project ─────────────────────────────────────────
  const selected = useMemo(
    () => projects.find((p) => p.id === value) ?? null,
    [projects, value],
  )

  // ── Filtered list ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (!query) return p.active
      const q = query.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q)
      )
    })
  }, [projects, query])

  // ── Reset activeIndex on filter change ───────────────────────
  useEffect(() => {
    setActiveIndex(0)
  }, [filtered.length])

  // ── Click-outside to close ───────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // ── Scroll active item into view ─────────────────────────────
  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.children[activeIndex] as HTMLElement | undefined
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  // ── Open dropdown ────────────────────────────────────────────
  const openDropdown = useCallback(() => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
    // Focus the search input after DOM updates
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [disabled])

  // ── Select handler ───────────────────────────────────────────
  const handleSelect = useCallback(
    (projectId: string) => {
      onChange(projectId)
      setOpen(false)
      setQuery('')
    },
    [onChange],
  )

  // ── Keyboard navigation ──────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openDropdown()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filtered[activeIndex]) {
            handleSelect(filtered[activeIndex].id)
          }
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          setQuery('')
          break
      }
    },
    [open, filtered, activeIndex, handleSelect, openDropdown],
  )

  // ── Listbox ID for aria ──────────────────────────────────────
  const listboxId = 'project-combobox-listbox'
  const activeDescendant =
    open && filtered[activeIndex]
      ? `project-option-${filtered[activeIndex].id}`
      : undefined

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger ──────────────────────────────────────────── */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        disabled={disabled}
        onClick={() => (open ? (setOpen(false), setQuery('')) : openDropdown())}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border bg-white px-3 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20 focus:border-[#3730A3]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-200 hover:border-gray-300',
        )}
      >
        {selected ? (
          <>
            <ColorDot color={selected.color} />
            <span className="truncate text-gray-900">{selected.name}</span>
            <span className="ml-auto shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500">
              {selected.code}
            </span>
          </>
        ) : (
          <span className="truncate text-gray-400">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
            selected && 'ml-0',
          )}
        />
      </button>

      {/* ── Dropdown ─────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-150',
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0',
        )}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar projeto…"
            className="h-6 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            aria-label="Buscar projeto"
            tabIndex={open ? 0 : -1}
          />
        </div>

        {/* Options list */}
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="max-h-[240px] overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <li className="flex flex-col items-center gap-1.5 px-3 py-6 text-sm text-gray-400">
              <FolderOpen className="h-8 w-8 text-gray-300" />
              Nenhum projeto encontrado
            </li>
          ) : (
            filtered.map((project, idx) => {
              const isActive = idx === activeIndex
              const isSelected = project.id === value
              return (
                <li
                  key={project.id}
                  id={`project-option-${project.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(project.id)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-blue-50 text-[#1D4ED8]'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <ColorDot color={project.color} />
                  <span className="truncate">
                    <HighlightMatch text={project.name} query={query} />
                  </span>
                  <span
                    className={cn(
                      'ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-xs',
                      isActive
                        ? 'bg-blue-100 text-[#1D4ED8]'
                        : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    <HighlightMatch text={project.code} query={query} />
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-[#3730A3]" />
                  )}
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
