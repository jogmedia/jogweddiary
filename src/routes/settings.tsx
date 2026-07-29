import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { RecordDialog } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useActivity, useSettings, useUpsert } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — JOG MEDIA Studio Accounts" },
      { name: "description", content: "Studio profile, invoice details, your role and the full activity log." },
      { property: "og:title", content: "Settings — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Studio profile, invoice details and activity log." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, role, isAdmin } = useAuth();
  const { data: settings } = useSettings();
  const { data: activity = [] } = useActivity();
  const save = useUpsert("app_settings", "Settings");

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Studio profile, access and activity" />

      <div className="surface mb-5 p-5">
        <p className="mb-3 text-sm font-semibold">Your account</p>
        <p className="text-sm">{user?.email}</p>
        <p className="text-xs capitalize text-muted-foreground">Role: {role ?? "none"}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Admins manage everything. Staff see only the projects they are assigned to and can update task and
          delivery status.
        </p>
      </div>

      <div className="surface mb-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Studio details</p>
          {isAdmin && settings && (
            <RecordDialog
              title="Edit studio details"
              fields={[
                { name: "business_name", label: "Business name", required: true },
                { name: "phone", label: "Phone" },
                { name: "email", label: "Email", type: "email" },
                { name: "gstin", label: "GSTIN" },
                { name: "invoice_prefix", label: "Invoice prefix" },
                { name: "address", label: "Address", type: "textarea" },
              ]}
              initial={settings}
              onSubmit={(v) => save.mutateAsync({ ...v, id: settings.id })}
              trigger={
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              }
            />
          )}
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Business</dt>
            <dd>{settings?.business_name ?? "JOG MEDIA"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Address</dt>
            <dd>{settings?.address ?? "Kozhikode, Kerala, India"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd>{settings?.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">GSTIN</dt>
            <dd>{settings?.gstin ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="surface p-5">
        <p className="mb-3 text-sm font-semibold">Activity log</p>
        {activity.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {activity.slice(0, 50).map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span>
                  <span className="capitalize">{a.action}</span> {a.details ?? a.entity_type}
                </span>
                <span className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
