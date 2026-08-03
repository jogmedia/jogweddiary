import { useMemo } from "react";
import {
  useAssignments,
  useProjectEvents,
  useProjects,
  type Assignment,
  type ProjectEvent,
} from "@/lib/db";
import { dayOffsetISO, fmtDate, todayISO } from "@/lib/format";
import { prettyRole } from "@/lib/roles";
import { eventLabel, eventMeta, fmtTime, openWhatsApp, travelLines } from "@/lib/whatsapp";

/** Days before an event when the reminder alert appears on the dashboard. */
export const REMINDER_DAYS = 3;

export type CrewAssignment = Assignment & {
  block_sent_at?: string | null;
  reminder_sent_at?: string | null;
};

export type CrewEventRow = {
  assignmentId: string;
  event: ProjectEvent;
  role: string | null;
};

export type CrewGroup = {
  key: string;
  staffId: string;
  staffName: string;
  phone: string | null;
  projectId: string;
  projectName: string;
  clientName: string;
  project: any;
  rows: CrewEventRow[];
  assignmentIds: string[];
  /** all rows already messaged */
  sent: boolean;
};

const byDate = (a: CrewEventRow, b: CrewEventRow) =>
  a.event.event_date < b.event.event_date ? -1 : 1;

/** "Date Block Request" — all assigned dates for one crew member on one project. */
export function buildDateBlockMessage(g: CrewGroup, business = "JOG MEDIA", contact?: string | null) {
  const blocks = [...g.rows].sort(byDate).map((r) => {
    const meta = eventMeta(r.event.event_type);
    const lines = [
      `${meta.emoji} *${eventLabel(r.event)}*`,
      `• 🗓 Date: ${fmtDate(r.event.event_date)}`,
      `• ⏰ Reporting: ${fmtTime(r.event.arrival_time ?? r.event.event_time)}`,
      `• 📍 Venue: ${r.event.location ?? "TBD"}`,
      `• 🎥 Your Role: ${prettyRole(r.role ?? "") || "Crew"}`,
    ];
    if (r.event.google_maps_link) lines.push(`• 🗺 Map: ${r.event.google_maps_link}`);
    return lines.join("\n");
  });

  return [
    `📌 *${business.toUpperCase()} - DATE BLOCK REQUEST*`,
    "",
    `Hi ${g.staffName}, please *block / save the below dates* for our wedding assignment.`,
    `Client: ${g.clientName}`,
    "",
    ...blocks.flatMap((b) => [b, ""]),
    ...travelLines(g.project),
    `✅ Kindly confirm your availability by replying to this message.`,
    `📞 ${business}${contact ? ` (${contact})` : ""}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

/** "Event Reminder" — sent 3 days before, venue + timing details. */
export function buildEventReminderMessage(
  g: CrewGroup,
  business = "JOG MEDIA",
  contact?: string | null,
) {
  const blocks = [...g.rows].sort(byDate).map((r) => {
    const meta = eventMeta(r.event.event_type);
    const lines = [
      `${meta.emoji} *${eventLabel(r.event)}*`,
      `• 🗓 Date: ${fmtDate(r.event.event_date)}`,
      `• ⏰ Team Arrival: ${fmtTime(r.event.arrival_time ?? r.event.event_time)}`,
      `• 🎬 Shoot Start: ${fmtTime(r.event.muhurtham_time ?? r.event.event_time)}`,
      `• 📍 Venue: ${r.event.location ?? "TBD"}`,
      `• 🎥 Your Role: ${prettyRole(r.role ?? "") || "Crew"}`,
    ];
    if (r.event.google_maps_link) lines.push(`• 🗺 Google Map: ${r.event.google_maps_link}`);
    if (r.event.contact_name || r.event.contact_phone)
      lines.push(`• ☎️ Venue Contact: ${r.event.contact_name ?? ""} ${r.event.contact_phone ?? ""}`.trim());
    return lines.join("\n");
  });

  return [
    `⏳ *${business.toUpperCase()} - EVENT REMINDER (${REMINDER_DAYS} DAYS TO GO)*`,
    "",
    `Hi ${g.staffName}, reminder for your upcoming shoot duty.`,
    `Client: ${g.clientName}`,
    "",
    ...blocks.flatMap((b) => [b, ""]),
    ...travelLines(g.project),
    `📦 Please check batteries, cards, lenses & gear a day before.`,
    `📞 ${business}${contact ? ` (${contact})` : ""}`,
  ].join("\n");
}

export const sendWhatsApp = (g: CrewGroup, message: string) => openWhatsApp(g.phone, message);

const groupRows = (
  assignments: CrewAssignment[],
  eventById: Map<string, ProjectEvent>,
  projectById: Map<string, any>,
  kind: "block" | "reminder",
  filter: (a: CrewAssignment, e: ProjectEvent) => boolean,
): CrewGroup[] => {
  const map = new Map<string, CrewGroup>();
  assignments.forEach((a) => {
    if (!a.event_id) return;
    const ev = eventById.get(a.event_id);
    if (!ev?.event_date) return;
    if (!filter(a, ev)) return;
    const key = `${a.staff_id}|${a.project_id}${kind === "reminder" ? `|${ev.event_date}` : ""}`;
    const project = projectById.get(a.project_id) ?? ev.projects ?? null;
    const existing = map.get(key);
    const row: CrewEventRow = { assignmentId: a.id, event: ev, role: a.role_in_project ?? null };
    if (existing) {
      existing.rows.push(row);
      existing.assignmentIds.push(a.id);
      existing.sent = existing.sent && Boolean(kind === "block" ? a.block_sent_at : a.reminder_sent_at);
    } else {
      map.set(key, {
        key,
        staffId: a.staff_id,
        staffName: a.staff?.name ?? "Crew",
        phone: a.staff?.whatsapp ?? a.staff?.phone ?? null,
        projectId: a.project_id,
        projectName: project?.project_name ?? a.projects?.project_name ?? "Project",
        clientName: project?.clients?.name ?? (ev.projects as any)?.clients?.name ?? "Client",
        project,
        rows: [row],
        assignmentIds: [a.id],
        sent: Boolean(kind === "block" ? a.block_sent_at : a.reminder_sent_at),
      });
    }
  });
  return [...map.values()].sort((x, y) =>
    [...x.rows].sort(byDate)[0].event.event_date.localeCompare([...y.rows].sort(byDate)[0].event.event_date),
  );
};

/**
 * Dashboard-wide crew notification queues:
 *  - pendingBlocks: assignments that never got the initial "block these dates" message
 *  - reminders: events happening within REMINDER_DAYS
 */
export function useCrewNotifications() {
  const { data: assignments = [] } = useAssignments();
  const { data: events = [] } = useProjectEvents();
  const { data: projects = [] } = useProjects();

  return useMemo(() => {
    const eventById = new Map(events.map((e) => [e.id, e]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const today = todayISO();
    const limit = dayOffsetISO(REMINDER_DAYS);
    const list = assignments as CrewAssignment[];

    const pendingBlocks = groupRows(
      list,
      eventById,
      projectById,
      "block",
      (a, e) => e.event_date >= today && !a.block_sent_at,
    );
    const sentBlocks = groupRows(
      list,
      eventById,
      projectById,
      "block",
      (a, e) => e.event_date >= today && Boolean(a.block_sent_at),
    );
    const reminders = groupRows(
      list,
      eventById,
      projectById,
      "reminder",
      (_a, e) => e.event_date >= today && e.event_date <= limit,
    );

    return { pendingBlocks, sentBlocks, reminders };
  }, [assignments, events, projects]);
}

/** Group builder for a single project (in-project buttons). */
export function projectCrewGroups(
  assignments: CrewAssignment[],
  events: ProjectEvent[],
  project: any,
  kind: "block" | "reminder" = "block",
) {
  return groupRows(
    assignments,
    new Map(events.map((e) => [e.id, e])),
    new Map([[project?.id, project]]),
    kind,
    () => true,
  );
}
