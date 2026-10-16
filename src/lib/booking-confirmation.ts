import { fmtDate } from "@/lib/format";

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

/** The exact WhatsApp booking confirmation template requested by the studio. */
export function buildBookingConfirmation(p: ConfirmationInput): string {
  const line = "━━━━━━━━━━━━━━━━━━━━━━";
  const dates = p.dates.length ? p.dates.map(fmtDate).join(", ") : "To be confirmed";
  const fns = p.functions.length ? p.functions.join(" + ") : "To be confirmed";
  const venue = p.venues.length ? p.venues.join(" / ") : "To be confirmed";
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
    `• Balance Payable: ₹${rupees(p.balance)}`,
    "",
    line,
    "We are excited to capture your beautiful memories! For any updates or queries, feel free to reach out to us.",
    "",
    "Warm regards,",
    "*Team Jog Media*",
    `📞 ${p.studioContact || ""}`.trimEnd(),
  ].join("\n");
}
