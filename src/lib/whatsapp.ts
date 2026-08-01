import { digitsOnly, fmtDate } from "@/lib/format";

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
  { value: "wedding_day", label: "Wedding Day / Muhurtham", emoji: "💍" },
  { value: "reception", label: "Reception", emoji: "🎉" },
  { value: "haldi", label: "Haldi", emoji: "🌼" },
  { value: "sangeet", label: "Sangeet", emoji: "🎶" },
  { value: "mehendi", label: "Mehendi", emoji: "🖐️" },
  { value: "engagement", label: "Engagement", emoji: "💐" },
  { value: "custom", label: "Other / Custom event", emoji: "✨" },
];

export const eventMeta = (type: string) =>
  EVENT_TYPES.find((t) => t.value === type) ?? { value: type, label: type, emoji: "✨" };

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

export function buildScheduleMessage(
  clientName: string,
  events: EventLike[],
  businessName = "JOG MEDIA",
  contactPhone?: string | null,
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
      rows.push(
        line(
          "• Location",
          e.location ? `${e.location}${e.google_maps_link ? ` (${e.google_maps_link})` : ""}` : e.google_maps_link,
        ),
      );
      if (e.notes) rows.push(`• Note: ${e.notes}`);
      return `${meta.emoji} *${meta.label}*\n${rows.filter(Boolean).join("\n")}`;
    });

  return [
    `📸 *${businessName.toUpperCase()} - WEDDING SHOOT SCHEDULE* 📸`,
    `Client: ${clientName}`,
    "",
    ...blocks.flatMap((b) => [b, ""]),
    `📞 Contact ${businessName}${contactPhone ? ` (${contactPhone})` : ""} for any queries!`,
  ].join("\n");
}

export function buildCrewMessage(
  event: EventLike,
  clientName: string,
  role: string | null | undefined,
  businessName = "JOG MEDIA",
) {
  const meta = eventMeta(event.event_type);
  return [
    `🎬 *${businessName.toUpperCase()} - CREW DUTY ALERT*`,
    "",
    `Event: ${meta.label} for ${clientName}`,
    `🗓 Date: ${fmtDate(event.event_date)}`,
    `⏰ Team Reporting Time: ${fmtTime(event.arrival_time ?? event.event_time)}`,
    `📍 Venue: ${event.location ?? "TBD"}${event.google_maps_link ? ` (${event.google_maps_link})` : ""}`,
    `🎥 Your Role: ${role || "Crew"}`,
  ].join("\n");
}

export function openWhatsApp(phone: string | null | undefined, message: string) {
  const num = waNumber(phone);
  const url = num
    ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}

