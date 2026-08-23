import { useMemo, useState } from "react";
import { BellRing, CalendarCheck, MapPin, MessageCircle, Pencil, Plus, Send, Trash2, UserPlus } from "lucide-react";
import {
  buildDateBlockMessage,
  buildEventReminderMessage,
  sendWhatsApp,
  type CrewAssignment,
  type CrewGroup,
} from "@/lib/crew-notify";
import { Button } from "@/components/ui/button";
import { crewRoleOptions } from "@/lib/roles";
import { CrewPicker, type CrewMember } from "@/components/CrewPicker";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { StatusBadge } from "@/components/ui-kit";
import { fmtDate, isMapsUrl, isValidPhone, waNumber } from "@/lib/format";
import {
  EVENT_TYPES,
  buildCrewMessage,
  buildScheduleMessage,
  eventLabel,
  eventMeta,
  fmtTime,
  openWhatsApp,
} from "@/lib/whatsapp";
import { useEventTypes, type Assignment, type ProjectEvent, type Staff } from "@/lib/db";
import { EventTypesManager } from "@/components/EventTypesManager";


const buildEventFields = (typeOptions: { value: string; label: string }[]): Field[] => [
  {
    name: "event_type",
    label: "Event",
    type: "select",
    required: true,
    options: typeOptions.length ? typeOptions : EVENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
  },

  { name: "event_date", label: "Date", type: "date", required: true },
  { name: "arrival_time", label: "Team arrival time", type: "time" },
  { name: "event_time", label: "Event time", type: "time" },
  { name: "muhurtham_time", label: "Muhurtham time (wedding day)", type: "time" },
  { name: "location", label: "Venue name", full: true, placeholder: "e.g. Kadavu Resort, Kozhikode" },
  {
    name: "google_maps_link",
    label: "Google Maps URL",
    type: "url",
    full: true,
    placeholder: "https://maps.app.goo.gl/…",
    hint: "Paste the venue's Google Maps share link — it's added to WhatsApp messages and the Work Brief PDF.",
    validate: (v) => (isMapsUrl(v) ? null : "Enter a valid link starting with https://"),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  },
  { name: "contact_name", label: "Venue contact name" },
  {
    name: "contact_phone",
    label: "Venue contact phone",
    type: "tel",
    placeholder: "98765 43210",
    hint: "10-digit number is auto-saved with +91.",
    validate: (v) => (!v || isValidPhone(v) ? null : "Enter a valid phone number"),
    transform: (v) => (v ? `+${waNumber(v)}` : v),
  },

  {
    name: "status",
    label: "Status",
    type: "select",
    options: ["pending", "confirmed", "completed", "cancelled"].map((v) => ({ value: v, label: v })),
  },
  { name: "notes", label: "Notes", type: "textarea" },
];

