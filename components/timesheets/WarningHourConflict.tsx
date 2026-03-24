'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface WarningHourConflictProps {
  project: string
  startTime: string
  endTime: string
  /** Show the "Substituir" action strip (TimesheetForm). Omit for read-only display (QuickCreatePopover). */
  onReplace?: () => void
  /** Compact layout for use inside small popovers. */
  compact?: boolean
}

function fmtTime(t: string) { return t.slice(0, 5) }

export default function WarningHourConflict({
  project,
  startTime,
  endTime,
  onReplace,
  compact = false,
}: WarningHourConflictProps) {
  if (compact) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
        <div>
          <p className="font-semibold">Conflito de horário</p>
          <p className="text-amber-700 mt-0.5">
            &ldquo;{project}&rdquo; &mdash; {fmtTime(startTime)} às {fmtTime(endTime)}
          </p>
          {onReplace ? (
            <button
              type="button"
              onClick={onReplace}
              className="mt-1 inline-flex items-center gap-1 text-amber-800 font-medium hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Substituir
            </button>
          ) : (
            <p className="text-amber-600 mt-0.5">
              Ajuste o horário ou use o formulário completo para substituir.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Full variant (TimesheetForm)
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-800 overflow-hidden"
    >
      {/* Info row */}
      <div className="flex gap-3 px-4 pt-3 pb-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <div className="space-y-0.5 flex-1">
          <p className="font-semibold">Conflito de horário</p>
          <p className="text-amber-700">Já existe um apontamento neste período:</p>
          <p className="font-medium text-amber-900">
            &ldquo;{project}&rdquo; &mdash; {fmtTime(startTime)} às {fmtTime(endTime)}
          </p>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 border-t border-amber-200 px-4 py-2 bg-amber-100/60">
        <p className="text-xs text-amber-600 flex-1">
          Ajuste o horário ou substitua o apontamento existente.
        </p>
        {onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="h-7 px-2.5 text-xs text-amber-800 font-medium inline-flex items-center gap-1 rounded-md hover:bg-amber-200 hover:text-amber-900 transition shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Substituir
          </button>
        )}
      </div>
    </div>
  )
}
