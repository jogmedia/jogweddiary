import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { RecordDialog } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses, useProjects, useRemove, useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { exportCsv, exportExcel } from "@/lib/exporters";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useExpenseCategories } from "@/lib/expense-categories";


export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — JOG MEDIA Studio Accounts" },
      { name: "description", content: "Track project and studio expenses by category, date and vendor." },
      { property: "og:title", content: "Expenses — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Track project and studio expenses by category and vendor." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: projects = [] } = useProjects();
  const { options: categoryOptions, addCategory } = useExpenseCategories();
  const save = useUpsert("project_expenses", "Expense");
  const remove = useRemove("project_expenses", "Expense");
  const [q, setQ] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(
    () =>
      expenses.filter((e) => {
        const text = `${e.category} ${e.paid_to ?? ""} ${e.projects?.project_name ?? ""}`.toLowerCase();
        return (
          (!q || text.includes(q.toLowerCase())) &&
          (!from || e.expense_date >= from) &&
          (!to || e.expense_date <= to)
        );
      }),
    [expenses, q, from, to],
  );

  const total = rows.reduce((a, e) => a + Number(e.amount ?? 0), 0);
  const exportRows = rows.map((e) => ({
    Date: e.expense_date,
    Project: e.projects?.project_name ?? "Studio (no project)",
    Category: e.category,
    PaidTo: e.paid_to ?? "",
    Mode: e.payment_mode ?? "",
    Amount: Number(e.amount),
  }));

  return (
    <AppShell>
      <PageHeader
        title="Expenses"
        subtitle="Project costs and studio overheads"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportCsv(exportRows, "expenses")}>
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel(exportRows, "expenses")}>
              <Download className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <RecordDialog
              title="Record expense"
              fields={[
                {
                  name: "project_id",
                  label: "Project (leave blank for studio overhead)",
                  type: "select",
                  options: projects.map((p) => ({ value: p.id, label: p.project_name })),
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
              ]}
              initial={{ expense_date: todayISO(), payment_mode: "cash" }}
              extra={(values, set) =>
                needsBankAccount(values.payment_mode) ||
                values.category === "Owner Salary / Personal Draw" ? (
                  <BankAccountField
                    label="Paid From Bank Account"
                    value={values.bank_account_id ?? null}
                    onChange={(v) => set("bank_account_id", v)}
                  />
                ) : null
              }
              onSubmit={(v) =>
                save.mutateAsync({
                  ...v,
                  bank_account_id:
                    needsBankAccount(v.payment_mode) || v.category === "Owner Salary / Personal Draw"
                      ? (v.bank_account_id ?? null)
                      : null,
                })
              }
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add expense
                </Button>
              }
            />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entries" value={String(rows.length)} />
        <StatCard label="Total spent" value={inr(total)} tone="destructive" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search category, vendor or project" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Input type="date" className="w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {isLoading ? (
        <EmptyState message="Loading expenses…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No expenses found." />
      ) : (
        <div className="surface divide-y divide-border">
          {rows.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {e.category} · {inr(e.amount)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.projects?.project_name ?? "Studio overhead"} · {fmtDate(e.expense_date)}
                  {e.paid_to ? ` · ${e.paid_to}` : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(e.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
