import { CalendarClock, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAssignments, useProjectEvents, useProjects } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { buildCrewMessage, eventLabel, eventMeta, fmtTime, openWhatsApp } from "@/lib/whatsapp";

type Props = {
  /** Strict ISO date (YYYY-MM-DD) to show shoots for. */
  date: string;
  title: string;
  empty?: string;
};

export function ShootDay({ date, title, empty = "No shoots scheduled for Today / Tomorrow" }: Props) {
  const { data: projects = [] } = useProjects();
  const { data: events = [] } = useProjectEvents();
  const { data: assignments = [] } = useAssignments();

  const evs = events.filter((e) => e.event_date === date);
  const evProjectIds = new Set(evs.map((e) => e.project_id));
  const bareProjects = projects.filter((p) => p.event_date === date && !evProjectIds.has(p.id));

  type Item = {
    key: string;
    projectId: string;
    eventId: string | null;
    title: string;
    client: string;
    venue: string | null;
    mapLink: string | null;
    reporting: string;
    crew: { id: string; name: string; phone: string | null; role: string; message: string }[];
  };


  const items: Item[] = [
    ...evs.map((e) => {
      const project = projects.find((p) => p.id === e.project_id);
      const clientName = e.projects?.clients?.name ?? project?.clients?.name ?? "—";
      const crew = assignments
        .filter((a) => (a.event_id ? a.event_id === e.id : a.project_id === e.project_id))
        .map((a) => ({
          id: a.id,
          name: a.staff?.name ?? "Crew",
          phone: a.staff?.phone ?? null,
          role: a.role_in_project || a.staff?.role || "Crew",
          message: buildCrewMessage(e, clientName, a.role_in_project || a.staff?.role),
        }));
      return {
        key: e.id,
        projectId: e.project_id,
        title: `${eventMeta(e.event_type).emoji} ${eventLabel(e)} — ${e.projects?.project_name ?? project?.project_name ?? "Project"}`,
        client: clientName,
        venue: e.location,
        mapLink: e.google_maps_link,
        reporting: fmtTime(e.arrival_time ?? e.event_time ?? e.muhurtham_time),
        crew,
      };
    }),
    ...bareProjects.map((p) => {
      const clientName = p.clients?.name ?? "—";
      const crew = assignments
        .filter((a) => a.project_id === p.id)
        .map((a) => ({
          id: a.id,
          name: a.staff?.name ?? "Crew",
          phone: a.staff?.phone ?? null,
          role: a.role_in_project || a.staff?.role || "Crew",
          message: buildCrewMessage(
            {
              event_type: "wedding_day",
              event_date: p.event_date,
              location: p.venue,
            },
            clientName,
            a.role_in_project || a.staff?.role,
          ),
        }));
      return {
        key: p.id,
        projectId: p.id,
        title: `💍 ${p.project_name}`,
        client: clientName,
        venue: p.venue,
        mapLink: null,
        reporting: "—",
        crew,
      };
    }),
  ];

  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="h-4 w-4" />
        {title}
        <span className="ml-auto text-xs font-normal text-muted-foreground">{fmtDate(date)}</span>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-3">
          {items.map((it) => (
            <div key={it.key} className="rounded-xl border border-border p-3">
              <Link to="/projects/$id" params={{ id: it.projectId }} className="block">
                <p className="text-sm font-semibold">{it.title}</p>
                <p className="text-xs text-muted-foreground">Client: {it.client}</p>
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {it.venue || "Venue TBD"}
                </span>
                <span>Reporting: {it.reporting}</span>
                {it.mapLink && (
                  <a href={it.mapLink} target="_blank" rel="noreferrer" className="text-primary underline">
                    Open map
                  </a>
                )}
              </div>

              <div className="mt-3 border-t border-border pt-2">
                {it.crew.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">No crew assigned yet</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {it.crew.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-xs capitalize text-muted-foreground">{c.role}</p>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 bg-[hsl(142_70%_35%)] text-white hover:bg-[hsl(142_70%_29%)]"
                          onClick={() => openWhatsApp(c.phone, c.message)}
                        >
                          WhatsApp
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
