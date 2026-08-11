import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBankAccounts, useUpsert } from "@/lib/db";
import { inr } from "@/lib/format";

/** Payment modes that land money in a bank / UPI account. */
export const BANK_MODES = ["upi", "bank", "cheque", "online", "card"];

export const needsBankAccount = (mode?: string | null) =>
  !!mode && BANK_MODES.includes(String(mode).toLowerCase());

export function BankAccountField({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (id: string | null) => void;
}) {
  const { data: accounts = [] } = useBankAccounts();
  const saveBank = useUpsert("bank_accounts", "Bank account");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bank_name: "", account_number: "", opening_balance: "" });
  const [err, setErr] = useState("");

  const active = accounts.filter((a) => a.is_active);

  const create = async () => {
    if (!form.bank_name.trim()) {
      setErr("Bank name is required");
      return;
    }
    const id = await saveBank.mutateAsync({
      bank_name: form.bank_name.trim(),
      account_number: form.account_number.trim() || null,
      opening_balance: Number(form.opening_balance || 0),
    });
    if (id) onChange(id as string);
    setForm({ bank_name: "", account_number: "", opening_balance: "" });
    setErr("");
    setOpen(false);
  };

  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium">Destination Bank Account</Label>
      <div className="flex gap-2">
        <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={active.length ? "Select bank account" : "No bank accounts yet"} />
          </SelectTrigger>
          <SelectContent>
            {active.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.bank_name}
                {a.account_number ? ` · ${a.account_number}` : ""} — {inr(a.current_balance)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Add bank account"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Add bank account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Bank Name<span className="text-destructive"> *</span>
              </Label>
              <Input
                autoFocus
                placeholder="e.g. HDFC Business"
                value={form.bank_name}
                onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              />
              {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Account Number / UPI ID</Label>
              <Input
                placeholder="e.g. 50100XXXXXX or jog@upi"
                value={form.account_number}
                onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Initial Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={form.opening_balance}
                onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saveBank.isPending}>
              {saveBank.isPending ? "Saving…" : "Save account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
