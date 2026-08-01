import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { useAssignments, useRemove, useStaff, useUpsert, type Staff } from "@/lib/db";
import { digitsOnly, isValidPhone, waNumber } from "@/lib/format";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff — JOG MEDIA Studio Accounts" },
      { name: "description", content: "Photographers, videographers and editors with their project assignments." },
      { property: "og:title", content: "Staff — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Crew members and their project assignments." },
    ],
  }),
  component: StaffPage,
});

const FIELDS: Field[] = [
  { name: "name", label: "Name", required: true },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    placeholder: "98765 43210",
    hint: "Saved with +91 country code.",
    validate: (v: any) => (!v || isValidPhone(v) ? null : "Enter a valid phone number"),
    transform: (v: any) => (v ? `+${waNumber(v)}` : v),
  },
  {
    name: "role",
    label: "Role",
    type: "select",
    options: ["photographer", "videographer", "editor", "album designer", "manager", "staff"].map((v) => ({
      value: v,
      label: v,
    })),
  },
  {
    name: "user_id",
    label: "Login user ID (optional)",
    full: true,
    placeholder: "Paste the staff member's account ID to grant app access",
  },
];

function StaffPage() {
  const { data: staff = [], isLoading } = useStaff();
  const { data: assignments = [] } = useAssignments();
  const save = useUpsert("staff", "Staff member");
  const remove = useRemove("staff", "Staff member");
  const [editing, setEditing] = useState<Staff | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Staff"
        subtitle="Crew directory and project load"
        actions={
          <RecordDialog
            title="Add staff member"
            fields={FIELDS}
            initial={{ role: "photographer" }}
            onSubmit={(v) => save.mutateAsync(v)}
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add staff
              </Button>
            }
          />
        }
      />

      {isLoading ? (
        <EmptyState message="Loading staff…" />
      ) : staff.length === 0 ? (
        <EmptyState message="No staff added yet." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {staff.map((s) => {
            const count = assignments.filter((a) => a.staff_id === s.id).length;
            return (
              <div key={s.id} className="surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-semibold">{s.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{s.role}</p>
                  </div>
                  <StatusBadge value={s.active_status ? "active" : "pending"} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {count} project{count === 1 ? "" : "s"} assigned
                  {s.user_id ? " · app access enabled" : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <a href={`tel:${digitsOnly(s.phone)}`}>
                      <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <RecordDialog
          title="Edit staff member"
          fields={FIELDS}
          initial={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSubmit={(v) => save.mutateAsync({ ...v, id: editing.id })}
        />
      )}
    </AppShell>
  );
}
