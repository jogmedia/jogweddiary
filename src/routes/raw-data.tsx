import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, HardDrive, HardDriveDownload, MessageCircle, Pencil, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ClickableStatCard, EmptyState, PageHeader } from "@/components/ui-kit";
import { DrivePicker } from "@/components/DrivePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BACKUP_BADGE,
  DRIVE_OPTIONS,
  backupState,
  buildBackupRecordMessage,
} from "@/lib/drives";
import { exportPdf } from "@/lib/exporters";
import { fmtDate, todayISO } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import { useAssignments, useProjects, useUpsert } from "@/lib/db";
import type { Project } from "@/lib/db";

export const Route = createFileRoute("/raw-data")({
  head: () => ({
    meta: [
      { title: "Raw Data Backup — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Track raw footage backups for every wedding shoot with hard disk numbers, pending alerts and PDF reports.",
      },
      { property: "og:title", content: "Raw Data Backup — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Hard disk wise raw data backup register for JOG MEDIA shoots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RawDataPage,
});

type Filter = "all" | "pending" | "done";

const ALL_DISKS = "__all__";

const backupMsg = (
  client: string,
  project: string,
  date: string,
  primary: string,
  secondary: string,
  folder: string,
) =>
  buildBackupRecordMessage({
    projectName: `${client} — ${project}`,
    primary,
    secondary,
    folder,
    date: fmtDate(date),
  });

function RawDataPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: assignments = [] } = useAssignments();
  const save = useUpsert("projects", "Backup status");
  const [drives, setDrives] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState<Record<string, string>>({});
  const [folders, setFolders] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [disk, setDisk] = useState<string>(ALL_DISKS);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const today = todayISO();

  const clientName = (p: Project) => p.clients?.name ?? p.project_name;
  const driveOf = (p: Project) =>
    (drives[p.id] ?? p.primary_hard_disk ?? p.backup_drive ?? "").trim();
  const secondOf = (p: Project) => (seconds[p.id] ?? p.secondary_hard_disk ?? "").trim();
  const crewFor = (p: Project) => assignments.filter((a) => a.project_id === p.id);
  const folderOf = (p: Project) => (folders[p.id] ?? p.backup_folder ?? "").trim();

  const isEditorRole = (role?: string | null) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return (
      r.includes("editor") ||
      r.includes("designer") ||
      r.includes("album") ||
      r.includes("video") ||
      r.includes("lightroom")
    );
  };
  const editorsFor = (p: Project) =>
    crewFor(p).filter(
      (a) =>
        isEditorRole(a.role_in_project) ||
        isEditorRole(a.staff?.role),
    );

  const shot = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            p.project_status !== "cancelled" &&
            (p.shoot_status === "completed" || p.project_status === "completed" || p.event_date < today),
        )
        .sort((a, b) => (a.event_date < b.event_date ? 1 : -1)),
    [projects, today],
  );

  const pendingCount = shot.filter((p) => !p.raw_backup_done).length;
  const doneCount = shot.filter((p) => p.raw_backup_done).length;

  const diskOptions = useMemo(() => {
    const used = new Set(
      shot
        .flatMap((p) => [
          (p.primary_hard_disk ?? p.backup_drive ?? "").trim(),
          (p.secondary_hard_disk ?? "").trim(),
        ])
        .filter(Boolean),
    );
    return [...DRIVE_OPTIONS.filter((d) => used.has(d)), ...[...used].filter((d) => !DRIVE_OPTIONS.includes(d))];
  }, [shot]);

  const matchesQuery = (p: Project) => {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    const hay = `${clientName(p)} ${p.project_name} ${p.venue ?? ""} ${driveOf(p)} ${secondOf(p)} ${folderOf(p)}`
      .toLowerCase()
      .replace(/[_\-.]/g, " ");
    // every word typed must appear somewhere → "disk 3" and "hard disk 3" both work
    return query
      .replace(/[_\-.]/g, " ")
      .split(/\s+/)
      .every((word) => hay.includes(word));
  };

  const rows = shot.filter((p) => {
    if (filter === "pending" && p.raw_backup_done) return false;
    if (filter === "done" && !p.raw_backup_done) return false;
    if (disk !== ALL_DISKS && driveOf(p) !== disk && secondOf(p) !== disk) return false;
    return matchesQuery(p);
  });

  const toggle = (p: Project, done: boolean) =>
    save.mutate({
      id: p.id,
      raw_backup_done: done,
      primary_hard_disk: driveOf(p) || null,
      secondary_hard_disk: secondOf(p) || null,
      backup_drive: driveOf(p) || null,
      backup_folder: folderOf(p) || null,
    });

  const dirty = (p: Project) =>
    driveOf(p) !== (p.primary_hard_disk ?? p.backup_drive ?? "").trim() ||
    secondOf(p) !== (p.secondary_hard_disk ?? "").trim() ||
    folderOf(p) !== (p.backup_folder ?? "").trim();

  return (
    <AppShell>
      <PageHeader
        title="Raw Data"
        subtitle="Hard disk wise raw footage backup register"
        actions={
          <Button variant="outline" onClick={() => exportPdf("raw-data-report", "Raw Data Backup Report")}>
            <FileDown className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ClickableStatCard
          label="Shoots completed"
          value={String(shot.length)}
          hint="Tap to show all shoots"
          active={filter === "all"}
          onClick={() => setFilter("all")}
          ariaLabel="Show all completed shoots"
        />
        <ClickableStatCard
          label="Backup pending"
          value={String(pendingCount)}
          tone={pendingCount ? "destructive" : "success"}
          hint="Raw data not yet secured"
          active={filter === "pending"}
          onClick={() => setFilter((f) => (f === "pending" ? "all" : "pending"))}
          ariaLabel="Filter shoots pending backup"
        />
        <ClickableStatCard
          label="Backed up"
          value={String(doneCount)}
          tone="success"
          hint="Stored on hard disks"
          active={filter === "done"}
          onClick={() => setFilter((f) => (f === "done" ? "all" : "done"))}
          ariaLabel="Filter shoots already backed up"
        />
      </div>

      <div className="surface mt-6 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
          <Input
            type="search"
            aria-label="Search raw data by client, event, folder or hard disk"
            className="h-12 pl-11 pr-24 text-base"
            placeholder="Search client, event, folder name or Hard Disk 3…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q ? (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 h-8 -translate-y-1/2 px-2 text-xs"
              onClick={() => setQ("")}
            >
              Clear
            </Button>
          ) : null}
        </div>
        {q.trim() ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? "shoot" : "shoots"} matching “{q.trim()}”
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {([
          { key: "all", label: "All Drives" },
          { key: "done", label: "Backed Up" },
          { key: "pending", label: "Pending Backup" },
        ] as { key: Filter; label: string }[]).map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <Select value={disk} onValueChange={setDisk}>
          <SelectTrigger className="h-9 w-full sm:ml-auto sm:w-52">
            <SelectValue placeholder="Filter by Hard Disk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DISKS}>Filter by Hard Disk: All</SelectItem>
            {diskOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hidden source for the PDF export */}
      <div id="raw-data-report" className="hidden">
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          JOG MEDIA — Raw Data Backup Report
        </h1>
        <p style={{ fontSize: 12, marginBottom: 12 }}>Generated on {fmtDate(today)}</p>
        <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th align="left">Client</th>
              <th align="left">Project / Event</th>
              <th align="left">Event Date</th>
              <th align="left">Backup Status</th>
              <th align="left">Primary Disk</th>
              <th align="left">Secondary Disk</th>
              <th align="left">Folder Name</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{clientName(p)}</td>
                <td>{p.project_name}</td>
                <td>{fmtDate(p.event_date)}</td>
                <td>{p.raw_backup_done ? "Backed up" : "Pending"}</td>
                <td>{driveOf(p) || "—"}</td>
                <td>{secondOf(p) || "—"}</td>
                <td>{folderOf(p) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="No shoots match this filter." />
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((p) => (
            <li
              key={p.id}
              className={`surface flex h-full flex-col p-4 transition-shadow ${
                q.trim() ? "ring-1 ring-primary/20 shadow-sm" : ""
              }`}
            >
              {/* Header: Client / Event Name & Date + Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-primary">{clientName(p)}</p>
                  <p className="mt-0.5 truncate text-sm text-secondary-foreground">
                    {p.project_name} · {fmtDate(p.event_date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <span
                    className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                      BACKUP_BADGE[backupState(driveOf(p), secondOf(p))].className
                    }`}
                  >
                    {BACKUP_BADGE[backupState(driveOf(p), secondOf(p))].label}
                  </span>
                  {q.trim() ? (
                    editorsFor(p).length === 1 ? (
                      <Button
                        size="sm"
                        className="h-8 shrink-0 gap-1.5"
                        onClick={() => {
                          const a = editorsFor(p)[0];
                          openWhatsApp(
                            a.staff?.phone,
                            backupMsg(
                              clientName(p),
                              p.project_name,
                              p.event_date,
                              driveOf(p),
                              secondOf(p),
                              folderOf(p),
                            ),
                          );
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Send to WhatsApp</span>
                      </Button>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" className="h-8 shrink-0 gap-1.5">
                            <MessageCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Send to WhatsApp</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                          {editorsFor(p).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No editor assigned to this project.</p>
                          ) : (
                            <>
                              <p className="mb-2 text-xs font-medium text-muted-foreground">Send to editor</p>
                              <div className="space-y-2">
                                {editorsFor(p).map((a) => (
                                  <div key={a.id} className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 text-sm">
                                      <span className="font-medium">{a.staff?.name}</span>
                                      <span className="text-muted-foreground">
                                        {" · "}
                                        {a.role_in_project ?? a.staff?.role ?? "Editor"}
                                      </span>
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      disabled={!a.staff?.phone}
                                      onClick={() =>
                                        openWhatsApp(
                                          a.staff?.phone,
                                          backupMsg(
                                            clientName(p),
                                            p.project_name,
                                            p.event_date,
                                            driveOf(p),
                                            secondOf(p),
                                            folderOf(p),
                                          ),
                                        )
                                      }
                                    >
                                      Send
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </PopoverContent>
                      </Popover>
                    )
                  ) : null}
                </div>
              </div>

              {/* Highlighted details grid */}
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">💽 Primary Disk (Working)</p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <HardDrive className="h-4 w-4 text-primary" />
                    {driveOf(p) ? (
                      <span className="break-words">{driveOf(p)}</span>
                    ) : (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">💾 Secondary Disk (Backup)</p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <HardDrive className="h-4 w-4 text-primary" />
                    {secondOf(p) ? (
                      <span className="break-words">{secondOf(p)}</span>
                    ) : (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">📁 Folder Path / Name</p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <span className="font-mono text-xs text-primary">📁</span>
                    {folderOf(p) ? (
                      <span className="break-all font-mono text-xs">{folderOf(p)}</span>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </div>
                </div>
              </div>

              {editing[p.id] ? (
                <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/40 p-3">
                  <DrivePicker
                    label="Primary Working Disk *"
                    value={driveOf(p)}
                    onChange={(v) => setDrives((d) => ({ ...d, [p.id]: v }))}
                  />
                  <DrivePicker
                    label="Secondary Backup Disk *"
                    value={secondOf(p)}
                    onChange={(v) => setSeconds((d) => ({ ...d, [p.id]: v }))}
                  />
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Folder name</p>
                    <Input
                      placeholder="e.g. JOG_2026_Akhil_Wedding"
                      value={folders[p.id] ?? p.backup_folder ?? ""}
                      onChange={(e) => setFolders((f) => ({ ...f, [p.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={!!p.raw_backup_done}
                        disabled={save.isPending || !(driveOf(p) && secondOf(p))}
                        onCheckedChange={(v) => toggle(p, v)}
                      />
                      <span>Confirmed backed up to both disks</span>
                    </label>
                    <span className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing((e) => ({ ...e, [p.id]: false }))}
                      >
                        Close
                      </Button>
                      <Button
                        size="sm"
                        disabled={save.isPending || !dirty(p)}
                        onClick={() => {
                          save.mutate({
                            id: p.id,
                            primary_hard_disk: driveOf(p) || null,
                            secondary_hard_disk: secondOf(p) || null,
                            backup_drive: driveOf(p) || null,
                            backup_folder: folderOf(p) || null,
                          });
                          setEditing((e) => ({ ...e, [p.id]: false }));
                        }}
                      >
                        <HardDriveDownload className="mr-1.5 h-4 w-4" /> Save
                      </Button>
                    </span>
                  </div>
                </div>
              ) : null}

              {sharing[p.id] ? (
                <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                  {crewFor(p).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No crew assigned to this project.</p>
                  ) : (
                    crewFor(p).map((a) => (
                      <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="min-w-0">
                          <span className="font-medium">{a.staff?.name}</span>
                          <span className="text-muted-foreground">
                            {" · "}
                            {a.role_in_project ?? a.staff?.role ?? "Crew"}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs"
                          disabled={!a.staff?.phone}
                          onClick={() =>
                            openWhatsApp(
                              a.staff?.phone,
                              backupMsg(
                                clientName(p),
                                p.project_name,
                                p.event_date,
                                driveOf(p),
                                secondOf(p),
                                folderOf(p),
                              ),
                            )
                          }
                        >
                          <MessageCircle className="mr-1 h-3.5 w-3.5" /> Send
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditing((e) => ({ ...e, [p.id]: !e[p.id] }))}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit Backup Info
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setSharing((s) => ({ ...s, [p.id]: !s[p.id] }))}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Send to WhatsApp
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
