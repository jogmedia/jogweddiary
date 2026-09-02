import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useExpenses, usePayments, useProjects, useRemove, useUpsert } from "@/lib/db";
import { useExpenseCategories } from "@/lib/expense-categories";
import { PAY_ACCOUNTS } from "@/lib/accounts";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

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

type Row = {
  id: string;
  title: string;
  sub: string;
  amount: number;
  mode: string;
  raw: Record<string, any>;
};

/** Compact today-only cash flow widget for the studio dashboard. */
export function TodayDaybook() {
  const today = todayISO();
  const [tab, setTab] = useState<"income" | "expense">("income");

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
    { name: "payment_mode", label: "Payment mode", type: "select", required: true, options: MODE_OPTIONS },
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
      <BankAccountField value={values.bank_account_id ?? null} onChange={(v) => set("bank_account_id", v)} />
    ) : null;

  const withBank = (v: Record<string, any>) => ({
    ...v,
    bank_account_id: needsBankAccount(v.payment_mode) ? (v.bank_account_id ?? null) : null,
  });

  const income: Row[] = useMemo(
    () =>
      payments
        .filter((p) => p.payment_date === today)
        .map((p) => ({
          id: p.id,
          title: (p.projects as any)?.clients?.name ?? "Client",
          sub: p.projects?.project_name ?? "Studio income",
          amount: Number(p.amount ?? 0),
          mode: modeLabel(p.payment_mode),
          raw: p as any,
        })),
    [payments, today],
  );

  const outflow: Row[] = useMemo(
    () =>
      expenses
        .filter((e) => e.expense_date === today)
        .map((e) => ({
          id: e.id,
          title: e.category,
          sub:
            (e.projects as any)?.clients?.name && e.projects?.project_name
              ? `${(e.projects as any).clients.name} · ${e.projects?.project_name}`
              : (e.projects?.project_name ?? "Studio overhead"),
          amount: Number(e.amount ?? 0),
          mode: modeLabel(e.payment_mode),
          raw: e as any,
        })),
    [expenses, today],
  );

  const inTotal = income.reduce((a, r) => a + r.amount, 0);
  const outTotal = outflow.reduce((a, r) => a + r.amount, 0);
  const net = inTotal - outTotal;

  const confirmDelete = (fn: () => void) => {
    if (typeof window === "undefined" || window.confirm("Delete this transaction?")) fn();
  };

  const rows = tab === "income" ? income : outflow;

  return (
    <div className="surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">📖 Today's Daybook (വരവ് - ചിലവ്)</p>
          <p className="text-xs text-muted-foreground">{fmtDate(today)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setAddIncome(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Income
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddExpense(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Expense
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/daybook">
              Open Full Daybook <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Mini summary chips */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full border border-border px-3 py-1 text-success">
          Income: {inr(inTotal)}
        </span>
        <span className="rounded-full border border-border px-3 py-1 text-destructive">
          Expenses: {inr(outTotal)}
        </span>
        <span
          className={cn(
            "rounded-full border border-border px-3 py-1",
            net >= 0 ? "text-success" : "text-destructive",
          )}
        >
          Net Today: {inr(net)}
        </span>
      </div>

      {/* Tabs */}
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
        {([
          ["income", `Today's Income (${income.length})`],
          ["expense", `Today's Expenses (${outflow.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "min-h-10 rounded-lg px-2 text-xs font-medium transition-colors",
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No {tab === "income" ? "income" : "expense"} logged yet for today
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.sub} · {r.mode}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm font-semibold",
                  tab === "income" ? "text-success" : "text-destructive",
                )}
              >
                {inr(r.amount)}
              </p>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  aria-label="Edit transaction"
                  title="Edit transaction"
                  onClick={() => (tab === "income" ? setEditIncome(r.raw) : setEditExpense(r.raw))}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  aria-label="Delete transaction"
                  title="Delete transaction"
                  onClick={() =>
                    confirmDelete(() =>
                      tab === "income" ? removePayment.mutate(r.id) : removeExpense.mutate(r.id),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {addIncome && (
        <RecordDialog
          title="Add Daily Income"
          submitLabel="Save Income"
          fields={incomeFields}
          initial={{ payment_date: today, payment_mode: "cash" }}
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
          initial={{ expense_date: today, payment_mode: "cash" }}
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
    </div>
  );
}
