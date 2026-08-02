import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useProjectEvents, useProjects } from "@/lib/db";
import { fmtDate, inr } from "@/lib/format";
import { eventLabel, eventMeta, fmtTime } from "@/lib/whatsapp";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Shoot calendar — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Month calendar of every booked wedding shoot and sub-event, colour coded by payment and shoot status, with double-booking alerts.",
      },
      { property: "og:title", content: "Shoot calendar — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Booked wedding dates, sub-events and double-booking warnings in one calendar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

type Item = {
  id: string;
  date: string;
  time: string | null;
  title: string;
  sub: string;
  projectId: string;
  tone: "success" | "info" | "danger";
};

const TONE_CLASS: Record<Item["tone"], string> = {
  success: "bg-success/12 text-success border-success/30",
  info: "bg-info/12 text-info border-info/30",
  danger: "bg-destructive/12 text-destructive border-destructive/30",
};

function CalendarPage() {
  const { data: projects = [] } = useProjects();
  const { data: events = [] } = useProjectEvents();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const items = useMemo<Item[]>(() => {
    const projectTone = (p: any): Item["tone"] => {
      if (Number(p.balance_due ?? 0) > 0) return "danger";
      if (p.project_status === "completed" || p.delivery_status === "delivered") return "success";
      return "info";
    };
    const byProject = new Map(projects.map((p) => [p.id, p]));
    const evItems: Item[] = events.map((e) => {
      const p: any = byProject.get(e.project_id);
      return {
        id: e.id,
        date: e.event_date,
        time: e.muhurtham_time ?? e.event_time ?? e.arrival_time ?? null,
        title: eventLabel(e),
        sub: `${p?.clients?.name ?? p?.project_name ?? "Project"} · ${e.location ?? "Venue TBD"}`,
        projectId: e.project_id,
        tone: p ? projectTone(p) : "info",
      };
    });
    const withEvents = new Set(events.map((e) => e.project_id));
    const projItems: Item[] = projects
      .filter((p) => !withEvents.has(p.id))
      .map((p: any) => ({
        id: `p-${p.id}`,
        date: p.event_date,
        time: null,
        title: p.project_name,
        sub: `${p.clients?.name ?? "Client"} · ${inr(p.balance_due)} due`,
        projectId: p.id,
        tone: projectTone(p),
      }));
    return [...evItems, ...projItems];
  }, [events, projects]);

  const monthItems = useMemo(() => {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    return items.filter((i) => i.date?.startsWith(key));
  }, [items, cursor]);

  const byDay = useMemo(() => {
    const map = new Map<number, Item[]>();
    monthItems.forEach((i) => {
      const day = Number(i.date.slice(8, 10));
      map.set(day, [...(map.get(day) ?? []), i]);
    });
    return map;
  }, [monthItems]);

  const conflicts = useMemo(
    () =>
      Array.from(byDay.entries())
        .filter(([, list]) => new Set(list.map((i) => i.projectId)).size > 1)
        .sort((a, b) => a[0] - b[0]),
    [byDay],
  );

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayStr = new Date().toISOString().slice(0, 10);

  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <AppShell>
      <PageHeader
        title="Calendar"
        subtitle="All booked shoots and sub-events. Red = payment pending, blue = upcoming, green = completed."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">
              {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {conflicts.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Double booking alert</p>
            <p className="text-xs">
              {conflicts
                .map(
                  ([day, list]) =>
                    `${day} ${cursor.toLocaleDateString("en-IN", { month: "short" })}: ${new Set(
                      list.map((i) => i.sub.split(" · ")[0]),
                    ).size} clients`,
                )
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="surface overflow-hidden p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d.slice(0, 1)}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e${idx}`} className="min-h-20 rounded-lg" />;
            const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const list = byDay.get(day) ?? [];
            const conflict = new Set(list.map((i) => i.projectId)).size > 1;
            return (
              <div
                key={day}
                className={`min-h-20 rounded-lg border p-1.5 ${
                  conflict ? "border-destructive/50 bg-destructive/5" : "border-border"
                } ${iso === todayStr ? "ring-1 ring-primary" : ""}`}
              >
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">{day}</p>
                <div className="space-y-1">
                  {list.slice(0, 3).map((i) => (
                    <Link
                      key={i.id}
                      to="/projects/$id"
                      params={{ id: i.projectId }}
                      className={`block truncate rounded border px-1 py-0.5 text-[10px] leading-tight ${TONE_CLASS[i.tone]}`}
                      title={`${i.title} · ${i.sub}`}
                    >
                      {i.title}
                    </Link>
                  ))}
                  {list.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{list.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface mt-6 divide-y divide-border">
        <p className="p-3 text-sm font-semibold">This month</p>
        {monthItems.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nothing scheduled this month.</p>
        )}
        {[...monthItems]
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .map((i) => (
            <Link
              key={i.id}
              to="/projects/$id"
              params={{ id: i.projectId }}
              className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.sub}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{fmtDate(i.date)}</p>
                <p className="text-xs text-muted-foreground">{i.time ? fmtTime(i.time) : ""}</p>
              </div>
            </Link>
          ))}
      </div>
    </AppShell>
  );
}
