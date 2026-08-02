import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";

export const TICKET_BUCKET = "travel-tickets";

const MODE_LABEL: Record<string, string> = {
  train: "Train",
  flight: "Flight",
  bus: "Bus",
  cab: "Cab",
  self_drive: "Self Drive",
};

export type TravelProject = {
  travel_required?: boolean | null;
  travel_booking_status?: string | null;
  travel_mode?: string | null;
  travel_notes?: string | null;
  travel_ticket_path?: string | null;
  travel_ticket_name?: string | null;
};

/** True when there is any travel/ticket info worth sharing with crew. */
export const hasTicketInfo = (p?: TravelProject | null) =>
  !!p?.travel_required &&
  (p.travel_booking_status ?? "pending") !== "not_needed" &&
  !!(p.travel_notes?.trim() || p.travel_ticket_path || p.travel_mode);

/** Long-lived (7 day) signed download URL for a stored ticket file. */
export async function ticketDownloadUrl(path?: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(TICKET_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7, { download: true });
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function buildTicketMessage(opts: {
  crewName?: string | null;
  clientName: string;
  eventName: string;
  date: string;
  project: TravelProject;
  ticketUrl?: string | null;
  businessName?: string;
}) {
  const { crewName, clientName, eventName, date, project, ticketUrl, businessName = "JOG MEDIA" } = opts;
  const mode = project.travel_mode ? MODE_LABEL[project.travel_mode] ?? project.travel_mode : null;
  const booked = (project.travel_booking_status ?? "pending") === "booked";

  const rows = [
    `🎫 *${businessName.toUpperCase()} - TRAVEL & TICKET DETAILS*`,
    "",
    crewName ? `Hi ${crewName},` : null,
    `Event: ${eventName} for ${clientName}`,
    `🗓 Travel / Event Date: ${fmtDate(date)}`,
    `🚆 Mode of travel: ${mode ?? "To be confirmed"}`,
    `📌 Booking status: ${booked ? "✅ Ticket Booked" : "⚠️ Not booked yet"}`,
    project.travel_notes?.trim() ? `🎟 Ticket / PNR details: ${project.travel_notes.trim()}` : null,
    ticketUrl ? "" : null,
    ticketUrl ? `📎 Download your ticket (${project.travel_ticket_name ?? "attachment"}):` : null,
    ticketUrl ?? null,
    "",
    `Please save the ticket and reach on time. - ${businessName}`,
  ];
  return rows.filter((r) => r !== null).join("\n");
}

/** Builds the ticket message (with a fresh download link) and opens WhatsApp. */
export async function sendTicketWhatsApp(opts: {
  phone?: string | null;
  crewName?: string | null;
  clientName: string;
  eventName: string;
  date: string;
  project: TravelProject;
}) {
  const url = await ticketDownloadUrl(opts.project.travel_ticket_path);
  if (opts.project.travel_ticket_path && !url) {
    toast.error("Could not create the ticket download link");
  }
  openWhatsApp(opts.phone, buildTicketMessage({ ...opts, ticketUrl: url }));
}
