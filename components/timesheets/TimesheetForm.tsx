'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Timesheet } from '@/lib/types/database.types'
import { formatDuration } from '@/lib/utils/time'
import {
  Calendar, Clock, Briefcase, AlignLeft,
  Save, Trash2, Loader2, Timer, X
} from 'lucide-react'

interface TimesheetFormProps {
  mode: 'create' | 'edit'
  defaultDate?: string
  timesheet?: Timesheet
  onSuccess: () => void
  onClose: () => void
}

function timeToMinutes(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function TimesheetForm({ mode, defaultDate, timesheet, onSuccess, onClose }: TimesheetFormProps) {
  const [date, setDate]               = useState(timesheet?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime]     = useState(timesheet?.start_time.slice(0, 5) ?? '09:00')
  const [endTime, setEndTime]         = useState(timesheet?.end_time.slice(0, 5) ?? '18:00')
  const [project, setProject]         = useState(timesheet?.project ?? '')
  const [description, setDescription] = useState(timesheet?.description ?? '')
  const [status, setStatus]           = useState<string>(timesheet?.status ?? 'draft')
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const startMin    = timeToMinutes(startTime)
  const endMin      = timeToMinutes(endTime)
  const durationMin = endMin > startMin ? endMin - startMin : null

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!date)              e.date      = 'Data é obrigatória'
    if (!startTime)         e.startTime = 'Hora de início é obrigatória'
    if (!endTime)           e.endTime   = 'Hora de fim é obrigatória'
    if (endMin <= startMin) e.endTime   = 'Hora fim deve ser após o início'
    if (!project.trim())    e.project   = 'Projeto é obrigatório'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const supabase = createClient()

    if (mode === 'create') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { onClose(); return }
      const { error } = await supabase.from('timesheets').insert({
        user_id: user.id,
        date,
        start_time: startTime,
        end_time: endTime,
        project: project.trim(),
        description: description.trim() || null,
        status: 'draft' as const,
      })
      if (error) { setErrors({ server: error.message }); setLoading(false); return }
    } else {
      const { error } = await supabase.from('timesheets').update({
        date,
        start_time: startTime,
        end_time: endTime,
        project: project.trim(),
        description: description.trim() || null,
        status: status as 'draft' | 'submitted' | 'approved',
      }).eq('id', timesheet!.id)
      if (error) { setErrors({ server: error.message }); setLoading(false); return }
    }

    onSuccess()
  }

  async function handleDeleteConfirmed() {
    if (!timesheet) return
    setDeleting(true)
    setShowDeleteConfirm(false)
    const supabase = createClient()
    await supabase.from('timesheets').delete().eq('id', timesheet.id)
    onSuccess()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {mode === 'create' ? 'Novo Apontamento' : 'Editar Apontamento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {errors.server && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {errors.server}
            </div>
          )}

          {/* Row: Date + Status */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data" error={errors.date}>
              <FieldWrap>
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={inp(!!errors.date)}
                />
              </FieldWrap>
            </Field>

            <Field label="Status">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-8 text-sm text-gray-800 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
              >
                <option value="draft">Rascunho</option>
                <option value="submitted">Enviado</option>
                <option value="approved">Aprovado</option>
              </select>
            </Field>
          </div>

          {/* Row: Start + End + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Início" error={errors.startTime}>
              <FieldWrap>
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={inp(!!errors.startTime)}
                />
              </FieldWrap>
            </Field>

            <Field label="Fim" error={errors.endTime}>
              <FieldWrap>
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className={inp(!!errors.endTime)}
                />
              </FieldWrap>
            </Field>

            <Field label="Duração">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 h-full">
                <Timer className="h-4 w-4 text-gray-400 shrink-0" />
                <span className={`text-sm font-bold ${durationMin !== null ? 'text-[#3730A3]' : 'text-gray-400'}`}>
                  {durationMin !== null ? formatDuration(durationMin) : '—'}
                </span>
              </div>
            </Field>
          </div>

          {/* Project */}
          <Field label="Projeto" error={errors.project}>
            <FieldWrap>
              <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="Nome do projeto"
                className={inp(!!errors.project)}
              />
            </FieldWrap>
          </Field>

          {/* Description */}
          <Field label="Descrição">
            <div className="flex items-start gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6] transition">
              <AlignLeft className="h-4 w-4 text-gray-400 mt-3 shrink-0" />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="O que foi feito? (opcional)"
                rows={4}
                className="w-full py-2.5 pr-1 text-sm text-gray-800 bg-transparent outline-none resize-none placeholder:text-gray-400"
              />
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3730A3] text-sm font-semibold text-white hover:bg-[#312E81] transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>

      {/* AlertDialog — confirmação de exclusão (padrão shadcn/ui) */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          {/* Overlay escuro */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />

          {/* Card do modal */}
          <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3
              id="delete-dialog-title"
              className="text-base font-semibold text-gray-900"
            >
              Excluir apontamento
            </h3>
            <p
              id="delete-dialog-desc"
              className="mt-2 text-sm text-gray-500 leading-relaxed"
            >
              Tem certeza que deseja excluir este apontamento? Esta ação não pode ser desfeita.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ──────────────────── helpers ──────────────────── */

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6] transition">
      {children}
    </div>
  )
}

function inp(hasError: boolean) {
  return `w-full py-2.5 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400${hasError ? ' placeholder:text-red-300' : ''}`
}
