import { Link } from "@tanstack/react-router";
import { Landmark, Wallet, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBankAccounts, useExpenses, usePayments } from "@/lib/db";
import { inr, todayISO } from "@/lib/format";

const OWNER_DRAW = "Owner Salary / Personal Draw";

function useMoney() {
  const { data: banks = [] } = useBankAccounts();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const month = todayISO().slice(0, 7);

  const cashIn = payments
    .filter((p: any) => !p.bank_account_id)
    .reduce((a: number, p: any) => a + Number(p.amount ?? 0), 0);
  const cashOut = expenses
    .filter((e: any) => !e.bank_account_id)
    .reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);

  const rows = [
    ...banks
      .filter((b) => b.is_active !== false)
      .map((b) => ({ id: b.id, name: b.bank_name, balance: Number(b.current_balance ?? 0) })),
    { id: "cash", name: "Cash in Hand", balance: cashIn - cashOut },
  ];

  const inMonth = (d: any) => String(d ?? "").slice(0, 7) === month;

  // Real-time month income = every payment actually logged this month, all projects.
  const monthIncome = payments
    .filter((p: any) => inMonth(p.payment_date))
    .reduce((a: number, p: any) => a + Number(p.amount ?? 0), 0);
  const monthDraw = expenses
    .filter((e: any) => e.category === OWNER_DRAW && inMonth(e.expense_date))
    .reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);
  // Business expenses only (owner draw is a withdrawal, not a cost).
  const monthExpenses = expenses
    .filter((e: any) => e.category !== OWNER_DRAW && inMonth(e.expense_date))
    .reduce((a: number, e: any) => a + Number(e.amount ?? 0), 0);

  return {
    rows,
    total: rows.reduce((a, r) => a + r.balance, 0),
    monthIncome,
    monthProfit: monthIncome - monthExpenses,
    monthDraw,
    retention: monthIncome - monthDraw,
  };
}

/** Live balances of every bank account + cash. Click to open Accounts. */
export function BankBalancesWidget({ compact = false }: { compact?: boolean }) {
  const { rows, total } = useMoney();
  return (
    <Link
      to="/accounts"
      className={cn(
        "block rounded-xl transition-colors",
        compact
          ? "mx-3 mb-2 border border-sidebar-border bg-sidebar-accent/40 p-3 hover:bg-sidebar-accent"
          : "surface p-4 hover:border-primary/40",
      )}
    >
      <div className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", compact && "text-sidebar-foreground")}>
        <Landmark className="h-4 w-4" /> Bank Balances
      </div>
      <ul className={cn("space-y-1", compact ? "text-[12px]" : "grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-sm")}>
        {rows.map((r) => (
          <li
            key={r.id}
            className={cn(
              "flex items-center justify-between gap-2",
              compact ? "text-sidebar-foreground/80" : "rounded-lg bg-muted/40 px-2.5 py-1.5",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              {r.id === "cash" ? <Wallet className="h-3.5 w-3.5 shrink-0" /> : null}
              {r.name}
            </span>
            <span className="shrink-0 font-medium tabular-nums">{inr(r.balance)}</span>
          </li>
        ))}
      </ul>
      <div
        className={cn(
          "mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold",
          compact ? "border-sidebar-border text-sidebar-foreground" : "border-border",
        )}
      >
        <span>Total</span>
        <span className="tabular-nums">{inr(total)}</span>
      </div>
    </Link>
  );
}

/** Flexible owner salary tracker — no fixed targets, current month only. */
export function OwnerSalaryWidget({ compact = false }: { compact?: boolean }) {
  const { monthIncome, monthProfit, monthDraw, retention } = useMoney();
  const monthName = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const items = [
    { label: "Month income", value: monthIncome },
    { label: "Month profit", value: monthProfit },
    { label: "Owner salary drawn", value: monthDraw },
    { label: "Net retention", value: retention },
  ];

  return (
    <div
      className={cn(
        compact
          ? "mx-3 mb-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3"
          : "surface p-4",
      )}
    >
      <div className={cn("mb-1 flex items-center gap-2 text-sm font-semibold", compact && "text-sidebar-foreground")}>
        <PiggyBank className="h-4 w-4" /> Owner Salary Tracker
      </div>
      <p className={cn("mb-2 text-[11px]", compact ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
        {monthName} · flexible, no fixed limit
      </p>
      <ul className={cn("space-y-1", compact ? "text-[12px]" : "grid gap-1 sm:grid-cols-2 lg:grid-cols-4 text-sm")}>
        {items.map((i) => (
          <li
            key={i.label}
            className={cn(
              "flex items-center justify-between gap-2",
              compact ? "text-sidebar-foreground/80" : "rounded-lg bg-muted/40 px-2.5 py-1.5",
            )}
          >
            <span className="truncate">{i.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{inr(i.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
