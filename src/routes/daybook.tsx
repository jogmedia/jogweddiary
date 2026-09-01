import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Scale } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses, usePayments } from "@/lib/db";
import { fmtDate, inr, localISO, todayISO, dayOffsetISO } from "@/lib/format";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<string, string> = {
  cash: "Cash in Hand",
  upi: "Bank / UPI",
  bank: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
};
const modeLabel = (v?: string | null) => MODE_LABELS[v ?? ""] ?? (v ? v : "Unspecified");

export const Route = createFileRoute("/daybook")({
  head: () => ({
    meta: [
      { title: "Daily Daybook — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Day-wise cash flow daybook for JOG MEDIA: client payments received and expenses paid on any selected date.",
      },
      { property: "og:title", content: "Daily Daybook — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Track daily income, expenses and net balance for the studio.",
      },
    ],
  }),
  component: DaybookPage,
});

type Row = {
  id: string;
  title: string;
  sub?: string;
  amount: number;
  mode: string;
  note?: string | null;
};

function DaybookPage() {
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");

  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const income: Row[] = useMemo(
    () =>
      payments
        .filter((p) => p.payment_date === date)
        .map((p) => ({
          id: p.id,
          title: (p.projects as any)?.clients?.name ?? "Client",
          sub: p.projects?.project_name ?? "Studio income",
          amount: Number(p.amount ?? 0),
          mode: modeLabel(p.payment_mode),
          note: p.notes ?? p.reference_no ?? null,
        })),
    [payments, date],
  );

  const outflow: Row[] = useMemo(
    () =>
      expenses
        .filter((e) => e.expense_date === date)
        .map((e) => ({
          id: e.id,
          title: e.category,
          sub:
            (e.projects as any)?.clients?.name && e.projects?.project_name
              ? `${(e.projects as any).clients.name} · ${e.projects?.project_name}`
              : (e.projects?.project_name ?? "Studio overhead"),
          amount: Number(e.amount ?? 0),
          mode: modeLabel(e.payment_mode),
          note: e.notes ?? e.paid_to ?? null,
        })),
    [expenses, date],
  );

  const inTotal = income.reduce((a, r) => a + r.amount, 0);
  const outTotal = outflow.reduce((a, r) => a + r.amount, 0);
  const net = inTotal - outTotal;

  const step = (days: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    setDate(localISO(d));
  };

  const isToday = date === todayISO();
  const isYesterday = date === dayOffsetISO(-1);

  return (
    <AppShell>
      <PageHeader
        title="Daily Daybook"
        subtitle={`Cash flow for ${fmtDate(date)}`}
      />

      {/* Date selector */}
      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => step(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || todayISO())}
          className="h-11 w-[170px]"
          aria-label="Select date"
        />
        <Button variant="outline" size="icon" aria-label="Next day" onClick={() => step(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={isToday ? "default" : "outline"} onClick={() => setDate(todayISO())}>
            Today
          </Button>
          <Button
            size="sm"
            variant={isYesterday ? "default" : "outline"}
            onClick={() => setDate(dayOffsetISO(-1))}
          >
            Yesterday
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Daily Income"
          value={inr(inTotal)}
          hint={`${income.length} entr${income.length === 1 ? "y" : "ies"}`}
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Daily Expenses"
          value={inr(outTotal)}
          hint={`${outflow.length} entr${outflow.length === 1 ? "y" : "ies"}`}
          tone="destructive"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          label="Net Balance"
          value={inr(net)}
          hint={net >= 0 ? "Surplus for the day" : "Deficit for the day"}
          tone={net >= 0 ? "success" : "destructive"}
          icon={<Scale className="h-4 w-4" />}
        />
      </div>

      {/* Mobile toggle */}
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1 lg:hidden">
        {([
          ["all", "All"],
          ["income", `Income (${inr(inTotal)})`],
          ["expense", `Expenses (${inr(outTotal)})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "min-h-11 rounded-lg px-2 text-xs font-medium transition-colors",
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {income.length === 0 && outflow.length === 0 ? (
        <div className="surface mt-4 p-10 text-center text-sm text-muted-foreground">
          No transactions recorded for this day
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className={cn(tab === "expense" && "hidden lg:block")}>
            <Column
              title="INCOME / INFLOW (വരവ്)"
              dot="🟢"
              rows={income}
              total={inTotal}
              totalLabel="Day's income"
              tone="success"
              empty="No income recorded for this day"
            />
          </div>
          <div className={cn(tab === "income" && "hidden lg:block")}>
            <Column
              title="EXPENSES / OUTFLOW (ചിലവ്)"
              dot="🔴"
              rows={outflow}
              total={outTotal}
              totalLabel="Day's expenses"
              tone="destructive"
              empty="No expenses recorded for this day"
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Column({
  title,
  dot,
  rows,
  total,
  totalLabel,
  tone,
  empty,
}: {
  title: string;
  dot: string;
  rows: Row[];
  total: number;
  totalLabel: string;
  tone: "success" | "destructive";
  empty: string;
}) {
  const toneText = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className="surface flex h-full flex-col p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>{dot}</span>
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex-1 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-semibold">{r.title}</p>
                <p className={cn("shrink-0 text-sm font-semibold", toneText)}>{inr(r.amount)}</p>
              </div>
              {r.sub && <p className="mt-0.5 text-xs text-muted-foreground">{r.sub}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-0.5">{r.mode}</span>
                {r.note && <span className="min-w-0 truncate">{r.note}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
        <span>{totalLabel}</span>
        <span className={toneText}>{inr(total)}</span>
      </div>
    </div>
  );
}
