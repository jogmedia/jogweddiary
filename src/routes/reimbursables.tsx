import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Plus, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { BankAccountField } from "@/components/BankAccountField";
import {
  ClientReimbursablesDialog,
  reimbursableTotals,
} from "@/components/ClientReimbursables";
import { useProjects, useReimbursables, useUpsert, type Reimbursable } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/reimbursables")({
  head: () => ({
    meta: [
      { title: "Reimbursables & Travel Claims — JOG MEDIA" },
      {
        name: "description",
        content:
          "Central tracker for client travel claims, tickets and tolls across every JOG MEDIA wedding project.",
      },
      { property: "og:title", content: "Reimbursables & Travel Claims — JOG MEDIA" },
      {
        property: "og:description",
        content: "Track pending and settled client reimbursables across all projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReimbursablesPage,
});

const SOURCES = [
  { value: "bank", label: "Bank / UPI" },
  { value: "cash", label: "Cash in Hand" },
];

function ReimbursablesPage() {
  const { data: projects = [] } = useProjects();
  const { data: rows = [], isLoading } = useReimbursables();
  const save = useUpsert("project_reimbursables", "Reimbursable");

  const [tab, setTab] = useState<"pending" | "settled">("pending");
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const groups = useMemo(() => {
    const byProject = new Map<string, Reimbursable[]>();
    for (const r of rows) {
      if (!byProject.has(r.project_id)) byProject.set(r.project_id, []);
      byProject.get(r.project_id)!.push(r);
    }
    return [...byProject.entries()]
      .map(([projectId, list]) => {
        const project = projects.find((p) => p.id === projectId);
        const totals = reimbursableTotals(list);
        return {
          projectId,
          project,
          list,
          claims: list.filter((r) => r.kind === "claim"),
          ...totals,
        };
      })
      .sort((a, b) => b.pending - a.pending);
  }, [rows, projects]);

  const totalPending = groups.reduce((a, g) => a + Math.max(g.pending, 0), 0);
  const totalSettled = groups.reduce((a, g) => a + g.reimbursed, 0);

  const visible = groups.filter((g) => (tab === "pending" ? g.pending > 0 : g.pending <= 0));

  const remind = (g: (typeof groups)[number]) => {
    const lines = [
      "📋 *REIMBURSABLE / TRAVEL CLAIM*",
      g.project ? `Project: ${g.project.project_name}` : "",
      g.project?.clients?.name ? `Client: ${g.project.clients.name}` : "",
      "",
      "*Items paid on your behalf*",
      ...g.claims.map(
        (c, i) => `${i + 1}. ${c.item_name} — ${inr(c.amount)} (${fmtDate(c.entry_date)})`,
      ),
      "",
      `Total claimed: ${inr(g.claimed)}`,
      `Already reimbursed: ${inr(g.reimbursed)}`,
      `*Balance to be settled: ${inr(g.pending)}*`,
      "",
      "These are actual travel / logistics bills only and are separate from the photography package amount.",
    ].filter(Boolean);
    openWhatsApp(g.project?.clients?.phone ?? null, lines.join("\n"));
  };

  const claimFields: Field[] = [
    {
      name: "project_id",
      label: "Project",
      type: "select",
      required: true,
      options: projects.map((p) => ({
        value: p.id,
        label: `${p.project_name}${p.clients?.name ? ` · ${p.clients.name}` : ""}`,
      })),
    },
    {
      name: "item_name",
      label: "Item / description",
      required: true,
      placeholder: "e.g. Train ticket — Kozhikode to Chennai",
    },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "entry_date", label: "Date", type: "date", required: true },
    { name: "payment_mode", label: "Paid from", type: "select", required: true, options: SOURCES },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const active = openProject ? groups.find((g) => g.projectId === openProject) : null;
  const activeProject = openProject ? projects.find((p) => p.id === openProject) : null;

  return (
    <AppShell>
      <PageHeader
        title="Reimbursables"
        subtitle="Travel claims, tickets and tolls paid on behalf of clients — across all projects"
        actions={
          <Button className="min-h-11" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Log new travel / expense claim
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total outstanding to collect"
          value={inr(totalPending)}
          hint={`${visible.length} client${visible.length === 1 ? "" : "s"} in this view`}
          tone={totalPending > 0 ? "destructive" : "success"}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard label="Total settled" value={inr(totalSettled)} tone="success" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pending" className="flex-1 sm:flex-none">
            Pending settlement
          </TabsTrigger>
          <TabsTrigger value="settled" className="flex-1 sm:flex-none">
            Completed / settled
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <EmptyState message="Loading claims…" />
        ) : visible.length === 0 ? (
          <EmptyState
            message={
              tab === "pending"
                ? "No pending reimbursables. Everything is settled."
                : "No settled claims yet."
            }
          />
        ) : (
          visible.map((g) => (
            <div key={g.projectId} className="surface p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {g.project?.clients?.name ?? "Unknown client"}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {g.project?.project_name ?? "—"}
                    {g.project?.event_date ? ` · ${fmtDate(g.project.event_date)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.claims.length} claim item{g.claims.length === 1 ? "" : "s"} · claimed{" "}
                    {inr(g.claimed)} · settled {inr(g.reimbursed)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Pending
                  </p>
                  <p
                    className={`text-base font-semibold ${
                      g.pending > 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    {inr(Math.max(g.pending, 0))}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button size="sm" variant="outline" className="min-h-11" onClick={() => remind(g)}>
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Send WhatsApp reminder
                </Button>
                <Button
                  size="sm"
                  className="min-h-11"
                  onClick={() => setOpenProject(g.projectId)}
                >
                  View &amp; settle
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {openProject && (
        <ClientReimbursablesDialog
          projectId={openProject}
          projectName={activeProject?.project_name}
          clientName={activeProject?.clients?.name}
          clientPhone={activeProject?.clients?.phone}
          rows={active?.list ?? []}
          open={!!openProject}
          onOpenChange={(v) => !v && setOpenProject(null)}
        />
      )}

      {adding && (
        <RecordDialog
          title="Log new travel / expense claim"
          submitLabel="Save claim"
          fields={claimFields}
          initial={{ entry_date: todayISO(), payment_mode: "cash" }}
          open={adding}
          onOpenChange={(v) => !v && setAdding(false)}
          extra={(values, set) =>
            values.payment_mode === "bank" ? (
              <BankAccountField
                label="Bank / UPI account"
                value={values.bank_account_id ?? null}
                onChange={(v) => set("bank_account_id", v)}
              />
            ) : null
          }
          onSubmit={async (v) => {
            await save.mutateAsync({
              ...v,
              kind: "claim",
              amount: Number(v.amount || 0),
              bank_account_id: v.payment_mode === "bank" ? (v.bank_account_id ?? null) : null,
            });
            setAdding(false);
          }}
        />
      )}
    </AppShell>
  );
}
