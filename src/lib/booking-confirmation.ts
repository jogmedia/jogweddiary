import { fmtDate } from "@/lib/format";
import { eventLabel } from "@/lib/whatsapp";

export type ConfirmationInput = {
  clientName: string;
  dates: string[];
  functions: string[];
  venues: string[];
  deliverables: string[];
  eventCoverage?: EventCoverage[];
  total: number;
  advance: number;
  balance: number;
  studioContact?: string | null;
};

export type EventCoverage = {
  eventName: string;
  eventDate: string;
  roles: { label: string; count: number }[];
};

const rupees = (n: number) => Math.round(n || 0).toLocaleString("en-IN");

/** Preserve the selected title, including custom names stored in event notes. */
export function confirmationFunctionName(
  event: { event_type: string; notes?: string | null },
  types: { slug: string; label: string }[] = [],
): string {
  if (event.event_type === "custom") return event.notes?.trim() || "Custom event";
  return types.find((t) => t.slug === event.event_type)?.label.trim() || eventLabel(event).trim() || "Custom event";
}

export function uniqueConfirmationValues(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const clean = value?.trim().replace(/\s+/g, " ") ?? "";
    const key = clean.toLocaleLowerCase("en-IN");
    if (!clean || seen.has(key)) return [];
    seen.add(key);
    return [clean];
  });
}

type CoverageEvent = {
  id: string;
  event_type: string;
  event_date: string;
  notes?: string | null;
};

type CoverageAssignment = {
  event_id?: string | null;
  staff_id?: string | null;
  role_in_project?: string | null;
  staff?: { role?: string | null } | null;
};

const roleCategory = (role: string) => {
  const clean = role.trim().replace(/_/g, " ").replace(/\s+/g, " ");
  const lower = clean.toLowerCase();
  if (lower.includes("drone") || lower.includes("uav")) return "Drone Pilot";
  if (lower.includes("photographer") || lower === "photography") {
    if (/traditional/i.test(clean)) return "Traditional Photographer";
    if (/candid/i.test(clean)) return "Candid Photographer";
    if (/lead/i.test(clean)) return "Lead Photographer";
    return "Photographer";
  }
  if (lower.includes("videographer") || lower.includes("cinematographer") || lower === "video") {
    if (/traditional/i.test(clean)) return "Traditional Videographer";
    if (/candid/i.test(clean)) return "Candid Videographer";
    if (/lead/i.test(clean)) return "Lead Videographer";
    return "Videographer";
  }
  return null;
};

function plannedCoverage(deliverables: string[]): EventCoverage["roles"] {
  const terms = deliverables.join(" ").toLowerCase();
  const roles: EventCoverage["roles"] = [{ label: "Traditional Photographer", count: 1 }];
  if (/video|videograph|cinema/.test(terms)) roles.push({ label: "Traditional Videographer", count: 1 });
  if (/candid/.test(terms)) roles.push({ label: "Candid Photographer", count: 1 });
  if (/drone|uav/.test(terms)) roles.push({ label: "Drone Pilot", count: 1 });
  return roles;
}

/** Build client-safe, role-only coverage for each event; staff names are never returned. */
export function buildEventCoverage(
  events: CoverageEvent[],
  assignments: CoverageAssignment[],
  deliverables: string[],
  types: { slug: string; label: string }[] = [],
): EventCoverage[] {
  return [...events]
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .map((event) => {
      const relevant = assignments.filter((assignment) => assignment.event_id === event.id || !assignment.event_id);
      const byStaff = new Map<string, CoverageAssignment>();
      relevant.forEach((assignment, index) => {
        byStaff.set(assignment.staff_id || `assignment-${index}`, assignment);
      });
      const counts = new Map<string, number>();
      byStaff.forEach((assignment) => {
        const role = roleCategory(assignment.role_in_project || assignment.staff?.role || "");
        if (role) counts.set(role, (counts.get(role) ?? 0) + 1);
      });
      const order = ["Traditional Photographer", "Candid Photographer", "Lead Photographer", "Photographer", "Traditional Videographer", "Candid Videographer", "Lead Videographer", "Videographer", "Drone Pilot"];
      const roles = counts.size
        ? [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
        : plannedCoverage(deliverables);
      return { eventName: confirmationFunctionName(event, types), eventDate: event.event_date, roles };
    });
}

export function bookingPaymentSchedule(total: number, advance: number, balance?: number) {
  const balancePayable = balance && balance > 0 ? balance : Math.max(0, total - advance);
  return { balancePayable, weddingDayPayable: total * 0.9 - advance, albumDeliveryPayable: total * 0.1 };
}

/** The exact WhatsApp booking confirmation template requested by the studio. */
export function buildBookingConfirmation(p: ConfirmationInput): string {
  const line = "━━━━━━━━━━━━━━━━━━━━━━";
  const dates = p.dates.length ? p.dates.map(fmtDate).join(", ") : "To be confirmed";
  const functions = uniqueConfirmationValues(p.functions);
  const venues = uniqueConfirmationValues(p.venues);
  const fns = functions.length ? functions.join(" + ") : "Custom event";
  const venue = venues.length ? venues.join(" / ") : "To be confirmed";
  const schedule = bookingPaymentSchedule(p.total, p.advance);
  const items = p.deliverables.length
    ? p.deliverables.map((d) => `• ${d}`).join("\n")
    : "• As discussed";
  const eventSchedule = p.eventCoverage?.length
    ? p.eventCoverage.map((event) => {
        const roleLines = event.roles.map(({ label, count }) => {
          const plural = count === 1 ? label : label === "Drone Pilot" ? "Drone Pilots" : `${label}s`;
          return `   - ${count} ${plural}`;
        });
        return [`▪︎ *${event.eventName}* (${fmtDate(event.eventDate)})`, ...roleLines].join("\n");
      })
    : [`▪︎ *${fns}* (${dates})`, "   - Coverage to be confirmed"].join("\n");
  return [
    "*JOG MEDIA — BOOKING CONFIRMATION* 📸",
    line,
    `Dear *${p.clientName}*,`,
    "Thank you for choosing Jog Media for your big day! Your booking is officially confirmed.",
    "",
    "🗓️ *Event Schedule & Coverage Breakdown:*",
    eventSchedule,
    `📍 *Venue:* ${venue}`,
    "",
    "📦 *Package Deliverables:*",
    items,
    "",
    "💰 *Payment Details:*",
    `• Total Agreed Amount: ₹${rupees(p.total)}`,
    `• Advance Received: ₹${rupees(p.advance)} (Confirmed)`,
    `• Total Balance Payable: ₹${rupees(schedule.balancePayable)}`,
    "───────────────────────",
    "*📋 Balance Payment Schedule:*",
    `• *On Wedding Day (90% Completion):* ₹${rupees(schedule.weddingDayPayable)}`,
    `• *On Album Printing & Delivery (Balance):* ₹${rupees(schedule.albumDeliveryPayable)}`,
    line,
    "We look forward to capturing your special moments!",
    "",
    "Warm regards,",
    "*Team Jog Media*",
    `📞 ${p.studioContact || ""}`.trimEnd(),
  ].join("\n");
}
