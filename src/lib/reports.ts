import type { Account, JournalEntry, LedgerTxn, Project } from "./db";

export type Basis = "cash" | "accrual";
export type Range = { from: string; to: string };

export type ReportInput = {
  income: LedgerTxn[];
  expenses: LedgerTxn[];
  projects: Project[];
  journals: JournalEntry[];
  accounts: Account[];
  assets: { asset_value: number; acquired_date: string | null }[];
  liabilities: { liability_value: number; due_date: string | null }[];
  equity: { amount: number; transaction_date: string }[];
};

const inRange = (d: string | null | undefined, r: Range) => !!d && d >= r.from && d <= r.to;
const upTo = (d: string | null | undefined, to: string) => !d || d <= to;

type Bucket = { label: string; amount: number };

function group(rows: LedgerTxn[], fallback: string): Bucket[] {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.chart_of_accounts?.account_name ?? r.notes ?? fallback;
    map.set(key, (map.get(key) ?? 0) + Number(r.amount ?? 0));
  });
  return [...map.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Journal amounts by account type within a period (credit-positive for income/equity/liability). */
function journalTotals(journals: JournalEntry[], filter: (date: string) => boolean) {
  const totals: Record<string, number> = {};
  journals.forEach((j) => {
    if (!filter(j.entry_date)) return;
    (j.journal_entry_lines ?? []).forEach((l) => {
      const type = l.chart_of_accounts?.account_type ?? "Other";
      const credit = Number(l.credit ?? 0);
      const debit = Number(l.debit ?? 0);
      const signed =
        type === "Income" || type === "Liabilities" || type === "Equity" ? credit - debit : debit - credit;
      totals[type] = (totals[type] ?? 0) + signed;
    });
  });
  return totals;
}

export function profitAndLoss(input: ReportInput, range: Range, basis: Basis) {
  const cashIncome = input.income.filter((t) => inRange(t.transaction_date, range));
  const accrualIncomeRows = input.projects.filter((p) => inRange(p.event_date, range));

  const incomeLines: Bucket[] =
    basis === "cash"
      ? group(cashIncome, "Project Income")
      : [
          {
            label: "Contracted project revenue",
            amount: accrualIncomeRows.reduce((a, p) => a + Number(p.total_amount ?? 0), 0),
          },
        ];

  const periodExpenses = input.expenses.filter((t) => inRange(t.transaction_date, range));
  const directRows = periodExpenses.filter((t) => t.project_id);
  const opexRows = periodExpenses.filter((t) => !t.project_id);

  const jt = journalTotals(input.journals, (d) => inRange(d, range));
  const journalIncome = jt["Income"] ?? 0;
  const journalCogs = jt["Cost of Goods Sold"] ?? 0;
  const journalOpex = jt["Expenses"] ?? 0;

  const totalIncome = incomeLines.reduce((a, l) => a + l.amount, 0) + journalIncome;
  const directCosts = directRows.reduce((a, t) => a + Number(t.amount ?? 0), 0) + journalCogs;
  const operatingExpenses = opexRows.reduce((a, t) => a + Number(t.amount ?? 0), 0) + journalOpex;

  return {
    incomeLines: journalIncome
      ? [...incomeLines, { label: "Journal income entries", amount: journalIncome }]
      : incomeLines,
    directLines: journalCogs
      ? [...group(directRows, "Project cost"), { label: "Journal direct costs", amount: journalCogs }]
      : group(directRows, "Project cost"),
    opexLines: journalOpex
      ? [...group(opexRows, "Operating expense"), { label: "Journal operating expenses", amount: journalOpex }]
      : group(opexRows, "Operating expense"),
    totalIncome,
    directCosts,
    grossProfit: totalIncome - directCosts,
    operatingExpenses,
    netProfit: totalIncome - directCosts - operatingExpenses,
  };
}

export function cashFlow(input: ReportInput, range: Range) {
  const cashInBefore = input.income
    .filter((t) => t.transaction_date < range.from)
    .reduce((a, t) => a + Number(t.amount ?? 0), 0);
  const cashOutBefore = input.expenses
    .filter((t) => t.transaction_date < range.from)
    .reduce((a, t) => a + Number(t.amount ?? 0), 0);
  const equityBefore = input.equity
    .filter((e) => e.transaction_date < range.from)
    .reduce((a, e) => a + Number(e.amount ?? 0), 0);

  const inRows = input.income.filter((t) => inRange(t.transaction_date, range));
  const outRows = input.expenses.filter((t) => inRange(t.transaction_date, range));
  const equityIn = input.equity
    .filter((e) => inRange(e.transaction_date, range))
    .reduce((a, e) => a + Number(e.amount ?? 0), 0);

  const cashIn = inRows.reduce((a, t) => a + Number(t.amount ?? 0), 0) + equityIn;
  const cashOut = outRows.reduce((a, t) => a + Number(t.amount ?? 0), 0);
  const opening = cashInBefore - cashOutBefore + equityBefore;

  return {
    opening,
    cashIn,
    cashOut,
    closing: opening + cashIn - cashOut,
    inLines: group(inRows, "Receipts"),
    outLines: group(outRows, "Payments"),
    equityIn,
  };
}

export function balanceSheet(input: ReportInput, asOf: string) {
  const cashIn = input.income
    .filter((t) => upTo(t.transaction_date, asOf))
    .reduce((a, t) => a + Number(t.amount ?? 0), 0);
  const cashOut = input.expenses
    .filter((t) => upTo(t.transaction_date, asOf))
    .reduce((a, t) => a + Number(t.amount ?? 0), 0);
  const equityContrib = input.equity
    .filter((e) => upTo(e.transaction_date, asOf))
    .reduce((a, e) => a + Number(e.amount ?? 0), 0);

  const cash = cashIn - cashOut + equityContrib;
  const receivables = input.projects
    .filter((p) => p.event_date <= asOf)
    .reduce((a, p) => a + Math.max(0, Number(p.balance_due ?? 0)), 0);
  const fixedAssets = input.assets
    .filter((a) => upTo(a.acquired_date, asOf))
    .reduce((acc, a) => acc + Number(a.asset_value ?? 0), 0);

  const jt = journalTotals(input.journals, (d) => d <= asOf);
  const journalAssets = jt["Assets"] ?? 0;
  const journalLiabilities = jt["Liabilities"] ?? 0;
  const journalEquity = jt["Equity"] ?? 0;

  const assetLines: Bucket[] = [
    { label: "Cash & Bank", amount: cash },
    { label: "Accounts Receivable", amount: receivables },
    { label: "Fixed Assets (Equipment)", amount: fixedAssets },
  ];
  if (journalAssets) assetLines.push({ label: "Journal asset entries", amount: journalAssets });

  const liabilityLines: Bucket[] = input.liabilities
    .filter((l) => upTo(l.due_date, asOf) || true)
    .map((l) => ({ label: (l as any).liability_name ?? "Liability", amount: Number(l.liability_value ?? 0) }));
  if (journalLiabilities)
    liabilityLines.push({ label: "Journal liability entries", amount: journalLiabilities });

  const totalAssets = assetLines.reduce((a, l) => a + l.amount, 0);
  const totalLiabilities = liabilityLines.reduce((a, l) => a + l.amount, 0);

  // Retained earnings = all recognised income less all expenses up to date.
  const retained =
    input.income.filter((t) => upTo(t.transaction_date, asOf)).reduce((a, t) => a + Number(t.amount ?? 0), 0) +
    receivables -
    input.expenses.filter((t) => upTo(t.transaction_date, asOf)).reduce((a, t) => a + Number(t.amount ?? 0), 0);

  const equityLines: Bucket[] = [
    { label: "Owner's Capital", amount: equityContrib },
    { label: "Retained Earnings", amount: retained },
  ];
  if (journalEquity) equityLines.push({ label: "Journal equity entries", amount: journalEquity });
  const totalEquity = equityLines.reduce((a, l) => a + l.amount, 0);

  return {
    assetLines,
    liabilityLines,
    equityLines,
    totalAssets,
    totalLiabilities,
    totalEquity,
    difference: totalAssets - (totalLiabilities + totalEquity),
  };
}

export function projectProfitability(input: ReportInput, range?: Range) {
  return input.projects.map((p) => {
    const income = input.income
      .filter((t) => t.project_id === p.id && (!range || inRange(t.transaction_date, range)))
      .reduce((a, t) => a + Number(t.amount ?? 0), 0);
    const expense = input.expenses
      .filter((t) => t.project_id === p.id && (!range || inRange(t.transaction_date, range)))
      .reduce((a, t) => a + Number(t.amount ?? 0), 0);
    return {
      id: p.id,
      name: p.project_name,
      client: p.clients?.name ?? "—",
      eventDate: p.event_date,
      contracted: Number(p.total_amount ?? 0),
      received: income,
      balance: Number(p.balance_due ?? 0),
      expense,
      profit: income - expense,
      margin: income ? ((income - expense) / income) * 100 : 0,
    };
  });
}

export function monthlySeries(input: ReportInput, months = 12) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys.map((k) => {
    const income = input.income
      .filter((t) => t.transaction_date?.startsWith(k))
      .reduce((a, t) => a + Number(t.amount ?? 0), 0);
    const expense = input.expenses
      .filter((t) => t.transaction_date?.startsWith(k))
      .reduce((a, t) => a + Number(t.amount ?? 0), 0);
    return { key: k, income, expense, profit: income - expense };
  });
}
