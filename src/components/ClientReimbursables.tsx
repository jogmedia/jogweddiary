import { useMemo, useState } from "react";
import { ChevronRight, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { BankAccountField } from "@/components/BankAccountField";
import { useRemove, useUpsert, type Reimbursable } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";

const SOURCES = [
  { value: "bank", label: "Bank / UPI" },
  { value: "cash", label: "Cash in Hand" },
];

const sourceLabel = (v?: string | null) =>
  SOURCES.find((s) => s.value === v)?.label ?? "Cash in Hand";

export function reimbursableTotals(rows: Reimbursable[]) {
  const claimed = rows
    .filter((r) => r.kind === "claim")
    .reduce((a, r) => a + Number(r.amount ?? 0), 0);
  const reimbursed = rows
    .filter((r) => r.kind === "settlement")
    .reduce((a, r) => a + Number(r.amount ?? 0), 0);
  return { claimed, reimbursed, pending: claimed - reimbursed };
}

/** Standalone card summarising money spent on the client's behalf. */
export function ClientReimbursablesCard({
  rows,
  onClick,
}: {
  rows: Reimbursable[];
  onClick: () => void;
}) {
  const { claimed, reimbursed, pending } = reimbursableTotals(rows);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open client reimbursables ledger"
      className="surface w-full cursor-pointer p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Client reimbursables
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tickets, fuel &amp; tolls paid on the client&apos;s behalf — kept out of project profit
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Balance to collect
          </p>
          <p className={`stat-value ${pending > 0 ? "text-destructive" : "text-success"}`}>
            {inr(pending)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total claimed</p>
          <p className="text-base font-semibold">{inr(claimed)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Total reimbursed
          </p>
          <p className="text-base font-semibold text-success">{inr(reimbursed)}</p>
        </div>
      </div>
    </button>
  );
}

export function ClientReimbursablesDialog({
  projectId,
  projectName,
  clientName,
  clientPhone,
  rows,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  rows: Reimbursable[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const save = useUpsert("project_reimbursables", "Reimbursable");
  const remove = useRemove("project_reimbursables", "Reimbursable");
  const [adding, setAdding] = useState<null | "claim" | "settlement">(null);
  const [editing, setEditing] = useState<Reimbursable | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { claimed, reimbursed, pending } = useMemo(() => reimbursableTotals(rows), [rows]);
  const claims = rows.filter((r) => r.kind === "claim");
  const settlements = rows.filter((r) => r.kind === "settlement");

  const claimFields: Field[] = [
    { name: "item_name", label: "Item / description", required: true, placeholder: "e.g. Train ticket — Kozhikode to Chennai" },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "entry_date", label: "Date", type: "date", required: true },
    { name: "payment_mode", label: "Paid from", type: "select", required: true, options: SOURCES },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const settlementFields: Field[] = [
    { name: "item_name", label: "Description", required: true, placeholder: "e.g. Travel bill settled" },
    { name: "amount", label: "Amount received", type: "number", required: true },
    { name: "entry_date", label: "Date", type: "date", required: true },
    { name: "payment_mode", label: "Received into", type: "select", required: true, options: SOURCES },
    { name: "reference_no", label: "Reference" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const bankExtra = (values: Record<string, any>, set: (n: string, v: any) => void) =>
    values.payment_mode === "bank" ? (
      <BankAccountField
        label="Bank / UPI account"
        value={values.bank_account_id ?? null}
        onChange={(v) => set("bank_account_id", v)}
      />
    ) : null;

  const submit = (kind: "claim" | "settlement") => async (v: Record<string, any>) => {
    await save.mutateAsync({
      ...v,
      project_id: projectId,
      kind,
      amount: Number(v.amount || 0),
      bank_account_id: v.payment_mode === "bank" ? (v.bank_account_id ?? null) : null,
    });
  };

  const shareStatement = () => {
    const lines = [
      `📋 *REIMBURSABLE STATEMENT*`,
      projectName ? `Project: ${projectName}` : "",
      clientName ? `Client: ${clientName}` : "",
      "",
      "*Items paid on your behalf*",
      ...claims.map((c, i) => `${i + 1}. ${c.item_name} — ${inr(c.amount)} (${fmtDate(c.entry_date)})`),
      "",
      `Total claimed: ${inr(claimed)}`,
      `Already reimbursed: ${inr(reimbursed)}`,
      `*Balance to be settled: ${inr(pending)}*`,
      "",
      "These are actual travel / logistics bills only and are separate from the photography package amount.",
    ].filter(Boolean);
    openWhatsApp(clientPhone, lines.join("\n"));
  };

  const row = (r: Reimbursable) => (
    <div key={r.id} className="surface grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 p-3">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">
          {r.item_name} ·{" "}
          <span className={r.kind === "claim" ? "text-destructive" : "text-success"}>
            {r.kind === "claim" ? "-" : "+"}
            {inr(r.amount)}
          </span>
        </p>
        <p className="break-words text-xs text-muted-foreground">
          {fmtDate(r.entry_date)} · {sourceLabel(r.payment_mode)}
          {r.reference_no ? ` · ${r.reference_no}` : ""}
        </p>
        {r.notes && <p className="mt-1 break-words text-xs text-muted-foreground">{r.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11"
          aria-label="Edit entry"
          onClick={() => setEditing(r)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11"
          aria-label="Delete entry"
          onClick={() => setDeleteId(r.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Client reimbursables ledger</DialogTitle>
          </DialogHeader>

          <div className="surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Balance to collect from party
            </p>
            <p className={`stat-value ${pending > 0 ? "text-destructive" : "text-success"}`}>
              {inr(pending)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Claimed {inr(claimed)} · Reimbursed {inr(reimbursed)}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button size="sm" className="min-h-11" onClick={() => setAdding("claim")}>
                <Plus className="mr-1.5 h-4 w-4" /> Add claim item
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() => setAdding("settlement")}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Record settlement
              </Button>
              <Button size="sm" variant="outline" className="min-h-11" onClick={shareStatement}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> Share statement
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Claim items ({claims.length})
            </p>
            <div className="space-y-2">
              {claims.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No reimbursable items yet.
                </p>
              ) : (
                claims.map(row)
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Settlements received ({settlements.length})
            </p>
            <div className="space-y-2">
              {settlements.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nothing settled yet.
                </p>
              ) : (
                settlements.map(row)
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {adding && (
        <RecordDialog
          title={adding === "claim" ? "Add reimbursable item" : "Record settlement from client"}
          submitLabel={adding === "claim" ? "Save item" : "Save settlement"}
          fields={adding === "claim" ? claimFields : settlementFields}
          initial={{ entry_date: todayISO(), payment_mode: "cash" }}
          open={!!adding}
          onOpenChange={(v) => !v && setAdding(null)}
          extra={bankExtra}
          onSubmit={async (v) => {
            await submit(adding)(v);
            setAdding(null);
          }}
        />
      )}

      {editing && (
        <RecordDialog
          title={editing.kind === "claim" ? "Edit reimbursable item" : "Edit settlement"}
          submitLabel="Update"
          fields={editing.kind === "claim" ? claimFields : settlementFields}
          initial={editing as any}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          extra={bankExtra}
          onSubmit={async (v) => {
            await save.mutateAsync({
              ...v,
              id: editing.id,
              project_id: projectId,
              kind: editing.kind,
              amount: Number(v.amount || 0),
              bank_account_id: v.payment_mode === "bank" ? (v.bank_account_id ?? null) : null,
            });
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              The linked bank / cash balance is adjusted back automatically.
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
