import { fmtDate, waNumber } from "@/lib/format";

export type EventLike = {
  event_type: string;
  event_date: string;
  event_time?: string | null;
  arrival_time?: string | null;
  muhurtham_time?: string | null;
  location?: string | null;
  google_maps_link?: string | null;
  notes?: string | null;
};

export const EVENT_TYPES = [
  { value: "save_the_date", label: "Save The Date", emoji: "📅" },
  { value: "wedding_evening", label: "Wedding Evening / Pre-Wedding", emoji: "🌙" },
  { value: "wedding_eve", label: "Wedding Eve / Sangeeth", emoji: "🌙" },
  { value: "wedding_day", label: "Wedding Day / Muhurtham", emoji: "💍" },
  { value: "reception", label: "Reception", emoji: "🎉" },
  { value: "haldi", label: "Haldi", emoji: "🌼" },
  { value: "sangeet", label: "Sangeet", emoji: "🎶" },
  { value: "mehendi", label: "Mehendi", emoji: "🖐️" },
  { value: "engagement", label: "Engagement", emoji: "💐" },
  { value: "custom", label: "Other / Custom event", emoji: "✨" },
];

/** Labels loaded from the shared `event_types` table (kept in sync by useEventTypes). */
let dynamicTypes: { value: string; label: string; emoji: string }[] = [];

export const registerEventTypes = (
  list: { slug: string; label: string; emoji?: string | null }[],
) => {
  dynamicTypes = list.map((t) => ({ value: t.slug, label: t.label, emoji: t.emoji ?? "✨" }));
};

const prettify = (slug: string) =>
  slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const eventMeta = (type: string) =>
  dynamicTypes.find((t) => t.value === type) ??
  EVENT_TYPES.find((t) => t.value === type) ?? { value: type, label: prettify(type), emoji: "✨" };

/** Label for an event — custom events use their own name (stored in notes). */
export const eventLabel = (e: { event_type: string; notes?: string | null }) => {
  if (e.event_type === "custom" && e.notes?.trim()) return e.notes.trim();
  return eventMeta(e.event_type).label;
};

