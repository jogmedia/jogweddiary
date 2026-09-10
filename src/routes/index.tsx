import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  Plane,
  MessageCircle,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { FixedDepositAlert } from "@/components/FixedDepositAlert";
import { BackupAlert } from "@/components/BackupAlert";
import { CrewReminders } from "@/components/CrewReminders";
import { ShootDay } from "@/components/ShootDay";
import { TravelBadge, travelState } from "@/components/TravelBadge";
import { BankBalancesWidget, OwnerSalaryWidget } from "@/components/MoneyWidgets";
import { MonthlyFinanceCard } from "@/components/MonthlyFinance";
import { DashboardMetricCards } from "@/components/DashboardMetrics";
import { TodayDaybook } from "@/components/TodayDaybook";


import { currentMonthKey } from "@/lib/month-finance";

import { PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import {
  useDeliveries,
  useExpenseTxns,
  useIncomeTxns,
  useProjectEvents,
  useProjects,
  useUpsert,
} from "@/lib/db";
import { dayOffsetISO, fmtDate, inr, inrShort, monthLabel, todayISO } from "@/lib/format";
import { monthlySeries } from "@/lib/reports";
import { eventLabel, eventMeta, fmtTime, openWhatsApp } from "@/lib/whatsapp";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";

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
  const { data: events = [] } = useProjectEvents();

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

  const eventRows = events.map((e) => {
    const project = projects.find((p) => p.id === e.project_id);
    const meta = eventMeta(e.event_type);
    return {
      id: e.id,
      date: e.event_date,
      projectId: e.project_id,
      primary: `${meta.emoji} ${eventLabel(e)} — ${e.projects?.project_name ?? project?.project_name ?? "Project"}`,
      client: e.projects?.clients?.name ?? project?.clients?.name ?? "—",
      time: fmtTime(e.arrival_time ?? e.event_time ?? e.muhurtham_time),
      venue: e.location ?? project?.venue ?? "Venue TBD",
      status: e.status ?? project?.shoot_status,
      travel: project ?? e.projects ?? null,
    };
  });
  const eventProjectDates = new Set(eventRows.map((r) => `${r.projectId}|${r.date}`));
  const bareProjectRows = projects
    .filter((p) => p.event_date && !eventProjectDates.has(`${p.id}|${p.event_date}`))
    .map((p) => ({
      id: p.id,
      date: p.event_date,
      projectId: p.id,
      primary: p.project_name,
      client: p.clients?.name ?? "—",
      time: "—",
      venue: p.venue ?? "Venue TBD",
      status: p.shoot_status,
      travel: p,
    }));
  const allShootRows = [...eventRows, ...bareProjectRows];

  const todaysShoots = allShootRows.filter((r) => r.date === today);
  const upcoming = allShootRows
    .filter((r) => r.date > today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  const overdue = projects
    .filter((p) => Number(p.balance_due ?? 0) > 0 && p.event_date < today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6);
  const doneDeliveries = deliveries.slice(0, 6);

  const [travelOnly, setTravelOnly] = useState(false);
  const [selMonth, setSelMonth] = useState(currentMonthKey());
  const pendingTravel = allShootRows
    .filter((r) => r.date >= today && ["pending", "urgent"].includes(travelState(r.travel as any, r.date)))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <AppShell>
      <PageHeader
        hideBack
        title="Studio Dashboard"
        subtitle={`Overview for ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`}
      />





      {/* 1. Daily shoot widgets — very top */}
      <div className="grid gap-4">
        <ShootDay date={today} title="Today's shoots" />
      </div>

      <div className="mt-4">
        <ShootDay date={dayOffsetISO(1)} title="Tomorrow's Shoot" />
      </div>

      <div className="mt-4">
        <ShootDay date={dayOffsetISO(2)} title="Day After Tomorrow's Shoot" />
      </div>

      {/* Today's daybook snapshot */}
      <div className="mt-4">
        <TodayDaybook />
      </div>


      {/* 2. Crew reminders below daily shoots */}
      <CrewReminders />

      <FixedDepositAlert />
      <BackupAlert />





      {/* 2. Upcoming events */}
      <div className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={travelOnly ? "default" : "outline"}
            onClick={() => setTravelOnly((v) => !v)}
          >
            <Plane className="mr-1 h-4 w-4" />
            Pending travel tickets ({pendingTravel.length})
          </Button>
          {travelOnly && (
            <span className="text-xs text-muted-foreground">Showing only projects/events with unbooked tickets</span>
          )}
        </div>
        <ListCard
          title={travelOnly ? "Events with pending travel tickets" : "Upcoming events"}
          icon={<CalendarDays className="h-4 w-4" />}
          empty={travelOnly ? "All travel tickets are booked" : "No upcoming events"}
          rows={(travelOnly ? pendingTravel : upcoming).map((r) => ({
            id: r.projectId,
            primary: r.primary,
            secondary: `${fmtDate(r.date)} · ⏰ ${r.time} · ${r.venue}`,
            badge: r.status,
            extra: <TravelBadge project={r.travel as any} eventDate={r.date} />,
          }))}
        />
      </div>

      {/* Money widgets below shoots & upcoming events */}
      <div className="mt-4 grid gap-4">
        <MonthlyFinanceCard month={selMonth} onMonthChange={setSelMonth} />
        <div className="grid gap-4 lg:grid-cols-2">
          <OwnerSalaryWidget month={selMonth} />
          <BankBalancesWidget />
        </div>
      </div>


      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <OverdueBalances projects={overdue} today={today} />
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
        <DashboardMetricCards month={selMonth} />
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

const PAY_MODES = ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v }));

