import { useBankAccounts, useExpenses, usePayments } from "@/lib/db";
import { todayISO } from "@/lib/format";

export const OWNER_DRAW = "Owner Salary / Personal Draw";

/** Month keys (YYYY-MM) for the last `count` months, newest first. */
export function monthOptions(count = 24) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export const currentMonthKey = () => todayISO().slice(0, 7);

export const fullMonthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

export type MonthPayment = {
  id: string;
  date: string;
  client: string;
  project: string;
  mode: string;
  bank: string;
  amount: number;
};

export type MonthExpense = {
  id: string;
  date: string;
  category: string;
  project: string;
  paidTo: string;
  bank: string;
  amount: number;
  isDraw: boolean;
};

/** Live income / expense / profit / owner-draw breakdown for one month. */
export function useMonthFinance(month: string) {
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: banks = [] } = useBankAccounts();

  const bankName = (id: string | null | undefined) =>
    id ? (banks.find((b) => b.id === id)?.bank_name ?? "Bank") : "Cash";

  const inMonth = (d: any) => String(d ?? "").slice(0, 7) === month;

  const paymentRows: MonthPayment[] = payments
    .filter((p: any) => inMonth(p.payment_date))
    .map((p: any) => ({
      id: p.id,
      date: p.payment_date,
      client: p.projects?.clients?.name ?? "—",
      project: p.projects?.project_name ?? "—",
      mode: p.payment_mode ?? "—",
      bank: bankName(p.bank_account_id),
      amount: Number(p.amount ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const expenseRows: MonthExpense[] = expenses
    .filter((e: any) => inMonth(e.expense_date))
    .map((e: any) => ({
      id: e.id,
      date: e.expense_date,
      category: e.category ?? "—",
      project: e.projects?.project_name ?? "Studio overhead",
      paidTo: e.paid_to ?? "—",
      bank: bankName(e.bank_account_id),
      amount: Number(e.amount ?? 0),
      isDraw: e.category === OWNER_DRAW,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalIncome = paymentRows.reduce((a, r) => a + r.amount, 0);
  const ownerDraw = expenseRows.filter((r) => r.isDraw).reduce((a, r) => a + r.amount, 0);
  const businessExpenses = expenseRows.filter((r) => !r.isDraw).reduce((a, r) => a + r.amount, 0);
  const totalExpenses = businessExpenses + ownerDraw;

  return {
    paymentRows,
    expenseRows,
    totalIncome,
    businessExpenses,
    totalExpenses,
    ownerDraw,
    netProfit: totalIncome - businessExpenses,
    retention: totalIncome - businessExpenses - ownerDraw,
  };
}
