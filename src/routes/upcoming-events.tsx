import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Send, Users, ArrowRight, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { EditCrewDialog } from "@/components/EditCrewDialog";
import { useAssignments, useEventTypes, useProjectEvents, useSettings, useUpsert } from "@/lib/db";
import { fmtDate, isMapsUrl, isValidPhone, todayISO, waNumber } from "@/lib/format";
import { EVENT_TYPES, buildScheduleMessage, eventLabel, eventMeta, fmtTime, openWhatsApp } from "@/lib/whatsapp";
import { prettyRole } from "@/lib/roles";

export const Route = createFileRoute("/upcoming-events")({
  head: () => ({
    meta: [
      { title: "Upcoming events — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Every upcoming wedding shoot and sub-event with countdown, reporting time, venue map, assigned crew and quick edit actions.",
      },
      { property: "og:title", content: "Upcoming events — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Chronological list of upcoming shoots with crew status and quick edits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpcomingEventsPage,
});

const RANGES = [
  { value: "all", label: "All Upcoming" },
  { value: "7", label: "Next 7 Days" },
  { value: "month", label: "This Month" },
] as const;

const buildEventFields = (typeOptions: { value: string; label: string }[]): Field[] => [
  {
    name: "event_type",
    label: "Event",
    type: "select",
    required: true,
    options: typeOptions.length ? typeOptions : EVENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
  },
  { name: "event_date", label: "Date", type: "date", required: true },
  { name: "arrival_time", label: "Reporting / arrival time", type: "time" },
  { name: "event_time", label: "Event time", type: "time" },
  { name: "muhurtham_time", label: "Muhurtham time (wedding day)", type: "time" },
  { name: "location", label: "Venue name", full: true, placeholder: "e.g. Kadavu Resort, Kozhikode" },
  {
    name: "google_maps_link",
    label: "Google Maps URL",
    type: "url",
    full: true,
    placeholder: "https://maps.app.goo.gl/…",
    validate: (v) => (isMapsUrl(v) ? null : "Enter a valid link starting with https://"),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  },
  { name: "contact_name", label: "Venue contact name" },
  {
    name: "contact_phone",
    label: "Venue contact phone",
    type: "tel",
    placeholder: "98765 43210",
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

const daysUntil = (date: string) => {
  const today = new Date(todayISO());
  const d = new Date(date);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
};

const countdown = (date: string) => {
  const n = daysUntil(date);
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
};

function UpcomingEventsPage() {
  const { data: events = [] } = useProjectEvents();
  const { data: assignments = [] } = useAssignments();
  const { data: eventTypes = [] } = useEventTypes();
  const { data: settings } = useSettings();
  const saveEvent = useUpsert("project_events", "Event");

  const [range, setRange] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const typeOptions = useMemo(
    () =>
      eventTypes
        .filter((t) => t.is_active)
        .map((t) => ({ value: t.slug, label: `${t.emoji ?? "✨"} ${t.label}` })),
    [eventTypes],
  );
  const eventFields = useMemo(() => buildEventFields(typeOptions), [typeOptions]);

  const today = todayISO();
  const upcoming = useMemo(
    () =>
      (events as any[])
        .filter((e) => e.event_date >= today && e.status !== "cancelled")
        .sort((a, b) => (a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : 0)),
    [events, today],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const monthPrefix = today.slice(0, 7);
    return upcoming.filter((e) => {
      if (range === "7" && daysUntil(e.event_date) > 7) return false;
      if (range === "month" && !e.event_date.startsWith(monthPrefix)) return false;
      if (type !== "all" && e.event_type !== type) return false;
      if (!q) return true;
      const p = e.projects ?? {};
      const hay = [
        p.clients?.name,
        p.project_name,
        e.location,
        e.contact_name,
        p.place_district,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [upcoming, range, type, query, today]);

  const next7 = upcoming.filter((e) => daysUntil(e.event_date) <= 7).length;
  const needCrew = upcoming.filter(
    (e) => !assignments.some((a) => a.event_id === e.id || (!a.event_id && a.project_id === e.project_id)),
  ).length;

  const crewFor = (e: any) =>
    assignments.filter((a) => a.event_id === e.id || (!a.event_id && a.project_id === e.project_id));

  const shareSchedule = (e: any) => {
    const crew = crewFor(e);
    const business = settings?.business_name ?? "JOG MEDIA";
    const clientName = e.projects?.clients?.name ?? "Client";
    const message = buildScheduleMessage(clientName, [e], business, (settings as any)?.phone, e.projects);
    if (crew.length === 0) {
      openWhatsApp(null, message);
      return;
    }
    crew.forEach((a) => openWhatsApp((a.staff as any)?.whatsapp ?? a.staff?.phone, message));
  };

  return (
    <AppShell>
      <PageHeader
        title="Upcoming Events"
        subtitle="Every scheduled shoot in date order, with reporting time, venue and crew status."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard compact label="Upcoming" value={String(upcoming.length)} />
        <StatCard compact label="Next 7 days" value={String(next7)} tone="info" />
        <StatCard compact label="Needs crew" value={String(needCrew)} tone="destructive" />
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "outline"}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-full sm:w-52">
              <SelectValue placeholder="Filter by event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {(typeOptions.length
                ? typeOptions
                : EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))
              ).map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder="Search client, venue or district…"
          className="h-11"
        />
      </div>

      {filtered.length === 0 && <EmptyState message="No upcoming events match these filters." />}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((e) => {
          const p = e.projects ?? {};
          const crew = crewFor(e);
          const meta = eventMeta(e.event_type);
          const status = crew.length > 0 ? "crew assigned" : "needs crew";
          return (
            <div key={e.id} className="surface flex h-full w-full flex-col overflow-hidden p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                    {fmtDate(e.event_date)}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {countdown(e.event_date)}
                    </span>
                  </p>
                  <Link
                    to="/projects/$id"
                    params={{ id: e.project_id }}
                    className="mt-1 block truncate text-base font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {p.clients?.name ?? p.project_name ?? "Project"}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="mr-1">{meta.emoji}</span>
                    {eventLabel(e)}
                    {p.project_name ? ` · ${p.project_name}` : ""}
                  </p>
                </div>
                <StatusBadge value={status} className="shrink-0" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border p-2">
                  <p className="text-muted-foreground">Reporting time</p>
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
                <span className="min-w-0">
                  {e.location ?? "Venue TBD"}
                  {p.place_district ? ` · ${p.place_district}` : ""}
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

              <div className="mt-3 rounded-lg border border-border p-2">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                  <Users className="h-3.5 w-3.5 text-primary" /> Crew on duty
                </p>
                {crew.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nobody assigned yet.</p>
                ) : (
                  <ul className="space-y-0.5 text-xs">
                    {crew.map((a) => (
                      <li key={a.id} className="truncate">
                        {a.staff?.name}
                        <span className="text-muted-foreground">
                          {" "}
                          · {prettyRole(a.role_in_project ?? a.staff?.role)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Event
                </Button>
                <EditCrewDialog
                  projectId={e.project_id}
                  eventId={e.id}
                  date={e.event_date}
                  title={`${eventLabel(e)} · ${fmtDate(e.event_date)}`}
                />
                <Button size="sm" variant="secondary" onClick={() => shareSchedule(e)}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> WhatsApp Schedule to Crew
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/projects/$id" params={{ id: e.project_id }}>
                    View Full Project <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
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
          initial={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSubmit={async (v) => {
            await saveEvent.mutateAsync({ ...v, id: editing.id });
            setEditing(null);
          }}
        />
      )}
    </AppShell>
  );
}
