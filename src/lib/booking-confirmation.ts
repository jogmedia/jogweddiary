import { fmtDate } from "@/lib/format";
import { eventLabel } from "@/lib/whatsapp";

export type ConfirmationInput = {
  clientName: string;
  dates: string[];
  functions: string[];
  venues: string[];
  deliverables: string[];
  total: number;
  advance: number;
  balance: number;
  studioContact?: string | null;
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
  return [
    "*JOG MEDIA — BOOKING CONFIRMATION* 📸",
    line,
    `Dear *${p.clientName}*,`,
    "Thank you for choosing Jog Media for your big day! Your booking is officially confirmed.",
    "",
    `🗓️ *Event Date(s):* ${dates}`,
    `🎉 *Function(s):* ${fns}`,
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
