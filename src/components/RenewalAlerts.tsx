import { useMemo, useState } from "react";
import { Landmark, Lock, Plus, Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BankAccountField } from "@/components/BankAccountField";
import {
  useFixedDeposits,
  useGoldLoans,
  useRemove,
  useUpsert,
  type FixedDeposit,
  type GoldLoan,
} from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { countdownLabel, daysUntil } from "@/lib/fd";
import { cn } from "@/lib/utils";

type Reminder = {
  key: string;
  kind: "fd" | "gold";
  label: string;
  meta: string;
  amount: number;
  date: string;
  days: number;
  fd?: FixedDeposit;
  loan?: GoldLoan;
};

type LoanForm = {
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

const blankLoan = (): LoanForm => ({
  bank_name: "",
  loan_number: "",
  gold_grams: "",
  loan_amount: "",
  loan_date: todayISO(),
  renewal_date: todayISO(),
  interest_rate: "",
  periodic_interest: "",
  bank_account_id: null,
  notes: "",
});

const toLoanForm = (l: GoldLoan): LoanForm => ({
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

/** FD maturities + gold loan renewals due within 15 days, live from the database. */
export function RenewalAlertsWidget({ compact = false }: { compact?: boolean }) {
  const { data: fds = [] } = useFixedDeposits();
  const { data: loans = [] } = useGoldLoans();
  const saveLoan = useUpsert("gold_loans", "Gold loan");
  const saveFd = useUpsert("fixed_deposits", "Fixed deposit");
  const removeLoan = useRemove("gold_loans", "Gold loan");

  const [form, setForm] = useState<LoanForm | null>(null);
  const [fdEdit, setFdEdit] = useState<FixedDeposit | null>(null);
  const [fdDate, setFdDate] = useState("");
  const [err, setErr] = useState("");

  const reminders = useMemo<Reminder[]>(() => {
    const fdRows: Reminder[] = fds
      .filter((f) => f.status !== "closed")
      .map((f) => ({
        key: `fd-${f.id}`,
        kind: "fd" as const,
        label: `🔒 FD — ${f.bank_name}`,
        meta: f.fd_number ? `A/c ${f.fd_number}` : "Fixed deposit",
        amount: Number(f.principal || 0),
        date: f.maturity_date,
        days: daysUntil(f.maturity_date),
        fd: f,
      }));
    const loanRows: Reminder[] = loans
      .filter((l) => l.status !== "closed")
      .map((l) => ({
        key: `gl-${l.id}`,
        kind: "gold" as const,
        label: `🟡 Gold Loan — ${l.bank_name}`,
        meta: l.loan_number ? `GL ${l.loan_number}` : "Gold loan",
        amount: Number(l.loan_amount || 0),
        date: l.renewal_date,
        days: daysUntil(l.renewal_date),
        loan: l,
      }));
    return [...fdRows, ...loanRows]
      .filter((r) => r.days <= 15)
      .sort((a, b) => a.days - b.days);
  }, [fds, loans]);

  const overdue = reminders.some((r) => r.days <= 0);

  const submitLoan = async () => {
    if (!form) return;
    if (!form.bank_name.trim()) return setErr("Bank / institution is required");
    if (!form.renewal_date) return setErr("Renewal due date is required");
    await saveLoan.mutateAsync({
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

  const renewLoan = async () => {
    if (!form?.id) return;
    const [y, m, d] = form.renewal_date.split("-").map(Number);
    const next = new Date(y, (m || 1) - 1, d || 1);
    next.setMonth(next.getMonth() + 3);
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    setForm({ ...form, renewal_date: iso });
    await saveLoan.mutateAsync({ id: form.id, renewal_date: iso });
  };

  const closeLoan = async () => {
    if (!form?.id) return;
    await saveLoan.mutateAsync({
      id: form.id,
      status: "closed",
      closed_date: todayISO(),
      closed_amount: Number(form.loan_amount || 0),
    });
    setForm(null);
  };

  const tone = (days: number) =>
    days <= 0
      ? "bg-destructive/15 text-destructive"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

  return (
    <>
      <div
        className={cn(
          compact
            ? "mx-3 mb-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3"
            : "surface p-4",
        )}
      >
        <div className="mb-1 flex items-center gap-2">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold",
              compact && "text-sidebar-foreground",
            )}
          >
            <Landmark className="h-4 w-4 shrink-0" />
            <span className="truncate">Renewals &amp; Loan Alerts</span>
          </div>
          {reminders.length > 0 ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                tone(overdue ? 0 : 1),
              )}
            >
              {reminders.length}
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Add gold loan"
            onClick={() => {
              setErr("");
              setForm(blankLoan());
            }}
            className={cn(
              "shrink-0 rounded-md p-1.5",
              compact
                ? "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {reminders.length === 0 ? (
          <p
            className={cn(
              "text-[11px]",
              compact ? "text-sidebar-foreground/60" : "text-muted-foreground",
            )}
          >
            All renewals up to date (No dues in next 15 days)
          </p>
        ) : (
          <ul className={cn("space-y-1.5", compact ? "text-[12px]" : "text-sm")}>
            {reminders.map((r) => (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => {
                    setErr("");
                    if (r.kind === "gold" && r.loan) setForm(toLoanForm(r.loan));
                    else if (r.fd) {
                      setFdEdit(r.fd);
                      setFdDate(r.fd.maturity_date);
                    }
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left",
                    compact ? "hover:bg-sidebar-accent" : "bg-muted/40 hover:bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate font-medium",
                        compact && "text-sidebar-foreground",
                      )}
                    >
                      {r.label}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-[11px]",
                        compact ? "text-sidebar-foreground/60" : "text-muted-foreground",
                      )}
                    >
                      {r.meta} · Due {fmtDate(r.date)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={cn(
                        "block font-semibold tabular-nums",
                        compact && "text-sidebar-foreground",
                      )}
                    >
                      {inr(r.amount)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
                        tone(r.days),
                      )}
                    >
                      {countdownLabel(r.date)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Gold loan manager */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4" /> {form?.id ? "Gold Loan" : "Add Gold Loan"}
            </DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Bank / Financial institution</Label>
                <Input
                  value={form.bank_name}
                  placeholder="SBI Nadapuram, Federal Bank, Manappuram…"
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan account / GL number</Label>
                <Input
                  value={form.loan_number}
                  onChange={(e) => setForm({ ...form, loan_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Pawned gold weight (g)</Label>
                <Input
                  type="number"
                  value={form.gold_grams}
                  onChange={(e) => setForm({ ...form, gold_grams: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan amount sanctioned (₹)</Label>
                <Input
                  type="number"
                  value={form.loan_amount}
                  onChange={(e) => setForm({ ...form, loan_amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan (disbursed) date</Label>
                <Input
                  type="date"
                  value={form.loan_date}
                  onChange={(e) => setForm({ ...form, loan_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Renewal / maturity due date</Label>
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
                <Label>Periodic interest amount (₹)</Label>
                <Input
                  type="number"
                  value={form.periodic_interest}
                  onChange={(e) => setForm({ ...form, periodic_interest: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <BankAccountField
                  label="Linked bank account"
                  value={form.bank_account_id}
                  onChange={(id) => setForm({ ...form, bank_account_id: id })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes / packet ID</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              {err ? <p className="text-sm text-destructive sm:col-span-2">{err}</p> : null}
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {form?.id ? (
              <>
                <Button variant="outline" onClick={renewLoan}>
                  Renew loan (+3 months)
                </Button>
                <Button variant="outline" onClick={closeLoan}>
                  Close / settle loan
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    if (!confirm("Delete this gold loan record?")) return;
                    await removeLoan.mutateAsync(form.id!);
                    setForm(null);
                  }}
                >
                  Delete
                </Button>
              </>
            ) : null}
            <Button onClick={submitLoan}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FD quick edit */}
      <Dialog open={!!fdEdit} onOpenChange={(o) => !o && setFdEdit(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> {fdEdit?.bank_name} FD
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>Maturity / renewal date</Label>
            <Input type="date" value={fdDate} onChange={(e) => setFdDate(e.target.value)} />
            <p className="mt-2 text-xs text-muted-foreground">
              Invested {inr(Number(fdEdit?.principal || 0))}
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={async () => {
                if (!fdEdit) return;
                await saveFd.mutateAsync({
                  id: fdEdit.id,
                  status: "closed",
                  closed_date: todayISO(),
                  closed_amount: Number(fdEdit.maturity_amount || fdEdit.principal || 0),
                });
                setFdEdit(null);
              }}
            >
              Close FD
            </Button>
            <Button
              onClick={async () => {
                if (!fdEdit || !fdDate) return;
                await saveFd.mutateAsync({ id: fdEdit.id, maturity_date: fdDate });
                setFdEdit(null);
              }}
            >
              Save date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
