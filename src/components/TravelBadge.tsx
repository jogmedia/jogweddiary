import { Plane } from "lucide-react";
import { todayISO } from "@/lib/format";

export type TravelInfo = {
  travel_required?: boolean | null;
  travel_booking_status?: string | null;
  travel_mode?: string | null;
  travel_notes?: string | null;
};

/** Days between today and an ISO date (negative = past). */
export function daysUntil(iso?: string | null) {
  if (!iso) return Infinity;
  const a = new Date(`${todayISO()}T00:00:00`).getTime();
  const b = new Date(`${iso}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export type TravelState = "booked" | "urgent" | "pending" | "none";

export function travelState(p?: TravelInfo | null, eventDate?: string | null): TravelState {
  if (!p?.travel_required) return "none";
  const status = p.travel_booking_status ?? "pending";
  if (status === "booked") return "booked";
  if (status === "not_needed") return "none";
  const d = daysUntil(eventDate);
  return d <= 7 && d >= 0 ? "urgent" : "pending";
}

export function TravelBadge({
  project,
  eventDate,
  className = "",
}: {
  project?: TravelInfo | null;
  eventDate?: string | null;
  className?: string;
}) {
  const state = travelState(project, eventDate);
  if (state === "none") return null;

  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold " + className;

  if (state === "booked")
    return (
      <span
        className={`${base} border-[hsl(142_60%_35%/0.35)] bg-[hsl(142_60%_35%/0.12)] text-[hsl(142_70%_28%)]`}
      >
        🟢 Ticket Booked
      </span>
    );

  if (state === "urgent")
    return (
      <span className={`${base} border-destructive/40 bg-destructive/12 text-destructive`}>
        🔴 ⚠️ Ticket Pending
      </span>
    );

  return (
    <span className={`${base} border-border bg-muted text-muted-foreground`}>
      <Plane className="h-3 w-3" /> Ticket Pending
    </span>
  );
}
