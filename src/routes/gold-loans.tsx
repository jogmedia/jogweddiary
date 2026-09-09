import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Pencil, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BankAccountField } from "@/components/BankAccountField";
import { useBankAccounts, useGoldLoans, useRemove, useUpsert, type GoldLoan } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { countdownLabel, daysUntil } from "@/lib/fd";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gold-loans")({
  head: () => ({
    meta: [
      { title: "Gold Loans Register — JOG MEDIA" },
      {
        name: "description",
        content:
          "Register of every JOG MEDIA gold loan: pledged weight, sanctioned amount, interest, renewal due dates and settlement history.",
      },
      { property: "og:title", content: "Gold Loans Register — JOG MEDIA" },
      {
        property: "og:description",
        content: "Pledged gold loan register with renewal countdowns, renew, settle and edit actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoldLoansPage,
});

type FormState = {
  id?: string;
  bank_name: string;
  loan_number: string;
  gold_grams: string;
  loan_amount: string;
  loan_date: string;
  renewal_date: string;
  interest_rate: string;
  periodic_interest: string;
  bank_account_id: string | null;
  notes: string;
};

const blank = (): FormState => ({
  bank_name: "",
  loan_number: "",
  gold_grams: "",
  loan_amount: "",
  loan_date: todayISO(),
  renewal_date: todayISO(),
  interest_rate: "9",
  periodic_interest: "",
  bank_account_id: null,
  notes: "",
});

const toForm = (l: GoldLoan): FormState => ({
  id: l.id,
  bank_name: l.bank_name,
  loan_number: l.loan_number ?? "",
  gold_grams: l.gold_grams == null ? "" : String(l.gold_grams),
  loan_amount: String(l.loan_amount ?? ""),
  loan_date: l.loan_date,
  renewal_date: l.renewal_date,
  interest_rate: String(l.interest_rate ?? ""),
  periodic_interest: l.periodic_interest == null ? "" : String(l.periodic_interest),
  bank_account_id: l.bank_account_id,
  notes: l.notes ?? "",
});

const addMonths = (iso: string, months: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y || 1970, (m || 1) - 1, d || 1);
  dt.setMonth(dt.getMonth() + months);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

/** 8 grams = 1 പവൻ (sovereign). */
const sovereigns = (grams: number) => grams / 8;

const yearlyInterest = (l: GoldLoan) => (Number(l.loan_amount || 0) * Number(l.interest_rate || 0)) / 100;

function GoldLoansPage() {
  const { data: loans = [], isLoading } = useGoldLoans();
  const { data: accounts = [] } = useBankAccounts();
  const save = useUpsert("gold_loans", "Gold loan");
  const remove = useRemove("gold_loans", "Gold loan");

  const [tab, setTab] = useState<"active" | "due" | "closed">("active");
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState("");
  const [renewFor, setRenewFor] = useState<GoldLoan | null>(null);
  const [renewDate, setRenewDate] = useState("");
  const [settleFor, setSettleFor] = useState<GoldLoan | null>(null);
  const [settleDate, setSettleDate] = useState(todayISO());
  const [settleAmount, setSettleAmount] = useState("");
  const [settleAccount, setSettleAccount] = useState<string | null>(null);

  const active = useMemo(() => loans.filter((l) => l.status !== "closed"), [loans]);
  const closed = useMemo(() => loans.filter((l) => l.status === "closed"), [loans]);
  const due = useMemo(() => active.filter((l) => daysUntil(l.renewal_date) <= 15), [active]);

  const totalPrincipal = active.reduce((a, l) => a + Number(l.loan_amount || 0), 0);
  const totalGrams = active.reduce((a, l) => a + Number(l.gold_grams || 0), 0);
  const nextRenewal = [...active].sort((a, b) => daysUntil(a.renewal_date) - daysUntil(b.renewal_date))[0];

  const rows = tab === "active" ? active : tab === "due" ? due : closed;

  const submit = async () => {
    if (!form) return;
    if (!form.bank_name.trim()) return setErr("Bank / institution is required");
    if (!form.renewal_date) return setErr("Renewal due date is required");
    await save.mutateAsync({
      id: form.id,
      bank_name: form.bank_name.trim(),
      loan_number: form.loan_number.trim() || null,
      gold_grams: form.gold_grams ? Number(form.gold_grams) : null,
      loan_amount: Number(form.loan_amount || 0),
      loan_date: form.loan_date,
      renewal_date: form.renewal_date,
      interest_rate: Number(form.interest_rate || 0),
      periodic_interest: form.periodic_interest ? Number(form.periodic_interest) : null,
      bank_account_id: form.bank_account_id,
      notes: form.notes.trim() || null,
    });
    setErr("");
    setForm(null);
  };

  const submitRenew = async () => {
    if (!renewFor || !renewDate) return;
    await save.mutateAsync({ id: renewFor.id, renewal_date: renewDate });
    setRenewFor(null);
  };

  const submitSettle = async () => {
    if (!settleFor) return;
    const accName = accounts.find((a: any) => a.id === settleAccount)?.bank_name;
    const note = [settleFor.notes, accName ? `Settled via ${accName} on ${fmtDate(settleDate)}` : null]
      .filter(Boolean)
      .join(" · ");
    await save.mutateAsync({
      id: settleFor.id,
      status: "closed",
      closed_date: settleDate,
      closed_amount: Number(settleAmount || settleFor.loan_amount || 0),
      notes: note || null,
    });
    setSettleFor(null);
  };

  const tone = (days: number) =>
    days <= 0
      ? "bg-destructive/12 text-destructive border-destructive/25"
      : days <= 15
        ? "bg-warning/15 text-warning-foreground border-warning/35"
        : "bg-info/12 text-info border-info/25";

  return (
    <AppShell>
      <PageHeader
        title="Gold Loans Register"
        subtitle="Pledged gold, sanctioned amounts, interest and renewal due dates"
        actions={
          <Button
            onClick={() => {
              setErr("");
              setForm(blank());
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Gold Loan
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active loans" value={`${active.length}`} icon={<Coins className="h-4 w-4" />} />
        <StatCard label="Total principal" value={inr(totalPrincipal)} tone="destructive" />
        <StatCard
          label="Pledged gold"
          value={`${totalGrams.toFixed(1)} g`}
          hint={`${sovereigns(totalGrams).toFixed(2)} പവൻ`}
        />
        <StatCard
          label="Upcoming renewal"
          value={nextRenewal ? fmtDate(nextRenewal.renewal_date) : "—"}
          hint={nextRenewal ? `${nextRenewal.bank_name} · ${countdownLabel(nextRenewal.renewal_date)}` : "No active loans"}
          tone="warning"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList className="no-scrollbar flex w-full flex-nowrap overflow-x-auto">
          <TabsTrigger value="active">Active Loans ({active.length})</TabsTrigger>
          <TabsTrigger value="due">Renewals Due ({due.length})</TabsTrigger>
          <TabsTrigger value="closed">Settled ({closed.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <EmptyState message="Loading gold loans…" />
      ) : rows.length === 0 ? (
        <EmptyState
          message={
            tab === "closed"
              ? "No settled gold loans yet."
              : tab === "due"
                ? "No renewals due in the next 15 days."
                : "No gold loans recorded yet. Use “Add New Gold Loan”."
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((l) => {
            const days = daysUntil(l.renewal_date);
            const grams = Number(l.gold_grams || 0);
            const monthly = l.periodic_interest
              ? Number(l.periodic_interest)
              : yearlyInterest(l) / 12;
            return (
              <div key={l.id} className="surface w-full overflow-hidden p-4">
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">🪙 {l.bank_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.loan_number ? `GL A/c ${l.loan_number}` : "No account number"} · Pawned{" "}
                      {fmtDate(l.loan_date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums whitespace-nowrap">
                      {inr(Number(l.loan_amount || 0))}
                    </p>
                    {l.status === "closed" ? (
                      <span className="mt-1 inline-block rounded-full border border-success/25 bg-success/12 px-2 py-0.5 text-[10px] font-medium text-success whitespace-nowrap">
                        Settled {fmtDate(l.closed_date)}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                          tone(days),
                        )}
                      >
                        {countdownLabel(l.renewal_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">Pledged weight</p>
                    <p className="font-medium">
                      {grams ? `${grams.toFixed(1)} g (${sovereigns(grams).toFixed(2)} പവൻ)` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Renewal due</p>
                    <p className="font-medium">{fmtDate(l.renewal_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest</p>
                    <p className="font-medium">{Number(l.interest_rate || 0)}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Est. interest</p>
                    <p className="font-medium tabular-nums">
                      {inr(monthly)}/mo · {inr(yearlyInterest(l))}/yr
                    </p>
                  </div>
                </div>

                {l.notes ? (
                  <p className="mt-2 text-xs text-muted-foreground">📦 {l.notes}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2 no-print">
                  {l.status !== "closed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRenewDate(addMonths(l.renewal_date, 3));
                        setRenewFor(l);
                      }}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Renew
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setErr("");
                      setForm(toForm(l));
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  {l.status !== "closed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSettleDate(todayISO());
                        setSettleAmount(String(l.loan_amount ?? ""));
                        setSettleAccount(l.bank_account_id);
                        setSettleFor(l);
                      }}
                    >
                      <Wallet className="mr-1.5 h-3.5 w-3.5" /> Close / Settle
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={async () => {
                      if (!confirm(`Delete the ${l.bank_name} gold loan record?`)) return;
                      await remove.mutateAsync(l.id);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4" /> {form?.id ? "Edit Gold Loan" : "Add New Gold Loan"}
            </DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Bank / NBFC name</Label>
                <Input
                  value={form.bank_name}
                  placeholder="SBI Nadapuram, Federal Bank, Manappuram…"
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan / GL account number</Label>
                <Input
                  value={form.loan_number}
                  onChange={(e) => setForm({ ...form, loan_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Pledged gold weight (g)</Label>
                <Input
                  type="number"
                  value={form.gold_grams}
                  onChange={(e) => setForm({ ...form, gold_grams: e.target.value })}
                />
              </div>
              <div>
                <Label>Sanctioned amount (₹)</Label>
                <Input
                  type="number"
                  value={form.loan_amount}
                  onChange={(e) => setForm({ ...form, loan_amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan (pawned) date</Label>
                <Input
                  type="date"
                  value={form.loan_date}
                  onChange={(e) => setForm({ ...form, loan_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Renewal / expiry due date</Label>
                <Input
                  type="date"
                  value={form.renewal_date}
                  onChange={(e) => setForm({ ...form, renewal_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Interest rate (% p.a.)</Label>
                <Input
                  type="number"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                />
              </div>
              <div>
                <Label>Monthly interest amount (₹)</Label>
                <Input
                  type="number"
                  value={form.periodic_interest}
                  onChange={(e) => setForm({ ...form, periodic_interest: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <BankAccountField
                  label="Linked bank account (received into)"
                  value={form.bank_account_id}
                  onChange={(id) => setForm({ ...form, bank_account_id: id })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Packet ID / locker remarks</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              {err ? <p className="text-sm text-destructive sm:col-span-2">{err}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew */}
      <Dialog open={!!renewFor} onOpenChange={(o) => !o && setRenewFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renew {renewFor?.bank_name} loan</DialogTitle>
          </DialogHeader>
          <div>
            <Label>New renewal due date</Label>
            <Input type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} />
            <p className="mt-2 text-xs text-muted-foreground">
              Set this after paying the interest — the 15-day alert restarts from the new date.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitRenew}>Save renewal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle */}
      <Dialog open={!!settleFor} onOpenChange={(o) => !o && setSettleFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close / settle {settleFor?.bank_name} loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Settlement date</Label>
              <Input
                type="date"
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Amount repaid (₹)</Label>
              <Input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>
            <BankAccountField
              label="Repaid from account"
              value={settleAccount}
              onChange={setSettleAccount}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitSettle}>Mark settled</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
