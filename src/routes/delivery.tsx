import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { RecordDialog } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { useDeliveries, useProjects, useRemove, useUpsert } from "@/lib/db";
import { fmtDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery — JOG MEDIA Studio Accounts" },
      { name: "description", content: "Album, video and gallery delivery records for every wedding project." },
      { property: "og:title", content: "Delivery — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Album, video and gallery delivery records." },
    ],
  }),
  component: DeliveryPage,
});

function DeliveryPage() {
  const { data: deliveries = [], isLoading } = useDeliveries();
  const { data: projects = [] } = useProjects();
  const save = useUpsert("delivery_records", "Delivery");
  const remove = useRemove("delivery_records", "Delivery");

  const pending = projects.filter((p) => p.delivery_status !== "delivered").length;

  return (
    <AppShell>
      <PageHeader
        title="Delivery"
        subtitle="What has been handed over to clients"
        actions={
          <RecordDialog
            title="Add delivery record"
            fields={[
              {
                name: "project_id",
                label: "Project",
                type: "select",
                required: true,
                full: true,
                options: projects.map((p) => ({ value: p.id, label: p.project_name })),
              },
              {
                name: "delivery_type",
                label: "Delivery type",
                type: "select",
                required: true,
                options: ["Photos", "Video", "Album", "Pen drive", "Online gallery"].map((v) => ({
                  value: v,
                  label: v,
                })),
              },
              { name: "delivery_date", label: "Delivery date", type: "date" },
              { name: "file_link", label: "File link", full: true },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            initial={{ delivery_date: todayISO() }}
            onSubmit={(v) => save.mutateAsync(v)}
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add delivery
              </Button>
            }
          />
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Delivered items" value={String(deliveries.length)} tone="success" />
        <StatCard label="Projects pending delivery" value={String(pending)} tone="warning" />
      </div>

      {isLoading ? (
        <EmptyState message="Loading deliveries…" />
      ) : deliveries.length === 0 ? (
        <EmptyState message="No deliveries recorded yet." />
      ) : (
        <div className="surface divide-y divide-border">
          {deliveries.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {d.projects?.project_name} · {d.delivery_type}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.projects?.clients?.name} · {fmtDate(d.delivery_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value="delivered" />
                {d.file_link && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={d.file_link} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(d.id)}>
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
