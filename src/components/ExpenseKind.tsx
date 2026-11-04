import { Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPENSE_KIND_OPTIONS, type ExpenseKind } from "@/lib/expenses";

/** Mandatory Studio vs Personal toggle shown at the top of every expense form. */
export function ExpenseKindToggle({
  value,
  onChange,
}: {
  value: ExpenseKind;
  onChange: (k: ExpenseKind) => void;
}) {
  const icons = [Building2, Home];
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Expense type</p>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
        {EXPENSE_KIND_OPTIONS.map((o, i) => {
          const Icon = icons[i];
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Badge on expense rows: amber for Studio, green for Personal / Home. */
export function ExpenseKindBadge({
  kind,
  className,
}: {
  kind: ExpenseKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        kind === "personal" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
        className,
      )}
    >
      {kind === "personal" ? (
        <>
          <Home className="h-3 w-3" /> Personal / Home
        </>
      ) : (
        <>
          <Building2 className="h-3 w-3" /> Studio
        </>
      )}
    </span>
  );
}