function overdueReminder(p: any) {
  const client = p.clients?.name ?? "";
  const total = Number(p.total_amount ?? 0);
  const balance = Number(p.balance_due ?? 0);
  return [
    `Dear ${client},`,
    "",
    `Greetings from JOG MEDIA 📸`,
    "",
    `Gentle reminder: the balance for your event is pending:`,
    `• Project: ${p.project_name}`,
    `• Event date: ${fmtDate(p.event_date)}`,
    `• Agreed amount: ${inr(total)}`,
    `• Balance pending: ${inr(balance)}`,
    "",
    `Kindly arrange the payment at your convenience. Thank you!`,
    `— JOG MEDIA, Kozhikode`,
  ].join("\n");
}

function OverdueBalances({ projects, today }: { projects: any[]; today: string }) {
  const [payFor, setPayFor] = useState<any | null>(null);
  const save = useUpsert("project_payments", "Payment");

  const fields: Field[] = [
    { name: "payment_date", label: "Date", type: "date", required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "payment_mode", label: "Mode", type: "select", options: PAY_MODES, required: true },
    { name: "reference_no", label: "Reference no." },
    { name: "notes", label: "Notes", type: "textarea", full: true },
  ];

  return (
    <div className="surface w-full overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" />
        Overdue balances
      </div>
      {projects.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No overdue balances</p>
      ) : (
        <div>
          {projects.map((p) => {
            const days = Math.max(
              1,
              Math.floor((new Date(today).getTime() - new Date(p.event_date).getTime()) / 86400000),
            );
            return (
              <div
                key={p.id}
                className="mb-3 space-y-2.5 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                {/* Row 1: date pill + overdue badge */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {fmtDate(p.event_date)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                    ⚠️ {days} {days === 1 ? "day" : "days"} overdue
                  </span>
                </div>

                {/* Row 2: client name */}
                <Link
                  to="/projects/$id"
                  params={{ id: p.id }}
                  className="block truncate text-lg font-bold text-primary hover:underline"
                >
                  {p.clients?.name ?? "Client"}
                </Link>

                {/* Row 3: event details */}
                <p className="truncate text-xs font-medium text-muted-foreground">
                  💍 {p.project_name}
                </p>

                {/* Row 4: financial box */}
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Total agreed:{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {inr(p.total_amount)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-base font-bold tabular-nums text-destructive">
                    {inr(p.balance_due)} Due
                  </p>
                  {p.venue && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">📍 {p.venue}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="min-h-11 flex-1 sm:flex-none" onClick={() => setPayFor(p)}>
                    <Wallet className="mr-1.5 h-4 w-4" /> Record payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => openWhatsApp(p.clients?.whatsapp || p.clients?.phone, overdueReminder(p))}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp reminder
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="min-h-11 flex-1 sm:flex-none">
                    <Link to="/projects/$id" params={{ id: p.id }}>
                      View full project <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {payFor && (
        <RecordDialog
          key={payFor.id}
          open
          onOpenChange={(v) => !v && setPayFor(null)}
          title={`Record payment — ${payFor.clients?.name ?? payFor.project_name}`}
          fields={fields}
          initial={{
            payment_date: todayISO(),
            amount: Number(payFor.balance_due ?? 0) || "",
            payment_mode: "upi",
          }}
          submitLabel="Save payment"
          extra={(values, set) =>
            needsBankAccount(values.payment_mode) ? (
              <BankAccountField
                label="Received Into Bank Account"
                value={values.bank_account_id ?? null}
                onChange={(v) => set("bank_account_id", v)}
              />
            ) : null
          }
          onSubmit={async (v) => {
            await save.mutateAsync({
              ...v,
              project_id: payFor.id,
              bank_account_id: needsBankAccount(v.payment_mode) ? (v.bank_account_id ?? null) : null,
            });
            setPayFor(null);
          }}
        />
      )}
    </div>
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
  rows: { id: string; primary: string; secondary: string; badge?: string; extra?: React.ReactNode }[];
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
              <div className="flex shrink-0 flex-col items-end gap-1">
                {r.extra}
                {r.badge && <StatusBadge value={r.badge} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
