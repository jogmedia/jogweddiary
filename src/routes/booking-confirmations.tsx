import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, MessageCircle, Search, Copy } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjectEvents, useProjects, useSettings } from "@/lib/db";
import { fmtDate, fmtPhone, inr } from "@/lib/format";
import { eventMeta, openWhatsApp } from "@/lib/whatsapp";
import { toDeliverables } from "@/lib/packages";
import { buildBookingConfirmation, type ConfirmationInput } from "@/lib/booking-confirmation";

export const Route = createFileRoute("/booking-confirmations")({
  head: () => ({
    meta: [
      { title: "Booking Confirmations — JOG MEDIA" },
      {
        name: "description",
        content: "Confirmed client bookings with ticket previews and one-tap WhatsApp confirmations.",
      },
      { property: "og:title", content: "Booking Confirmations — JOG MEDIA" },
      { property: "og:description", content: "Confirmed bookings and WhatsApp booking tickets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingConfirmationsPage,
});

type Row = {
  project: any;
  phone: string | null;
  input: ConfirmationInput;
};

function BookingConfirmationsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: events = [] } = useProjectEvents();
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    return (projects as any[])
      .filter((p) => (p.project_status ?? "open") !== "cancelled")
      .map((p) => {
        const evs = (events as any[])
          .filter((e) => e.project_id === p.id && e.status !== "cancelled")
          .sort((a, b) => a.event_date.localeCompare(b.event_date));
        const dates = Array.from(new Set(evs.map((e) => e.event_date)));
        const functions = Array.from(
          new Set(evs.map((e) => eventMeta(e.event_type)?.label ?? e.event_type)),
        );
        const venues = Array.from(
          new Set([...evs.map((e) => e.location), p.venue].filter(Boolean) as string[]),
        );
        const total = Number(p.total_amount ?? 0);
        const balance = Number(p.balance_due ?? 0);
        return {
          project: p,
          phone: p.clients?.whatsapp || p.clients?.phone || null,
          input: {
            clientName: p.clients?.name ?? "Client",
            dates: dates.length ? dates : [p.event_date].filter(Boolean),
            functions: functions.length ? functions : [p.project_name].filter(Boolean),
            venues,
            deliverables: toDeliverables(p.deliverables),
            total,
            advance: Math.max(0, total - balance),
            balance,
            studioContact: settings?.phone ?? null,
          },
        };
      })
      .sort((a, b) => (b.input.dates[0] ?? "").localeCompare(a.input.dates[0] ?? ""));
  }, [projects, events, settings]);

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const digits = s.replace(/\D/g, "");
    return (
      r.input.clientName.toLowerCase().includes(s) ||
      (r.project.project_name ?? "").toLowerCase().includes(s) ||
      (digits && (r.phone ?? "").replace(/\D/g, "").includes(digits))
    );
  });

  const send = (r: Row) => {
    if (!r.phone) {
      toast.error("No WhatsApp number saved for this client");
      return;
    }
    openWhatsApp(r.phone, buildBookingConfirmation(r.input));
  };

  return (
    <AppShell>
      <PageHeader title="🎟️ Confirmed Bookings & Tickets" description="Send booking confirmations to clients on WhatsApp." />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client name or phone…" className="h-11 pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No bookings found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.project.id} className="w-full space-y-2.5 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link to="/projects/$id" params={{ id: r.project.id }} className="block truncate font-semibold text-foreground hover:text-primary">
                    {r.input.clientName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.phone ? fmtPhone(r.phone) : "No phone saved"} · {r.project.project_name}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {r.input.dates[0] ? fmtDate(r.input.dates[0]) : "Date TBC"}
                </span>
              </div>
              <p className="text-sm">🎉 {r.input.functions.join(" + ") || "—"}</p>
              {r.input.dates.length > 1 && (
                <p className="text-xs text-muted-foreground">🗓️ {r.input.dates.map(fmtDate).join(", ")}</p>
              )}
              {r.input.venues.length > 0 && <p className="text-xs text-muted-foreground">📍 {r.input.venues.join(" / ")}</p>}
              {r.input.deliverables.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {r.input.deliverables.slice(0, 4).map((d, i) => <li key={i}>{d}</li>)}
                  {r.input.deliverables.length > 4 && <li>+{r.input.deliverables.length - 4} more</li>}
                </ul>
              )}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center">
                <Money label="Total" value={r.input.total} />
                <Money label="Advance" value={r.input.advance} />
                <Money label="Balance" value={r.input.balance} strong />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="h-11 flex-1 gap-1.5" onClick={() => setPreview(r)}>
                  <Eye className="h-4 w-4" /> Preview Ticket
                </Button>
                <Button className="h-11 flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => send(r)}>
                  <MessageCircle className="h-4 w-4" /> Send WhatsApp Confirmation
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Ticket — {preview?.input.clientName}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 font-sans text-sm leading-relaxed">
                {buildBookingConfirmation(preview.input)}
              </pre>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="h-11 flex-1 gap-1.5"
                  onClick={() => {
                    navigator.clipboard?.writeText(buildBookingConfirmation(preview.input));
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                <Button className="h-11 flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => send(preview)}>
                  <MessageCircle className="h-4 w-4" /> Send on WhatsApp
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Money({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`truncate text-sm tabular-nums ${strong ? "font-bold text-destructive" : "font-semibold"}`}>{inr(value)}</p>
    </div>
  );
}
