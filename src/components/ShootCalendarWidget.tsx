import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookShootDialog } from "@/components/BookShootDialog";
import { useClients, useProjectEvents, type ProjectEvent } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { eventLabel } from "@/lib/whatsapp";

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const shootName = (e: ProjectEvent) =>
  e.projects?.clients?.name ?? e.projects?.project_name ?? "Shoot";

/** Dashboard calendar: green = open date, red = shoot already booked. Tap any date to book. */
export function ShootCalendarWidget() {
  const { data: events = [] } = useProjectEvents();
  const { data: clients = [] } = useClients();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookDate, setBookDate] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const byDate = useMemo(() => {
    const map = new Map<string, ProjectEvent[]>();
    events.forEach((e) => {
      if (!e.event_date) return;
      map.set(e.event_date, [...(map.get(e.event_date) ?? []), e]);
    });
    return map;
  }, [events]);

  const cells = [
    ...Array(new Date(y, m, 1).getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const bookedDays = useMemo(
    () => Array.from(byDate.keys()).filter((d) => d.startsWith(monthPrefix)).length,
    [byDate, monthPrefix],
  );
  const freeDays = daysInMonth - bookedDays;
  const monthLabel = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const dayList = openDay ? (byDate.get(openDay) ?? []) : [];

  return (
    <section className="surface w-full overflow-hidden px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            Shoot Calendar &amp; Quick Booking
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Green dates are open for booking · Red dates have scheduled shoots
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(y, m - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-28 text-center text-xs font-medium">{monthLabel}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next month"
            onClick={() => setCursor(new Date(y, m + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-medium text-success">
          Free days: {freeDays}
        </span>
        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[11px] font-medium text-destructive">
          Booked days: {bookedDays}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
        {WEEK.map((d, i) => (
          <div key={`${d}${i}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} className="min-h-14 rounded-lg" />;
          const date = iso(y, m, day);
          const list = byDate.get(date) ?? [];
          const busy = list.length > 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => (busy ? setOpenDay(date) : setBookDate(date))}
              className={`min-h-14 overflow-hidden rounded-lg border p-1 text-left transition active:scale-[0.98] ${
                busy
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-success/30 bg-success/10 text-success"
              } ${date === todayStr ? "ring-2 ring-primary" : ""}`}
            >
              <span className="text-[11px] font-semibold text-foreground">{day}</span>
              <span className="mt-0.5 block truncate text-[10px] leading-tight">
                {busy ? shootName(list[0]) : "Free"}
              </span>
              {list.length > 1 && (
                <span className="block text-[9px] leading-tight">+{list.length - 1} more</span>
              )}
            </button>
          );
        })}
      </div>

      {openDay && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setOpenDay(null)}
        >
          <div className="surface w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">{fmtDate(openDay)} — scheduled shoots</p>
            <div className="mt-3 space-y-2">
              {dayList.map((e) => (
                <Link
                  key={e.id}
                  to="/projects/$id"
                  params={{ id: e.project_id }}
                  onClick={() => setOpenDay(null)}
                  className="block rounded-xl border border-border px-3 py-2"
                >
                  <p className="truncate text-sm font-medium">{shootName(e)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {eventLabel(e as any)}
                    {e.arrival_time || e.event_time
                      ? ` · ${(e.arrival_time ?? e.event_time)!.slice(0, 5)}`
                      : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  setBookDate(openDay);
                  setOpenDay(null);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add another function
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpenDay(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {bookDate && (
        <BookShootDialog
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          date={bookDate}
          open
          onOpenChange={(v) => !v && setBookDate(null)}
        />
      )}
    </section>
  );
}
