import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { RecordDialog } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects, useRemove, useStaff, useTasks, useUpsert } from "@/lib/db";
import { fmtDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — JOG MEDIA Studio Accounts" },
      { name: "description", content: "Studio task list across all wedding projects with owners and due dates." },
      { property: "og:title", content: "Tasks — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Studio task list across all wedding projects." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: staff = [] } = useStaff();
  const save = useUpsert("project_tasks", "Task");
  const remove = useRemove("project_tasks", "Task");
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      tasks.filter((t) =>
        !q || `${t.task_name} ${t.projects?.project_name ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [tasks, q],
  );

  const today = todayISO();
  const overdue = rows.filter((t) => t.task_status !== "done" && t.due_date && t.due_date < today).length;

  return (
    <AppShell>
      <PageHeader
        title="Tasks"
        subtitle="Everything the crew needs to finish"
        actions={
          <RecordDialog
            title="New task"
            fields={[
              {
                name: "project_id",
                label: "Project",
                type: "select",
                required: true,
                full: true,
                options: projects.map((p) => ({ value: p.id, label: p.project_name })),
              },
              { name: "task_name", label: "Task", required: true, full: true },
              { name: "due_date", label: "Due date", type: "date" },
              {
                name: "task_status",
                label: "Status",
                type: "select",
                options: ["pending", "in_progress", "done"].map((v) => ({ value: v, label: v })),
              },
              {
                name: "assigned_to",
                label: "Assign to",
                type: "select",
                options: staff.map((s) => ({ value: s.id, label: s.name })),
              },
            ]}
            initial={{ task_status: "pending" }}
            onSubmit={(v) => save.mutateAsync(v)}
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add task
              </Button>
            }
          />
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open tasks" value={String(rows.filter((t) => t.task_status !== "done").length)} />
        <StatCard label="Overdue" value={String(overdue)} tone="destructive" />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <EmptyState message="Loading tasks…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No tasks yet." />
      ) : (
        <div className="surface divide-y divide-border">
          {rows.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.task_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.projects?.project_name} · due {fmtDate(t.due_date)} {t.staff?.name ? `· ${t.staff.name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  value={
                    t.task_status !== "done" && t.due_date && t.due_date < today ? "overdue" : t.task_status
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => save.mutate({ id: t.id, task_status: t.task_status === "done" ? "pending" : "done" })}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
