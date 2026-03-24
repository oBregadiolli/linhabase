"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Timesheet } from "@/lib/types/database.types";
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
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Save, Trash2, Loader2, Timer } from "lucide-react";
import WarningHourConflict from "./WarningHourConflict";

interface TimesheetFormProps {
  mode: "create" | "edit";
  defaultDate?: string;
  timesheet?: Timesheet;
  onSuccess: () => void;
  onClose: () => void;
}

interface ConflictEntry {
  id: string;
  project: string;
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

export default function TimesheetForm({
  mode,
  defaultDate,
  timesheet,
  onSuccess,
  onClose,
}: TimesheetFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(timesheet?.date ?? defaultDate ?? today);
  const [startTime, setStartTime] = useState(
    timesheet?.start_time.slice(0, 5) ?? "09:00",
  );
  const [endTime, setEndTime] = useState(
    timesheet?.end_time.slice(0, 5) ?? "18:00",
  );
  const [project, setProject] = useState(timesheet?.project ?? "");
  const [description, setDescription] = useState(timesheet?.description ?? "");
  const [status, setStatus] = useState<"draft" | "submitted" | "approved">(
    (timesheet?.status as "draft" | "submitted" | "approved") ?? "draft",
  );

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
    if (!project.trim()) e.project = "Projeto obrigatório";
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
      .select("id, project, start_time, end_time")
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
        project: hit.project,
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

    setLoading(true);
    setConflict(null);

    // ── Collision check ──────────────────────────────────────────────────
    const hit = await checkOverlap();
    if (hit) {
      setConflict(hit);
      setLoading(false);
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
      const { error } = await supabase.from("timesheets").insert({
        user_id: user.id,
        date,
        start_time: startTime,
        end_time: endTime,
        project: project.trim(),
        description: description.trim() || null,
        status: "draft" as const,
      });
      if (error) {
        setErrors({ server: error.message });
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("timesheets")
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          project: project.trim(),
          description: description.trim() || null,
          status,
        })
        .eq("id", timesheet!.id);
      if (error) {
        setErrors({ server: error.message });
        setLoading(false);
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
      const { error } = await supabase.from("timesheets").insert({
        user_id: user.id,
        date, start_time: startTime, end_time: endTime,
        project: project.trim(),
        description: description.trim() || null,
        status: "draft" as const,
      });
      if (error) { setErrors({ server: error.message }); setReplacing(false); return; }
    } else {
      const { error } = await supabase
        .from("timesheets")
        .update({
          date, start_time: startTime, end_time: endTime,
          project: project.trim(),
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
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-5">
          <SheetHeader>
            <SheetTitle className="text-base font-bold text-foreground">
              {mode === "create" ? "Novo Apontamento" : "Editar Apontamento"}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {mode === "create"
                ? "Registre as horas trabalhadas"
                : "Atualize os dados do apontamento"}
            </p>
          </SheetHeader>
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
              project={conflict.project}
              startTime={conflict.start_time}
              endTime={conflict.end_time}
              onReplace={() => setShowReplaceConfirm(true)}
            />
          )}
          {/* ────────────────────────────────────────────────────────────── */}

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
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ts-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  if (v) setStatus(v as "draft" | "submitted" | "approved");
                }}
              >
                <SelectTrigger id="ts-status" className="w-full">
                  <SelectValue>{statusLabel(status)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="submitted">Enviado</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                </SelectContent>
              </Select>
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
            <Input
              id="ts-project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Nome do projeto"
              className={cn(errors.project && "border-destructive")}
            />
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
            />
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 flex items-center gap-2">
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
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || replacing || !!conflict}
              className="bg-[#3730A3] hover:bg-[#312E81] disabled:opacity-50"
            >
              {loading || replacing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-1.5">
                {replacing ? "Substituindo..." : loading ? "Verificando..." : "Salvar"}
              </span>
            </Button>
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
              &ldquo;{conflict?.project}&rdquo; &mdash;{" "}
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
