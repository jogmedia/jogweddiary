import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Phone, MessageCircle, Pencil, Trash2, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClients, useProjects, useRemove, useUpsert, type Client } from "@/lib/db";
import { digitsOnly, inr } from "@/lib/format";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content: "Manage wedding clients, contact numbers, WhatsApp and addresses for JOG MEDIA.",
      },
      { property: "og:title", content: "Clients — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Manage wedding clients and their contact details." },
    ],
  }),
  component: ClientsPage,
});

const FIELDS: Field[] = [
  { name: "name", label: "Client name", required: true, full: true },
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
    name: "whatsapp",
    label: "WhatsApp",
    type: "tel",
    placeholder: "98765 43210",
    validate: (v: any) => (!v || isValidPhone(v) ? null : "Enter a valid WhatsApp number"),
    transform: (v: any) => (v ? `+${waNumber(v)}` : v),
  },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Address", type: "textarea" },
];

function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const upsert = useUpsert("clients", "Client");
  const remove = useRemove("clients", "Client");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  const statsFor = (id: string) => {
    const list = projects.filter((p) => p.client_id === id);
    return {
      count: list.length,
      value: list.reduce((a, p) => a + Number(p.total_amount ?? 0), 0),
    };
  };

  return (
    <AppShell>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"} on record`}
        actions={
          <RecordDialog
            title="New client"
            fields={FIELDS}
            onSubmit={(v) => upsert.mutateAsync(v)}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add client
              </Button>
            }
          />
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, phone or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <EmptyState message="Loading clients…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No clients yet. Add your first client to get started." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const s = statsFor(c.id);
            return (
              <div key={c.id} className="surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone ?? "No phone"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {c.address && <p className="mt-2 text-xs text-muted-foreground">{c.address}</p>}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">
                    {s.count} project{s.count === 1 ? "" : "s"}
                  </span>
                  <span className="font-medium">{inr(s.value)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild disabled={!c.phone}>
                    <a href={`tel:${digitsOnly(c.phone)}`}>
                      <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <a
                      href={`https://wa.me/${waNumber(c.whatsapp ?? c.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <RecordDialog
          title="Edit client"
          fields={FIELDS}
          initial={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSubmit={(v) => upsert.mutateAsync({ ...v, id: editing.id })}
        />
      )}
    </AppShell>
  );
}
