import { useMemo } from "react";
import { useAssignments, useProjectEvents, type Assignment, type ProjectEvent } from "@/lib/db";

export type Booking = {
  staffId: string;
  staffName: string;
  role: string | null;
  date: string;
  /** Best-known slot time for the booking (arrival / event / muhurtham). */
  time: string | null;
  projectId: string;
  projectName: string;
  eventId: string;
  eventLabel: string | null;
};

const slotTime = (e: ProjectEvent) =>
  (e.arrival_time ?? e.event_time ?? (e as any).muhurtham_time ?? null) as string | null;

/** Normalises "09:30:00" / "9:30" to minutes for slot comparison. */
const toMinutes = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hh = Number(h);
  const mm = Number(m ?? 0);
  return Number.isFinite(hh) ? hh * 60 + (Number.isFinite(mm) ? mm : 0) : null;
};

/** Two slots clash when they start within this window of each other. */
const SLOT_WINDOW_MIN = 180;

/**
 * Crew availability derived from saved event assignments.
 * A crew member is only "Booked" for the exact same date & time slot —
 * they may work several sub-events of one project on different dates.
 */
export function useCrewBookings() {
  const { data: assignments = [] } = useAssignments();
  const { data: events = [] } = useProjectEvents();

  return useMemo(() => {
    const eventById = new Map<string, ProjectEvent>(events.map((e) => [e.id, e]));
    const bookings: Booking[] = [];

    (assignments as Assignment[]).forEach((a) => {
      if (!a.event_id) return;
      const ev = eventById.get(a.event_id);
      if (!ev?.event_date) return;
      bookings.push({
        staffId: a.staff_id,
        staffName: a.staff?.name ?? "Crew",
        role: a.role_in_project ?? a.staff?.role ?? null,
        date: ev.event_date,
        time: slotTime(ev),
        projectId: a.project_id,
        projectName:
          (ev.projects as any)?.clients?.name ??
          ev.projects?.project_name ??
          a.projects?.project_name ??
          "Project",
        eventId: a.event_id,
        eventLabel: (ev.event_type ?? null) as string | null,
      });
    });

    const byDate = new Map<string, Booking[]>();
    bookings.forEach((b) => byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]));

    /**
     * Clashes for a crew member on a specific date & time slot.
     * Only the same date counts; a different sub-event on another date is fine.
     */
    const conflictsFor = (
      staffId: string,
      date?: string,
      opts?: { excludeEventId?: string | null; time?: string | null },
    ) => {
      if (!date) return [];
      const mine = toMinutes(opts?.time);
      return (byDate.get(date) ?? []).filter((b) => {
        if (b.staffId !== staffId) return false;
        if (opts?.excludeEventId && b.eventId === opts.excludeEventId) return false;
        const theirs = toMinutes(b.time);
        if (mine == null || theirs == null) return true; // unknown time → treat the day as taken
        return Math.abs(mine - theirs) < SLOT_WINDOW_MIN;
      });
    };

    return { bookings, byDate, conflictsFor };
  }, [assignments, events]);
}

