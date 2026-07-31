import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients, useProjects, useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Every wedding managed as a project: event date, venue, package, payments, balance and delivery status.",
      },
      { property: "og:title", content: "Projects — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Every wedding managed as a project with full status tracking." },
    ],
  }),
  component: ProjectsPage,
});

export const STATUS_OPTIONS = {
  project: ["open", "ongoing", "completed", "cancelled"],
  shoot: ["pending", "in_progress", "completed"],
  editing: ["pending", "in_progress", "completed"],
  album: ["pending", "in_progress", "completed"],
  delivery: ["pending", "in_progress", "delivered"],
};

const opts = (list: string[]) => list.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));

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
    { name: "event_date", label: "Event date", type: "date", required: true },
    { name: "venue", label: "Venue" },
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

function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const upsert = useUpsert("projects", "Project");
  const [search, setSearch] = useState("");
  const [pStatus, setPStatus] = useState("all");
  const [payStatus, setPayStatus] = useState("all");

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      const match =
        !q ||
        p.project_name.toLowerCase().includes(q) ||
        (p.venue ?? "").toLowerCase().includes(q) ||
        (p.clients?.name ?? "").toLowerCase().includes(q) ||
        (p.clients?.phone ?? "").includes(q);
      return (
        match &&
        (pStatus === "all" || p.project_status === pStatus) &&
        (payStatus === "all" || p.payment_status === payStatus)
      );
    });
  }, [projects, search, pStatus, payStatus]);

  const today = todayISO();

  return (
    <AppShell>
      <PageHeader
        title="Projects"
        subtitle="Each wedding is tracked end to end — shoot, editing, album, delivery and money."
        actions={
          <RecordDialog
            title="New project"
            fields={projectFields(clients)}
            initial={{
              event_date: today,
              project_status: "open",
              shoot_status: "pending",
              editing_status: "pending",
              album_status: "pending",
              delivery_status: "pending",
            }}
            onSubmit={(v) => upsert.mutateAsync(v)}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add project
              </Button>
            }
          />
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search project, client, phone or venue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={pStatus} onValueChange={setPStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Project status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.project.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={payStatus} onValueChange={setPayStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {["pending", "partial", "paid"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <EmptyState message="Loading projects…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No projects match your filters." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((p) => {
            const overdue = Number(p.balance_due ?? 0) > 0 && p.event_date < today;
            return (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                className="surface block p-4 transition-shadow hover:shadow-[var(--shadow-raised)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">{p.project_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.clients?.name ?? "—"} · {fmtDate(p.event_date)} · {p.venue ?? "Venue TBD"}
                    </p>
                  </div>
                  <StatusBadge value={overdue ? "overdue" : p.payment_status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">{inr(p.total_amount)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-muted-foreground">Received</p>
                    <p className="font-semibold">{inr(Number(p.total_amount) - Number(p.balance_due))}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-semibold">{inr(p.balance_due)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <StatusBadge value={`shoot: ${p.shoot_status}`} />
                  <StatusBadge value={`edit: ${p.editing_status}`} />
                  <StatusBadge value={`album: ${p.album_status}`} />
                  <StatusBadge value={`delivery: ${p.delivery_status}`} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
