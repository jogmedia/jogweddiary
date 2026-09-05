import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, MessageCircle, Search, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useProjects, useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pending-payments")({
  head: () => ({
    meta: [
      { title: "Pending Payments — JOG MEDIA" },
      {
        name: "description",
        content:
          "Track outstanding client balances, send WhatsApp payment reminders and record incoming payments for JOG MEDIA projects.",
      },
      { property: "og:title", content: "Pending Payments — JOG MEDIA" },
      {
        property: "og:description",
        content: "Outstanding client balances with quick reminders and payment recording.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PendingPaymentsPage,
});

const PAY_MODES = ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v }));

const FILTERS = [
  { value: "all", label: "All Pending" },
  { value: "shoot", label: "Shoot Done" },
  { value: "delivered", label: "Delivered (Unpaid)" },
] as const;

/** Projects that still owe money — used by the page and the sidebar badge. */
export function usePendingProjects() {
  const { data: projects = [], isLoading } = useProjects();
  const rows = (projects as any[]).filter((p) => Number(p.balance_due ?? 0) > 0);
  return { rows, isLoading };
}

function reminderMessage(p: any) {
  const client = p.clients?.name ?? "";
  const total = Number(p.total_amount ?? 0);
  const balance = Number(p.balance_due ?? 0);
  const received = total - balance;
  return [
    `Dear ${client},`,
    "",
    `Greetings from JOG MEDIA 📸`,
    "",
    `This is a gentle reminder regarding the pending balance for your event:`,
    `• Project: ${p.project_name}`,
    `• Event date: ${fmtDate(p.event_date)}`,
    p.venue ? `• Venue: ${p.venue}` : null,
    "",
    `• Agreed amount: ${inr(total)}`,
    `• Received so far: ${inr(received)}`,
    `• Balance pending: ${inr(balance)}`,
    "",
    `Kindly arrange the balance at your convenience. Thank you for choosing us!`,
    "",
    `— JOG MEDIA, Kozhikode`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function PendingPaymentsPage() {
  const { rows, isLoading } = usePendingProjects();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [payFor, setPayFor] = useState<any | null>(null);
  const save = useUpsert("project_payments", "Payment");

  const list = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows
      .filter((p) => {
        if (filter === "shoot" && String(p.shoot_status) !== "completed") return false;
        if (filter === "delivered" && String(p.delivery_status) !== "delivered") return false;
        const hay = `${p.clients?.name ?? ""} ${p.project_name ?? ""} ${p.venue ?? ""}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .sort((a, b) => Number(b.balance_due ?? 0) - Number(a.balance_due ?? 0));
  }, [rows, q, filter]);

  const totalPending = list.reduce((a, p) => a + Number(p.balance_due ?? 0), 0);

  const fields: Field[] = [
    { name: "payment_date", label: "Date", type: "date", required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "payment_mode", label: "Mode", type: "select", options: PAY_MODES, required: true },
    { name: "reference_no", label: "Reference no." },
    { name: "notes", label: "Notes", type: "textarea", full: true },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Pending Payments"
        subtitle="Every project with a balance still to collect"
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total pending to collect" value={inr(totalPending)} tone="destructive" />
        <StatCard
          label="Pending clients"
          value={`${list.length}`}
          hint={list.length === 1 ? "1 client pending" : `${list.length} clients pending`}
        />
      </div>

      <div className="surface mt-4 w-full overflow-hidden p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search client name or project…"
            className="h-11 pl-9"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <p className="surface p-8 text-center text-sm text-muted-foreground">
            No pending balances. Everything is collected 🎉
          </p>
        ) : (
          list.map((p) => {
            const total = Number(p.total_amount ?? 0);
            const balance = Number(p.balance_due ?? 0);
            const received = total - balance;
            return (
              <div key={p.id} className="surface w-full overflow-hidden p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/projects/$id"
                      params={{ id: p.id }}
                      className="block truncate text-base font-semibold text-primary hover:underline"
                    >
                      {p.clients?.name ?? "Client"}
                    </Link>
                    <p className="truncate text-sm text-foreground">{p.project_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fmtDate(p.event_date)}
                      {p.venue ? ` · ${p.venue}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Balance due
                    </p>
                    <p className="text-lg font-semibold tabular-nums whitespace-nowrap text-destructive">
                      {inr(balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-3">
                  <p className="text-muted-foreground">
                    Agreed
                    <span className="mt-0.5 block text-sm font-medium tabular-nums text-foreground">
                      {inr(total)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Received
                    <span className="mt-0.5 block text-sm font-medium tabular-nums text-success">
                      {inr(received)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Pending
                    <span className="mt-0.5 block text-sm font-semibold tabular-nums text-destructive">
                      {inr(balance)}
                    </span>
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => openWhatsApp(p.clients?.whatsapp || p.clients?.phone, reminderMessage(p))}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp reminder
                  </Button>
                  <Button
                    size="sm"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => setPayFor(p)}
                  >
                    <Wallet className="mr-1.5 h-4 w-4" /> Record payment
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="min-h-11 flex-1 sm:flex-none">
                    <Link to="/projects/$id" params={{ id: p.id }}>
                      View project <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {payFor && (
        <RecordDialog
          key={payFor.id}
          open
          onOpenChange={(v) => !v && setPayFor(null)}
          title={`Record payment — ${payFor.clients?.name ?? payFor.project_name}`}
          fields={fields}
          initial={{
            payment_date: todayISO(),
            amount: Number(payFor.balance_due ?? 0) || "",
            payment_mode: "upi",
          }}
          submitLabel="Save payment"
          extra={(values, set) =>
            needsBankAccount(values.payment_mode) ? (
              <BankAccountField
                label="Received Into Bank Account"
                value={values.bank_account_id ?? null}
                onChange={(v) => set("bank_account_id", v)}
              />
            ) : null
          }
          onSubmit={async (v) => {
            await save.mutateAsync({
              ...v,
              project_id: payFor.id,
              bank_account_id: needsBankAccount(v.payment_mode) ? (v.bank_account_id ?? null) : null,
            });
            setPayFor(null);
          }}
        />
      )}
    </AppShell>
  );
}
