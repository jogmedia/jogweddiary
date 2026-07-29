import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { RecordDialog } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePayments, useProjects, useRemove, useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { exportCsv, exportExcel } from "@/lib/exporters";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — JOG MEDIA Studio Accounts" },
      { name: "description", content: "All client payments received across every wedding project." },
      { property: "og:title", content: "Payments — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "All client payments received across every wedding project." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: payments = [], isLoading } = usePayments();
  const { data: projects = [] } = useProjects();
  const save = useUpsert("project_payments", "Payment");
  const remove = useRemove("project_payments", "Payment");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(
    () =>
      payments.filter((p) => {
        const text = `${p.projects?.project_name ?? ""} ${p.projects?.clients?.name ?? ""} ${p.reference_no ?? ""}`.toLowerCase();
        return (
          (!q || text.includes(q.toLowerCase())) &&
          (!from || p.payment_date >= from) &&
          (!to || p.payment_date <= to)
        );
      }),
    [payments, q, from, to],
  );

  const total = rows.reduce((a, p) => a + Number(p.amount ?? 0), 0);
  const exportRows = rows.map((p) => ({
    Date: p.payment_date,
    Project: p.projects?.project_name ?? "",
    Client: p.projects?.clients?.name ?? "",
    Mode: p.payment_mode,
    Reference: p.reference_no ?? "",
    Amount: Number(p.amount),
  }));

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        subtitle="Money received from clients"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportCsv(exportRows, "payments")}>
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel(exportRows, "payments")}>
              <Download className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <RecordDialog
              title="Record payment"
              fields={[
                {
                  name: "project_id",
                  label: "Project",
                  type: "select",
                  required: true,
                  options: projects.map((p) => ({ value: p.id, label: `${p.project_name} — ${p.clients?.name ?? ""}` })),
                  full: true,
                },
                { name: "payment_date", label: "Date", type: "date", required: true },
                { name: "amount", label: "Amount", type: "number", required: true },
                {
                  name: "payment_mode",
                  label: "Mode",
                  type: "select",
                  required: true,
                  options: ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v })),
                },
                { name: "reference_no", label: "Reference no." },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              initial={{ payment_date: todayISO(), payment_mode: "cash" }}
              onSubmit={(v) => save.mutateAsync(v)}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add payment
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Payments listed" value={String(rows.length)} />
        <StatCard label="Total received" value={inr(total)} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search project or client" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Input type="date" className="w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {isLoading ? (
        <EmptyState message="Loading payments…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No payments found." />
      ) : (
        <div className="surface divide-y divide-border">
          {rows.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {p.projects?.project_name} · {inr(p.amount)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.projects?.clients?.name} · {fmtDate(p.payment_date)} · {p.payment_mode}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
