import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { RecordDialog } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccounts,
  useAssets,
  useCreateJournalEntry,
  useEquityTxns,
  useJournalEntries,
  useLiabilities,
  usePayments,
  useProjects,
  useUpsert,
} from "@/lib/db";
import { fmtDate, inr, todayISO } from "@/lib/format";
import { accountBalances } from "@/lib/accounts";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content: "Chart of accounts, balanced journal entries, assets, liabilities and owner equity.",
      },
      { property: "og:title", content: "Accounts — JOG MEDIA Studio Accounts" },
      { property: "og:description", content: "Chart of accounts, journal entries, assets, liabilities and equity." },
    ],
  }),
  component: AccountsPage,
});

const ACCOUNT_TYPES = ["Assets", "Liabilities", "Equity", "Income", "Cost of Goods Sold", "Expenses"];

function AccountsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: journals = [] } = useJournalEntries();
  const { data: assets = [] } = useAssets();
  const { data: liabilities = [] } = useLiabilities();
  const { data: equity = [] } = useEquityTxns();
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const saveAccount = useUpsert("chart_of_accounts", "Account");
  const saveAsset = useUpsert("assets", "Asset");
  const saveLiability = useUpsert("liabilities", "Liability");
  const saveEquity = useUpsert("equity_transactions", "Equity transaction");
  const postEntry = useCreateJournalEntry();

  return (
    <AppShell>
      <PageHeader title="Accounts" subtitle="Double-entry bookkeeping for the studio" />

      <Tabs defaultValue="banks">
        <TabsList className="mb-4 flex flex-wrap justify-start">
          <TabsTrigger value="banks">Bank &amp; Cash</TabsTrigger>
          <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="equity">Equity</TabsTrigger>
        </TabsList>

        <TabsContent value="banks">
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              label="Total money received"
              value={inr(payments.reduce((a, p) => a + Number(p.amount ?? 0), 0))}
              tone="success"
            />
          </div>
          <div className="surface divide-y divide-border">
            {accountBalances(payments).map((b) => (
              <div key={b.account} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.count} payment{b.count === 1 ? "" : "s"} credited</p>
                </div>
                <p className="text-sm font-semibold">{inr(b.received)}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coa">
          <div className="mb-3">
            <RecordDialog
              title="New account"
              fields={[
                { name: "account_code", label: "Code" },
                { name: "account_name", label: "Account name", required: true },
                {
                  name: "account_type",
                  label: "Type",
                  type: "select",
                  required: true,
                  options: ACCOUNT_TYPES.map((v) => ({ value: v, label: v })),
                },
              ]}
              onSubmit={(v) => saveAccount.mutateAsync(v)}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add account
                </Button>
              }
            />
          </div>
          {ACCOUNT_TYPES.map((type) => {
            const list = accounts.filter((a) => a.account_type === type);
            if (!list.length) return null;
            return (
              <div key={type} className="surface mb-3 p-4">
                <p className="mb-2 text-sm font-semibold">{type}</p>
                <ul className="divide-y divide-border text-sm">
                  {list.map((a) => (
                    <li key={a.id} className="flex justify-between py-2">
                      <span>{a.account_name}</span>
                      <span className="text-xs text-muted-foreground">{a.account_code}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="journal">
          <JournalTab accounts={accounts} projects={projects} onPost={postEntry.mutateAsync} journals={journals} />
        </TabsContent>

        <TabsContent value="assets">
          <SimpleList
            title="Asset"
            addFields={[
              { name: "asset_name", label: "Asset name", required: true },
              { name: "asset_value", label: "Value", type: "number", required: true },
              { name: "acquired_date", label: "Acquired on", type: "date" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            initial={{ acquired_date: todayISO() }}
            onSave={(v) => saveAsset.mutateAsync(v)}
            rows={assets.map((a: any) => ({
              id: a.id,
              primary: a.asset_name,
              secondary: fmtDate(a.acquired_date),
              amount: Number(a.asset_value),
            }))}
          />
        </TabsContent>

        <TabsContent value="liabilities">
          <SimpleList
            title="Liability"
            addFields={[
              { name: "liability_name", label: "Liability name", required: true },
              { name: "liability_value", label: "Amount", type: "number", required: true },
              { name: "due_date", label: "Due date", type: "date" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            onSave={(v) => saveLiability.mutateAsync(v)}
            rows={liabilities.map((l: any) => ({
              id: l.id,
              primary: l.liability_name,
              secondary: `Due ${fmtDate(l.due_date)}`,
              amount: Number(l.liability_value),
            }))}
          />
        </TabsContent>

        <TabsContent value="equity">
          <SimpleList
            title="Equity transaction"
            addFields={[
              { name: "transaction_date", label: "Date", type: "date", required: true },
              { name: "amount", label: "Amount", type: "number", required: true },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            initial={{ transaction_date: todayISO() }}
            onSave={(v) => saveEquity.mutateAsync(v)}
            rows={equity.map((e: any) => ({
              id: e.id,
              primary: e.notes ?? "Owner capital",
              secondary: fmtDate(e.transaction_date),
              amount: Number(e.amount),
            }))}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function SimpleList({
  title,
  addFields,
  initial,
  onSave,
  rows,
}: {
  title: string;
  addFields: any[];
  initial?: Record<string, any>;
  onSave: (v: any) => Promise<unknown>;
  rows: { id: string; primary: string; secondary: string; amount: number }[];
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <StatCard label={`Total ${title.toLowerCase()}s`} value={inr(rows.reduce((a, r) => a + r.amount, 0))} />
        <RecordDialog
          title={`Add ${title.toLowerCase()}`}
          fields={addFields}
          initial={initial}
          onSubmit={onSave}
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add {title.toLowerCase()}
            </Button>
          }
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} records yet.`} />
      ) : (
        <div className="surface divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{r.primary}</p>
                <p className="text-xs text-muted-foreground">{r.secondary}</p>
              </div>
              <p className="text-sm font-semibold">{inr(r.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function JournalTab({
  accounts,
  projects,
  onPost,
  journals,
}: {
  accounts: any[];
  projects: any[];
  onPost: (p: any) => Promise<unknown>;
  journals: any[];
}) {
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([
    { account_id: "", debit: 0, credit: 0, project_id: "" },
    { account_id: "", debit: 0, credit: 0, project_id: "" },
  ]);

  const totalDebit = lines.reduce((a, l) => a + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((a, l) => a + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const update = (i: number, patch: any) =>
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <>
      <div className="surface mb-4 p-4">
        <p className="mb-3 text-sm font-semibold">New journal entry</p>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Memo</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4">
              <Select value={l.account_id} onValueChange={(v) => update(i, { account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={l.project_id} onValueChange={(v) => update(i, { project_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Debit"
                value={l.debit || ""}
                onChange={(e) => update(i, { debit: Number(e.target.value), credit: 0 })}
              />
              <Input
                type="number"
                placeholder="Credit"
                value={l.credit || ""}
                onChange={(e) => update(i, { credit: Number(e.target.value), debit: 0 })}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={balanced ? "text-success" : "text-destructive"}>
            Debit {inr(totalDebit)} · Credit {inr(totalCredit)} {balanced ? "· balanced" : "· must balance"}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLines((p) => [...p, { account_id: "", debit: 0, credit: 0, project_id: "" }])}
            >
              Add line
            </Button>
            <Button
              size="sm"
              disabled={!balanced}
              onClick={async () => {
                await onPost({
                  entry_date: date,
                  memo,
                  lines: lines.filter((l) => l.account_id),
                });
                setLines([
                  { account_id: "", debit: 0, credit: 0, project_id: "" },
                  { account_id: "", debit: 0, credit: 0, project_id: "" },
                ]);
                setMemo("");
              }}
            >
              Post entry
            </Button>
          </div>
        </div>
      </div>

      {journals.length === 0 ? (
        <EmptyState message="No journal entries posted yet." />
      ) : (
        <div className="space-y-3">
          {journals.map((j) => (
            <div key={j.id} className="surface p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">{j.memo ?? "Journal entry"}</span>
                <span className="text-muted-foreground">{fmtDate(j.entry_date)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {(j.journal_entry_lines ?? []).map((l: any) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-1.5">{l.chart_of_accounts?.account_name}</td>
                      <td className="py-1.5 text-right">{Number(l.debit) ? inr(l.debit) : ""}</td>
                      <td className="py-1.5 text-right">{Number(l.credit) ? inr(l.credit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
