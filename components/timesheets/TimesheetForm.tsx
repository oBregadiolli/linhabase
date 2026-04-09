"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Timesheet, Project } from "@/lib/types/database.types";
import { formatDuration, statusLabel } from "@/lib/utils/time";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Trash2, Loader2, Timer, Clock, SendHorizonal } from "lucide-react";
import WarningHourConflict from "./WarningHourConflict";

interface TimesheetFormProps {
  mode: "create" | "edit";
  defaultDate?: string;
  defaultStartTime?: string;
  timesheet?: Timesheet;
  projects?: Project[];
  companyId?: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

interface ConflictEntry {
  id: string;
  project_id: string | null;
  start_time: string;
  end_time: string;
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmtTime(t: string) {
  return t.slice(0, 5);
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addMinutesToTime(t: string, min: number): string {
  const total = timeToMinutes(t) + min;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-400',
    submitted: 'bg-amber-500',
    approved: 'bg-emerald-500',
  }
  return <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', colors[status] ?? 'bg-gray-400')} />
}

export default function TimesheetForm({
  mode,
  defaultDate,
  defaultStartTime,
  timesheet,
  projects = [],
  companyId,
  onSuccess,
  onClose,
}: TimesheetFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(timesheet?.date ?? defaultDate ?? today);
  const initialStart = timesheet?.start_time.slice(0, 5) ?? defaultStartTime ?? "09:00";
  const initialEnd = timesheet?.end_time.slice(0, 5) ?? (defaultStartTime ? addMinutesToTime(defaultStartTime, 60) : "18:00");
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  // ── Project selection (hybrid: project_id + project text) ──────────────
  // If timesheet already has project_id, use it. Otherwise start empty.
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    timesheet?.project_id ?? ""
  );
  // Fallback text for companies without registered projects (free-text input)
  const [projectText, setProjectText] = useState(
    timesheet?.project_id
      ? (projects.find(p => p.id === timesheet.project_id)?.name ?? '')
      : ''
  );

  // Build visible options: active projects + current project if inactive
  const visibleProjects = (() => {
    const active = projects.filter(p => p.active);
    // In edit mode, if current project is inactive, include it so user sees it
    if (mode === "edit" && selectedProjectId) {
      const currentProject = projects.find(p => p.id === selectedProjectId);
      if (currentProject && !currentProject.active) {
        return [currentProject, ...active];
      }
    }
    return active;
  })();

  const hasProjects = projects.length > 0;

  // Derive display name from selected project
  function getSelectedProjectName(): string {
    if (selectedProjectId) {
      const p = projects.find(p => p.id === selectedProjectId);
      if (p) return p.name;
    }
    return projectText;
  }
  const [description, setDescription] = useState(timesheet?.description ?? "");
  const status: "draft" | "submitted" | "approved" =
    (timesheet?.status as "draft" | "submitted" | "approved") ?? "draft";

  // Lock: submitted/approved timesheets cannot be edited by the user
  const isLocked = mode === "edit" && status === "approved";
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [conflict, setConflict] = useState<ConflictEntry | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const durationMin = endMin > startMin ? endMin - startMin : null;

  // Clear conflict whenever the user changes the period fields
  function handleDateChange(v: string) {
    setDate(v);
    setConflict(null);
  }
  function handleStartChange(v: string) {
    setStartTime(v);
    setConflict(null);
  }
  function handleEndChange(v: string) {
    setEndTime(v);
    setConflict(null);
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!date) e.date = "Data obrigatória";
    if (!startTime) e.startTime = "Hora de início obrigatória";
    if (!endTime) e.endTime = "Hora de fim obrigatória";
    if (endMin <= startMin) e.endTime = "Hora fim deve ser após o início";
    // If company has projects, require selection; otherwise require text
    if (hasProjects && !selectedProjectId) e.project = "Selecione um projeto";
    if (!hasProjects && !projectText.trim()) e.project = "Projeto obrigatório";
    return e;
  }

  async function checkOverlap(): Promise<ConflictEntry | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Postgres overlap: existing.start < new.end  AND  existing.end > new.start
    let query = supabase
      .from("timesheets")
      .select("id, project_id, start_time, end_time")
      .eq("user_id", user.id)
      .eq("date", date)
      .lt("start_time", endTime + ":00") // existing starts before new ends
      .gt("end_time", startTime + ":00") // existing ends   after  new starts
      .limit(1);

