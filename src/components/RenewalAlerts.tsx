import { useMemo, useState, useSyncExternalStore } from "react";
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

type FdForm = {
  bank_name: string;
  fd_number: string;
  principal: string;
  deposit_date: string;
  maturity_date: string;
  maturity_amount: string;
  source_bank_account_id: string | null;
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

const blankFd = (): FdForm => ({
  bank_name: "",
  fd_number: "",
  principal: "",
  deposit_date: todayISO(),
  maturity_date: todayISO(),
  maturity_amount: "",
  source_bank_account_id: null,
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

/* ------------------------------------------------------------------ *
 * Tiny external store so the dialogs live at the app root, outside the
 * mobile sidebar drawer. Opening a dialog from inside the drawer used to
 * unmount it together with the drawer, which read as "closes instantly".
 * ------------------------------------------------------------------ */

type RenewalRequest =
  | { mode: "add" }
  | { mode: "loan"; loan: GoldLoan }
  | { mode: "fd"; fd: FixedDeposit }
  | null;

let request: RenewalRequest = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => request;

export function openRenewalDialog(next: Exclude<RenewalRequest, null>) {
  request = next;
  emit();
}
export function closeRenewalDialog() {
  request = null;
  emit();
}

/** FD maturities + gold loan renewals due within 15 days, live from the database. */
export function RenewalAlertsWidget({
  compact = false,
  onOpenDialog,
}: {
  compact?: boolean;
  onOpenDialog?: () => void;
}) {
  const { data: fds = [] } = useFixedDeposits();
  const { data: loans = [] } = useGoldLoans();

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
    return [...fdRows, ...loanRows].filter((r) => r.days <= 15).sort((a, b) => a.days - b.days);
  }, [fds, loans]);

  const overdue = reminders.some((r) => r.days <= 0);

  const tone = (days: number) =>
    days <= 0
      ? "bg-destructive/15 text-destructive"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

  return (
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
          aria-label="Add gold loan or fixed deposit"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDialog?.();
            openRenewalDialog({ mode: "add" });
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
          className={cn("text-[11px]", compact ? "text-sidebar-foreground/60" : "text-muted-foreground")}
        >
          All renewals up to date (No dues in next 15 days)
        </p>
      ) : (
        <ul className={cn("space-y-1.5", compact ? "text-[12px]" : "text-sm")}>
          {reminders.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDialog?.();
                  if (r.kind === "gold" && r.loan) openRenewalDialog({ mode: "loan", loan: r.loan });
                  else if (r.fd) openRenewalDialog({ mode: "fd", fd: r.fd });
                }}
                className={cn(
                  "flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left",
                  compact ? "hover:bg-sidebar-accent" : "bg-muted/40 hover:bg-muted",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn("block truncate font-medium", compact && "text-sidebar-foreground")}
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
  );
}

/**
 * Renders the renewal dialogs once, at the app root, so they survive the
 * mobile drawer closing. Mount this outside any Sheet/Drawer.
 */
export function RenewalDialogsHost() {
  const req = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const saveLoan = useUpsert("gold_loans", "Gold loan");
  const saveFd = useUpsert("fixed_deposits", "Fixed deposit");
  const removeLoan = useRemove("gold_loans", "Gold loan");

  const [tab, setTab] = useState<"gold" | "fd">("gold");
  const [loan, setLoan] = useState<LoanForm>(blankLoan());
  const [fd, setFd] = useState<FdForm>(blankFd());
  const [fdDate, setFdDate] = useState("");
  const [err, setErr] = useState("");
  const [signature, setSignature] = useState<string>("");

  // Sync form state to the current request without effects re-running dialogs.
  const sig = req ? `${req.mode}:${"loan" in req ? req.loan.id : "fd" in req ? req.fd.id : "new"}` : "";
  if (sig !== signature) {
    setSignature(sig);
    setErr("");
    if (req?.mode === "add") {
      setTab("gold");
      setLoan(blankLoan());
      setFd(blankFd());
    } else if (req?.mode === "loan") {
      setLoan(toLoanForm(req.loan));
    } else if (req?.mode === "fd") {
      setFdDate(req.fd.maturity_date);
    }
  }

  const loanOpen = req?.mode === "add" || req?.mode === "loan";
  const fdEditOpen = req?.mode === "fd";
  const editingFd = req?.mode === "fd" ? req.fd : null;

  const submitLoan = async () => {
    if (!loan.bank_name.trim()) return setErr("Bank / institution is required");
    if (!loan.renewal_date) return setErr("Renewal due date is required");
    await saveLoan.mutateAsync({
      id: loan.id,
      bank_name: loan.bank_name.trim(),
      loan_number: loan.loan_number.trim() || null,
      gold_grams: loan.gold_grams ? Number(loan.gold_grams) : null,
      loan_amount: Number(loan.loan_amount || 0),
      loan_date: loan.loan_date,
      renewal_date: loan.renewal_date,
      interest_rate: Number(loan.interest_rate || 0),
      periodic_interest: loan.periodic_interest ? Number(loan.periodic_interest) : null,
      bank_account_id: loan.bank_account_id,
      notes: loan.notes.trim() || null,
    });
    setErr("");
    closeRenewalDialog();
  };

  const submitFd = async () => {
    if (!fd.bank_name.trim()) return setErr("Bank / provider is required");
    if (!fd.maturity_date) return setErr("Maturity / renewal date is required");
    const principal = Number(fd.principal || 0);
    await saveFd.mutateAsync({
      bank_name: fd.bank_name.trim(),
      fd_number: fd.fd_number.trim() || null,
      source_bank_account_id: fd.source_bank_account_id,
      principal,
      deposit_date: fd.deposit_date,
      tenure_months: 0,
      tenure_days: Math.max(0, daysUntil(fd.maturity_date) - daysUntil(fd.deposit_date)),
      interest_rate: 0,
      maturity_date: fd.maturity_date,
      maturity_amount: Number(fd.maturity_amount || principal),
      auto_renew: false,
      notes: fd.notes.trim() || null,
      status: "active",
    });
    setErr("");
    closeRenewalDialog();
  };

  const renewLoan = async () => {
    if (!loan.id) return;
    const [y, m, d] = loan.renewal_date.split("-").map(Number);
    const next = new Date(y, (m || 1) - 1, d || 1);
    next.setMonth(next.getMonth() + 3);
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    setLoan({ ...loan, renewal_date: iso });
    await saveLoan.mutateAsync({ id: loan.id, renewal_date: iso });
  };

  const closeLoan = async () => {
    if (!loan.id) return;
    await saveLoan.mutateAsync({
      id: loan.id,
      status: "closed",
      closed_date: todayISO(),
      closed_amount: Number(loan.loan_amount || 0),
    });
    closeRenewalDialog();
  };

  return (
    <>
      <Dialog open={loanOpen} onOpenChange={(o) => !o && closeRenewalDialog()}>
        <DialogContent className="z-[9999] max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              {loan.id ? "Gold Loan" : "Add Renewal / Loan"}
            </DialogTitle>
          </DialogHeader>

          {req?.mode === "add" ? (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(
                [
                  ["gold", "+ Gold Loan"],
                  ["fd", "+ Fixed Deposit"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setErr("");
                    setTab(key);
                  }}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium",
                    tab === key ? "bg-card shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {req?.mode === "add" && tab === "fd" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Bank / provider name</Label>
                <Input
                  value={fd.bank_name}
                  placeholder="Federal Bank, SBI, Canara…"
                  onChange={(e) => setFd({ ...fd, bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>FD account / certificate number</Label>
                <Input
                  value={fd.fd_number}
                  onChange={(e) => setFd({ ...fd, fd_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Invested amount (₹)</Label>
                <Input
                  type="number"
                  value={fd.principal}
                  onChange={(e) => setFd({ ...fd, principal: e.target.value })}
                />
              </div>
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={fd.deposit_date}
                  onChange={(e) => setFd({ ...fd, deposit_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Maturity / renewal date</Label>
                <Input
                  type="date"
                  value={fd.maturity_date}
                  onChange={(e) => setFd({ ...fd, maturity_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Expected maturity amount (₹)</Label>
                <Input
                  type="number"
                  value={fd.maturity_amount}
                  onChange={(e) => setFd({ ...fd, maturity_amount: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <BankAccountField
                  label="Debited bank account"
                  value={fd.source_bank_account_id}
                  onChange={(id) => setFd({ ...fd, source_bank_account_id: id })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={fd.notes}
                  onChange={(e) => setFd({ ...fd, notes: e.target.value })}
                />
              </div>
              {err ? <p className="text-sm text-destructive sm:col-span-2">{err}</p> : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Bank / NBFC name</Label>
                <Input
                  value={loan.bank_name}
                  placeholder="SBI Nadapuram, Federal Bank, Manappuram…"
                  onChange={(e) => setLoan({ ...loan, bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan / GL account number</Label>
                <Input
                  value={loan.loan_number}
                  onChange={(e) => setLoan({ ...loan, loan_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Gold weight (g)</Label>
                <Input
                  type="number"
                  value={loan.gold_grams}
                  onChange={(e) => setLoan({ ...loan, gold_grams: e.target.value })}
                />
              </div>
              <div>
                <Label>Sanctioned loan amount (₹)</Label>
                <Input
                  type="number"
                  value={loan.loan_amount}
                  onChange={(e) => setLoan({ ...loan, loan_amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan issue date</Label>
                <Input
                  type="date"
                  value={loan.loan_date}
                  onChange={(e) => setLoan({ ...loan, loan_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Renewal / maturity due date</Label>
                <Input
                  type="date"
                  value={loan.renewal_date}
                  onChange={(e) => setLoan({ ...loan, renewal_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Interest rate (% p.a.)</Label>
                <Input
                  type="number"
                  value={loan.interest_rate}
                  onChange={(e) => setLoan({ ...loan, interest_rate: e.target.value })}
                />
              </div>
              <div>
                <Label>Periodic interest amount (₹)</Label>
                <Input
                  type="number"
                  value={loan.periodic_interest}
                  onChange={(e) => setLoan({ ...loan, periodic_interest: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <BankAccountField
                  label="Linked bank account (received into)"
                  value={loan.bank_account_id}
                  onChange={(id) => setLoan({ ...loan, bank_account_id: id })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes / packet number</Label>
                <Textarea
                  rows={2}
                  value={loan.notes}
                  onChange={(e) => setLoan({ ...loan, notes: e.target.value })}
                />
              </div>
              {err ? <p className="text-sm text-destructive sm:col-span-2">{err}</p> : null}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {loan.id && req?.mode === "loan" ? (
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
                    await removeLoan.mutateAsync(loan.id!);
                    closeRenewalDialog();
                  }}
                >
                  Delete
                </Button>
              </>
            ) : null}
            <Button onClick={req?.mode === "add" && tab === "fd" ? submitFd : submitLoan}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FD quick edit */}
      <Dialog open={fdEditOpen} onOpenChange={(o) => !o && closeRenewalDialog()}>
        <DialogContent className="z-[9999] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> {editingFd?.bank_name} FD
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>Maturity / renewal date</Label>
            <Input type="date" value={fdDate} onChange={(e) => setFdDate(e.target.value)} />
            <p className="mt-2 text-xs text-muted-foreground">
              Invested {inr(Number(editingFd?.principal || 0))}
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={async () => {
                if (!editingFd) return;
                await saveFd.mutateAsync({
                  id: editingFd.id,
                  status: "closed",
                  closed_date: todayISO(),
                  closed_amount: Number(editingFd.maturity_amount || editingFd.principal || 0),
                });
                closeRenewalDialog();
              }}
            >
              Close FD
            </Button>
            <Button
              onClick={async () => {
                if (!editingFd || !fdDate) return;
                await saveFd.mutateAsync({ id: editingFd.id, maturity_date: fdDate });
                closeRenewalDialog();
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