export function EventSchedule({
  project,
  events,
  staff,
  assignments,
  settings,
  onSaveEvent,
  onDeleteEvent,
  onAssign,
  onUnassign,
}: {
  project: any;
  events: ProjectEvent[];
  staff: Staff[];
  assignments: Assignment[];
  settings: any;
  onSaveEvent: (values: Record<string, any>) => Promise<unknown>;
  onDeleteEvent: (id: string) => void;
  onAssign: (values: Record<string, any>) => Promise<unknown>;
  onUnassign: (id: string) => void;
}) {
  const [editing, setEditing] = useState<ProjectEvent | null>(null);
  const [newCrew, setNewCrew] = useState<CrewMember[]>([]);
  const { data: eventTypes = [] } = useEventTypes();
  const eventFields = useMemo(
    () =>
      buildEventFields(
        eventTypes
          .filter((t) => t.is_active)
          .map((t) => ({ value: t.slug, label: `${t.emoji ?? "✨"} ${t.label}` })),
      ),
    [eventTypes],
  );

  const clientName = project.clients?.name ?? "Client";
  const clientPhone = project.clients?.whatsapp ?? project.clients?.phone;
  const business = settings?.business_name ?? "JOG MEDIA";

  const sorted = useMemo(
    () => [...events].sort((a, b) => (a.event_date < b.event_date ? -1 : 1)),
    [events],
  );

  const crewFor = (eventId: string) =>
    assignments.filter((a) => a.event_id === eventId || !a.event_id);

  /** Group all of this crew member's events in the project (block) or just this event (reminder). */
  const notify = async (a: CrewAssignment, e: ProjectEvent, kind: "block" | "reminder") => {
    const mine =
      kind === "block"
        ? (assignments as CrewAssignment[]).filter((x) => x.staff_id === a.staff_id && x.event_id)
        : [a];
    const rows = mine
      .map((x) => {
        const ev = events.find((v) => v.id === x.event_id) ?? (x.id === a.id ? e : null);
        return ev ? { assignmentId: x.id, event: ev, role: x.role_in_project ?? null } : null;
      })
      .filter(Boolean) as CrewGroup["rows"];
    const group: CrewGroup = {
      key: a.id,
      staffId: a.staff_id,
      staffName: a.staff?.name ?? "Crew",
      phone: (a.staff as any)?.whatsapp ?? a.staff?.phone ?? null,
      projectId: project.id,
      projectName: project.project_name ?? "Project",
      clientName,
      project,
      rows: rows.length ? rows : [{ assignmentId: a.id, event: e, role: a.role_in_project ?? null }],
      assignmentIds: (rows.length ? rows : [{ assignmentId: a.id }]).map((r: any) => r.assignmentId),
      sent: false,
    };
    sendWhatsApp(
      group,
      kind === "block"
        ? buildDateBlockMessage(group, business, settings?.phone)
        : buildEventReminderMessage(group, business, settings?.phone),
    );
    const field = kind === "block" ? "block_sent_at" : "reminder_sent_at";
    for (const id of group.assignmentIds) {
      await onAssign({ id, [field]: new Date().toISOString() });
    }
  };

  const crewSection = (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-semibold">Assign Crew for this Event</p>
      <CrewPicker
        staff={staff}
        value={newCrew}
        onChange={setNewCrew}
        projectId={project.id}
      />
    </div>
  );


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <RecordDialog
          title="Add event"
          fields={eventFields}
          initial={{ event_type: "wedding_day", status: "pending" }}
          extra={crewSection}
          onReset={() => setNewCrew([])}
          onSubmit={async (v) => {
            const eventId = (await onSaveEvent(v)) as string | undefined;
            if (eventId) {
              for (const c of newCrew) {
                await onAssign({
                  staff_id: c.staffId,
                  role_in_project: c.role,
                  event_id: eventId,
                });
              }
            }
            setNewCrew([]);
          }}
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add event
            </Button>
          }
        />
        <EventTypesManager
          trigger={
            <Button size="sm" variant="outline">
              <Plus className="mr-1.5 h-4 w-4" /> Event types
            </Button>
          }
        />

        <Button
          size="sm"
          variant="secondary"
          disabled={sorted.length === 0}
          onClick={() =>
            openWhatsApp(
              clientPhone,
              buildScheduleMessage(clientName, sorted, business, settings?.phone, project),
            )
          }
        >
          <Send className="mr-1.5 h-4 w-4" /> Send Schedule to Client (WhatsApp)
        </Button>
      </div>

      {sorted.length === 0 && (
        <div className="surface p-6 text-center text-sm text-muted-foreground">
          No events scheduled yet. Add Save the Date, Pre-wedding, Wedding Day and Reception here.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((e) => {
          const meta = eventMeta(e.event_type);
          const crew = crewFor(e.id);
          return (
            <div key={e.id} className="surface flex h-full flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    <span className="mr-1.5">{meta.emoji}</span>
                    {eventLabel(e)}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDate(e.event_date)}</p>
                </div>
                <StatusBadge value={e.status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border p-2">
                  <p className="text-muted-foreground">Team arrival</p>
                  <p className="font-medium">{fmtTime(e.arrival_time)}</p>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <p className="text-muted-foreground">
                    {e.event_type === "wedding_day" ? "Muhurtham" : "Event time"}
                  </p>
                  <p className="font-medium">{fmtTime(e.muhurtham_time ?? e.event_time)}</p>
                </div>
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {e.location ?? "Venue TBD"}
                  {e.google_maps_link && (
                    <>
                      {" · "}
                      <a
                        className="text-primary underline"
                        href={e.google_maps_link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Map
                      </a>
                    </>
                  )}
                </span>
              </p>

              {/* Crew */}
              <div className="mt-3 rounded-lg border border-border p-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium">Crew on duty</p>
                  <RecordDialog
                    title="Assign crew to event"
                    fields={[
                      {
                        name: "staff_id",
                        label: "Team member",
                        type: "select",
                        required: true,
                        options: staff.map((s) => ({ value: s.id, label: `${s.name} (${s.role})` })),
                      },
                      {
                        name: "role_in_project",
                        label: "Duty / role",
                        type: "select",
                        options: crewRoleOptions,
                        allowCustom: true,
                        placeholder: "Select role",
                      },
                    ]}
                    onSubmit={(v) => onAssign({ ...v, event_id: e.id })}
                    trigger={
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <UserPlus className="mr-1 h-3.5 w-3.5" /> Assign
                      </Button>
                    }
                  />
                </div>
                {crew.length === 0 && <p className="text-xs text-muted-foreground">Nobody assigned.</p>}
                <div className="space-y-1.5">
                  {crew.map((a) => {
                    const an = a as CrewAssignment;
                    return (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {a.staff?.name}
                        <span className="text-muted-foreground"> · {a.role_in_project ?? "Crew"}</span>
                        {!a.event_id && <span className="text-muted-foreground"> (all events)</span>}
                        <StatusBadge
                          className="ml-1.5"
                          value={an.block_sent_at ? "dates sent" : "dates pending"}
                        />
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title="Send Date Block Request (WhatsApp)"
                          onClick={() => notify(an, e, "block")}
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title="Send Event Reminder (WhatsApp)"
                          onClick={() => notify(an, e, "reminder")}
                        >
                          <BellRing className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title="Notify crew via WhatsApp"
                          onClick={() =>
                            openWhatsApp(
                              a.staff?.phone,
                              buildCrewMessage(e, clientName, a.role_in_project, business, project as any),
                            )
                          }
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                        {a.event_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => onUnassign(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openWhatsApp(
                      clientPhone,
                      buildScheduleMessage(clientName, [e], business, settings?.phone),
                    )
                  }
                >
                  <Send className="mr-1.5 h-4 w-4" /> Share event
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDeleteEvent(e.id)}>
                  <Trash2 className="mr-1.5 h-4 w-4 text-destructive" /> Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <RecordDialog
          title="Edit event"
          fields={eventFields}
          initial={editing as any}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSubmit={async (v) => {
            await onSaveEvent({ ...v, id: editing.id });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
