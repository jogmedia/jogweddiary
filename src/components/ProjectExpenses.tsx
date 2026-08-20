import { useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

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
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useExpenseCategories } from "@/lib/expense-categories";
import { useRemove, useUpsert, type Expense } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";

const PAY_MODES = ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v }));

const SALARY_CATEGORY = "Owner Salary / Personal Draw";

export function ProjectExpensesDialog({
  projectId,
  expenses,
  open,
  onOpenChange,
}: {
  projectId: string;
  expenses: Expense[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { options: categoryOptions, addCategory } = useExpenseCategories();
  const save = useUpsert("project_expenses", "Expense");
  const remove = useRemove("project_expenses", "Expense");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const total = expenses.reduce((a, e) => a + Number(e.amount ?? 0), 0);

  const fields: Field[] = [
    { name: "expense_date", label: "Date", type: "date", required: true },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: categoryOptions,
      onAddOption: addCategory,
      addOptionTitle: "Add expense category",
      addOptionLabel: "Category name",
    },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "paid_to", label: "Vendor / Paid to" },
    { name: "payment_mode", label: "Mode", type: "select", options: PAY_MODES },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const bankExtra = (values: Record<string, any>, set: (n: string, v: any) => void) =>
    needsBankAccount(values.payment_mode) || values.category === SALARY_CATEGORY ? (
      <BankAccountField
        label="Paid From Bank Account"
        value={values.bank_account_id ?? null}
        onChange={(v) => set("bank_account_id", v)}
      />
    ) : null;

  const submit = (v: Record<string, any>, extraProps: Record<string, any> = {}) =>
    save.mutateAsync({
      ...v,
      ...extraProps,
      project_id: projectId,
      bank_account_id:
        needsBankAccount(v.payment_mode) || v.category === SALARY_CATEGORY
          ? (v.bank_account_id ?? null)
          : null,
    });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Project expenses breakdown</DialogTitle>
          </DialogHeader>

          <div className="surface flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total project expenses
              </p>
              <p className="stat-value text-destructive">{inr(total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <Button size="sm" className="min-h-11" onClick={() => setAdding(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add expense
            </Button>
          </div>

          <div className="mt-2 space-y-2">
            {expenses.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No expenses tagged to this project yet.
              </p>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="surface flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.category} · {inr(e.amount)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fmtDate(e.expense_date)}
                      {e.paid_to ? ` · ${e.paid_to}` : ""}
                      {e.payment_mode ? ` · ${e.payment_mode}` : ""}
                    </p>
                    {e.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      aria-label="Edit expense"
                      title="Edit expense"
                      onClick={() => setEditing(e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      aria-label="Delete expense"
                      title="Delete expense"
                      onClick={() => setDeleteId(e.id)}
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
          title="Add expense to project"
          submitLabel="Save expense"
          fields={fields}
          initial={{ expense_date: todayISO(), payment_mode: "cash" }}
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
          title="Edit expense"
          submitLabel="Update expense"
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
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the expense entry and recalculates the project profit.
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

/** Clickable stat card that opens the project expense breakdown. */
export function ProjectExpensesCard({
  profit,
  total,
  onClick,
}: {
  profit: number;
  total: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="View project expenses breakdown"
      className="surface flex h-full min-h-[112px] w-full cursor-pointer flex-col justify-between p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Project profit
        </p>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3">
        <p className={`stat-value ${profit >= 0 ? "text-success" : "text-destructive"}`}>
          {inr(profit)}
        </p>
        <p className="mt-1 text-xs font-medium text-primary">
          Expenses {inr(total)} · tap to view
        </p>
      </div>
    </button>
  );
}
