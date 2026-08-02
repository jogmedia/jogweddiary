import { AlertTriangle, HardDriveDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, todayISO } from "@/lib/format";
import { useProjects, useUpsert } from "@/lib/db";

export function BackupAlert() {
  const { data: projects = [] } = useProjects();
  const save = useUpsert("projects", "Backup status");
  const today = todayISO();

  const pending = projects.filter(
    (p) =>
      !p.raw_backup_done &&
      p.project_status !== "cancelled" &&
      (p.shoot_status === "completed" || p.project_status === "completed" || p.event_date < today),
  );

  if (pending.length === 0) return null;

  return (
    <div className="mb-4 rounded-[18px] border border-destructive/40 bg-destructive/10 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-destructive">
            Warning: {pending.length} {pending.length === 1 ? "shoot has" : "shoots have"} pending raw
            data backups!
          </p>
          <ul className="mt-3 space-y-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.clients?.name ?? p.project_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.project_name} · {fmtDate(p.event_date)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: p.id, raw_backup_done: true })}
                >
                  <HardDriveDownload className="mr-1.5 h-4 w-4" /> Mark as Backed Up
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