    // In edit mode, exclude the record itself so it doesn't conflict with itself
    if (mode === "edit" && timesheet?.id) {
      query = query.neq("id", timesheet.id);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      const hit = data[0];
      return {
        id: hit.id,
        project_id: hit.project_id,
        start_time: hit.start_time,
        end_time: hit.end_time,
      };
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setLoading(true);
    setConflict(null);

    // ── Collision check ──────────────────────────────────────────────────
    const hit = await checkOverlap();
    if (hit) {
      setConflict(hit);
      setLoading(false);
      setSubmitting(false);
      return;
    }
    // ────────────────────────────────────────────────────────────────────

    const supabase = createClient();

    if (mode === "create") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onClose();
        return;
      }
      const projectName = getSelectedProjectName();
      const { error } = await supabase.from("timesheets").insert({
        user_id: user.id,
        date,
        start_time: startTime,
        end_time: endTime,
        project_id: selectedProjectId || null,
        description: description.trim() || null,
        status: submitting ? 'submitted' : 'draft',
        company_id: companyId || null,
      });
      if (error) {
        setErrors({ server: error.message });
        setLoading(false);
        setSubmitting(false);
        return;
      }
    } else {
      const projectName = getSelectedProjectName();
      const { error } = await supabase
        .from("timesheets")
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          project_id: selectedProjectId || null,
          description: description.trim() || null,
          rejection_reason: null,
        })
        .eq("id", timesheet!.id);
      if (error) {
        setErrors({ server: error.message });
        setLoading(false);
        setSubmitting(false);
        return;
      }
    }

    onSuccess();
  }

  async function handleDelete() {
    if (!timesheet) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("timesheets").delete().eq("id", timesheet.id);
    onSuccess();
  }

  // Delete the conflicting record, then save the current form data
  async function handleReplaceConfirm() {
    if (!conflict) return;
    setReplacing(true);
    setShowReplaceConfirm(false);
    const supabase = createClient();

    // 1. Delete the conflicting entry
    const { error: delErr } = await supabase
      .from("timesheets")
      .delete()
      .eq("id", conflict.id);
    if (delErr) {
      setErrors({ server: delErr.message });
      setReplacing(false);
      return;
    }

    // 2. Save current form (same logic as handleSubmit without collision check)
    if (mode === "create") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { onClose(); return; }
      const projectName = getSelectedProjectName();
      const { error } = await supabase.from("timesheets").insert({
        user_id: user.id,
        date, start_time: startTime, end_time: endTime,
        project_id: selectedProjectId || null,
        description: description.trim() || null,
        status: "draft" as const,
        company_id: companyId || null,
      });
      if (error) { setErrors({ server: error.message }); setReplacing(false); return; }
    } else {
      const projectName = getSelectedProjectName();
      const { error } = await supabase
        .from("timesheets")
        .update({
          date, start_time: startTime, end_time: endTime,
          project_id: selectedProjectId || null,
          description: description.trim() || null,
          status,
        })
        .eq("id", timesheet!.id);
      if (error) { setErrors({ server: error.message }); setReplacing(false); return; }
    }

    onSuccess();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {mode === "create" ? "Novo Apontamento" : "Editar Apontamento"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {mode === "create"
                ? "Registre as horas trabalhadas"
                : "Atualize os dados do apontamento"}
            </p>
          </DialogHeader>
        </div>

        <Separator />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {errors.server && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {errors.server}
            </div>
          )}

          {/* ── Conflict banner ─────────────────────────────────────────── */}
          {conflict && (
            <WarningHourConflict
              project={conflict.project_id ? (projects.find(p => p.id === conflict.project_id)?.name ?? 'Sem projeto') : 'Sem projeto'}
              startTime={conflict.start_time}
              endTime={conflict.end_time}
              onReplace={() => setShowReplaceConfirm(true)}
            />
          )}
          {/* ────────────────────────────────────────────────────────────── */}

          {/* Rejection banner (shown when a draft was previously rejected) */}
          {mode === "edit" && status === "draft" && timesheet?.rejection_reason && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm">
              <p className="font-medium text-red-700">Apontamento devolvido pelo administrador</p>
              <p className="text-red-600 mt-1">{timesheet.rejection_reason}</p>
            </div>
          )}

          {/* Locked banner */}
          {isLocked && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              {status === "submitted"
                ? "Este apontamento foi enviado para aprovação e não pode ser editado."
                : "Este apontamento já foi aprovado e não pode ser editado."}
            </div>
          )}

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="ts-date"
                className={errors.date ? "text-destructive" : ""}
              >
                Data
              </Label>
              <Input
                id="ts-date"
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className={cn(errors.date && "border-destructive")}
                disabled={isLocked}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex items-center h-8 rounded-lg border border-input bg-muted/40 px-3 text-sm">
                <StatusDot status={status} />
                <span className="font-medium ml-2">{statusLabel(status)}</span>
              </div>
            </div>
          </div>

          {/* Start + End + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="ts-start"
                className={errors.startTime ? "text-destructive" : ""}
              >
                Início
              </Label>
              <Input
                id="ts-start"
                type="time"
                value={startTime}
                onChange={(e) => handleStartChange(e.target.value)}
                disabled={isLocked}
                className={cn(
                  errors.startTime && "border-destructive",
                  conflict && "border-amber-400 focus-visible:ring-amber-400",
                )}
              />
              {errors.startTime && (
                <p className="text-xs text-destructive">{errors.startTime}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="ts-end"
                className={errors.endTime ? "text-destructive" : ""}
              >
                Fim
              </Label>
              <Input
                id="ts-end"
                type="time"
                value={endTime}
                onChange={(e) => handleEndChange(e.target.value)}
                disabled={isLocked}
                className={cn(
                  errors.endTime && "border-destructive",
                  conflict && "border-amber-400 focus-visible:ring-amber-400",
                )}
              />
              {errors.endTime && (
                <p className="text-xs text-destructive">{errors.endTime}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Duração</Label>
              <div className="flex items-center gap-2 h-8 rounded-lg border border-input bg-muted/40 px-3 text-sm">
                <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    durationMin !== null
                      ? "text-[#3730A3]"
                      : "text-muted-foreground",
                  )}
                >
                  {durationMin !== null ? formatDuration(durationMin) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ts-project"
              className={errors.project ? "text-destructive" : ""}
            >
              Projeto
            </Label>
            {hasProjects ? (
              /* ── Structured select (company has projects) ── */
              <Select
                value={selectedProjectId}
                onValueChange={(v) => {
                  if (v) {
                    setSelectedProjectId(v);
                    const p = projects.find(p => p.id === v);
                    if (p) setProjectText(p.name);
                  }
                }}
              >
                <SelectTrigger
                  id="ts-project"
                  className={cn(
                    "w-full",
                    errors.project && "border-destructive",
                  )}
                >
                  <SelectValue placeholder="Selecione um projeto">
                    {selectedProjectId ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: projects.find(p => p.id === selectedProjectId)?.color || '#94a3b8' }}
                        />
                        {getSelectedProjectName()}
                        {projects.find(p => p.id === selectedProjectId)?.active === false && (
                          <span className="text-[10px] text-gray-400 ml-1">(inativo)</span>
                        )}
                      </span>
                    ) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {visibleProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color || '#94a3b8' }}
                        />
                        {p.name}
                        {!p.active && (
                          <span className="text-[10px] text-gray-400 ml-1">(inativo)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              /* ── Empty state: user has no company/projects ── */
              <div className="space-y-2">
                <Select disabled>
                  <SelectTrigger
                    id="ts-project"
                    className="w-full opacity-60 cursor-not-allowed"
                  >
                    <SelectValue placeholder="Nenhum projeto disponível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty" disabled>Nenhum projeto</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Você precisa pertencer a uma empresa com projetos cadastrados para registrar apontamentos.
                </p>
              </div>
            )}
            {errors.project && (
              <p className="text-xs text-destructive">{errors.project}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ts-desc" className="text-muted-foreground">
              Descrição <span className="text-xs">(opcional)</span>
            </Label>
            <Textarea
              id="ts-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que foi feito?"
              rows={4}
              className="resize-none"
              disabled={isLocked}
            />
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 flex flex-col gap-3">
          {/* Audit timestamps – only in edit mode */}
          {mode === "edit" && timesheet && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground border-b border-border pb-3">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>Criado em {fmtTimestamp(timesheet.created_at)}</span>
              </span>
              {timesheet.updated_at !== timesheet.created_at && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>Atualizado em {fmtTimestamp(timesheet.updated_at)}</span>
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
          {mode === "edit" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-1.5">Excluir</span>
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {isLocked ? "Fechar" : "Cancelar"}
            </Button>
            {!isLocked && (
              <Button
                type="submit"
                size="sm"
                disabled={loading || replacing || !!conflict || !hasProjects || (hasProjects && !selectedProjectId)}
                className="bg-[#1D4ED8] hover:bg-[#1e40af] text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
                <span className="ml-1.5">
                  {replacing ? "Substituindo..." : loading ? "Enviando..." : "Salvar e Enviar"}
                </span>
              </Button>
            )}
          </div>
        </div>
        </div>
      </form>

      {/* Delete confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir apontamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace / overwrite confirmation */}
      <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir apontamento existente?</AlertDialogTitle>
            <AlertDialogDescription>
              O apontamento abaixo será excluído permanentemente e substituído pelo novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 py-2 space-y-3 text-sm">
            <div className="rounded-md border bg-muted/50 px-3 py-2 font-medium">
              &ldquo;{conflict?.project_id ? (projects.find(p => p.id === conflict.project_id)?.name ?? 'Sem projeto') : 'Sem projeto'}&rdquo; &mdash;{" "}
              {conflict ? fmtTime(conflict.start_time) : ""} às{" "}
              {conflict ? fmtTime(conflict.end_time) : ""}
            </div>
            <p className="text-muted-foreground text-xs">Esta ação não pode ser desfeita.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReplaceConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir e substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
