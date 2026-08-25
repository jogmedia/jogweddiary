import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClickableStatCard, StatusBadge } from "@/components/ui-kit";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { useProjects, useRemove, useUpsert } from "@/lib/db";
import { useExpenseCategories } from "@/lib/expense-categories";
import { fmtDate, inr } from "@/lib/format";
import { fullMonthLabel, useMonthFinance } from "@/lib/month-finance";
import { openWhatsApp } from "@/lib/whatsapp";

type Sheet = null | "income" | "expenses" | "profit" | "pending";

/** Mobile-friendly bottom-sheet-ish modal with smooth scrolling. */
function DrillSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 text-left sm:px-5">
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <li className="rounded-xl border border-border bg-muted/25 p-3">{children}</li>;
}

function Total({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${tone ?? ""}`}>{inr(value)}</span>
    </div>
  );
}

export function DashboardMetricCards({ month }: { month: string }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const f = useMonthFinance(month);
  const { data: projects = [] } = useProjects();
  const { options: categoryOptions, addCategory } = useExpenseCategories();
  const saveExpense = useUpsert("project_expenses", "Expense");
  const removeExpense = useRemove("project_expenses", "Expense");
  const [editing, setEditing] = useState<any | null>(null);
  const label = fullMonthLabel(month);

  const categoryChips = useMemo(() => {
    const map = new Map<string, number>();
    f.expenseRows.forEach((r) => map.set(r.category, (map.get(r.category) ?? 0) + r.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [f.expenseRows]);

  const projectProfit = useMemo(() => {
    const map = new Map<string, { name: string; id: string | null; income: number; expense: number }>();
    const key = (id: string | null, name: string) => id ?? name;
    f.paymentRows.forEach((r) => {
      const k = key(r.projectId, r.project);
      const e = map.get(k) ?? { name: r.project, id: r.projectId, income: 0, expense: 0 };
      e.income += r.amount;
      map.set(k, e);
    });
    f.expenseRows
      .filter((r) => !r.isDraw)
      .forEach((r) => {
        const k = key(r.projectId, r.project);
        const e = map.get(k) ?? { name: r.project, id: r.projectId, income: 0, expense: 0 };
        e.expense += r.amount;
        map.set(k, e);
      });
    return [...map.values()]
      .map((v) => ({ ...v, profit: v.income - v.expense }))
      .sort((a, b) => b.profit - a.profit);
  }, [f.paymentRows, f.expenseRows]);

  const pendingRows = useMemo(
    () =>
      projects
        .filter((p: any) => Number(p.balance_due ?? 0) > 0)
        .map((p: any) => ({
          id: p.id,
          name: p.project_name,
          client: p.clients?.name ?? "—",
          phone: p.clients?.whatsapp ?? p.clients?.phone ?? null,
          total: Number(p.total_amount ?? 0),
          received: Math.max(0, Number(p.total_amount ?? 0) - Number(p.balance_due ?? 0)),
          balance: Number(p.balance_due ?? 0),
          status: p.payment_status,
          eventDate: p.event_date,
        }))
        .sort((a, b) => b.balance - a.balance),
    [projects],
  );
  const pendingTotal = pendingRows.reduce((a, r) => a + r.balance, 0);

  const expenseFields: Field[] = [
    {
      name: "project_id",
      label: "Project (leave blank for studio overhead)",
      type: "select",
      options: projects.map((p: any) => ({ value: p.id, label: p.project_name })),
      full: true,
    },
    { name: "expense_date", label: "Date", type: "date", required: true },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: categoryOptions,
      onAddOption: addCategory,
      addOptionTitle: "Add expense category",
      addOptionLabel: "Category name",
    },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "paid_to", label: "Paid to" },
    {
      name: "payment_mode",
      label: "Mode",
      type: "select",
      options: ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v })),
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const remind = (r: (typeof pendingRows)[number]) =>
    openWhatsApp(
      r.phone,
      [
        `Dear ${r.client},`,
        "",
        `Gentle reminder regarding the balance payment for *${r.name}*.`,
        `Agreed amount: ₹${r.total.toLocaleString("en-IN")}`,
        `Received: ₹${r.received.toLocaleString("en-IN")}`,
        `*Balance due: ₹${r.balance.toLocaleString("en-IN")}*`,
        "",
        "Kindly arrange at your convenience. Thank you! — JOG MEDIA",
      ].join("\n"),
    );

  return (
    <>
      <ClickableStatCard
        label="Pending Payments"
        value={inr(pendingTotal)}
        tone="destructive"
        hint="View all balances"
        onClick={() => setSheet("pending")}
      />
      <ClickableStatCard
        label="Monthly Income"
        value={inr(f.totalIncome)}
        tone="success"
        hint="View breakdown"
        onClick={() => setSheet("income")}
      />
      <ClickableStatCard
        label="Monthly Expenses"
        value={inr(f.businessExpenses)}
        hint="View breakdown"
        onClick={() => setSheet("expenses")}
      />
      <ClickableStatCard
        label="Monthly Profit"
        value={inr(f.netProfit)}
        tone={f.netProfit >= 0 ? "success" : "destructive"}
        hint="View P&L summary"
        onClick={() => setSheet("profit")}
      />

      {/* Income drill-down */}
      <DrillSheet
        open={sheet === "income"}
        onOpenChange={(v) => !v && setSheet(null)}
        title="Monthly Income Breakdown"
        subtitle={`${label} · ${f.paymentRows.length} payments received`}
      >
        <Total label="Total income" value={f.totalIncome} tone="text-success" />
        {f.paymentRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No payments received this month.</p>
        ) : (
          <ul className="space-y-2">
            {f.paymentRows.map((r) => (
              <Row key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{r.client}</p>
                    <p className="break-words text-xs text-muted-foreground">{r.project}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-success">{inr(r.amount)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full border border-border bg-card px-2 py-0.5">{fmtDate(r.date)}</span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5">{r.stage}</span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 capitalize">{r.mode}</span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5">{r.bank}</span>
                </div>
                {r.projectId && (
                  <Link
                    to="/projects/$id"
                    params={{ id: r.projectId }}
                    onClick={() => setSheet(null)}
                    className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-xs font-medium text-primary"
                  >
                    Open project <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </Row>
            ))}
          </ul>
        )}
      </DrillSheet>

      {/* Expenses drill-down */}
      <DrillSheet
        open={sheet === "expenses"}
        onOpenChange={(v) => !v && setSheet(null)}
        title="Monthly Expenses Breakdown"
        subtitle={`${label} · ${f.expenseRows.length} entries`}
      >
        <Total label="Total expenses" value={f.totalExpenses} />
        {categoryChips.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {categoryChips.map(([cat, amt]) => (
              <span
                key={cat}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium"
              >
                {cat} · <span className="tabular-nums">{inr(amt)}</span>
              </span>
            ))}
          </div>
        )}
        {f.expenseRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No expenses logged this month.</p>
        ) : (
          <ul className="space-y-2">
            {f.expenseRows.map((r) => (
              <Row key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{r.category}</p>
                    <p className="break-words text-xs text-muted-foreground">{r.project}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">{inr(r.amount)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full border border-border bg-card px-2 py-0.5">{fmtDate(r.date)}</span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5">{r.paidTo}</span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5">{r.bank}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[36px]"
                    onClick={() => setEditing(r.row)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[36px] text-destructive"
                    onClick={() => {
                      if (confirm("Delete this expense?")) removeExpense.mutate(r.id);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </Row>
            ))}
          </ul>
        )}
      </DrillSheet>

      {/* Profit drill-down */}
      <DrillSheet
        open={sheet === "profit"}
        onOpenChange={(v) => !v && setSheet(null)}
        title="Monthly Profit & Loss Summary"
        subtitle={label}
      >
        <div className="mb-4 space-y-2">
          <Total label="Total income" value={f.totalIncome} tone="text-success" />
          <Total label="Business expenses" value={f.businessExpenses} tone="text-destructive" />
          <Total
            label="Net profit"
            value={f.netProfit}
            tone={f.netProfit >= 0 ? "text-success" : "text-destructive"}
          />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Project-wise contribution
        </p>
        {projectProfit.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity this month.</p>
        ) : (
          <ul className="space-y-2">
            {projectProfit.map((p) => (
              <Row key={p.id ?? p.name}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold">{p.name}</p>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${p.profit >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {inr(p.profit)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Income {inr(p.income)} · Expenses {inr(p.expense)}
                </p>
                {p.id && (
                  <Link
                    to="/projects/$id"
                    params={{ id: p.id }}
                    onClick={() => setSheet(null)}
                    className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-xs font-medium text-primary"
                  >
                    Open project <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </Row>
            ))}
          </ul>
        )}
      </DrillSheet>

      {/* Pending balances drill-down */}
      <DrillSheet
        open={sheet === "pending"}
        onOpenChange={(v) => !v && setSheet(null)}
        title="All Pending Client Balances"
        subtitle={`${pendingRows.length} projects with outstanding balance`}
      >
        <Total label="Total outstanding" value={pendingTotal} tone="text-destructive" />
        {pendingRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">All balances are cleared 🎉</p>
        ) : (
          <ul className="space-y-2">
            {pendingRows.map((r) => (
              <Row key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{r.client}</p>
                    <p className="break-words text-xs text-muted-foreground">
                      {r.name} · {fmtDate(r.eventDate)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-destructive">{inr(r.balance)}</p>
                    <StatusBadge value={r.status} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Agreed {inr(r.total)} · Received {inr(r.received)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="min-h-[36px]" onClick={() => remind(r)}>
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp reminder
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="min-h-[36px]">
                    <Link to="/projects/$id" params={{ id: r.id }} onClick={() => setSheet(null)}>
                      Open project <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </Row>
            ))}
          </ul>
        )}
      </DrillSheet>

      {editing && (
        <RecordDialog
          title="Edit expense"
          fields={expenseFields}
          initial={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await saveExpense.mutateAsync({ ...editing, ...values });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