/** 18:30:00 -> 6:30 PM */
export const fmtTime = (t?: string | null) => {
  if (!t) return "—";
  const [hRaw, m = "00"] = t.split(":");
  const h = Number(hRaw);
  if (Number.isNaN(h)) return t;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.padStart(2, "0")} ${suffix}`;
};

const line = (label: string, value?: string | null) => (value ? `${label}: ${value}` : null);

export type VenueInfo = {
  venue?: string | null;
  place_district?: string | null;
  nearest_railway_station?: string | null;
  google_maps_link?: string | null;
  venue_contact_name?: string | null;
  venue_contact_phone?: string | null;
};

/** WhatsApp lines describing the main venue / travel navigation info for a project. */
export function venueLines(v?: VenueInfo | null): string[] {
  if (!v) return [];
  const rows = [
    line("• Venue", v.venue),
    line("• Place / District", v.place_district),
    line("• Nearest Railway Station", v.nearest_railway_station),
    v.google_maps_link ? `• 📍 Open in Google Maps: ${v.google_maps_link}` : null,
    v.venue_contact_name || v.venue_contact_phone
      ? `• ☎️ Venue Contact: ${[v.venue_contact_name, v.venue_contact_phone].filter(Boolean).join(" - ")}`
      : null,
  ].filter(Boolean) as string[];
  return rows.length ? ["📍 *VENUE & TRAVEL DETAILS*", ...rows] : [];
}

export function buildScheduleMessage(
  clientName: string,
  events: EventLike[],
  businessName = "JOG MEDIA",
  contactPhone?: string | null,
  venue?: VenueInfo | null,
) {
  const blocks = [...events]
    .sort((a, b) => (a.event_date < b.event_date ? -1 : 1))
    .map((e) => {
      const meta = eventMeta(e.event_type);
      const rows: (string | null)[] = [];
      if (e.event_type === "wedding_day") {
        rows.push(
          line("• Team Arrival", e.arrival_time ? fmtTime(e.arrival_time) : null),
          line("• Muhurtham", e.muhurtham_time ? fmtTime(e.muhurtham_time) : fmtTime(e.event_time)),
        );
      } else {
        rows.push(
          line("• Arrival Time", e.arrival_time ? fmtTime(e.arrival_time) : null),
          line("• Time", e.event_time ? fmtTime(e.event_time) : null),
        );
      }
      rows.unshift(line("• Date", fmtDate(e.event_date)));
      rows.push(line("• Location", e.location));
      if (e.google_maps_link) rows.push(`• 📍 Google Map: ${e.google_maps_link}`);

      if (e.notes && e.event_type !== "custom") rows.push(`• Note: ${e.notes}`);
      return `${meta.emoji} *${eventLabel(e)}*\n${rows.filter(Boolean).join("\n")}`;
    });

  const venueBlock = venueLines(venue);

  return [
    `📸 *${businessName.toUpperCase()} - WEDDING SHOOT SCHEDULE* 📸`,
    `Client: ${clientName}`,
    "",
    ...blocks.flatMap((b) => [b, ""]),
    ...(venueBlock.length ? [...venueBlock, ""] : []),
    `📞 Contact ${businessName}${contactPhone ? ` (${contactPhone})` : ""} for any queries!`,
  ].join("\n");
}


export type TravelLike = {
  travel_required?: boolean | null;
  travel_booking_status?: string | null;
  travel_mode?: string | null;
  travel_notes?: string | null;
};

const TRAVEL_MODE_LABEL: Record<string, string> = {
  train: "Train",
  flight: "Flight",
  bus: "Bus",
  cab: "Cab",
  self_drive: "Self Drive",
};

/** WhatsApp lines describing travel / ticket booking status for a project. */
export function travelLines(travel?: TravelLike | null): string[] {
  if (!travel?.travel_required) return [];
  const status = travel.travel_booking_status ?? "pending";
  if (status === "not_needed") return [];
  const mode = travel.travel_mode ? TRAVEL_MODE_LABEL[travel.travel_mode] ?? travel.travel_mode : null;
  const head =
    status === "booked"
      ? `🚆 Travel: ${mode ?? "Travel"} — ✅ Ticket Booked`
      : `🚆 Travel: ${mode ?? "Travel"} — ⚠️ Ticket NOT booked yet`;
  const rows = [head];
  if (travel.travel_notes?.trim()) {
    rows.push(`🎫 ${mode === "Train" ? "Train Details" : "Ticket Details"}: ${travel.travel_notes.trim()}`);
  }
  return rows;
}

export function buildCrewMessage(
  event: EventLike,
  clientName: string,
  role: string | null | undefined,
  businessName = "JOG MEDIA",
  travel?: TravelLike | null,
) {
  const meta = eventMeta(event.event_type);
  return [
    `${meta.emoji} *${businessName.toUpperCase()} - CREW DUTY ALERT*`,
    "",
    `Event: ${eventLabel(event)} for ${clientName}`,
    `🗓 Date: ${fmtDate(event.event_date)}`,
    `⏰ Team Reporting Time: ${fmtTime(event.arrival_time ?? event.event_time)}`,
    `🎬 Shoot Start Time: ${fmtTime(event.muhurtham_time ?? event.event_time)}`,
    `📍 Venue: ${event.location ?? "TBD"}`,
    ...(event.google_maps_link ? [`🗺 Google Map: ${event.google_maps_link}`] : []),
    `🎥 Your Role: ${role || "Crew"}`,
    ...travelLines(travel),
  ].join("\n");
}

export function whatsAppLink(phone: string | null | undefined, message: string) {
  const num = waNumber(phone);
  return num
    ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Same-tab redirect — never blocked as a pop-up, even from async handlers. */
export function openWhatsApp(phone: string | null | undefined, message: string) {
  window.location.href = whatsAppLink(phone, message);
}


/** Booking confirmation + advance receipt message for the client. */
export function buildBookingReceiptMessage(p: {
  businessName?: string;
  clientName?: string | null;
  projectName?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  total?: number | string | null;
  advance?: number | string | null;
  balance?: number | string | null;
  packageName?: string | null;
  services?: string[];
}) {
  const business = (p.businessName ?? "JOG MEDIA").toUpperCase();
  const total = Number(p.total ?? 0);
  const advance = Number(p.advance ?? 0);
  const balance = p.balance == null ? Math.max(total - advance, 0) : Number(p.balance);
  const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const services = (
    p.services?.length
      ? p.services
      : (p.packageName ?? "")
          .split(/[,/\n•]+/)
          .map((s) => s.trim())
          .filter(Boolean)
  ).filter(Boolean);

  return [
    `🎉 *BOOKING CONFIRMATION & RECEIPT - ${business}* 🎉`,
    "",
    `Dear ${p.clientName?.trim() || "Client"}, ❤️`,
    "",
    `Thank you for choosing ${business} to capture your special moments! We are excited to confirm your booking.`,
    "",
    "📅 *Event Details:*",
    `• Event Name: ${p.projectName?.trim() || "Wedding Coverage"}`,
    `• Event Date: ${p.eventDate ? fmtDate(p.eventDate) : "To be confirmed"}`,
    `• Venue: ${p.venue?.trim() || "To be confirmed"}`,
    "",
    "💰 *Payment Summary:*",
    `• Total Package Amount: ${money(total)}`,
    `• Advance Paid: ${money(advance)}`,
    `• Balance Payable: ${money(balance)}`,
    "",
    "🎁 *Services Included in Your Package:*",
    ...(services.length ? services.map((s) => `• ${s}`) : ["• As per the agreed package"]),
    "",
    "We look forward to creating timeless memories for you! If you have any questions, feel free to contact us.",
    "",
    "Warm regards,",
    `Team ${business.charAt(0) + business.slice(1).toLowerCase()} 🌸`,
  ].join("\n");
}
