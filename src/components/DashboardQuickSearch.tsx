import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { useProjectEvents, useProjects, useUpsert } from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { searchProjects } from "@/lib/quick-search";

const PAY_MODES = ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v }));
const fields: Field[] = [
  { name: "payment_date", label: "Date", type: "date", required: true },
  { name: "amount", label: "Amount", type: "number", required: true },
  { name: "payment_mode", label: "Mode", type: "select", options: PAY_MODES, required: true },
  { name: "reference_no", label: "Reference no." },
  { name: "notes", label: "Notes", type: "textarea" },
];

export function DashboardQuickSearch() {
  const { data: projects = [] } = useProjects();
  const { data: events = [] } = useProjectEvents();
  const save = useUpsert("project_payments", "Payment");
  const [q, setQ] = useState("");
  const [payFor, setPayFor] = useState<any | null>(null);

  const results = useMemo(() => searchProjects(projects as any[], events as any[], q), [projects, events, q]);
  const datesFor = (id: string, fallback: string) => {
    const ds = (events as any[]).filter((e) => e.project_id === id).map((e) => e.event_date).sort();
    return (ds.length ? [...new Set(ds)] : [fallback]).map(fmtDate).join(", ");
  };

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-4 bg-background px-1 pb-2 pt-1">
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Quick search client name, place, or mobile..."
          className="h-12 bg-card pr-11 text-base shadow-sm"
          aria-label="Quick search"
          enterKeyHint="search"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q.trim().length >= 2 && (
        <div className="surface absolute left-1 right-1 mt-1 max-h-[65vh] overflow-y-auto shadow-lg">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No matching clients or projects.</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((p: any) => {
                const total = Number(p.total_amount ?? 0);
                const due = Number(p.balance_due ?? 0);
                const paid = Math.max(0, total - due);
                return (
                  <li key={p.id} className="space-y-2 p-3">
                    <div>
                      <p className="font-semibold leading-tight">
                        {p.clients?.name ?? "—"} · {p.project_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {datesFor(p.id, p.event_date)}
                        {p.venue ? ` · ${p.venue}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full border border-border px-2 py-0.5">Total {inr(total)}</span>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">Paid {inr(paid)}</span>
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 font-bold text-warning">
                        Due {inr(due)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="h-10" onClick={() => setPayFor(p)}>
                        <Plus className="mr-1 h-4 w-4" /> Receive Payment
                      </Button>
                      <Button size="sm" variant="outline" className="h-10" asChild>
                        <Link to="/projects/$id" params={{ id: p.id }}>Open Project</Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {payFor && (
        <RecordDialog
          title={`Receive payment — ${payFor.project_name}`}
          submitLabel="Save payment"
          fields={fields}
          initial={{
            payment_date: todayISO(),
            payment_mode: "cash",
            amount: Number(payFor.balance_due ?? 0) || "",
          }}
          open={!!payFor}
          onOpenChange={(v) => !v && setPayFor(null)}
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
