import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { useFixedDeposits } from "@/lib/db";
import { countdownLabel, daysUntil } from "@/lib/fd";
import { fmtDate, inr } from "@/lib/format";
import { Button } from "@/components/ui/button";

/** Dashboard banner for fixed deposits maturing within 15 days (or already due). */
export function FixedDepositAlert() {
  const { data: rows = [] } = useFixedDeposits();

  const due = rows
    .filter((f) => f.status !== "closed" && daysUntil(f.maturity_date) <= 15)
    .sort((a, b) => (a.maturity_date < b.maturity_date ? -1 : 1));

  if (due.length === 0) return null;

  return (
    <section className="surface w-full overflow-hidden border-warning/40 bg-warning/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-base">
          <Lock className="h-4 w-4 shrink-0 text-warning" />
          <span className="truncate">FD maturity coming up</span>
        </h2>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/fixed-deposits">Open FDs</Link>
        </Button>
      </div>
      <ul className="mt-3 space-y-2">
        {due.map((fd) => (
          <li key={fd.id} className="flex w-full items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {fd.bank_name}
                {fd.fd_number ? ` · ${fd.fd_number}` : ""}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Matures {fmtDate(fd.maturity_date)} · {countdownLabel(fd.maturity_date)}
              </p>
            </div>
            <p className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">
              {inr(fd.maturity_amount || fd.principal)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
