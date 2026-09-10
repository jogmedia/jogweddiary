import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { OverdueBalances, selectOverdueProjects } from "@/components/OverdueBalances";
import { PageHeader } from "@/components/ui-kit";
import { useProjects } from "@/lib/db";
import { inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/overdue-balances")({
  head: () => ({
    meta: [
      { title: "Overdue Balances — JOG MEDIA" },
      { name: "description", content: "Projects with overdue client payment balances." },
      { property: "og:title", content: "Overdue Balances — JOG MEDIA" },
      { property: "og:description", content: "Projects with overdue client payment balances." },
    ],
  }),
  component: OverdueBalancesPage,
});

function OverdueBalancesPage() {
  const { data: projects = [], isLoading } = useProjects();
  const today = todayISO();
  const overdue = selectOverdueProjects(projects as any[], today);
  const total = overdue.reduce((s, p) => s + Number(p.balance_due ?? 0), 0);

  return (
    <AppShell>
      <PageHeader
        title="⚠️ Overdue Balances"
        subtitle="Oldest overdue events first. Record a payment to clear a card instantly."
      />
      {!isLoading && overdue.length > 0 && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Total overdue: {inr(total)} across {overdue.length}{" "}
          {overdue.length === 1 ? "client" : "clients"}
        </div>
      )}
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <OverdueBalances projects={overdue} today={today} />
      )}
    </AppShell>
  );
}
