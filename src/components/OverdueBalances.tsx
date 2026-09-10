import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CalendarDays, MessageCircle, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";

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

export function OverdueBalances({ projects, today }: { projects: any[]; today: string }) {
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

/** Shared overdue-project selector used by the dashboard, page and sidebar badge. */
export function selectOverdueProjects(projects: any[], today: string) {
  return projects
    .filter((p) => Number(p.balance_due ?? 0) > 0 && p.event_date < today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
}
