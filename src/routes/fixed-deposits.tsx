import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Landmark, Lock, Plus, Pencil, RefreshCw, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  useBankAccounts,
  useFixedDeposits,
  useRemove,
  useUpsert,
  type FixedDeposit,
} from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { addTenure, countdownLabel, daysUntil, estimateMaturity, fdState } from "@/lib/fd";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fixed-deposits")({
  head: () => ({
    meta: [
      { title: "Fixed Deposits (FD) — JOG MEDIA" },
      {
        name: "description",
        content:
          "Track every JOG MEDIA fixed deposit: invested amount, interest rate, maturity date, renewal reminders and closures.",
      },
      { property: "og:title", content: "Fixed Deposits (FD) — JOG MEDIA" },
      {
        property: "og:description",
        content: "Studio fixed deposit register with maturity countdowns and renewal alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FixedDepositsPage,
});

type FormState = {
  id?: string;
  bank_name: string;
  fd_number: string;
  source_bank_account_id: string | null;
  principal: string;
  deposit_date: string;
  tenure_months: string;
  tenure_days: string;
  interest_rate: string;
  maturity_date: string;
  maturity_amount: string;
  auto_renew: boolean;
  notes: string;
};

const blank = (): FormState => ({
  bank_name: "",
  fd_number: "",
  source_bank_account_id: null,
  principal: "",
  deposit_date: todayISO(),
  tenure_months: "12",
  tenure_days: "0",
  interest_rate: "7",
  maturity_date: addTenure(todayISO(), 12, 0),
  maturity_amount: "",
  auto_renew: false,
  notes: "",
});

const toForm = (fd: FixedDeposit): FormState => ({
  id: fd.id,
  bank_name: fd.bank_name,
  fd_number: fd.fd_number ?? "",
  source_bank_account_id: fd.source_bank_account_id,
  principal: String(fd.principal ?? ""),
  deposit_date: fd.deposit_date,
  tenure_months: String(fd.tenure_months ?? 0),
  tenure_days: String(fd.tenure_days ?? 0),
  interest_rate: String(fd.interest_rate ?? 0),
  maturity_date: fd.maturity_date,
  maturity_amount: String(fd.maturity_amount ?? ""),
  auto_renew: fd.auto_renew,
  notes: fd.notes ?? "",
});

function FixedDepositsPage() {
  const { data: rows = [], isLoading } = useFixedDeposits();
  const { data: banks = [] } = useBankAccounts();
  const save = useUpsert("fixed_deposits", "Fixed deposit");
  const remove = useRemove("fixed_deposits", "Fixed deposit");

  const [tab, setTab] = useState<"active" | "closed">("active");
  const [form, setForm] = useState<FormState | null>(null);
  const [renew, setRenew] = useState<FixedDeposit | null>(null);
  const [close, setClose] = useState<FixedDeposit | null>(null);
  const [err, setErr] = useState("");

  const active = rows.filter((f) => f.status !== "closed");
  const closed = rows.filter((f) => f.status === "closed");
  const visible = tab === "active" ? active : closed;

  const totals = useMemo(() => {
    const invested = active.reduce((a, f) => a + Number(f.principal || 0), 0);
    const maturity = active.reduce(
      (a, f) => a + Number(f.maturity_amount || f.principal || 0),
      0,
    );
    const due30 = active.filter((f) => daysUntil(f.maturity_date) <= 30).length;
    const due15 = active.filter((f) => daysUntil(f.maturity_date) <= 15).length;
    return { invested, maturity, due30, due15 };
  }, [active]);

  const bankName = (id: string | null) => banks.find((b) => b.id === id)?.bank_name ?? "—";

  const patch = (p: Partial<FormState>) =>
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, ...p };
      // keep maturity date + expected value in sync with tenure edits
      if (
        p.deposit_date !== undefined ||
        p.tenure_months !== undefined ||
        p.tenure_days !== undefined
      ) {
        next.maturity_date = addTenure(
          next.deposit_date,
          Number(next.tenure_months || 0),
          Number(next.tenure_days || 0),
        );
      }
      if (
        p.principal !== undefined ||
        p.interest_rate !== undefined ||
        p.tenure_months !== undefined ||
        p.tenure_days !== undefined
      ) {
        next.maturity_amount = String(
          estimateMaturity(
            Number(next.principal || 0),
            Number(next.interest_rate || 0),
            Number(next.tenure_months || 0),
            Number(next.tenure_days || 0),
          ),
        );
      }
      return next;
    });

  const submit = async () => {
    if (!form) return;
    if (!form.bank_name.trim()) return setErr("Bank / institution name is required");
    if (Number(form.principal) <= 0) return setErr("FD amount must be greater than zero");
    if (!form.id && !form.source_bank_account_id)
      return setErr("Choose the bank account the money is transferred from");
    if (!form.maturity_date) return setErr("Maturity date is required");
    setErr("");
    await save.mutateAsync({
      id: form.id,
      bank_name: form.bank_name.trim(),
      fd_number: form.fd_number.trim() || null,
      source_bank_account_id: form.source_bank_account_id,
      principal: Number(form.principal || 0),
      deposit_date: form.deposit_date,
      tenure_months: Number(form.tenure_months || 0),
      tenure_days: Number(form.tenure_days || 0),
      interest_rate: Number(form.interest_rate || 0),
      maturity_date: form.maturity_date,
      maturity_amount: Number(form.maturity_amount || 0),
      auto_renew: form.auto_renew,
      notes: form.notes.trim() || null,
      status: "active",
    });
    setForm(null);
  };

  return (
    <AppShell>
      <PageHeader
        title="Fixed Deposits (FD)"
        subtitle="Studio savings locked in deposits — tracked as an internal asset transfer, never as an expense."
        actions={
          <Button onClick={() => setForm(blank())}>
            <Plus className="mr-1.5 h-4 w-4" /> Open / Record New FD
          </Button>
        }
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCard
          compact
          label="Total Active FDs"
          value={inr(totals.invested)}
          hint={`${active.length} deposit${active.length === 1 ? "" : "s"} invested`}
          icon={<Lock className="h-4 w-4" />}
        />
        <StatCard
          compact
          label="Expected Maturity Value"
          value={inr(totals.maturity)}
          hint={`Interest accruing ${inr(totals.maturity - totals.invested)}`}
          tone="success"
          icon={<Landmark className="h-4 w-4" />}
        />
        <StatCard
          compact
          label="Upcoming Renewals"
          value={String(totals.due30)}
          hint={`${totals.due15} within 15 days · ${totals.due30} within 30 days`}
          tone={totals.due15 > 0 ? "warning" : "default"}
          icon={<RefreshCw className="h-4 w-4" />}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {isLoading ? (
          <EmptyState message="Loading fixed deposits…" />
        ) : visible.length === 0 ? (
          <EmptyState
            message={
              tab === "active"
                ? "No active fixed deposits yet. Use “Open / Record New FD” to move idle bank balance into a deposit."
                : "No closed deposits yet."
            }
          />
        ) : (
          visible.map((fd) => {
            const state = fdState(fd);
            const banner =
              state === "overdue"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : state === "due-soon"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "";
            return (
              <div key={fd.id} className="surface w-full overflow-hidden p-4">
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{fd.bank_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fd.fd_number ? `FD No. ${fd.fd_number}` : "No FD number recorded"} · from{" "}
                      {bankName(fd.source_bank_account_id)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
                      {inr(fd.principal)}
                    </p>
                    <p className="whitespace-nowrap text-xs text-success tabular-nums">
                      → {inr(fd.maturity_amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5">
                    {Number(fd.interest_rate).toFixed(2)}% p.a.
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5">
                    Started {fmtDate(fd.deposit_date)}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5">
                    {fd.tenure_months} mo{fd.tenure_days ? ` ${fd.tenure_days} d` : ""}
                  </span>
                  {fd.auto_renew && (
                    <span className="rounded-full border border-border px-2 py-0.5">Auto-renew</span>
                  )}
                </div>

                {fd.status === "closed" ? (
                  <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                    Closed on {fmtDate(fd.closed_date)} · {inr(fd.closed_amount ?? 0)} credited to{" "}
                    {bankName(fd.payout_bank_account_id)}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "mt-3 rounded-lg border px-3 py-2 text-xs",
                      banner || "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {state === "overdue" && <strong>Renewal Due! </strong>}⏳ Matures on{" "}
                    {fmtDate(fd.maturity_date)} · {countdownLabel(fd.maturity_date)}
                  </div>
                )}

                {fd.notes && <p className="mt-2 text-xs text-muted-foreground">{fd.notes}</p>}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setForm(toForm(fd))}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit Details
                  </Button>
                  {fd.status !== "closed" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setRenew(fd)}>
                        <RefreshCw className="mr-1.5 h-4 w-4" /> Renew FD
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setClose(fd)}>
                        <Wallet className="mr-1.5 h-4 w-4" /> Close / Liquidate
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete this fixed deposit record? The bank balance will be restored."))
                        remove.mutate(fd.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / edit */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {form?.id ? "Edit fixed deposit" : "Open / Record New FD"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <BankAccountField
                label="Bank Account Source (amount is transferred out of this balance)"
                value={form.source_bank_account_id}
                onChange={(id) => patch({ source_bank_account_id: id })}
              />
              <Field label="FD Amount Invested (₹)" required>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.principal}
                  onChange={(e) => patch({ principal: e.target.value })}
                />
              </Field>
              <Field label="Bank / Institution holding the FD" required>
                <Input
                  placeholder="e.g. SBI Kozhikode Main"
                  value={form.bank_name}
                  onChange={(e) => patch({ bank_name: e.target.value })}
                />
              </Field>
              <Field label="FD Account / Reference Number">
                <Input
                  value={form.fd_number}
                  onChange={(e) => patch({ fd_number: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Deposit Date">
                  <Input
                    type="date"
                    value={form.deposit_date}
                    onChange={(e) => patch({ deposit_date: e.target.value })}
                  />
                </Field>
                <Field label="Interest Rate (% p.a.)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.interest_rate}
                    onChange={(e) => patch({ interest_rate: e.target.value })}
                  />
                </Field>
                <Field label="Tenure (months)">
                  <Input
                    type="number"
                    value={form.tenure_months}
                    onChange={(e) => patch({ tenure_months: e.target.value })}
                  />
                </Field>
                <Field label="Tenure (extra days)">
                  <Input
                    type="number"
                    value={form.tenure_days}
                    onChange={(e) => patch({ tenure_days: e.target.value })}
                  />
                </Field>
                <Field label="Maturity / Renewal Date">
                  <Input
                    type="date"
                    value={form.maturity_date}
                    onChange={(e) => setForm((f) => (f ? { ...f, maturity_date: e.target.value } : f))}
                  />
                </Field>
                <Field label="Expected Maturity Amount (₹)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.maturity_amount}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, maturity_amount: e.target.value } : f))
                    }
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Auto-Renewal</p>
                  <p className="text-xs text-muted-foreground">Bank renews on maturity</p>
                </div>
                <Switch
                  checked={form.auto_renew}
                  onCheckedChange={(v) => patch({ auto_renew: v })}
                />
              </div>
              <Field label="Notes / Remarks">
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              </Field>
              {err && <p className="text-xs text-destructive">{err}</p>}
              <p className="text-xs text-muted-foreground">
                This is recorded as an internal asset transfer — the amount leaves the selected bank
                balance but is not counted as a studio expense.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {form?.id ? "Save changes" : "Record FD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RenewDialog fd={renew} onClose={() => setRenew(null)} />
      <CloseDialog fd={close} onClose={() => setClose(null)} />
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function RenewDialog({ fd, onClose }: { fd: FixedDeposit | null; onClose: () => void }) {
  const save = useUpsert("fixed_deposits", "Fixed deposit");
  const [months, setMonths] = useState("12");
  const [rate, setRate] = useState("");
  const [from, setFrom] = useState("");

  const start = from || fd?.maturity_date || todayISO();
  const effRate = rate || String(fd?.interest_rate ?? 0);
  const newMaturity = addTenure(start, Number(months || 0), 0);
  const newValue = fd
    ? estimateMaturity(
        Number(fd.maturity_amount || fd.principal),
        Number(effRate || 0),
        Number(months || 0),
        0,
      )
    : 0;

  const apply = async () => {
    if (!fd) return;
    await save.mutateAsync({
      id: fd.id,
      deposit_date: start,
      tenure_months: Number(months || 0),
      tenure_days: 0,
      interest_rate: Number(effRate || 0),
      maturity_date: newMaturity,
      maturity_amount: newValue,
      status: "active",
    });
    onClose();
  };

  return (
    <Dialog
      open={!!fd}
      onOpenChange={(o) => {
        if (!o) onClose();
        else {
          setMonths(String(fd?.tenure_months ?? 12));
          setRate(String(fd?.interest_rate ?? ""));
          setFrom(fd?.maturity_date ?? todayISO());
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Renew FD</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Renewal starts on">
            <Input type="date" value={start} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="New tenure (months)">
            <Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} />
          </Field>
          <Field label="New interest rate (% p.a.)">
            <Input
              type="number"
              inputMode="decimal"
              value={effRate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            New maturity: <strong>{fmtDate(newMaturity)}</strong> · expected {inr(newValue)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={save.isPending}>
            Renew
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ fd, onClose }: { fd: FixedDeposit | null; onClose: () => void }) {
  const save = useUpsert("fixed_deposits", "Fixed deposit");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [err, setErr] = useState("");

  const apply = async () => {
    if (!fd) return;
    if (!bank) return setErr("Choose the bank account receiving the money");
    if (Number(amount) <= 0) return setErr("Amount received must be greater than zero");
    setErr("");
    await save.mutateAsync({
      id: fd.id,
      status: "closed",
      closed_date: date,
      closed_amount: Number(amount || 0),
      payout_bank_account_id: bank,
    });
    onClose();
  };

  return (
    <Dialog
      open={!!fd}
      onOpenChange={(o) => {
        if (!o) onClose();
        else {
          setAmount(String(fd?.maturity_amount ?? fd?.principal ?? ""));
          setBank(fd?.source_bank_account_id ?? null);
          setDate(todayISO());
          setErr("");
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Close / Liquidate FD</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Closure date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Amount received (principal + interest)" required>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <BankAccountField
            label="Credit into bank account"
            value={bank}
            onChange={(id) => setBank(id)}
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={save.isPending}>
            Close FD
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
