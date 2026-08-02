import { useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProjectEvents, useRemove, useUpsert, type ProjectEvent } from "@/lib/db";
import { eventMeta } from "@/lib/whatsapp";

export const STATUS_OPTIONS = {
  project: ["open", "ongoing", "completed", "cancelled"],
  shoot: ["pending", "in_progress", "completed"],
  editing: ["pending", "in_progress", "completed"],
  album: ["pending", "in_progress", "completed"],
  delivery: ["pending", "in_progress", "delivered"],
};

const opts = (list: string[]) => list.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));

/** Project fields — the single event date is replaced by the sub-events section. */
export function projectFields(clients: { id: string; name: string }[]): Field[] {
  return [
    {
      name: "client_id",
      label: "Client",
      type: "select",
      required: true,
      options: clients.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "project_name", label: "Project name", required: true },
    { name: "venue", label: "Main venue" },
    { name: "package_name", label: "Package" },
    { name: "total_amount", label: "Total agreed amount", type: "number" },
    { name: "advance_amount", label: "Advance amount", type: "number" },
    { name: "payment_due_date", label: "Balance due date", type: "date" },
    { name: "project_status", label: "Project status", type: "select", options: opts(STATUS_OPTIONS.project) },
    { name: "shoot_status", label: "Shoot status", type: "select", options: opts(STATUS_OPTIONS.shoot) },
    { name: "editing_status", label: "Editing status", type: "select", options: opts(STATUS_OPTIONS.editing) },
    { name: "album_status", label: "Album status", type: "select", options: opts(STATUS_OPTIONS.album) },
    { name: "delivery_status", label: "Delivery status", type: "select", options: opts(STATUS_OPTIONS.delivery) },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

const SUB_EVENTS = [
  { type: "save_the_date", label: "Save the Date" },
  { type: "haldi", label: "Haldi" },
  { type: "engagement", label: "Engagement" },
  { type: "wedding_day", label: "Wedding Day / Muhurtham" },
  { type: "reception", label: "Reception" },
] as const;

type Row = { enabled: boolean; date: string; location: string; name?: string; id?: string };

const emptyRow = (): Row => ({ enabled: false, date: "", location: "" });

function buildRows(events: ProjectEvent[]) {
  const rows: Record<string, Row> = {};
  SUB_EVENTS.forEach(({ type }) => {
    const e = events.find((ev) => ev.event_type === type);
    rows[type] = e
      ? { enabled: true, date: e.event_date ?? "", location: e.location ?? "", id: e.id }
      : emptyRow();
  });
  const custom = events.find((ev) => ev.event_type === "custom");
  rows.custom = custom
    ? {
        enabled: true,
        date: custom.event_date ?? "",
        location: custom.location ?? "",
        name: custom.notes ?? "",
        id: custom.id,
      }
    : { ...emptyRow(), name: "" };
  return rows;
}

export function ProjectDialog({
  clients,
  projectId,
  initial,
  trigger,
  open,
  onOpenChange,
  title,
}: {
  clients: { id: string; name: string }[];
  projectId?: string;
  initial?: Record<string, any>;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title?: string;
}) {
  const { data: events = [] } = useProjectEvents(projectId);
  const saveProject = useUpsert("projects", "Project");
  const saveEvent = useUpsert("project_events", "Event");
  const delEvent = useRemove("project_events", "Event");
  const [rows, setRows] = useState<Record<string, Row>>(() => buildRows(events));

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const activeDates = () =>
    Object.entries(rows)
      .filter(([, r]) => r.enabled && r.date)
      .map(([key, r]) => ({ key, ...r }));

  const submit = async (values: Record<string, any>) => {
    const active = activeDates();
    const wedding = active.find((r) => r.key === "wedding_day");
    const earliest = [...active].sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    const primaryDate = wedding?.date ?? earliest?.date ?? initial?.event_date ?? null;

    const id = await saveProject.mutateAsync({
      ...values,
      ...(primaryDate ? { event_date: primaryDate } : {}),
      ...(projectId ? { id: projectId } : {}),
    });
    const pid = (projectId ?? id) as string;

    for (const [key, row] of Object.entries(rows)) {
      const type = key;
      if (row.enabled && row.date) {
        await saveEvent.mutateAsync({
          ...(row.id ? { id: row.id } : {}),
          project_id: pid,
          event_type: type,
          event_date: row.date,
          location: row.location || null,
          ...(type === "custom" ? { notes: row.name || "Other event" } : {}),
        });
      } else if (row.id) {
        await delEvent.mutateAsync(row.id);
      }
    }
  };

  return (
    <RecordDialog
      title={title ?? (projectId ? "Edit project" : "New project")}
      fields={projectFields(clients)}
      initial={initial}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onReset={() => setRows(buildRows(events))}
      onSubmit={submit}
      extra={
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Sub-events &amp; dates</p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Turn on each function and set its own date — every one appears on the dashboard and calendar.
          </p>
          <div className="space-y-2">
            {[...SUB_EVENTS.map((s) => ({ ...s, key: s.type })), { key: "custom", label: "Other event" }].map(
              (s) => {
                const row = rows[s.key] ?? emptyRow();
                return (
                  <div key={s.key} className="rounded-lg border border-border bg-card p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`ev-${s.key}`} className="text-xs font-medium">
                        {s.key === "custom" ? "✨ Other event" : `${eventMeta(s.key).emoji} ${s.label}`}
                      </Label>
                      <Switch
                        id={`ev-${s.key}`}
                        checked={row.enabled}
                        onCheckedChange={(v) => setRow(s.key, { enabled: v })}
                      />
                    </div>
                    {row.enabled && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {s.key === "custom" && (
                          <Input
                            className="sm:col-span-2"
                            placeholder="Event name (e.g. Sangeet)"
                            value={row.name ?? ""}
                            onChange={(e) => setRow(s.key, { name: e.target.value })}
                          />
                        )}
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => setRow(s.key, { date: e.target.value })}
                        />
                        <Input
                          placeholder="Venue / location"
                          value={row.location}
                          onChange={(e) => setRow(s.key, { location: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      }
    />
  );
}
