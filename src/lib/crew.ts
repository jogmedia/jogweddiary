import { useMemo } from "react";
import { useAssignments, useProjectEvents, type Assignment, type ProjectEvent } from "@/lib/db";

export type Booking = {
  staffId: string;
  staffName: string;
  role: string | null;
  date: string;
  projectId: string;
  projectName: string;
  eventId: string;
};

/**
 * Crew availability derived from saved event assignments.
 * A crew member is "Booked" on every date of an event they are assigned to.
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
        projectId: a.project_id,
        projectName:
          (ev.projects as any)?.clients?.name ??
          ev.projects?.project_name ??
          a.projects?.project_name ??
          "Project",
        eventId: a.event_id,
      });
    });

    const byDate = new Map<string, Booking[]>();
    bookings.forEach((b) => byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]));

    /** Bookings for a crew member on a date, optionally excluding one project. */
    const conflictsFor = (staffId: string, date?: string, excludeProjectId?: string) => {
      if (!date) return [];
      return (byDate.get(date) ?? []).filter(
        (b) => b.staffId === staffId && b.projectId !== excludeProjectId,
      );
    };

    return { bookings, byDate, conflictsFor };
  }, [assignments, events]);
}
