import { useState, type ReactNode } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CrewPicker } from "@/components/CrewPicker";
import {
  useAssignments,
  useProjectEvents,
  useRemove,
  useStaff,
  useUpsert,
  type Assignment,
  type ProjectEvent,
} from "@/lib/db";

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
  { type: "engagement", label: "Engagement" },
  { type: "haldi", label: "Haldi / Mehendi" },
  { type: "wedding_eve", label: "Wedding Eve / Sangeeth" },
  { type: "wedding_day", label: "Wedding Day / Muhurtham" },
  { type: "reception", label: "Reception" },
] as const;

type Row = {
  enabled: boolean;
  date: string;
  time: string;
  location: string;
  name?: string;
  id?: string;
  staffIds: string[];
};

const emptyRow = (): Row => ({ enabled: false, date: "", time: "", location: "", staffIds: [] });
const emptyCustomRow = (): Row => ({
  enabled: true,
  date: "",
  time: "",
  location: "",
  name: "",
  staffIds: [],
});

const crewFor = (assignments: Assignment[], eventId?: string) =>
  eventId ? assignments.filter((a) => a.event_id === eventId).map((a) => a.staff_id) : [];

function buildRows(events: ProjectEvent[], assignments: Assignment[] = []) {
  const rows: Record<string, Row> = {};
  SUB_EVENTS.forEach(({ type }) => {
    const e = events.find((ev) => ev.event_type === type);
    rows[type] = e
      ? {
          enabled: true,
          date: e.event_date ?? "",
          time: (e.event_time ?? "").slice(0, 5),
          location: e.location ?? "",
          id: e.id,
          staffIds: crewFor(assignments, e.id),
        }
      : emptyRow();
  });
  return rows;
}

