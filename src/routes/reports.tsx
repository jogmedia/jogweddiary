import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccounts,
  useAssets,
  useEquityTxns,
  useExpenseTxns,
  useIncomeTxns,
  useJournalEntries,
  useLiabilities,
  useProjects,
} from "@/lib/db";
import { fmtDate, inr, monthLabel, todayISO, yearStartISO } from "@/lib/format";
import { balanceSheet, cashFlow, monthlySeries, profitAndLoss, projectProfitability, type Basis } from "@/lib/reports";
import { exportCsv, exportExcel, exportPdf } from "@/lib/exporters";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content: "Profit & Loss, Balance Sheet, Cash Flow and project profitability with date-range filters.",
      },
      { property: "og:title", content: "Reports — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Profit & Loss, Balance Sheet, Cash Flow and project profitability." },
    ],
  }),
  component: ReportsPage,
});

function Row({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border py-2 text-sm ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{inr(amount)}</span>
    </div>
  );
}

function ReportsPage() {
  const { data: income = [] } = useIncomeTxns();
  const { data: expenses = [] } = useExpenseTxns();
  const { data: projects = [] } = useProjects();
  const { data: journals = [] } = useJournalEntries();
  const { data: accounts = [] } = useAccounts();
  const { data: assets = [] } = useAssets();
  const { data: liabilities = [] } = useLiabilities();
  const { data: equity = [] } = useEquityTxns();

  const [from, setFrom] = useState(yearStartISO());
  const [to, setTo] = useState(todayISO());
  const [basis, setBasis] = useState<Basis>("cash");
  const [projectFilter, setProjectFilter] = useState("all");

  const input = useMemo(
    () => ({
      income: projectFilter === "all" ? income : income.filter((t) => t.project_id === projectFilter),
      expenses: projectFilter === "all" ? expenses : expenses.filter((t) => t.project_id === projectFilter),
      projects: projectFilter === "all" ? projects : projects.filter((p) => p.id === projectFilter),
      journals,
      accounts,
      assets: assets as any[],
      liabilities: liabilities as any[],
      equity: equity as any[],
    }),
    [income, expenses, projects, journals, accounts, assets, liabilities, equity, projectFilter],
  );

  const range = { from, to };
  const pl = useMemo(() => profitAndLoss(input, range, basis), [input, from, to, basis]);
  const bs = useMemo(() => balanceSheet(input, to), [input, to]);
  const cf = useMemo(() => cashFlow(input, range), [input, from, to]);
  const profitability = useMemo(() => projectProfitability(input, range), [input, from, to]);
  const monthly = useMemo(() => monthlySeries(input, 12), [input]);

  const plRows = [
    ...pl.incomeLines.map((l) => ({ Section: "Income", Line: l.label, Amount: l.amount })),
    ...pl.directLines.map((l) => ({ Section: "Direct Costs", Line: l.label, Amount: l.amount })),
    ...pl.opexLines.map((l) => ({ Section: "Operating Expenses", Line: l.label, Amount: l.amount })),
    { Section: "Result", Line: "Net Profit", Amount: pl.netProfit },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Accounting reports with date-range, basis and project filters"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportCsv(plRows, "profit-and-loss")}>
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel(plRows, "profit-and-loss")}>
              <Download className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportPdf("report-area", "JOG MEDIA Report")}>
              <Printer className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="surface mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 no-print">
        <div>
          <Label className="mb-1.5 block text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">To / As of</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Basis</Label>
          <Select value={basis} onValueChange={(v) => setBasis(v as Basis)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash basis</SelectItem>
              <SelectItem value="accrual">Accrual basis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Project</Label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div id="report-area">
        <Tabs defaultValue="pl">
          <TabsList className="mb-4 flex flex-wrap justify-start no-print">
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
            <TabsTrigger value="proj">Project Profitability</TabsTrigger>
            <TabsTrigger value="month">Monthly Profitability</TabsTrigger>
          </TabsList>

          <TabsContent value="pl">
            <div className="surface p-5">
              <p className="mb-1 font-display text-xl font-semibold">Profit and Loss</p>
              <p className="mb-4 text-xs text-muted-foreground">
                {fmtDate(from)} to {fmtDate(to)} · {basis} basis
              </p>
              <p className="mt-4 mb-1 text-xs font-semibold uppercase text-muted-foreground">Income</p>
              {pl.incomeLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              <Row label="Total Income" amount={pl.totalIncome} bold />

              <p className="mt-5 mb-1 text-xs font-semibold uppercase text-muted-foreground">Direct Costs</p>
              {pl.directLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              <Row label="Total Direct Costs" amount={pl.directCosts} bold />
              <Row label="Gross Profit" amount={pl.grossProfit} bold />

              <p className="mt-5 mb-1 text-xs font-semibold uppercase text-muted-foreground">Operating Expenses</p>
              {pl.opexLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              <Row label="Total Operating Expenses" amount={pl.operatingExpenses} bold />

              <div className="mt-5 flex justify-between rounded-lg bg-muted p-3 text-base font-semibold">
                <span>{pl.netProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
                <span className={pl.netProfit >= 0 ? "text-success" : "text-destructive"}>{inr(pl.netProfit)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bs">
            <div className="surface p-5">
              <p className="mb-1 font-display text-xl font-semibold">Balance Sheet</p>
              <p className="mb-4 text-xs text-muted-foreground">As of {fmtDate(to)}</p>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Assets</p>
              {bs.assetLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              <Row label="Total Assets" amount={bs.totalAssets} bold />

              <p className="mt-5 mb-1 text-xs font-semibold uppercase text-muted-foreground">Liabilities</p>
              {bs.liabilityLines.length === 0 && <Row label="No liabilities recorded" amount={0} />}
              {bs.liabilityLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              <Row label="Total Liabilities" amount={bs.totalLiabilities} bold />

              <p className="mt-5 mb-1 text-xs font-semibold uppercase text-muted-foreground">Equity</p>
              {bs.equityLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              <Row label="Total Equity" amount={bs.totalEquity} bold />

              <div className="mt-5 flex justify-between rounded-lg bg-muted p-3 text-sm font-semibold">
                <span>Liabilities + Equity</span>
                <span>{inr(bs.totalLiabilities + bs.totalEquity)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cf">
            <div className="surface p-5">
              <p className="mb-1 font-display text-xl font-semibold">Cash Flow</p>
              <p className="mb-4 text-xs text-muted-foreground">
                {fmtDate(from)} to {fmtDate(to)}
              </p>
              <Row label="Opening cash" amount={cf.opening} bold />
              <p className="mt-5 mb-1 text-xs font-semibold uppercase text-muted-foreground">Cash in</p>
              {cf.inLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              {cf.equityIn > 0 && <Row label="Owner contribution" amount={cf.equityIn} />}
              <Row label="Total cash in" amount={cf.cashIn} bold />
              <p className="mt-5 mb-1 text-xs font-semibold uppercase text-muted-foreground">Cash out</p>
              {cf.outLines.map((l, i) => (
                <Row key={i} label={l.label} amount={l.amount} />
              ))}
              <Row label="Total cash out" amount={cf.cashOut} bold />
              <div className="mt-5 flex justify-between rounded-lg bg-muted p-3 text-base font-semibold">
                <span>Closing cash</span>
                <span>{inr(cf.closing)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="proj">
            <div className="surface overflow-x-auto p-5">
              <p className="mb-4 font-display text-xl font-semibold">Project profitability</p>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="py-2">Project</th>
                    <th className="py-2">Client</th>
                    <th className="py-2 text-right">Contracted</th>
                    <th className="py-2 text-right">Received</th>
                    <th className="py-2 text-right">Expenses</th>
                    <th className="py-2 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {profitability.map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.client}</td>
                      <td className="py-2 text-right">{inr(p.contracted)}</td>
                      <td className="py-2 text-right">{inr(p.received)}</td>
                      <td className="py-2 text-right">{inr(p.expense)}</td>
                      <td className={`py-2 text-right font-semibold ${p.profit >= 0 ? "text-success" : "text-destructive"}`}>
                        {inr(p.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 no-print">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    exportCsv(
                      profitability.map((p) => ({
                        Project: p.name,
                        Client: p.client,
                        Contracted: p.contracted,
                        Received: p.received,
                        Expenses: p.expense,
                        Profit: p.profit,
                      })),
                      "project-profitability",
                    )
                  }
                >
                  <Download className="mr-1.5 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="month">
            <div className="surface p-5">
              <p className="mb-4 font-display text-xl font-semibold">Monthly profitability</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {monthly.map((m) => (
                  <StatCard
                    key={m.key}
                    label={monthLabel(m.key)}
                    value={inr(m.profit)}
                    hint={`Income ${inr(m.income)} · Expense ${inr(m.expense)}`}
                    tone={m.profit >= 0 ? "success" : "destructive"}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
