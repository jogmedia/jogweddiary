import { Camera, Check, MessageCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildHandoverReminder, isPhotoRole, isVideoRole, primaryDisk, secondaryDisk, type HandoverKind } from "@/lib/drives";
import { fmtDate } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import { prettyRole } from "@/lib/roles";
import {
  useCrewHandovers,
  useProjectEvents,
  useSetCrewHandover,
  type Assignment,
  type CrewHandover,
  type Project,
  type ProjectEvent,
  type Staff,
} from "@/lib/db";

export type HandoverRow = {
  key: string;
  kind: HandoverKind;
  eventId: string;
  eventLabel: string;
  date: string;
  received: boolean;
  receivedAt: string | null;
  crew: { id: string; name: string; phone: string | null; role: string | null };
};

const eventName = (e: ProjectEvent) =>
  (e.event_type ?? "Event").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** One checklist row per crew member, per event, per photo/video duty. */
export function handoverChecklist(
  project: Project,
  assignments: Assignment[],
  events: ProjectEvent[],
  handovers: CrewHandover[],
): HandoverRow[] {
  const evs = events
    .filter((e) => e.project_id === project.id)
    .sort((a, b) => (a.event_date < b.event_date ? -1 : 1));
  const rows: HandoverRow[] = [];
  evs.forEach((ev) => {
    assignments
      .filter((a) => a.project_id === project.id && a.event_id === ev.id && a.staff)
      .forEach((a) => {
        const role = a.role_in_project ?? a.staff?.role ?? null;
        const kind: HandoverKind | null = isVideoRole(role) ? "video" : isPhotoRole(role) ? "photo" : null;
        if (!kind) return;
        const h = handovers.find((x) => x.event_id === ev.id && x.staff_id === a.staff_id && x.kind === kind);
        rows.push({
          key: `${ev.id}-${a.staff_id}-${kind}`,
          kind,
          eventId: ev.id,
          eventLabel: eventName(ev),
          date: ev.event_date,
          received: h?.status === "received",
          receivedAt: h?.received_at ?? null,
          crew: { id: a.staff_id, name: a.staff!.name, phone: a.staff!.phone, role },
        });
      });
  });
  return rows;
}

/** Pending rows only — used by dashboard alerts. */
export const handoverAlerts = (
  project: Project,
  assignments: Assignment[],
  events: ProjectEvent[],
  handovers: CrewHandover[],
) => handoverChecklist(project, assignments, events, handovers).filter((r) => !r.received);

function CrewCard({
  row,
  project,
  onToggle,
  saving,
}: {
  row: HandoverRow;
  project: Project;
  onToggle: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {row.crew.name}{" "}
            <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {prettyRole(row.crew.role)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.eventLabel} · {fmtDate(row.date)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            row.received
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {row.received ? "🟢 Received & backed up" : "🔴 Raw pending"}
        </span>
      </div>
      {row.received && row.receivedAt ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Received {new Date(row.receivedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={row.received ? "outline" : "default"}
          className="h-9 flex-1"
          disabled={saving}
          onClick={onToggle}
        >
          {row.received ? "Mark back as pending" : (<><Check className="mr-1.5 h-4 w-4" /> Mark as Received</>)}
        </Button>
        {!row.received ? (
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1"
            disabled={!row.crew.phone}
            onClick={() =>
              openWhatsApp(
                row.crew.phone,
                buildHandoverReminder({
                  kind: row.kind,
                  crewName: row.crew.name,
                  clientName: project.clients?.name ?? project.project_name,
                  eventDate: fmtDate(row.date),
                  functionType: row.eventLabel,
                }),
              )
            }
          >
            <MessageCircle className="mr-1.5 h-4 w-4" /> 📲 WhatsApp Reminder to {row.crew.name}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Multi-crew photo & video raw handover checklist, grouped by event. */
export function BackupHandover({
  project,
  assignments,
}: {
  project: Project;
  assignments: Assignment[];
  staff?: Staff[];
  onSave?: (patch: Record<string, unknown>) => void;
  saving?: boolean;
}) {
  const { data: events = [] } = useProjectEvents(project.id);
  const { data: handovers = [] } = useCrewHandovers(project.id);
  const setHandover = useSetCrewHandover();
  const rows = handoverChecklist(project, assignments, events, handovers);
  const pendingNames = [...new Set(rows.filter((r) => !r.received).map((r) => r.crew.name))];
  const disksOk = Boolean(primaryDisk(project)) && Boolean(secondaryDisk(project));
  const complete = disksOk && rows.length > 0 && pendingNames.length === 0;

  const toggle = (r: HandoverRow) =>
    setHandover.mutate({
      project_id: project.id,
      event_id: r.eventId,
      staff_id: r.crew.id,
      kind: r.kind,
      status: r.received ? "pending" : "received",
    });

  const section = (kind: HandoverKind) => {
    const list = rows.filter((r) => r.kind === kind);
    const Icon = kind === "photo" ? Camera : Video;
    const done = list.filter((r) => r.received).length;
    return (
      <details open className="rounded-xl border border-border bg-muted/30 p-3">
        <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {kind === "photo" ? "📷 Photo Raw Handover Checklist" : "🎥 Video Raw Handover Checklist"}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {done}/{list.length} received
          </span>
        </summary>
        <div className="mt-3 space-y-2">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No {kind === "photo" ? "photographers" : "videographers"} assigned to any event yet.
            </p>
          ) : (
            list.map((r) => (
              <CrewCard
                key={r.key}
                row={r}
                project={project}
                saving={setHandover.isPending}
                onToggle={() => toggle(r)}
              />
            ))
          )}
        </div>
      </details>
    );
  };

  const hasPhoto = rows.some((r) => r.kind === "photo");
  const hasVideo = rows.some((r) => r.kind === "video");
  const scope = hasPhoto && hasVideo ? "PHOTO & VIDEO" : hasPhoto ? "PHOTO ONLY" : "VIDEO ONLY";
  const allReceived = rows.length > 0 && pendingNames.length === 0;

  return (
    <div className="space-y-3">
      <span
        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
          allReceived
            ? "border-success/30 bg-success/10 text-success"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}
      >
        {rows.length === 0
          ? "Backup: Pending (no photographer / videographer assigned)"
          : allReceived
            ? "🟢 All raw footage received"
            : `🔴 Backup pending (${scope})${pendingNames.length ? ` · ${pendingNames.join(", ")}` : ""}`}
      </span>
      {(hasPhoto || hasVideo) && (
        <div className={`grid grid-cols-1 gap-3 ${hasPhoto && hasVideo ? "lg:grid-cols-2" : ""}`}>
          {hasPhoto && section("photo")}
          {hasVideo && section("video")}
        </div>
      )}
    </div>
  );
}
