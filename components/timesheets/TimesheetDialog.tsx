'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Timesheet, Project } from '@/lib/types/database.types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import TimesheetForm from './TimesheetForm'

export type DialogState =
  | { open: false }
  | { open: true; mode: 'create'; defaultDate?: string; defaultStartTime?: string }
  | { open: true; mode: 'edit'; timesheetId: string }

interface TimesheetDialogProps {
  state: DialogState
  onClose: () => void
  onSuccess: () => void
}

export default function TimesheetDialog({ state, onClose, onSuccess }: TimesheetDialogProps) {
  const [timesheet, setTimesheet]   = useState<Timesheet | undefined>(undefined)
  const [fetching, setFetching]     = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [projects, setProjects]     = useState<Project[]>([])
  const [companyId, setCompanyId]   = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const editId = state.open && state.mode === 'edit' ? state.timesheetId : null

  // Load user's company projects (once per dialog open)
  useEffect(() => {
    if (!state.open) return
    let cancelled = false

    async function loadProjects() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      // Get user's active company membership
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (!membership || cancelled) return

      // Fetch all projects for the company (active + inactive for edit scenarios)
      const { data: projectList } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', membership.company_id)
        .order('name', { ascending: true })

      if (!cancelled && projectList) {
        setProjects(projectList as Project[])
        setCompanyId(membership.company_id)
      }
    }

    loadProjects()
    return () => { cancelled = true }
  }, [state.open, supabase])

  useEffect(() => {
    if (!editId) {
      setTimesheet(undefined)
      setFetchError(null)
      return
    }

    let cancelled = false
    setFetching(true)
    setFetchError(null)

    supabase
      .from('timesheets')
      .select('*')
      .eq('id', editId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        setFetching(false)
        if (error || !data) {
          setFetchError('Não foi possível carregar o apontamento. Tente novamente.')
          return
        }
        setTimesheet(data as unknown as Timesheet)
      })

    return () => { cancelled = true }
  }, [editId, supabase])

  return (
    <Dialog open={state.open} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {!state.open ? null : fetching ? (
          /* Loading skeleton */
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle>Carregando apontamento...</DialogTitle>
              <DialogDescription className="sr-only">
                Aguarde enquanto o apontamento é carregado
              </DialogDescription>
            </DialogHeader>
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
          /* Error state */
          <div className="p-6 flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Erro ao carregar</DialogTitle>
              <DialogDescription className="sr-only">
                Ocorreu um erro ao carregar o apontamento
              </DialogDescription>
            </DialogHeader>
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
            defaultStartTime={state.mode === 'create' ? state.defaultStartTime : undefined}
            timesheet={state.mode === 'edit' ? timesheet : undefined}
            projects={projects}
            companyId={companyId}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
