import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Download, IndianRupee, PiggyBank, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOC, PdfFooter, PdfHeader, PdfPage, PdfSection } from "@/components/PdfDoc";
import { useSettings } from "@/lib/db";
import { fmtDate, inr } from "@/lib/format";
import { downloadElementPdf } from "@/lib/pdf";
import { fullMonthLabel, monthOptions, useMonthFinance } from "@/lib/month-finance";

const REPORT_ID = "fin-report";

function Cell({ children, bold = false, right = false }: { children: any; bold?: boolean; right?: boolean }) {
  return (
    <td
      style={{
        padding: "5px 6px",
        borderBottom: `1px solid ${DOC.line}`,
        fontSize: 9,
        textAlign: right ? "right" : "left",
        fontWeight: bold ? 700 : 400,
        color: DOC.charcoal,
      }}
    >
      {children}
    </td>
  );
}

function Head({ cols }: { cols: [string, boolean?][] }) {
  return (
    <thead>
      <tr style={{ background: DOC.tint }}>
        {cols.map(([label, right]) => (
          <th
            key={label}
            style={{
              padding: "5px 6px",
              fontSize: 8.6,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              textAlign: right ? "right" : "left",
              color: DOC.darkGold,
              borderBottom: `1px solid ${DOC.gold}`,
            }}
          >
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** Hidden A4 statement — visible only while printing, and used for PDF export. */
function PrintableReport({ month, settings }: { month: string; settings: any }) {
  const f = useMonthFinance(month);
  const label = fullMonthLabel(month);
  const summary: [string, number][] = [
    ["Total Income", f.totalIncome],
    ["Business Expenses", f.businessExpenses],
    ["Net Profit", f.netProfit],
    ["Owner Salary Drawn", f.ownerDraw],
    ["Net Retention", f.retention],
  ];

  return (
    <div id={REPORT_ID} style={{ display: "none" }}>
      <PdfPage>
        <PdfHeader
          settings={settings}
          docTitle={`Monthly Financial Statement — ${label}`}
          docMeta={`${settings?.address ?? "Kozhikode, Kerala, India"} · Generated ${fmtDate(new Date().toISOString())}`}
        />

        <PdfSection title="Overview" />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <Head cols={[["Particulars"], ["Amount (INR)", true]]} />
          <tbody>
            {summary.map(([k, v]) => (
              <tr key={k}>
                <Cell bold={k === "Net Retention"}>{k}</Cell>
                <Cell right bold>
                  {inr(v)}
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>

        <PdfSection title="Payments Received" />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <Head cols={[["Date"], ["Client"], ["Event / Project"], ["Mode"], ["Bank"], ["Amount", true]]} />
          <tbody>
            {f.paymentRows.length === 0 && (
              <tr>
                <Cell>—</Cell>
                <Cell>No payments recorded</Cell>
                <Cell>—</Cell>
                <Cell>—</Cell>
                <Cell>—</Cell>
                <Cell right>{inr(0)}</Cell>
              </tr>
            )}
            {f.paymentRows.map((r) => (
              <tr key={r.id}>
                <Cell>{fmtDate(r.date)}</Cell>
                <Cell>{r.client}</Cell>
                <Cell>{r.project}</Cell>
                <Cell>{r.mode}</Cell>
                <Cell>{r.bank}</Cell>
                <Cell right>{inr(r.amount)}</Cell>
              </tr>
            ))}
            <tr>
              <Cell bold>Total</Cell>
              <Cell>{""}</Cell>
              <Cell>{""}</Cell>
              <Cell>{""}</Cell>
              <Cell>{""}</Cell>
              <Cell right bold>
                {inr(f.totalIncome)}
              </Cell>
            </tr>
          </tbody>
        </table>

        <PdfSection title="Expenses Incurred" />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <Head cols={[["Date"], ["Category"], ["Project / Overhead"], ["Paid To"], ["Bank"], ["Amount", true]]} />
          <tbody>
            {f.expenseRows.length === 0 && (
              <tr>
                <Cell>—</Cell>
                <Cell>No expenses recorded</Cell>
                <Cell>—</Cell>
                <Cell>—</Cell>
                <Cell>—</Cell>
                <Cell right>{inr(0)}</Cell>
              </tr>
            )}
            {f.expenseRows.map((r) => (
              <tr key={r.id}>
                <Cell>{fmtDate(r.date)}</Cell>
                <Cell>{r.category}</Cell>
                <Cell>{r.project}</Cell>
                <Cell>{r.paidTo}</Cell>
                <Cell>{r.bank}</Cell>
                <Cell right>{inr(r.amount)}</Cell>
              </tr>
            ))}
            <tr>
              <Cell bold>Total</Cell>
              <Cell>{""}</Cell>
              <Cell>{""}</Cell>
              <Cell>{""}</Cell>
              <Cell>{""}</Cell>
              <Cell right bold>
                {inr(f.totalExpenses)}
              </Cell>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 9, color: DOC.gray }}>
          <div>
            Generated via JOG MEDIA App · {new Date().toLocaleString("en-IN")}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 170, borderTop: `1px solid ${DOC.line}`, paddingTop: 4, marginTop: 30 }}>
              Signature / Stamp
            </div>
          </div>
        </div>

        <PdfFooter settings={settings} />
      </PdfPage>
    </div>
  );
}

/** Month picker + live monthly financial summary + A4 print / PDF export. */
export function MonthlyFinanceCard({ month, onMonthChange }: { month: string; onMonthChange: (m: string) => void }) {
  const { data: settings } = useSettings();
  const f = useMonthFinance(month);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const months = monthOptions(24);

  const items = [
    { label: "Monthly income", value: f.totalIncome, icon: IndianRupee },
    { label: "Monthly expenses", value: f.businessExpenses, icon: TrendingDown },
    { label: "Net profit", value: f.netProfit, icon: TrendingUp },
    { label: "Owner salary drawn", value: f.ownerDraw, icon: PiggyBank },
    { label: "Retention / surplus", value: f.retention, icon: Wallet },
  ];

  const download = async () => {
    setBusy(true);
    try {
      await downloadElementPdf(REPORT_ID, `JOG-MEDIA-Financial-Report-${month}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-semibold">Monthly financial overview</p>
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {fullMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="no-print" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print A4 Report
        </Button>
        <Button size="sm" className="no-print" disabled={busy} onClick={download}>
          <Download className="mr-1 h-4 w-4" /> {busy ? "Preparing…" : "Download PDF"}
        </Button>
      </div>

      <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
              <i.icon className="h-4 w-4 shrink-0" />
              {i.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{inr(i.value)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {fullMonthLabel(month)} · {f.paymentRows.length} payments · {f.expenseRows.length} expense entries
      </p>

      {mounted &&
        createPortal(<PrintableReport month={month} settings={settings} />, document.body)}
    </div>
  );
}