function buildCustomRows(events: ProjectEvent[], assignments: Assignment[] = []) {
  return events
    .filter((ev) => ev.event_type === "custom")
    .map((e) => ({
      enabled: true,
      date: e.event_date ?? "",
      time: (e.event_time ?? "").slice(0, 5),
      location: e.location ?? "",
      name: e.notes ?? "",
      id: e.id,
      staffIds: crewFor(assignments, e.id),
    }));
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
  const { data: allEvents = [] } = useProjectEvents(projectId);
  const { data: staff = [] } = useStaff();
  const { data: allAssignments = [] } = useAssignments(projectId);
  const events = projectId ? allEvents : [];
  const assignments = projectId ? allAssignments : [];
  const saveProject = useUpsert("projects", "Project");
  const saveEvent = useUpsert("project_events", "Event");
  const delEvent = useRemove("project_events", "Event");
  const saveAssignment = useUpsert("project_assignments", "Crew assignment");
  const delAssignment = useRemove("project_assignments", "Crew assignment");
  const [rows, setRows] = useState<Record<string, Row>>(() => buildRows(events, assignments));
  const [customEvents, setCustomEvents] = useState<Row[]>(() => buildCustomRows(events, assignments));

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const setCustomRow = (index: number, patch: Partial<Row>) =>
    setCustomEvents((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addCustomEvent = () => setCustomEvents((prev) => [...prev, emptyCustomRow()]);

  const removeCustomEvent = async (index: number) => {
    const row = customEvents[index];
    if (row?.id) {
      await delEvent.mutateAsync(row.id);
    }
    setCustomEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const activeDates = () =>
    Object.entries(rows)
      .filter(([, r]) => r.enabled && r.date)
      .map(([key, r]) => ({ key, ...r }));

  const syncCrew = async (pid: string, eventId: string, staffIds: string[]) => {
    const current = assignments.filter((a) => a.event_id === eventId);
    for (const a of current) {
      if (!staffIds.includes(a.staff_id)) await delAssignment.mutateAsync(a.id);
    }
    for (const sid of staffIds) {
      if (current.some((a) => a.staff_id === sid)) continue;
      const member = staff.find((s) => s.id === sid);
      await saveAssignment.mutateAsync({
        project_id: pid,
        event_id: eventId,
        staff_id: sid,
        role_in_project: member?.role ?? null,
      });
    }
  };

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
      if (row.enabled && row.date) {
        const evId = (await saveEvent.mutateAsync({
          ...(row.id ? { id: row.id } : {}),
          project_id: pid,
          event_type: key,
          event_date: row.date,
          event_time: row.time || null,
          location: row.location || null,
        })) as string;
        if (evId) await syncCrew(pid, evId, row.staffIds ?? []);
      } else if (row.id) {
        await delEvent.mutateAsync(row.id);
      }
    }

    for (const row of customEvents) {
      if (row.enabled && row.date) {
        const evId = (await saveEvent.mutateAsync({
          ...(row.id ? { id: row.id } : {}),
          project_id: pid,
          event_type: "custom",
          event_date: row.date,
          event_time: row.time || null,
          location: row.location || null,
          notes: row.name || "Custom event",
        })) as string;
        if (evId) await syncCrew(pid, evId, row.staffIds ?? []);
      } else if (row.id) {
        await delEvent.mutateAsync(row.id);
      }
    }

    if (!projectId) {
      setRows(buildRows([]));
      setCustomEvents([]);
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
      onReset={() => {
        setRows(buildRows(events, assignments));
        setCustomEvents(buildCustomRows(events, assignments));
      }}
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
            {SUB_EVENTS.map((s) => {
              const row = rows[s.type] ?? emptyRow();
              return (
                <div key={s.type} className="rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`ev-${s.type}`} className="text-xs font-medium">
                      {s.label}
                    </Label>
                    <Switch
                      id={`ev-${s.type}`}
                      checked={row.enabled}
                      onCheckedChange={(v) => setRow(s.type, { enabled: v })}
                    />
                  </div>
                  {row.enabled && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => setRow(s.type, { date: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={row.time}
                        onChange={(e) => setRow(s.type, { time: e.target.value })}
                      />
                      <Input
                        className="sm:col-span-2"
                        placeholder="Venue / location"
                        value={row.location}
                        onChange={(e) => setRow(s.type, { location: e.target.value })}
                      />
                      <div className="sm:col-span-2">
                        <CrewPicker
                          staff={staff}
                          value={row.staffIds ?? []}
                          onChange={(ids) => setRow(s.type, { staffIds: ids })}
                          date={row.date}
                          projectId={projectId}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {customEvents.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold text-primary">Custom events</p>
                <div className="space-y-2">
                  {customEvents.map((row, index) => (
                    <div key={index} className="rounded-lg border border-border bg-card p-2.5">
                      <div className="mb-2 flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Event name (e.g. Sangeet, Family Dinner)"
                          value={row.name ?? ""}
                          onChange={(e) => setCustomRow(index, { name: e.target.value })}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-destructive"
                          onClick={() => removeCustomEvent(index)}
                          disabled={delEvent.isPending}
                          aria-label="Remove custom event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => setCustomRow(index, { date: e.target.value })}
                        />
                        <Input
                          type="time"
                          value={row.time}
                          onChange={(e) => setCustomRow(index, { time: e.target.value })}
                        />
                        <Input
                          className="sm:col-span-2"
                          placeholder="Venue / location"
                          value={row.location}
                          onChange={(e) => setCustomRow(index, { location: e.target.value })}
                        />
                        <div className="sm:col-span-2">
                          <CrewPicker
                            staff={staff}
                            value={row.staffIds ?? []}
                            onChange={(ids) => setCustomRow(index, { staffIds: ids })}
                            date={row.date}
                            projectId={projectId}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="mt-1 w-full gap-1 border-dashed text-primary hover:bg-primary/5 hover:text-primary"
              onClick={addCustomEvent}
            >
              <Plus className="h-4 w-4" />
              Add Custom Event
            </Button>
          </div>
        </div>
      }
    />
  );
}
