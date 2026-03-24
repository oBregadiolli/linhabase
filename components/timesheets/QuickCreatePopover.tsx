'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Save, Loader2, X, Clock, ExternalLink, GripVertical } from 'lucide-react'
import WarningHourConflict from './WarningHourConflict'

interface QuickCreatePopoverProps {
  date: string
  startTime?: string
  anchorRect: DOMRect
  onClose: () => void
  onSuccess: () => void
  onMoreOptions: (date: string) => void
}

interface ConflictEntry {
  id: string
  project: string
  start_time: string
  end_time: string
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function addMinutes(t: string, min: number) {
  const total = timeToMinutes(t) + min
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const MIN_W = 280
const MIN_H = 200
const DEFAULT_W = 328

export default function QuickCreatePopover({
  date,
  startTime: initialStart = '09:00',
  anchorRect,
  onClose,
  onSuccess,
  onMoreOptions,
}: QuickCreatePopoverProps) {
  const [project, setProject]         = useState('')
  const [startTime, setStartTime]     = useState(initialStart)
  const [endTime, setEndTime]         = useState(addMinutes(initialStart, 60))
  const [description, setDescription] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [conflict, setConflict]       = useState<ConflictEntry | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)
  const projectRef = useRef<HTMLInputElement>(null)

  // Track current position/size in refs — NO React state during drag/resize
  const posRef  = useRef({ x: 0, y: 0 })
  const sizeRef = useRef({ w: DEFAULT_W, h: 0 })

  // Compute initial position once on mount
  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cx = anchorRect.left + anchorRect.width / 2
    const x  = Math.min(Math.max(cx - DEFAULT_W / 2, 12), vw - DEFAULT_W - 12)
    const h  = popoverRef.current?.offsetHeight ?? 380
    const tryY = anchorRect.bottom + 8
    const y    = tryY + h > vh - 12 ? anchorRect.top - h - 8 : tryY

    posRef.current  = { x, y }
    sizeRef.current = { w: DEFAULT_W, h }
    applyStyle()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Write pos/size directly to DOM — zero React re-renders
  function applyStyle() {
    const el = popoverRef.current
    if (!el) return
    el.style.left   = `${posRef.current.x}px`
    el.style.top    = `${posRef.current.y}px`
    el.style.width  = `${sizeRef.current.w}px`
    el.style.height = sizeRef.current.h > 0 ? `${sizeRef.current.h}px` : ''
  }

  // Focus on mount
  useEffect(() => { setTimeout(() => projectRef.current?.focus(), 60) }, [])

  // Close on outside click or Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  // ── Drag ─────────────────────────────────────────────────────────────────
  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const origX  = posRef.current.x
    const origY  = posRef.current.y

    function onMove(ev: MouseEvent) {
      posRef.current.x = origX + ev.clientX - startX
      posRef.current.y = origY + ev.clientY - startY
      applyStyle()
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  function startResize(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const origW  = sizeRef.current.w
    const origH  = popoverRef.current?.offsetHeight ?? 380

    function onMove(ev: MouseEvent) {
      sizeRef.current.w = Math.max(MIN_W, origW + ev.clientX - startX)
      sizeRef.current.h = Math.max(MIN_H, origH + ev.clientY - startY)
      applyStyle()
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleStartChange(v: string) { setStartTime(v); setEndTime(addMinutes(v, 60)); setConflict(null); setError(null) }
  function handleEndChange(v: string)   { setEndTime(v); setConflict(null); setError(null) }

  async function checkOverlap(): Promise<ConflictEntry | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('timesheets').select('id, project, start_time, end_time')
      .eq('user_id', user.id).eq('date', date)
      .lt('start_time', endTime + ':00').gt('end_time', startTime + ':00').limit(1)
    if (data && data.length > 0) {
      const h = data[0]
      return { id: h.id, project: h.project, start_time: h.start_time, end_time: h.end_time }
    }
    return null
  }

  const handleSave = useCallback(async () => {
    if (!project.trim()) { setError('Projeto obrigatório'); return }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) { setError('Hora fim deve ser após o início'); return }

    setLoading(true); setError(null); setConflict(null)
    const hit = await checkOverlap()
    if (hit) { setConflict(hit); setLoading(false); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { onClose(); return }

    const { error: err } = await supabase.from('timesheets').insert({
      user_id: user.id, date, start_time: startTime, end_time: endTime,
      project: project.trim(), description: description.trim() || null, status: 'draft' as const,
    })
    if (err) { setError(err.message); setLoading(false); return }
    onSuccess()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, startTime, endTime, description, date, onSuccess, onClose])

  function handleMoreOptions() { onClose(); onMoreOptions(date) }
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }

  const popover = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Novo apontamento rápido"
      // Initial style — overwritten immediately by applyStyle() in useEffect
      style={{ position: 'fixed', top: -9999, left: -9999, width: DEFAULT_W, zIndex: 9999 }}
      className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* ── Drag handle / Header ─────────────────────────────────── */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-gray-100 cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-sm font-semibold text-gray-800">Novo Apontamento</span>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>

        <input
          ref={projectRef}
          value={project}
          onChange={e => { setProject(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          placeholder="Nome do projeto"
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm placeholder-gray-400 outline-none transition',
            'focus:border-[#3730A3] focus:ring-2 focus:ring-[#3730A3]/20',
            error === 'Projeto obrigatório' ? 'border-red-400' : 'border-gray-200',
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          {(['Início', 'Fim'] as const).map((label, i) => (
            <div key={label} className="space-y-1">
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</label>
              <input
                type="time"
                value={i === 0 ? startTime : endTime}
                onChange={e => i === 0 ? handleStartChange(e.target.value) : handleEndChange(e.target.value)}
                className={cn(
                  'w-full rounded-lg border px-2 py-1.5 text-sm outline-none transition',
                  'focus:border-[#3730A3] focus:ring-2 focus:ring-[#3730A3]/20',
                  conflict ? 'border-amber-400' : 'border-gray-200',
                )}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            Descrição <span className="normal-case">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="O que foi feito?"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 outline-none transition focus:border-[#3730A3] focus:ring-2 focus:ring-[#3730A3]/20"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {conflict && (
          <WarningHourConflict
            project={conflict.project}
            startTime={conflict.start_time}
            endTime={conflict.end_time}
            compact
          />
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pb-3 pt-2 gap-2 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={handleMoreOptions}
          className="inline-flex items-center gap-1 text-xs text-[#3730A3] font-medium hover:underline"
          title="Abrir formulário completo (suporta substituição de conflitos)"
        >
          <ExternalLink className="h-3 w-3" />
          Mais opções
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !!conflict}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition',
            'bg-[#3730A3] hover:bg-[#312E81] disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* ── Resize handle (bottom-right) ─────────────────────────── */}
      <div
        onMouseDown={startResize}
        className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-25 hover:opacity-60 transition-opacity"
        title="Redimensionar"
      >
        {/* SVG grip dots */}
        <svg viewBox="0 0 16 16" fill="currentColor" className="text-gray-500 w-full h-full">
          <circle cx="14" cy="14" r="1.5"/>
          <circle cx="9"  cy="14" r="1.5"/>
          <circle cx="14" cy="9"  r="1.5"/>
          <circle cx="4"  cy="14" r="1.5"/>
          <circle cx="9"  cy="9"  r="1.5"/>
          <circle cx="14" cy="4"  r="1.5"/>
        </svg>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(popover, document.body)
}
