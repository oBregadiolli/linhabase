'use client'

import { useState, useCallback, useEffect, createContext, useContext } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

/* Types */

type ToastVariant = 'error' | 'warning' | 'success' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
  durationMs: number
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, durationMs?: number) => void
}

/* Context */

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

/* Provider + Renderer */

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'error', durationMs = 4000) => {
    const id = ++nextId
    setItems(prev => [...prev, { id, message, variant, durationMs }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 pointer-events-none">
        {items.map(item => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* Individual toast card */

const VARIANT_STYLES: Record<ToastVariant, {
  bg: string; border: string; icon: React.ReactNode; iconColor: string
}> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    icon: <XCircle className="h-5 w-5" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-500',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    icon: <Info className="h-5 w-5" />,
  },
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const v = VARIANT_STYLES[item.variant]

  // Enter animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(item.id), 300)
    }, item.durationMs)
    return () => clearTimeout(timer)
  }, [item.id, item.durationMs, onDismiss])

  const handleClose = () => {
    setExiting(true)
    setTimeout(() => onDismiss(item.id), 300)
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm max-w-sm
        ${v.bg} ${v.border}
        transition-all duration-300 ease-out
        ${visible && !exiting ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}
    >
      <span className={`shrink-0 mt-0.5 ${v.iconColor}`}>{v.icon}</span>
      <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{item.message}</p>
      <button
        onClick={handleClose}
        className="shrink-0 rounded-md p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
