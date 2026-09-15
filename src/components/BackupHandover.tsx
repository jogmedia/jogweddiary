import { Camera, MessageCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DrivePicker } from "@/components/DrivePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildHandoverReminder,
  handoverBadge,
  handoverCloud,
  handoverDisk,
  handoverReceived,
  isPhotoRole,
  isVideoRole,
  type HandoverKind,
} from "@/lib/drives";
import { fmtDate } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import { prettyRole } from "@/lib/roles";
import type { Assignment, Project, Staff } from "@/lib/db";

const UNSET = "__none__";

type Patch = Record<string, unknown>;

/** Crew member expected to hand over the cards for this kind of raw data. */
export function handoverCrew(
  project: Project,
  assignments: Assignment[],
  staff: Staff[],
  kind: HandoverKind,
): { id: string | null; name: string | null; phone: string | null; role: string | null } {
  const pinned = kind === "photo" ? project.photo_handover_staff_id : project.video_handover_staff_id;
  if (pinned) {
    const s = staff.find((x) => x.id === pinned);
    if (s) return { id: s.id, name: s.name, phone: s.phone, role: s.role };
  }
  const match = (kind === "photo" ? isPhotoRole : isVideoRole);
  const a = assignments.find(
    (x) => x.project_id === project.id && (match(x.role_in_project) || match(x.staff?.role)),
  );
  if (a?.staff)
    return {
      id: a.staff_id,
      name: a.staff.name,
      phone: a.staff.phone,
      role: a.role_in_project ?? a.staff.role ?? null,
    };
  return { id: null, name: null, phone: null, role: null };
}

export function handoverAlerts(project: Project, assignments: Assignment[], staff: Staff[]) {
  return (["photo", "video"] as HandoverKind[])
    .filter((kind) => !handoverReceived(project, kind))
    .map((kind) => ({ kind, crew: handoverCrew(project, assignments, staff, kind) }));
}

function HandoverCard({
  kind,
  project,
  assignments,
  staff,
  onSave,
  saving,
}: {
  kind: HandoverKind;
  project: Project;
  assignments: Assignment[];
  staff: Staff[];
  onSave: (patch: Patch) => void;
  saving?: boolean;
}) {
  const photo = kind === "photo";
  const crew = handoverCrew(project, assignments, staff, kind);
  const received = handoverReceived(project, kind);
  const disk = handoverDisk(project, kind);
  const cloud = handoverCloud(project, kind);
  const Icon = photo ? Camera : Video;
  const who = crew.name ?? (photo ? "Photographer" : "Videographer");

  const patch = (v: Patch) => onSave({ id: project.id, ...v });

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {photo ? "📸 Photo Raw Backup Handover" : "🎥 Video Footage Backup Handover"}
        </p>
        <span
          className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            received
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {received
            ? photo
              ? "🟢 Raw photos received & backed up"
              : "🟢 Video footage received & backed up"
            : photo
              ? "🔴 Raw photos pending from photographer"
              : "🔴 Video footage pending from videographer"}
        </span>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {crew.name ? (
          <>
            Assigned: <span className="font-medium text-foreground">{crew.name}</span>
            {crew.role ? ` · ${prettyRole(crew.role)}` : ""}
          </>
        ) : (
          `No ${photo ? "photographer" : "videographer"} assigned — pick the crew member below.`
        )}
      </p>

      <div className="mt-2">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {photo ? "Photographer" : "Videographer"} responsible
        </p>
        <Select
          value={crew.id ?? UNSET}
          onValueChange={(v) =>
            patch(
              photo
                ? { photo_handover_staff_id: v === UNSET ? null : v }
                : { video_handover_staff_id: v === UNSET ? null : v },
            )
          }
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select crew member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET}>Not selected</SelectItem>
            {staff
              .filter((s) => s.active_status)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {prettyRole(s.role)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={received ? "outline" : "default"}
          className="h-9 flex-1"
          disabled={saving}
          onClick={() =>
            patch(
              photo
                ? { photo_handover_status: received ? "pending" : "received" }
                : { video_handover_status: received ? "pending" : "received" },
            )
          }
        >
          {received
            ? "Mark back as pending"
            : photo
              ? "Mark raw photos received"
              : "Mark video footage received"}
        </Button>
        {!received ? (
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1"
            disabled={!crew.phone}
            onClick={() =>
              openWhatsApp(
                crew.phone,
                buildHandoverReminder({
                  kind,
                  crewName: who,
                  clientName: project.clients?.name ?? project.project_name,
                  eventDate: fmtDate(project.event_date),
                  functionType: project.project_name,
                }),
              )
            }
          >
            <MessageCircle className="mr-1.5 h-4 w-4" /> 📲 WhatsApp Reminder to {who}
          </Button>
        ) : null}
      </div>

      {received ? (
        <div className="mt-3 space-y-2.5 border-t border-border pt-2.5">
          <DrivePicker
            label={photo ? "Photo Stored On Disk" : "Video Stored On Disk"}
            value={disk}
            onChange={(v) => patch(photo ? { photo_backup_disk: v } : { video_backup_disk: v })}
          />
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={cloud}
              disabled={saving}
              onCheckedChange={(v) =>
                patch(photo ? { photo_cloud_uploaded: v } : { video_cloud_uploaded: v })
              }
            />
            <span>☁️ Uploaded to Google Drive</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

/** Photo + video raw data handover tracking with WhatsApp reminders. */
export function BackupHandover({
  project,
  assignments,
  staff,
  onSave,
  saving,
}: {
  project: Project;
  assignments: Assignment[];
  staff: Staff[];
  onSave: (patch: Patch) => void;
  saving?: boolean;
}) {
  const photoCrew = handoverCrew(project, assignments, staff, "photo");
  const videoCrew = handoverCrew(project, assignments, staff, "video");
  const badge = handoverBadge({
    photoDone: handoverReceived(project, "photo") && Boolean(handoverDisk(project, "photo")),
    videoDone: handoverReceived(project, "video") && Boolean(handoverDisk(project, "video")),
    photographer: photoCrew.name,
    videographer: videoCrew.name,
  });

  return (
    <div className="space-y-3">
      <span
        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${badge.className}`}
      >
        {badge.label}
      </span>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <HandoverCard
          kind="photo"
          project={project}
          assignments={assignments}
          staff={staff}
          onSave={onSave}
          saving={saving}
        />
        <HandoverCard
          kind="video"
          project={project}
          assignments={assignments}
          staff={staff}
          onSave={onSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
