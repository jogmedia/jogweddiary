import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, CircleDot, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "@/components/ProjectDialog";
import { useClients } from "@/lib/db";
import { useCrewBookings, type Booking } from "@/lib/crew";
import { fmtDate } from "@/lib/format";
import { eventLabel } from "@/lib/whatsapp";

export const Route = createFileRoute("/my-availability")({
  head: () => ({
    meta: [
      { title: "My free dates — Vipinraj Chathoth | JOG MEDIA" },
      {
        name: "description",
        content:
          "Instantly check which dates Vipinraj Chathoth is free or already booked for a shoot, and book a new wedding date on the spot.",
      },
      { property: "og:title", content: "My free dates — Vipinraj Chathoth | JOG MEDIA" },
      {
        property: "og:description",
        content: "Free and booked shoot dates for Vipinraj Chathoth, month by month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvailabilityPage,
});

const OWNER_MATCH = "vipinraj";
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function AvailabilityPage() {
  const { bookings } = useCrewBookings();
  const { data: clients = [] } = useClients();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookDate, setBookDate] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const mine = useMemo(
    () => bookings.filter((b) => (b.staffName ?? "").toLowerCase().includes(OWNER_MATCH)),
    [bookings],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    mine.forEach((b) => map.set(b.date, [...(map.get(b.date) ?? []), b]));
    return map;
  }, [mine]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [
    ...Array(new Date(y, m, 1).getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const shift = (n: number) => setCursor(new Date(y, m + n, 1));

  const freeDates = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => iso(y, m, i + 1)).filter(
        (d) => d >= todayStr && !byDate.has(d),
      ),
    [byDate, daysInMonth, m, y, todayStr],
  );
  const bookedThisMonth = useMemo(
    () =>
      Array.from(byDate.keys())
        .filter((d) => d.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`))
        .sort(),
    [byDate, m, y],
  );

  const monthLabel = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const thisMonth = new Date();
  const nextMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1);

  const dayList = openDay ? (byDate.get(openDay) ?? []) : [];

  return (
    <AppShell>
      <PageHeader
        title="My free dates"
        subtitle="Vipinraj Chathoth — green dates are open for booking, red dates already have a shoot."
        backTo="/"
        backLabel="Back to Dashboard"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-border bg-surface p-1">
          {(["calendar", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`min-h-9 rounded-full px-4 text-xs font-medium capitalize ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {v === "calendar" ? "Calendar" : "Quick free dates"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="surface px-4 py-3">
          <p className="text-xs text-muted-foreground">Free days left this month</p>
          <p className="text-xl font-semibold text-success">{freeDates.length}</p>
        </div>
        <div className="surface px-4 py-3">
          <p className="text-xs text-muted-foreground">Booked days</p>
          <p className="text-xl font-semibold text-destructive">{bookedThisMonth.length}</p>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="surface w-full overflow-hidden p-2 sm:p-3">
          <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
            {WEEK.map((d) => (
              <div key={d}>{d.slice(0, 1)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e${idx}`} className="min-h-16 rounded-lg" />;
              const date = iso(y, m, day);
              const list = byDate.get(date) ?? [];
              const past = date < todayStr;
              const busy = list.length > 0;
              return (
                <button
                  key={day}
                  onClick={() => (busy ? setOpenDay(date) : !past && setBookDate(date))}
                  className={`min-h-16 rounded-lg border p-1 text-left transition ${
                    busy
                      ? "border-destructive/40 bg-destructive/10"
                      : past
                        ? "border-border bg-muted/30 text-muted-foreground"
                        : "border-success/30 bg-success/10 active:scale-[0.98]"
                  } ${date === todayStr ? "ring-1 ring-primary" : ""}`}
                >
                  <span className="text-[11px] font-medium">{day}</span>
                  {busy ? (
                    <span className="mt-0.5 block truncate text-[10px] leading-tight text-destructive">
                      {list[0].projectName}
                    </span>
                  ) : (
                    !past && (
                      <span className="mt-0.5 block text-[10px] leading-tight text-success">Free</span>
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-nowrap gap-2 overflow-x-auto py-1 no-scrollbar">
            <button
              onClick={() => setCursor(new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1))}
              className="min-h-9 shrink-0 rounded-full border border-border px-4 text-xs font-medium"
            >
              This month
            </button>
            <button
              onClick={() => setCursor(nextMonth)}
              className="min-h-9 shrink-0 rounded-full border border-border px-4 text-xs font-medium"
            >
              Next month
            </button>
            <input
              type="month"
              value={`${y}-${String(m + 1).padStart(2, "0")}`}
              onChange={(e) => {
                const [yy, mm] = e.target.value.split("-").map(Number);
                if (yy && mm) setCursor(new Date(yy, mm - 1, 1));
              }}
              className="min-h-9 shrink-0 rounded-full border border-border bg-surface px-3 text-xs"
            />
          </div>

          <div className="surface w-full divide-y divide-border overflow-hidden">
            <p className="px-4 py-3 text-sm font-semibold text-success">
              Available dates — {monthLabel}
            </p>
            {freeDates.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No free dates left in {monthLabel}.
              </p>
            )}
            {freeDates.map((d) => (
              <div key={d} className="flex w-full items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <CircleDot className="h-3.5 w-3.5 shrink-0 text-success" />
                  <span className="truncate text-sm font-medium">{fmtDate(d)}</span>
                  <span className="shrink-0 text-xs text-success">Available</span>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => setBookDate(d)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Book
                </Button>
              </div>
            ))}
          </div>

          <div className="surface w-full divide-y divide-border overflow-hidden">
            <p className="px-4 py-3 text-sm font-semibold text-destructive">
              Already booked — {monthLabel}
            </p>
            {bookedThisMonth.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No shoots booked yet.</p>
            )}
            {bookedThisMonth.map((d) => {
              const list = byDate.get(d) ?? [];
              return (
                <Link
                  key={d}
                  to="/projects/$id"
                  params={{ id: list[0].projectId }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fmtDate(d)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {list.map((b) => `${b.projectName}${b.eventLabel ? ` · ${b.eventLabel}` : ""}`).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-destructive">Booked</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {openDay && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setOpenDay(null)}
        >
          <div
            className="surface w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarCheck className="h-4 w-4 text-destructive" />
              {fmtDate(openDay)} — booked
            </p>
            <div className="mt-3 space-y-2">
              {dayList.map((b) => (
                <Link
                  key={b.eventId}
                  to="/projects/$id"
                  params={{ id: b.projectId }}
                  className="block rounded-xl border border-border px-3 py-2"
                  onClick={() => setOpenDay(null)}
                >
                  <p className="truncate text-sm font-medium">{b.projectName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {eventLabel({ event_type: b.eventLabel } as any)}
                    {b.time ? ` · ${b.time.slice(0, 5)}` : ""}
                    {b.role ? ` · ${b.role}` : ""}
                  </p>
                </Link>
              ))}
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={() => setOpenDay(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {bookDate && (
        <ProjectDialog
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          initial={{ event_date: bookDate }}
          title={`Book shoot — ${fmtDate(bookDate)}`}
          open
          onOpenChange={(v) => !v && setBookDate(null)}
        />
      )}
    </AppShell>
  );
}
