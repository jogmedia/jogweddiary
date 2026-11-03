import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fuel, Pencil, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useBankAccounts, useExpenses, useProjects, useRemove, useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { FUEL_CATEGORY, FUEL_MODES, summarizeFuel, type FuelFilter } from "@/lib/fuel";

export const Route = createFileRoute("/fuel")({
  head: () => ({
    meta: [
      { title: "Petrol / Fuel Log — JOG MEDIA" },
      { name: "description", content: "Monthly petrol and fuel spend for JOG MEDIA, split between project shoots and personal / studio use." },
      { property: "og:title", content: "Petrol / Fuel Log — JOG MEDIA" },
      { property: "og:description", content: "Track every fill-up: project shoot fuel vs personal / studio fuel, by month and year." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FuelPage,
});

type Form = {
  id?: string;
  expense_date: string;
  amount: string;
  payment_mode: string;
  type: "project" | "personal";
  project_id: string;
  bank_account_id: string | null;
  paid_to: string;
  notes: string;
};

const blank = (): Form => ({
  expense_date: todayISO(),
  amount: "",
  payment_mode: "upi",
  type: "personal",
  project_id: "",
  bank_account_id: null,
  paid_to: "",
  notes: "",
});

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

function FuelPage() {
  const { data: expenses = [] } = useExpenses();
  const { data: projects = [] } = useProjects();
  const { data: accounts = [] } = useBankAccounts();
  const save = useUpsert("project_expenses", "Fuel expense");
  const remove = useRemove("project_expenses", "Fuel expense");

  const current = todayISO().slice(0, 7);
  const [period, setPeriod] = useState(current);
  const [filter, setFilter] = useState<FuelFilter>("all");
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState("");

  const periods = useMemo(() => {
    const months = new Set<string>([current]);
    const years = new Set<string>([current.slice(0, 4)]);
    (expenses as any[]).forEach((e) => {
      if (!e.expense_date) return;
      months.add(e.expense_date.slice(0, 7));
      years.add(e.expense_date.slice(0, 4));
    });
    return {
      months: [...months].sort().reverse(),
      years: [...years].sort().reverse(),
    };
  }, [expenses, current]);

  const s = useMemo(() => summarizeFuel(expenses as any[], period, filter), [expenses, period, filter]);
  const projectById = useMemo(() => new Map((projects as any[]).map((p) => [p.id, p])), [projects]);

  const submit = async () => {
    if (!form) return;
    const amount = Number(form.amount || 0);
    if (!(amount > 0)) return setErr("Enter the amount");
    if (form.type === "project" && !form.project_id) return setErr("Pick the project shoot");
    await save.mutateAsync({
      id: form.id,
      category: FUEL_CATEGORY,
      expense_date: form.expense_date,
      amount,
      payment_mode: form.payment_mode,
      project_id: form.type === "project" ? form.project_id : null,
      bank_account_id: needsBankAccount(form.payment_mode) ? form.bank_account_id : null,
      paid_to: form.paid_to.trim() || null,
      notes: form.notes.trim() || null,
    });
    setErr("");
    setForm(null);
  };

  const edit = (e: any) =>
    setForm({
      id: e.id,
      expense_date: e.expense_date,
      amount: String(e.amount ?? ""),
      payment_mode: e.payment_mode ?? "cash",
      type: e.project_id ? "project" : "personal",
      project_id: e.project_id ?? "",
      bank_account_id: e.bank_account_id ?? null,
      paid_to: e.paid_to ?? "",
      notes: e.notes ?? "",
    });

  const modeLabel = (e: any) => {
    const m = FUEL_MODES.find((x) => x.value === e.payment_mode)?.label ?? e.payment_mode ?? "—";
    const acc = (accounts as any[]).find((a) => a.id === e.bank_account_id)?.bank_name;
    return acc ? `${m} · ${acc}` : m;
  };

  return (
    <AppShell>
      <PageHeader
        title="⛽ Petrol / Fuel"
        subtitle="Project shoot fuel and personal / studio fuel in one log"
        actions={
          <Button onClick={() => setForm(blank())}>
            <Plus className="mr-1 h-4 w-4" /> Add Fuel Expense
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.months.map((m) => (
              <SelectItem key={m} value={m}>
                {m === current ? `Current Month (${monthLabel(m)})` : monthLabel(m)}
              </SelectItem>
            ))}
            {periods.years.map((y) => (
              <SelectItem key={y} value={y}>
                Full year {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FuelFilter)}>
          <TabsList>
            <TabsTrigger value="all">All Fuel</TabsTrigger>
            <TabsTrigger value="project">Project Fuel</TabsTrigger>
            <TabsTrigger value="personal">Personal Fuel</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Fuel Spent" value={inr(s.total)} icon={<Fuel className="h-4 w-4" />} />
        <StatCard label="Project Shoots Fuel" value={inr(s.project)} />
        <StatCard label="Personal / General Fuel" value={inr(s.personal)} />
        <StatCard label="Fill-ups / Entries" value={String(s.count)} />
      </div>

      {s.list.length === 0 ? (
        <EmptyState message="No fuel entries for this period." />
      ) : (
        <div className="surface divide-y divide-border">
          {s.list.map((e: any) => {
            const p = e.project_id ? projectById.get(e.project_id) : null;
            return (
              <div key={e.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{inr(e.amount)}</p>
                  <p className="text-sm">
                    {p ? (
                      <Link to="/projects/$id" params={{ id: p.id }} className="text-primary hover:underline">
                        {p.clients?.name ?? p.project_name} · {p.project_name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Personal / Studio</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(e.expense_date)} · {modeLabel(e)}
                    {e.paid_to ? ` · ${e.paid_to}` : ""}
                  </p>
                  {e.notes && <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" aria-label="Edit fuel entry" onClick={() => edit(e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete fuel entry"
                    onClick={() => confirm("Delete this fuel entry?") && remove.mutate(e.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit fuel expense" : "Add fuel expense"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                </div>
                <div>
                  <Label>Amount (₹)</Label>
                  <Input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Type</Label>
                <Tabs value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Form["type"] })}>
                  <TabsList className="w-full">
                    <TabsTrigger className="flex-1" value="project">Project Shoot</TabsTrigger>
                    <TabsTrigger className="flex-1" value="personal">Personal / General Studio</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {form.type === "project" && (
                <div>
                  <Label>Project</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select project shoot" /></SelectTrigger>
                    <SelectContent>
                      {(projects as any[]).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.project_name} · {fmtDate(p.event_date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Payment mode</Label>
                <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsBankAccount(form.payment_mode) && (
                <BankAccountField label="Paid From Bank Account" value={form.bank_account_id} onChange={(v) => setForm({ ...form, bank_account_id: v })} />
              )}
              <div>
                <Label>Pump name (optional)</Label>
                <Input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} />
              </div>
              <div>
                <Label>Notes / Odometer (optional)</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
