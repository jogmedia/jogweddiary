import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { RecordDialog, type Field } from "@/components/RecordDialog";
import { ProjectDialog } from "@/components/ProjectDialog";
import { CrewPicker, type CrewMember } from "@/components/CrewPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, isMapsUrl } from "@/lib/format";
import { EVENT_TYPES } from "@/lib/whatsapp";
import { useEventTypes, useProjects, useStaff, useUpsert } from "@/lib/db";

/** Fills the venue from the chosen project once, when it is still empty. */
function VenueAutoFill({
  venue,
  current,
  set,
}: {
  venue?: string | null;
  current?: string | null;
  set: (name: string, value: any) => void;
}) {
  useEffect(() => {
    if (venue && !current) set("location", venue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);
  return null;
}

/**
 * Booking modal for a chosen calendar date — either adds a new sub-event to an
 * existing project, or opens the full new-project form.
 */
export function BookShootDialog({
  date,
  clients,
  open,
  onOpenChange,
}: {
  date: string;
  clients: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const { data: projects = [] } = useProjects();
  const { data: staff = [] } = useStaff();
  const { data: eventTypes = [] } = useEventTypes();
  const saveEvent = useUpsert("project_events", "Event");
  const saveAssignment = useUpsert("project_assignments", "Crew assignment");

  const typeOptions = useMemo(() => {
    const list = eventTypes
      .filter((t) => t.is_active)
      .map((t) => ({ value: t.slug, label: `${t.emoji ?? "✨"} ${t.label}` }));
    return list.length ? list : EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }));
  }, [eventTypes]);

  const projectOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (projects as any[])
      .filter((p) => (p.project_status ?? "open") !== "cancelled")
      .map((p) => ({
        value: p.id,
        label: `${p.clients?.name ?? "Client"} — ${p.project_name ?? "Project"}`,
      }))
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .slice(0, 60);
  }, [projects, query]);

  const modeSwitch = (
    <div className="mb-3 flex rounded-full border border-border bg-muted/40 p-1">
      {(
        [
          ["existing", "Add event to existing project"],
          ["new", "Create brand new project"],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => setMode(v)}
          className={`min-h-9 flex-1 rounded-full px-3 text-[11px] font-medium leading-tight sm:text-xs ${
            mode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (mode === "new") {
    return (
      <ProjectDialog
        clients={clients}
        initial={{ event_date: date }}
        title={`Book shoot — ${fmtDate(date)}`}
        header={modeSwitch}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }

  const fields: Field[] = [
    {
      name: "project_id",
      label: "Existing project / client",
      type: "select",
      required: true,
      full: true,
      placeholder: "Select project",
      options: projectOptions,
    },
    {
      name: "event_type",
      label: "Event / function",
      type: "select",
      required: true,
      options: typeOptions,
      allowCustom: true,
      placeholder: "Select event",
    },
    { name: "event_date", label: "Shoot date", type: "date", required: true },
    { name: "arrival_time", label: "Reporting time", type: "time" },
    { name: "event_time", label: "Event time", type: "time" },
    { name: "location", label: "Venue & location", full: true, placeholder: "e.g. Kadavu Resort, Kozhikode" },
    {
      name: "google_maps_link",
      label: "Google Maps link",
      type: "url",
      full: true,
      placeholder: "https://maps.app.goo.gl/…",
      validate: (v) => (isMapsUrl(v) ? null : "Enter a valid link starting with https://"),
      transform: (v) => (typeof v === "string" ? v.trim() : v),
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  return (
    <RecordDialog
      title={`Book shoot — ${fmtDate(date)}`}
      submitLabel="Save Event to Project"
      fields={fields}
      initial={{ event_date: date, status: "pending" }}
      open={open}
      onOpenChange={onOpenChange}
      onReset={() => {
        setCrew([]);
        setQuery("");
      }}
      header={
        <>
          {modeSwitch}
          <div className="relative mb-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client or project…"
              className="pl-9"
            />
          </div>
        </>
      }
      extra={(values, set) => {
        const project = (projects as any[]).find((p) => p.id === values.project_id);
        return (
          <div className="space-y-3">
            <VenueAutoFill venue={project?.venue} current={values.location} set={set} />
            <div className="rounded-md border border-border p-3">
              <Label className="mb-2 block text-xs font-semibold">Assign crew</Label>
              <CrewPicker
                staff={staff}
                value={crew}
                onChange={setCrew}
                date={values.event_date ?? date}
                time={values.arrival_time ?? values.event_time ?? null}
                projectId={values.project_id}
              />
            </div>
          </div>
        );
      }}
      onSubmit={async (v) => {
        const eventId = (await saveEvent.mutateAsync({
          project_id: v.project_id,
          event_type: v.event_type,
          event_date: v.event_date,
          arrival_time: v.arrival_time ?? null,
          event_time: v.event_time ?? null,
          location: v.location ?? null,
          google_maps_link: v.google_maps_link ?? null,
          notes: v.notes ?? null,
          status: "pending",
        })) as string | undefined;
        if (eventId) {
          for (const c of crew) {
            await saveAssignment.mutateAsync({
              project_id: v.project_id,
              staff_id: c.staffId,
              role_in_project: c.role,
              event_id: eventId,
            });
          }
        }
        setCrew([]);
        toast.success("Event added to project");
      }}
    />
  );
}
