import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  paid: "bg-success/12 text-success border-success/25",
  completed: "bg-success/12 text-success border-success/25",
  delivered: "bg-success/12 text-success border-success/25",
  done: "bg-success/12 text-success border-success/25",
  active: "bg-info/12 text-info border-info/25",
  open: "bg-info/12 text-info border-info/25",
  ongoing: "bg-info/12 text-info border-info/25",
  "in progress": "bg-info/12 text-info border-info/25",
  in_progress: "bg-info/12 text-info border-info/25",
  partial: "bg-warning/15 text-warning-foreground border-warning/35",
  pending: "bg-muted text-muted-foreground border-border",
  overdue: "bg-destructive/12 text-destructive border-destructive/25",
  cancelled: "bg-destructive/12 text-destructive border-destructive/25",
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  const raw = (value ?? "pending").toLowerCase();
  const key = raw.includes(":") ? raw.split(":").pop()!.trim() : raw;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize leading-5",
        TONE[key] ?? "bg-secondary text-secondary-foreground border-border",
        className,
      )}
    >
      {(value ?? "pending").replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="surface flex h-full min-h-[112px] flex-col justify-between p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-3">
        <p className={cn("stat-value", toneClass)}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Same look as StatCard, but tappable with a chevron affordance. */
export function ClickableStatCard({
  label,
  value,
  hint,
  tone = "default",
  onClick,
  ariaLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive";
  onClick: () => void;
  ariaLabel?: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="surface flex h-full min-h-[112px] w-full cursor-pointer flex-col justify-between p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3">
        <p className={cn("stat-value", toneClass)}>{value}</p>
        {hint && <p className="mt-1 text-xs font-medium text-primary">{hint}</p>}
      </div>
    </button>
  );
}


export function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface flex items-center justify-center p-10 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
