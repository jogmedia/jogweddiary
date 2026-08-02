import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Download, Plane, Search, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { TravelBadge, travelState } from "@/components/TravelBadge";
import { openTicket } from "@/components/TicketUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/format";
import { eventLabel } from "@/lib/whatsapp";
import { useProjectEvents, useProjects } from "@/lib/db";
import type { Project, ProjectEvent } from "@/lib/db";

export const Route = createFileRoute("/travel")({
  head: () => ({
    meta: [
      { title: "Travel & Bookings — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Track outstation wedding trips, train and flight ticket bookings, PNR details and uploaded ticket files for every JOG MEDIA shoot.",
      },
      { property: "og:title", content: "Travel & Bookings — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Trip register with pending and confirmed ticket bookings for JOG MEDIA shoots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TravelPage,
});

type Tab = "all" | "pending" | "booked";

const MODE_LABEL: Record<string, string> = {
  train: "🚆 Train",
  flight: "✈️ Flight",
  bus: "🚌 Bus",
  cab: "🚕 Cab",
  self_drive: "🚗 Self drive",
};

type Row = {
  key: string;
  project: Project;
  date: string;
  subEvent: string;
};

function TravelPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: events = [] } = useProjectEvents();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const rows = useMemo<Row[]>(() => {
    const trips = projects.filter((p) => p.travel_required);
    const byProject = new Map<string, ProjectEvent[]>();
    events.forEach((e) => {
      const list = byProject.get(e.project_id) ?? [];
      list.push(e);
      byProject.set(e.project_id, list);
    });
    const out: Row[] = [];
    trips.forEach((p) => {
      const evs = (byProject.get(p.id) ?? []).slice().sort((a, b) => a.event_date.localeCompare(b.event_date));
      if (evs.length === 0) {
        out.push({ key: p.id, project: p, date: p.event_date, subEvent: "Main event" });
        return;
      }
      evs.forEach((e) => out.push({ key: e.id, project: p, date: e.event_date, subEvent: eventLabel(e) }));
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [projects, events]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const state = travelState(r.project, r.date);
      if (tab === "booked" && state !== "booked") return false;
      if (tab === "pending" && state !== "pending" && state !== "urgent") return false;
      if (!needle) return true;
      const hay = [
        r.project.project_name,
        r.project.clients?.name ?? "",
        r.subEvent,
        r.project.travel_mode ?? "",
        r.project.travel_notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return needle.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [rows, tab, q]);

  const totalTrips = new Set(rows.map((r) => r.project.id)).size;
  const pending = rows.filter((r) => {
    const s = travelState(r.project, r.date);
    return s === "pending" || s === "urgent";
  }).length;
  const booked = rows.filter((r) => travelState(r.project, r.date) === "booked").length;

  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: `All (${rows.length})` },
    { id: "pending", label: `Pending bookings (${pending})` },
    { id: "booked", label: `Booked (${booked})` },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Travel & Bookings"
        subtitle="Outstation trips, ticket booking status, PNR details and ticket files."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total trips" value={String(totalTrips)} hint="Projects needing travel" icon={<Plane className="h-4 w-4" />} />
        <StatCard
          label="Pending ticket bookings"
          value={String(pending)}
          hint="Not booked yet"
          tone={pending ? "destructive" : "default"}
          icon={<TriangleAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Confirmed bookings"
          value={String(booked)}
          hint="Tickets booked"
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            className="text-xs"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search client, project, PNR…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <EmptyState message="Loading trips…" />
      ) : filtered.length === 0 ? (
        <EmptyState message="No travel records match this filter." />
      ) : (
        <div className="surface overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Client / Project</th>
                <th className="px-4 py-3 font-medium">Event date</th>
                <th className="px-4 py-3 font-medium">Sub-event</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">PNR / ticket notes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ticket file</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.key} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.project.clients?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.project.project_name}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">{r.subEvent}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {MODE_LABEL[r.project.travel_mode ?? ""] ?? r.project.travel_mode ?? "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <span className="block truncate text-xs text-muted-foreground" title={r.project.travel_notes ?? ""}>
                      {r.project.travel_notes?.trim() || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TravelBadge project={r.project} eventDate={r.date} />
                  </td>
                  <td className="px-4 py-3">
                    {r.project.travel_ticket_path ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void openTicket(r.project.travel_ticket_path!)}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        {r.project.travel_ticket_name ?? "View ticket"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
