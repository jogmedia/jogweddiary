import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, HardDrive, HardDriveDownload, MessageCircle, Pencil, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { DrivePicker } from "@/components/DrivePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DRIVE_OPTIONS } from "@/lib/drives";
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

const backupMsg = (crew: string, client: string, date: string, drive: string, folder: string) =>
  `Hi ${crew}, raw data for ${client}'s shoot (${fmtDate(date)}) is ready.\n\nHard Disk: ${
    drive || "not assigned"
  }\nFolder: ${folder || "not assigned"}\n\nPlease start the editing work. - JOG MEDIA`;

function RawDataPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: assignments = [] } = useAssignments();
  const save = useUpsert("projects", "Backup status");
  const [drives, setDrives] = useState<Record<string, string>>({});
  const [folders, setFolders] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [disk, setDisk] = useState<string>(ALL_DISKS);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const today = todayISO();

  const clientName = (p: Project) => p.clients?.name ?? p.project_name;
  const driveOf = (p: Project) => (drives[p.id] ?? p.backup_drive ?? "").trim();
  const crewFor = (p: Project) => assignments.filter((a) => a.project_id === p.id);
  const folderOf = (p: Project) => (folders[p.id] ?? p.backup_folder ?? "").trim();

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
    const used = new Set(shot.map((p) => (p.backup_drive ?? "").trim()).filter(Boolean));
    return [...DRIVE_OPTIONS.filter((d) => used.has(d)), ...[...used].filter((d) => !DRIVE_OPTIONS.includes(d))];
  }, [shot]);

  const rows = shot.filter((p) => {
    if (filter === "pending" && p.raw_backup_done) return false;
    if (filter === "done" && !p.raw_backup_done) return false;
    if (disk !== ALL_DISKS && (p.backup_drive ?? "").trim() !== disk) return false;
    if (!q.trim()) return true;
    const hay = `${clientName(p)} ${p.project_name} ${driveOf(p)} ${folderOf(p)}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const toggle = (p: Project, done: boolean) =>
    save.mutate({
      id: p.id,
      raw_backup_done: done,
      backup_drive: driveOf(p) || null,
      backup_folder: folderOf(p) || null,
    });

  const dirty = (p: Project) =>
    driveOf(p) !== (p.backup_drive ?? "").trim() || folderOf(p) !== (p.backup_folder ?? "").trim();

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
        <StatCard label="Shoots completed" value={String(shot.length)} icon={<HardDrive className="h-4 w-4" />} />
        <StatCard
          label="Backup pending"
          value={String(pendingCount)}
          tone={pendingCount ? "destructive" : "success"}
          hint="Raw data not yet secured"
        />
        <StatCard label="Backed up" value={String(doneCount)} tone="success" hint="Stored on hard disks" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
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
          <SelectTrigger className="h-9 w-full sm:w-52">
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
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search client, project, disk or folder"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
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
              <th align="left">Hard Disk No.</th>
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
            <li key={p.id} className="surface flex h-full flex-col p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{clientName(p)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.project_name} · {fmtDate(p.event_date)}
                  </p>
                </div>
                <span
                  className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                    p.raw_backup_done
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {p.raw_backup_done ? "Backed up" : "Pending"}
                </span>
              </div>

              {driveOf(p) ? (
                <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  <HardDrive className="h-3.5 w-3.5" /> Backup Location: {driveOf(p)}
                  {folderOf(p) ? ` · Folder: ${folderOf(p)}` : ""}
                </p>
              ) : null}

              {editing[p.id] ? (
                <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted/40 p-3">
                  <DrivePicker
                    value={drives[p.id] ?? p.backup_drive ?? ""}
                    onChange={(v) => setDrives((d) => ({ ...d, [p.id]: v }))}
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
                        disabled={save.isPending}
                        onCheckedChange={(v) => toggle(p, v)}
                      />
                      <span>Backed up to primary &amp; secondary disks</span>
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
                              backupMsg(a.staff?.name ?? "team", clientName(p), p.event_date, driveOf(p), folderOf(p)),
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
