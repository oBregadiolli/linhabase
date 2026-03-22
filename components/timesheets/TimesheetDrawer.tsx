'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Timesheet } from '@/lib/types/database.types'
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
  const [timesheet, setTimesheet] = useState<Timesheet | undefined>(undefined)
  const [fetching, setFetching] = useState(false)

  // When opened in edit mode, fetch the timesheet
  useEffect(() => {
    if (!state.open || state.mode !== 'edit') {
      setTimesheet(undefined)
      return
    }
    setFetching(true)
    const supabase = createClient()
    supabase
      .from('timesheets')
      .select('*')
      .eq('id', state.timesheetId)
      .single()
      .then(({ data }) => {
        setTimesheet((data as unknown as Timesheet | null) ?? undefined)
        setFetching(false)
      })
  }, [state])

  const isOpen = state.open

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={[
          'fixed top-0 right-0 z-50 h-screen w-full max-w-lg bg-white shadow-2xl',
          'transform transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {!state.open ? null : fetching ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="h-6 w-6 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
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
      </div>
    </>
  )
}
