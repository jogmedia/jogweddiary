import { waNumber } from "@/lib/format";

export const LAYOUT_DAYS = 90;
export const DISPATCH_DAYS = 10;

export type PortalProject = {
  project_id: string;
  project_name: string;
  client_name: string | null;
  event_date: string | null;
  venue: string | null;
  package_name: string | null;
  raw_sent_date: string | null;
  raw_drive_link: string | null;
  selection_received_date: string | null;
  layout_status: string | null;
  album_proof_link: string | null;
  client_approval_status: string | null;
  client_revision_note: string | null;
  client_selection_note: string | null;
  sent_to_printing_date: string | null;
  courier_dispatched_date: string | null;
  delivery_status: string | null;
};

const MS_DAY = 86_400_000;

/** Days remaining from `start` + `days`. Negative means overdue. */
export function daysLeft(start?: string | null, days = 0) {
  if (!start) return null;
  const due = new Date(`${start}T00:00:00`).getTime() + days * MS_DAY;
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((due - today) / MS_DAY);
}

export function countdownLabel(left: number | null, what: string) {
  if (left === null) return null;
  if (left < 0) return `${what}: ${Math.abs(left)} days overdue`;
  if (left === 0) return `${what}: due today`;
  return `${what}: ${left} days left`;
}

export type PortalStage = {
  key: string;
  label: string;
  done: boolean;
};

export function portalStages(p: Partial<PortalProject>): PortalStage[] {
  return [
    { key: "raw", label: "Raw Sent", done: Boolean(p.raw_sent_date) },
    { key: "selection", label: "Selection Done", done: Boolean(p.selection_received_date) },
    {
      key: "design",
      label: "Designing",
      done: p.layout_status === "completed" || p.client_approval_status === "approved",
    },
    { key: "printing", label: "Printing", done: Boolean(p.sent_to_printing_date) },
    {
      key: "delivered",
      label: "Delivered",
      done: Boolean(p.courier_dispatched_date) || p.delivery_status === "delivered",
    },
  ];
}

export function portalProgress(p: Partial<PortalProject>) {
  const stages = portalStages(p);
  const done = stages.filter((s) => s.done).length;
  return { stages, done, pct: Math.round((done / stages.length) * 100) };
}

/** Public client portal URL for a project. */
export function portalUrl(projectId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/portal/${projectId}`;
}

export function portalWaLink(phone: string | null | undefined, clientName: string | null | undefined, url: string) {
  const msg = `Hi ${clientName || "there"}, Track your album design status and review layout proofs here: ${url}`;
  const num = waNumber(phone ?? "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
