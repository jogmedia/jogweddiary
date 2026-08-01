import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  FolderKanban,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import {
  useDeliveries,
  useExpenseTxns,
  useIncomeTxns,
  useProjects,
} from "@/lib/db";
import { fmtDate, inr, inrShort, monthLabel, todayISO } from "@/lib/format";
import { monthlySeries } from "@/lib/reports";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Live view of wedding projects, monthly income, expenses, profit, upcoming shoots and pending balances for JOG MEDIA.",
      },
      { property: "og:title", content: "Dashboard — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Live view of wedding projects, income, expenses and profit for JOG MEDIA.",
      },
    ],
  }),
  component: Dashboard,
});

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: projects = [] } = useProjects();
  const { data: income = [] } = useIncomeTxns();
  const { data: expenses = [] } = useExpenseTxns();
  const { data: deliveries = [] } = useDeliveries();

  const today = todayISO();
  const monthPrefix = today.slice(0, 7);

  const stats = useMemo(() => {
    const monthlyIncome = income
      .filter((t) => t.transaction_date?.startsWith(monthPrefix))
      .reduce((a, t) => a + Number(t.amount ?? 0), 0);
    const monthlyExpense = expenses
      .filter((t) => t.transaction_date?.startsWith(monthPrefix))
      .reduce((a, t) => a + Number(t.amount ?? 0), 0);
    return {
      total: projects.length,
      active: projects.filter((p) => p.project_status !== "completed" && p.project_status !== "cancelled")
        .length,
      completed: projects.filter((p) => p.project_status === "completed").length,
      pending: projects.reduce((a, p) => a + Math.max(0, Number(p.balance_due ?? 0)), 0),
      monthlyIncome,
      monthlyExpense,
      monthlyProfit: monthlyIncome - monthlyExpense,
    };
  }, [projects, income, expenses, monthPrefix]);

  const series = useMemo(
    () =>
      monthlySeries(
        {
          income,
          expenses,
          projects,
          journals: [],
          accounts: [],
          assets: [],
          liabilities: [],
          equity: [],
        },
        12,
      ).map((m) => ({ ...m, label: monthLabel(m.key) })),
    [income, expenses, projects],
  );

  const todaysShoots = projects.filter((p) => p.event_date === today);
  const upcoming = projects
    .filter((p) => p.event_date > today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6);
  const overdue = projects
    .filter((p) => Number(p.balance_due ?? 0) > 0 && p.event_date < today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6);
  const doneDeliveries = deliveries.slice(0, 6);

  return (
    <AppShell>
      <PageHeader
        title="Studio Dashboard"
        subtitle={`Overview for ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`}
      />

      {/* 1. Today's shoots */}
      <div className="grid gap-4">
        <ListCard
          title="Today's shoots"
          icon={<CalendarDays className="h-4 w-4" />}
          empty="No shoots scheduled today"
          rows={todaysShoots.map((p) => ({
            id: p.id,
            primary: p.project_name,
            secondary: `${p.clients?.name ?? "—"} · ${p.venue ?? "Venue TBD"}`,
            badge: p.shoot_status,
          }))}
        />
      </div>

      {/* 2. Upcoming events */}
      <div className="mt-4 grid gap-4">
        <ListCard
          title="Upcoming events"
          icon={<CalendarDays className="h-4 w-4" />}
          empty="No upcoming events"
          rows={upcoming.map((p) => ({
            id: p.id,
            primary: p.project_name,
            secondary: `${fmtDate(p.event_date)} · ${p.venue ?? "Venue TBD"}`,
            badge: p.project_status,
          }))}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListCard
          title="Overdue balances"
          icon={<AlertTriangle className="h-4 w-4" />}
          empty="No overdue balances"
          rows={overdue.map((p) => ({
            id: p.id,
            primary: p.project_name,
            secondary: `${inr(p.balance_due)} due · event ${fmtDate(p.event_date)}`,
            badge: "overdue",
          }))}
        />
        <ListCard
          title="Completed deliveries"
          icon={<PackageCheck className="h-4 w-4" />}
          empty="No deliveries recorded"
          rows={doneDeliveries.map((d) => ({
            id: d.project_id,
            primary: d.projects?.project_name ?? "Project",
            secondary: `${d.delivery_type} · ${fmtDate(d.delivery_date)}`,
            badge: "delivered",
          }))}
        />
      </div>

      {/* 3. Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Projects" value={String(stats.total)} icon={<FolderKanban className="h-4 w-4" />} />
        <StatCard label="Active" value={String(stats.active)} hint="in progress" />
        <StatCard label="Completed" value={String(stats.completed)} tone="success" />
        <StatCard
          label="Pending Payments"
          value={inr(stats.pending)}
          tone="destructive"
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          label="Monthly Income"
          value={inr(stats.monthlyIncome)}
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Monthly Expenses"
          value={inr(stats.monthlyExpense)}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          label="Monthly Profit"
          value={inr(stats.monthlyProfit)}
          tone={stats.monthlyProfit >= 0 ? "success" : "destructive"}
        />
        <StatCard label="Deliveries Done" value={String(deliveries.length)} icon={<PackageCheck className="h-4 w-4" />} />
      </div>

      {/* 4. Financial trends */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Revenue trend (12 months)">
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" fontSize={11} stroke="var(--color-muted-foreground)" />
            <YAxis tickFormatter={inrShort} fontSize={11} stroke="var(--color-muted-foreground)" width={55} />
            <Tooltip formatter={(v: number) => inr(v)} />
            <Area dataKey="income" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.18} />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Expense trend">
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" fontSize={11} stroke="var(--color-muted-foreground)" />
            <YAxis tickFormatter={inrShort} fontSize={11} stroke="var(--color-muted-foreground)" width={55} />
            <Tooltip formatter={(v: number) => inr(v)} />
            <Bar dataKey="expense" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Profit trend">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" fontSize={11} stroke="var(--color-muted-foreground)" />
            <YAxis tickFormatter={inrShort} fontSize={11} stroke="var(--color-muted-foreground)" width={55} />
            <Tooltip formatter={(v: number) => inr(v)} />
            <Line dataKey="profit" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
      </div>

    </AppShell>
  );
}

function ListCard({
  title,
  icon,
  rows,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { id: string; primary: string; secondary: string; badge?: string }[];
  empty: string;
}) {
  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={`${r.id}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
              <Link to="/projects/$id" params={{ id: r.id }} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{r.secondary}</p>
              </Link>
              {r.badge && <StatusBadge value={r.badge} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
