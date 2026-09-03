import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses, usePayments, useProjects, useRemove, useUpsert } from "@/lib/db";
import { fmtDate, inr, localISO, todayISO, dayOffsetISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAY_ACCOUNTS } from "@/lib/accounts";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useExpenseCategories } from "@/lib/expense-categories";

const MODE_LABELS: Record<string, string> = {
  cash: "Cash in Hand",
  upi: "Bank / UPI",
  bank: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
};
const modeLabel = (v?: string | null) => MODE_LABELS[v ?? ""] ?? (v ? v : "Unspecified");

const MODE_OPTIONS = ["cash", "upi", "bank", "cheque", "card"].map((v) => ({
  value: v,
  label: modeLabel(v),
}));

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
  projectId?: string | null;
  raw: Record<string, any>;
};

function DaybookPage() {
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");

  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: projects = [] } = useProjects();
  const { options: categoryOptions, addCategory } = useExpenseCategories();

  const savePayment = useUpsert("project_payments", "Payment");
  const removePayment = useRemove("project_payments", "Payment");
  const saveExpense = useUpsert("project_expenses", "Expense");
  const removeExpense = useRemove("project_expenses", "Expense");

  const [addIncome, setAddIncome] = useState(false);
  const [addExpense, setAddExpense] = useState(false);
  const [editIncome, setEditIncome] = useState<Record<string, any> | null>(null);
  const [editExpense, setEditExpense] = useState<Record<string, any> | null>(null);

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.project_name}${p.clients?.name ? ` — ${p.clients.name}` : ""}`,
  }));

  const incomeFields: Field[] = [
    {
      name: "project_id",
      label: "Project / Client",
      type: "select",
      required: true,
      options: projectOptions,
      full: true,
    },
    { name: "payment_date", label: "Payment date", type: "date", required: true },
    { name: "amount", label: "Amount (₹)", type: "number", required: true },
    {
      name: "payment_mode",
      label: "Payment mode",
      type: "select",
      required: true,
      options: MODE_OPTIONS,
    },
    {
      name: "account",
      label: "Deposited to account",
      type: "select",
      options: PAY_ACCOUNTS.map((a) => ({ value: a.value, label: a.label })),
    },
    {
      name: "notes",
      label: "Notes / payment stage",
      type: "textarea",
      placeholder: "Advance / Interim / Final",
    },
  ];

  const expenseFields: Field[] = [
    {
      name: "project_id",
      label: "Project / Client (leave blank for Studio Overhead / General)",
      type: "select",
      options: projectOptions,
      full: true,
    },
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
    { name: "amount", label: "Amount (₹)", type: "number", required: true },
    { name: "expense_date", label: "Expense date", type: "date", required: true },
    { name: "paid_to", label: "Paid to" },
    { name: "payment_mode", label: "Paid via", type: "select", options: MODE_OPTIONS },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const bankExtra = (values: Record<string, any>, set: (n: string, v: any) => void) =>
    needsBankAccount(values.payment_mode) ? (
      <BankAccountField
        value={values.bank_account_id ?? null}
        onChange={(v) => set("bank_account_id", v)}
      />
    ) : null;

  const withBank = (v: Record<string, any>) => ({
    ...v,
    bank_account_id: needsBankAccount(v.payment_mode) ? (v.bank_account_id ?? null) : null,
  });

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
          projectId: (p as any).project_id,
          raw: p as any,
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
          projectId: (e as any).project_id,
          raw: e as any,
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

  const confirmDelete = (fn: () => void) => {
    if (typeof window === "undefined" || window.confirm("Delete this transaction?")) fn();
  };

  return (
    <AppShell>
      <PageHeader title="Daily Daybook" subtitle={`Cash flow for ${fmtDate(date)}`} />

      {/* Date selector */}
      <div className="surface p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => step(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayISO())}
              className="h-11 max-w-[220px] flex-1 text-center"
              aria-label="Select date"
            />
            <Button variant="outline" size="icon" aria-label="Next day" onClick={() => step(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant={isToday ? "default" : "outline"}
              className="flex-1 sm:flex-none"
              onClick={() => setDate(todayISO())}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={isYesterday ? "default" : "outline"}
              className="flex-1 sm:flex-none"
              onClick={() => setDate(dayOffsetISO(-1))}
            >
              Yesterday
            </Button>
          </div>
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
            addLabel="Record Income"
            onAdd={() => setAddIncome(true)}
            onEdit={(r) => setEditIncome(r.raw)}
            onDelete={(r) => confirmDelete(() => removePayment.mutate(r.id))}
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
            addLabel="Add Expense"
            onAdd={() => setAddExpense(true)}
            onEdit={(r) => setEditExpense(r.raw)}
            onDelete={(r) => confirmDelete(() => removeExpense.mutate(r.id))}
          />
        </div>
      </div>

      {addIncome && (
        <RecordDialog
          title="Add Daily Income"
          submitLabel="Save Income"
          fields={incomeFields}
          initial={{ payment_date: date, payment_mode: "cash" }}
          open={addIncome}
          onOpenChange={setAddIncome}
          extra={bankExtra}
          onSubmit={async (v) => {
            await savePayment.mutateAsync(withBank(v));
            setAddIncome(false);
          }}
        />
      )}

      {editIncome && (
        <RecordDialog
          title="Edit Income"
          submitLabel="Update Income"
          fields={incomeFields}
          initial={editIncome}
          open={!!editIncome}
          onOpenChange={(v) => !v && setEditIncome(null)}
          extra={bankExtra}
          onSubmit={async (v) => {
            await savePayment.mutateAsync({ ...withBank(v), id: editIncome.id });
            setEditIncome(null);
          }}
        />
      )}

      {addExpense && (
        <RecordDialog
          title="Add Daily Expense"
          submitLabel="Save Expense"
          fields={expenseFields}
          initial={{ expense_date: date, payment_mode: "cash" }}
          open={addExpense}
          onOpenChange={setAddExpense}
          extra={bankExtra}
          onSubmit={async (v) => {
            await saveExpense.mutateAsync(withBank(v));
            setAddExpense(false);
          }}
        />
      )}

      {editExpense && (
        <RecordDialog
          title="Edit Expense"
          submitLabel="Update Expense"
          fields={expenseFields}
          initial={editExpense}
          open={!!editExpense}
          onOpenChange={(v) => !v && setEditExpense(null)}
          extra={bankExtra}
          onSubmit={async (v) => {
            await saveExpense.mutateAsync({ ...withBank(v), id: editExpense.id });
            setEditExpense(null);
          }}
        />
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
  addLabel,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  dot: string;
  rows: Row[];
  total: number;
  totalLabel: string;
  tone: "success" | "destructive";
  empty: string;
  addLabel: string;
  onAdd: () => void;
  onEdit: (r: Row) => void;
  onDelete: (r: Row) => void;
}) {
  const toneText = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className="surface flex h-full flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden>{dot}</span>
          {title}
        </p>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" /> {addLabel}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex-1 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                {r.projectId ? (
                  <Link
                    to="/projects/$id"
                    params={{ id: r.projectId }}
                    className="group min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="truncate text-sm font-semibold group-hover:underline">{r.title}</p>
                    {r.sub && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground group-hover:underline">
                        {r.sub}
                      </p>
                    )}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{r.title}</p>
                    {r.sub && <p className="mt-0.5 text-xs text-muted-foreground">{r.sub}</p>}
                  </div>
                )}
                <p className={cn("shrink-0 text-sm font-semibold", toneText)}>{inr(r.amount)}</p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    aria-label="Edit transaction"
                    title="Edit transaction"
                    onClick={() => onEdit(r)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    aria-label="Delete transaction"
                    title="Delete transaction"
                    onClick={() => onDelete(r)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
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
