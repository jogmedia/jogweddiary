import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useRemove, useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";

const PAY_MODES = ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v }));

type Payment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_no?: string | null;
  notes?: string | null;
  bank_account_id?: string | null;
};

/** Payment milestones & history for one project. */
export function ProjectPaymentsDialog({
  projectId,
  payments,
  total,
  balance,
  open,
  onOpenChange,
}: {
  projectId: string;
  payments: Payment[];
  total: number;
  balance: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const save = useUpsert("project_payments", "Payment");
  const remove = useRemove("project_payments", "Payment");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const received = payments.reduce((a, p) => a + Number(p.amount ?? 0), 0);

  const fields: Field[] = [
    { name: "payment_date", label: "Date", type: "date", required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "payment_mode", label: "Mode", type: "select", options: PAY_MODES, required: true },
    { name: "reference_no", label: "Reference no." },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const bankExtra = (values: Record<string, any>, set: (n: string, v: any) => void) =>
    needsBankAccount(values.payment_mode) ? (
      <BankAccountField
        label="Received Into Bank Account"
        value={values.bank_account_id ?? null}
        onChange={(v) => set("bank_account_id", v)}
      />
    ) : null;

  const submit = (v: Record<string, any>, extraProps: Record<string, any> = {}) =>
    save.mutateAsync({
      ...v,
      ...extraProps,
      project_id: projectId,
      bank_account_id: needsBankAccount(v.payment_mode) ? (v.bank_account_id ?? null) : null,
    });

  const sorted = [...payments].sort((a, b) =>
    String(a.payment_date) < String(b.payment_date) ? 1 : -1,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Payment milestones &amp; history</DialogTitle>
          </DialogHeader>

          <div className="surface flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Received
              </p>
              <p className="stat-value text-success">{inr(received)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Agreed {inr(total)} · Balance due{" "}
                <span className={balance > 0 ? "text-destructive" : "text-success"}>
                  {inr(balance)}
                </span>
              </p>
            </div>
            <Button size="sm" className="min-h-11" onClick={() => setAdding(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Record payment
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {sorted.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              sorted.map((p) => (
                <div key={p.id} className="surface flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inr(p.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fmtDate(p.payment_date)}
                      {p.payment_mode ? ` · ${p.payment_mode}` : ""}
                      {p.reference_no ? ` · ${p.reference_no}` : ""}
                    </p>
                    {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      aria-label="Edit payment"
                      title="Edit payment"
                      onClick={() => setEditing(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      aria-label="Delete payment"
                      title="Delete payment"
                      onClick={() => setDeleteId(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {adding && (
        <RecordDialog
          title="Record payment"
          submitLabel="Save payment"
          fields={fields}
          initial={{ payment_date: todayISO(), payment_mode: "cash" }}
          open={adding}
          onOpenChange={(v) => !v && setAdding(false)}
          extra={bankExtra}
          onSubmit={async (v) => {
            await submit(v);
            setAdding(false);
          }}
        />
      )}

      {editing && (
        <RecordDialog
          title="Edit payment"
          submitLabel="Update payment"
          fields={fields}
          initial={editing as any}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          extra={bankExtra}
          onSubmit={async (v) => {
            await submit(v, { id: editing.id });
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the payment and recalculates received, balance due and bank balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) remove.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
