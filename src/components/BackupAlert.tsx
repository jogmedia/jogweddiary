import { useState } from "react";
import { AlertTriangle, HardDriveDownload, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fmtDate, todayISO } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import { DRIVE_OPTIONS } from "@/lib/drives";
import { useAssignments, useProjects, useUpsert } from "@/lib/db";
import type { Assignment, Project } from "@/lib/db";

const reminderMsg = (crew: string, client: string, date: string) =>
  `Hi ${crew}, please upload/handover the raw data for ${client}'s shoot held on ${fmtDate(date)}. Backup is currently pending.`;

const doneMsg = (crew: string, client: string, date: string, drive?: string) =>
  `Hi ${crew}, Raw Data Backup for ${client}'s shoot (${fmtDate(date)}) has been successfully completed and verified${
    drive ? ` (stored on ${drive})` : ""
  }. Thank you!`;

export function BackupAlert() {
  const { data: projects = [] } = useProjects();
  const { data: assignments = [] } = useAssignments();
  const save = useUpsert("projects", "Backup status");
  const [drives, setDrives] = useState<Record<string, string>>({});
  const today = todayISO();

  const pending = projects.filter(
    (p) =>
      !p.raw_backup_done &&
      p.project_status !== "cancelled" &&
      (p.shoot_status === "completed" || p.project_status === "completed" || p.event_date < today),
  );

  if (pending.length === 0) return null;

  const crewFor = (p: Project) => assignments.filter((a) => a.project_id === p.id);
  const clientName = (p: Project) => p.clients?.name ?? p.project_name;

  const markDone = (p: Project, notify?: Assignment) => {
    const drive = (drives[p.id] ?? p.backup_drive ?? "").trim();
    save.mutate({ id: p.id, raw_backup_done: true, backup_drive: drive || null });
    if (notify?.staff?.phone) {
      openWhatsApp(
        notify.staff.phone,
        doneMsg(notify.staff.name ?? "team", clientName(p), p.event_date, drive),
      );
    }
  };


  return (
    <div className="mb-4 rounded-[18px] border-2 border-destructive/50 bg-destructive/10 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold uppercase tracking-wide text-destructive">
            Warning: {pending.length} {pending.length === 1 ? "shoot has" : "shoots have"} pending raw
            data backups!
          </p>

          <ul className="mt-3 space-y-3">
            {pending.map((p) => {
              const crew = crewFor(p);
              return (
                <li key={p.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{clientName(p)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.project_name} · {fmtDate(p.event_date)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={save.isPending}
                      onClick={() => markDone(p, crew[0])}
                    >
                      <HardDriveDownload className="mr-1.5 h-4 w-4" /> Mark as Backed Up
                    </Button>
                  </div>

                  {crew.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">No crew assigned.</p>
                  ) : (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      {crew.map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{a.staff?.name}</span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {a.role_in_project ?? a.staff?.role ?? "Crew"}
                              {a.staff?.phone ? ` · ${a.staff.phone}` : ""}
                            </span>
                          </span>
                          <span className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              disabled={!a.staff?.phone}
                              onClick={() =>
                                openWhatsApp(
                                  a.staff?.phone,
                                  reminderMsg(a.staff?.name ?? "team", clientName(p), p.event_date),
                                )
                              }
                            >
                              <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp Crew
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-2 text-xs"
                              disabled={save.isPending}
                              onClick={() => markDone(p, a)}
                            >
                              Mark as Backed Up &amp; Notify
                            </Button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs">
                    <Switch
                      checked={!!p.raw_backup_done}
                      disabled={save.isPending}
                      onCheckedChange={(v) => v && markDone(p, crew[0])}
                    />
                    <span>Raw Data Backed Up to Primary &amp; Secondary Hard Drives</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
