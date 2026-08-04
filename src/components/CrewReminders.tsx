import { useState } from "react";
import { BellRing, CalendarClock, Check, MapPin, MessageCircle, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui-kit";
import { useSettings, useUpsert } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { prettyRole } from "@/lib/roles";
import { eventLabel, eventMeta, fmtTime } from "@/lib/whatsapp";
import {
  REMINDER_DAYS,
  buildDateBlockMessage,
  buildEventReminderMessage,
  sendWhatsApp,
  useCrewNotifications,
  type CrewGroup,
} from "@/lib/crew-notify";

type Tab = "block" | "reminder";

export function CrewReminders() {
  const [tab, setTab] = useState<Tab>("block");
  const [showSent, setShowSent] = useState(false);
  const { pendingBlocks, sentBlocks, reminders } = useCrewNotifications();
  const { data: settings } = useSettings();
  const save = useUpsert("project_assignments", "Crew notification");

  const business = settings?.business_name ?? "JOG MEDIA";
  const contact = settings?.phone ?? null;

  const send = async (g: CrewGroup, kind: Tab) => {
    const msg =
      kind === "block"
        ? buildDateBlockMessage(g, business, contact)
        : buildEventReminderMessage(g, business, contact);
    sendWhatsApp(g, msg);
    const field = kind === "block" ? "block_sent_at" : "reminder_sent_at";
    for (const id of g.assignmentIds) {
      await save.mutateAsync({ id, [field]: new Date().toISOString() });
    }
  };

  const pendingReminders = reminders.filter((g) => !g.sent);
  const sentReminders = reminders.filter((g) => g.sent);

  const pending = tab === "block" ? pendingBlocks : pendingReminders;
  const sent = tab === "block" ? sentBlocks : sentReminders;
  const blockList = showSent ? sent : pending;

  return (
    <div className="surface mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="h-4 w-4 text-primary" /> Crew Schedule &amp; Reminders
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={tab === "block" ? "default" : "outline"}
            onClick={() => {
              setTab("block");
              setShowSent(false);
            }}
          >
            <Users className="mr-1.5 h-4 w-4" /> Pending Date Block Alerts ({pendingBlocks.length})
          </Button>
          <Button
            size="sm"
            variant={tab === "reminder" ? "default" : "outline"}
            onClick={() => {
              setTab("reminder");
              setShowSent(false);
            }}
          >
            <CalendarClock className="mr-1.5 h-4 w-4" /> Upcoming Event Reminders (3 Days Prior) (
            {pendingReminders.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSent((s) => !s)}>
            {showSent ? "Hide Sent History" : `Show Sent History (${sent.length})`}
          </Button>
        </div>
      </div>


      {blockList.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {showSent
            ? "Nothing sent yet."
            : tab === "block"
              ? "Every assigned crew member has received their date block request."
              : `No pending reminders for sub-events within the next ${REMINDER_DAYS} days.`}
        </p>

      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {blockList.map((g) => (
            <div key={g.key} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{g.staffName}</p>
                  <Link
                    to="/projects/$id"
                    params={{ id: g.projectId }}
                    className="text-xs text-primary underline"
                  >
                    {g.projectName} · {g.clientName}
                  </Link>
                </div>
                <StatusBadge value={g.sent ? "sent" : "pending"} />
              </div>

              <div className="mt-2 space-y-1.5">
                {[...g.rows]
                  .sort((a, b) => a.event.event_date.localeCompare(b.event.event_date))
                  .map((r) => (
                    <div key={r.assignmentId} className="text-xs">
                      <p className="font-medium">
                        {eventMeta(r.event.event_type).emoji} {eventLabel(r.event)} ·{" "}
                        {fmtDate(r.event.event_date)}
                      </p>
                      <p className="flex items-start gap-1 text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          ⏰ {fmtTime(r.event.arrival_time ?? r.event.event_time)} ·{" "}
                          {r.event.location ?? "Venue TBD"} · 🎥 {prettyRole(r.role ?? "") || "Crew"}
                        </span>
                      </p>
                    </div>
                  ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={g.sent ? "outline" : "default"} onClick={() => send(g, tab)}>
                  {g.sent ? <Check className="mr-1.5 h-4 w-4" /> : <MessageCircle className="mr-1.5 h-4 w-4" />}
                  {tab === "block"
                    ? g.sent
                      ? "Resend date block"
                      : "Send WhatsApp"
                    : g.sent
                      ? "Resend reminder"
                      : "Send WhatsApp reminder"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
