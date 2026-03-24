'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Timesheet } from '@/lib/types/database.types'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import TimesheetForm from './TimesheetForm'

export type DrawerState =
  | { open: false }
  | { open: true; mode: 'create'; defaultDate?: string }
  | { open: true; mode: 'edit'; timesheetId: string }

interface TimesheetDrawerProps {
  state: DrawerState
  onClose: () => void
  onSuccess: () => void
}

export default function TimesheetDrawer({ state, onClose, onSuccess }: TimesheetDrawerProps) {
  const [timesheet, setTimesheet]   = useState<Timesheet | undefined>(undefined)
  const [fetching, setFetching]     = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // M-2: depend only on the id, not the entire state object reference
  const editId = state.open && state.mode === 'edit' ? state.timesheetId : null

  useEffect(() => {
    if (!editId) {
      setTimesheet(undefined)
      setFetchError(null)
      return
    }

    let cancelled = false
    setFetching(true)
    setFetchError(null)

    createClient()
      .from('timesheets')
      .select('*')
      .eq('id', editId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        setFetching(false)
        if (error || !data) {
          // C-3: surface the error instead of silently showing blank form
          setFetchError('Não foi possível carregar o apontamento. Tente novamente.')
          return
        }
        setTimesheet(data as unknown as Timesheet)
      })

    return () => { cancelled = true }
  }, [editId])

  return (
    <Sheet open={state.open} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        {!state.open ? null : fetching ? (
          /* Loading skeleton */
          <div className="p-6 space-y-4">
            <SheetHeader>
              <SheetTitle>Carregando apontamento...</SheetTitle>
            </SheetHeader>
            <div className="space-y-3 mt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : fetchError ? (
          /* C-3: Error state */
          <div className="p-6 flex flex-col gap-4">
            <SheetHeader>
              <SheetTitle>Erro ao carregar</SheetTitle>
            </SheetHeader>
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {fetchError}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition"
              >
                Fechar
              </button>
              <button
                onClick={() => { setFetchError(null); setFetching(true) }}
                className="flex-1 rounded-md bg-[#3730A3] px-4 py-2 text-sm font-medium text-white hover:bg-[#312E81] transition"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <TimesheetForm
            mode={state.mode}
            defaultDate={state.mode === 'create' ? state.defaultDate : undefined}
            timesheet={state.mode === 'edit' ? timesheet : undefined}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
