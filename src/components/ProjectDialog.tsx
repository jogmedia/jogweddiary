import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Package as PackageIcon, Plane, Plus, Trash2 } from "lucide-react";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CrewPicker, type CrewMember } from "@/components/CrewPicker";
import { ADVANCE_REF, PAY_ACCOUNTS, modeForAccount } from "@/lib/accounts";
import { isMapsUrl, todayISO, waNumber } from "@/lib/format";
import { TicketUpload } from "@/components/TicketUpload";
import { BookingReceiptButton } from "@/components/BookingReceiptButton";
import {
  PRESET_PACKAGES,
  findPackage,
  packageByName,
  toDeliverables,
} from "@/lib/packages";
import { EventTypesManager } from "@/components/EventTypesManager";
import {
  useAssignments,
  useClients,
  useEventTypes,
  usePayments,
  useProjectEvents,
  useRemove,
  useStaff,
  useUpsert,
  type Assignment,
  type EventType,
  type ProjectEvent,
} from "@/lib/db";


export const STATUS_OPTIONS = {
  project: ["open", "ongoing", "completed", "cancelled"],
  shoot: ["pending", "in_progress", "completed"],
  editing: ["pending", "in_progress", "completed"],
  album: ["pending", "in_progress", "completed"],
  delivery: ["pending", "in_progress", "delivered"],
};

const opts = (list: string[]) => list.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));

/** Pull the first money-looking number out of typed package text (e.g. "₹80,000 — ..." → 80000). */
const parseAmount = (text: string | null | undefined): number | null => {
  const m = (text ?? "").match(/[\d][\d,.]*/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const matchPackages = (query: string | null | undefined) => {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return PRESET_PACKAGES;
  const terms = q.split(/\s+/);
  return PRESET_PACKAGES.filter((p) => {
    const hay = `${p.label} ${p.category} ${p.amount}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
};


export const ADVANCE_ACCOUNTS = PAY_ACCOUNTS.map(({ value, label }) => ({ value, label }));

/** Project fields — the single event date is replaced by the sub-events section. */
export function projectFields(
  clients: { id: string; name: string }[],
  addClient?: (name: string, extra: Record<string, any>) => Promise<string | null>,
): Field[] {
  return [
    {
      name: "client_id",
      label: "Client",
      type: "select",
      required: true,
      options: clients.map((c) => ({ value: c.id, label: c.name })),
      ...(addClient
        ? {
            onAddOption: addClient,
            addOptionTitle: "Add new client",
            addOptionLabel: "Client name",
            addOptionPlaceholder: "e.g. Arun & Meera",
            addOptionSubmitLabel: "Add client",
            addOptionFields: [
              { name: "phone", label: "Phone number", type: "tel" as const, placeholder: "98765 43210" },
              { name: "address", label: "City / Location", placeholder: "e.g. Kozhikode" },
            ],
          }
        : {}),
    },
    { name: "project_name", label: "Project name", required: true },
    { name: "venue", label: "Main venue" },
    { name: "place_district", label: "Place / District", placeholder: "e.g. Kozhikode, Thalassery" },
    {
      name: "nearest_railway_station",
      label: "Nearest railway station",
      placeholder: "e.g. Thalassery Railway Station",
    },
    {
      name: "google_maps_link",
      label: "Google Maps location link",
      type: "url",
      full: true,
      placeholder: "https://maps.app.goo.gl/…",
      validate: (v) => (isMapsUrl(v) ? null : "Enter a valid https link"),
    },
    { name: "package_name", label: "Package" },

    { name: "total_amount", label: "Total agreed amount", type: "number" },
    { name: "advance_amount", label: "Advance amount", type: "number" },
    {
      name: "advance_account",
      label: "Advance payment account / mode",
      type: "select",
      options: ADVANCE_ACCOUNTS,
    },
    { name: "advance_date", label: "Advance received on", type: "date" },
    { name: "payment_due_date", label: "Balance due date", type: "date" },
    { name: "project_status", label: "Project status", type: "select", options: opts(STATUS_OPTIONS.project) },
    { name: "shoot_status", label: "Shoot status", type: "select", options: opts(STATUS_OPTIONS.shoot) },
    { name: "editing_status", label: "Editing status", type: "select", options: opts(STATUS_OPTIONS.editing) },
    { name: "album_status", label: "Album status", type: "select", options: opts(STATUS_OPTIONS.album) },
    { name: "delivery_status", label: "Delivery status", type: "select", options: opts(STATUS_OPTIONS.delivery) },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

const BOOKING_STATUS = [
  { value: "pending", label: "Pending / Not Booked" },
  { value: "booked", label: "Booked" },
  { value: "not_needed", label: "Not Needed" },
];

const TRAVEL_MODES = [
  { value: "train", label: "Train" },
  { value: "flight", label: "Flight" },
  { value: "bus", label: "Bus" },
  { value: "cab", label: "Cab" },
  { value: "self_drive", label: "Self Drive" },
];

type Travel = {
  travel_required: boolean;
  travel_booking_status: string;
  travel_mode: string;
  travel_notes: string;
  travel_ticket_path: string | null;
  travel_ticket_name: string | null;
};

const buildTravel = (initial?: Record<string, any>): Travel => ({
  travel_required: !!initial?.travel_required,
  travel_booking_status: initial?.travel_booking_status ?? "not_needed",
  travel_mode: initial?.travel_mode ?? "",
  travel_notes: initial?.travel_notes ?? "",
  travel_ticket_path: initial?.travel_ticket_path ?? null,
  travel_ticket_name: initial?.travel_ticket_name ?? null,
});

const SUB_EVENTS = [
  { type: "save_the_date", label: "Save the Date" },
  { type: "engagement", label: "Engagement" },
  { type: "haldi", label: "Haldi / Mehendi" },
  { type: "wedding_eve", label: "Wedding Eve / Sangeeth" },
  { type: "wedding_day", label: "Wedding Day / Muhurtham" },
  { type: "reception", label: "Reception" },
] as const;

type Row = {
  enabled: boolean;
  date: string;
  time: string;
  location: string;
  name?: string;
  id?: string;
  crew: CrewMember[];
};

const emptyRow = (): Row => ({ enabled: false, date: "", time: "", location: "", crew: [] });
const emptyCustomRow = (): Row => ({
  enabled: true,
  date: "",
  time: "",
  location: "",
  name: "",
  crew: [],
});

const crewFor = (assignments: Assignment[], eventId?: string): CrewMember[] =>
  eventId
    ? assignments
        .filter((a) => a.event_id === eventId)
        .map((a) => ({ staffId: a.staff_id, role: a.role_in_project ?? a.staff?.role ?? null }))
    : [];

function buildRows(events: ProjectEvent[], assignments: Assignment[] = []) {
  const rows: Record<string, Row> = {};
  SUB_EVENTS.forEach(({ type }) => {
    const e = events.find((ev) => ev.event_type === type);
    rows[type] = e
      ? {
          enabled: true,
          date: e.event_date ?? "",
          time: (e.event_time ?? "").slice(0, 5),
          location: e.location ?? "",
          id: e.id,
          crew: crewFor(assignments, e.id),
        }
      : emptyRow();
  });
  return rows;
}

function buildCustomRows(events: ProjectEvent[], assignments: Assignment[] = []) {
  return events
    .filter((ev) => ev.event_type === "custom")
    .map((e) => ({
      enabled: true,
      date: e.event_date ?? "",
      time: (e.event_time ?? "").slice(0, 5),
      location: e.location ?? "",
      name: e.notes ?? "",
      id: e.id,
      crew: crewFor(assignments, e.id),
    }));
}

export function ProjectDialog({
  clients,
  projectId,
  initial,
  trigger,
  open,
  onOpenChange,
  title,
}: {
  clients: { id: string; name: string }[];
  projectId?: string;
  initial?: Record<string, any>;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title?: string;
}) {
  const { data: allEvents = [] } = useProjectEvents(projectId);
  const { data: staff = [] } = useStaff();
  const { data: clientRows = [] } = useClients();
  const { data: allAssignments = [] } = useAssignments(projectId);
  const events = projectId ? allEvents : [];
  const assignments = projectId ? allAssignments : [];
  const saveProject = useUpsert("projects", "Project");
  const saveClient = useUpsert("clients", "Client");

  /** Quick-add a client from the project form and select them immediately. */
  const addClient = async (name: string, extra: Record<string, any>) => {
    const clean = name.trim();
    if (!clean) return null;
    const phone = String(extra.phone ?? "").trim();
    const id = await saveClient.mutateAsync({
      name: clean,
      phone: phone || null,
      whatsapp: phone ? waNumber(phone) : null,
      address: String(extra.address ?? "").trim() || null,
    });
    return (id as string) ?? null;
  };

  const saveEvent = useUpsert("project_events", "Event");
  const delEvent = useRemove("project_events", "Event");
  const saveAssignment = useUpsert("project_assignments", "Crew assignment");
  const delAssignment = useRemove("project_assignments", "Crew assignment");
  const savePayment = useUpsert("project_payments", "Payment");
  const { data: existingPayments = [] } = usePayments(projectId);
  const [rows, setRows] = useState<Record<string, Row>>(() => buildRows(events, assignments));
  const [customEvents, setCustomEvents] = useState<Row[]>(() => buildCustomRows(events, assignments));
  const [travel, setTravel] = useState<Travel>(() => buildTravel(initial));
  const [deliverables, setDeliverables] = useState<string[]>(() =>
    toDeliverables(initial?.deliverables),
  );
  const [packageId, setPackageId] = useState<string>(
    () => packageByName(initial?.package_name)?.id ?? "",
  );
  const [pkgOpen, setPkgOpen] = useState(false);

  const applyPackage = (id: string, set: (name: string, value: any) => void) => {
    setPackageId(id);
    const preset = findPackage(id);
    if (!preset) return;
    set("package_name", preset.label);
    set("total_amount", preset.amount);
    setDeliverables([...preset.items]);
  };


  const setItem = (index: number, value: string) =>
    setDeliverables((prev) => prev.map((v, i) => (i === index ? value : v)));
  const removeItem = (index: number) =>
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  const addItem = () => setDeliverables((prev) => [...prev, ""]);

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  const setCustomRow = (index: number, patch: Partial<Row>) =>
    setCustomEvents((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addCustomEvent = () => setCustomEvents((prev) => [...prev, emptyCustomRow()]);

  const removeCustomEvent = async (index: number) => {
    const row = customEvents[index];
    if (row?.id) {
      await delEvent.mutateAsync(row.id);
    }
    setCustomEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const firstEventDate = () => {
    const all = [
      ...Object.values(rows).filter((r) => r.enabled && r.date).map((r) => r.date),
      ...customEvents.filter((r) => r.enabled && r.date).map((r) => r.date),
    ].sort();
    return all[0];
  };

  const activeDates = () =>
    Object.entries(rows)
      .filter(([, r]) => r.enabled && r.date)
      .map(([key, r]) => ({ key, ...r }));

  const syncCrew = async (pid: string, eventId: string, crew: CrewMember[]) => {
    const current = assignments.filter((a) => a.event_id === eventId);
    for (const a of current) {
      if (!crew.some((c) => c.staffId === a.staff_id)) await delAssignment.mutateAsync(a.id);
    }
    for (const c of crew) {
      const existing = current.find((a) => a.staff_id === c.staffId);
      const member = staff.find((s) => s.id === c.staffId);
      const role = c.role ?? member?.role ?? null;
      if (existing && existing.role_in_project === role) continue;
      await saveAssignment.mutateAsync({
        ...(existing ? { id: existing.id } : {}),
        project_id: pid,
        event_id: eventId,
        staff_id: c.staffId,
        role_in_project: role,
      });
    }
  };

  const submit = async (values: Record<string, any>) => {
    const active = activeDates();
    const customActive = customEvents.filter((r) => r.enabled && r.date);
    const wedding = active.find((r) => r.key === "wedding_day");
    const allDates = [...active.map((r) => r.date), ...customActive.map((r) => r.date)]
      .filter(Boolean)
      .sort();
    const primaryDate = wedding?.date ?? allDates[0] ?? initial?.event_date ?? todayISO();

    const cleanItems = deliverables.map((d) => d.trim()).filter(Boolean);
    const id = await saveProject.mutateAsync({
      ...values,
      deliverables: cleanItems,
      travel_required: travel.travel_required,
      travel_booking_status: travel.travel_required ? travel.travel_booking_status : "not_needed",
      travel_mode: travel.travel_required ? travel.travel_mode || null : null,
      travel_notes: travel.travel_required ? travel.travel_notes || null : null,
      travel_ticket_path: travel.travel_required ? travel.travel_ticket_path : null,
      travel_ticket_name: travel.travel_required ? travel.travel_ticket_name : null,
      advance_date: values.advance_date || todayISO(),
      event_date: primaryDate,
      ...(projectId ? { id: projectId } : {}),
    });
    const pid = (projectId ?? id) as string;

    // Keep the advance in sync as the first received payment, credited to the chosen account.
    const advance = Number(values.advance_amount ?? 0);
    const logged = existingPayments.find((p) => (p.reference_no ?? "") === ADVANCE_REF);
    if (pid && advance > 0) {
      await savePayment.mutateAsync({
        ...(logged ? { id: logged.id } : {}),
        project_id: pid,
        payment_date: values.advance_date || todayISO(),
        amount: advance,
        payment_mode: modeForAccount(values.advance_account),
        account: values.advance_account ?? null,
        reference_no: ADVANCE_REF,
        notes: "Advance received on booking (auto-recorded)",
      });
    }


    for (const [key, row] of Object.entries(rows)) {
      if (row.enabled && row.date) {
        const evId = (await saveEvent.mutateAsync({
          ...(row.id ? { id: row.id } : {}),
          project_id: pid,
          event_type: key,
          event_date: row.date,
          event_time: row.time || null,
          location: row.location || null,
        })) as string;
        if (evId) await syncCrew(pid, evId, row.crew ?? []);
      } else if (row.id) {
        await delEvent.mutateAsync(row.id);
      }
    }

    for (const row of customEvents) {
      if (row.enabled && row.date) {
        const evId = (await saveEvent.mutateAsync({
          ...(row.id ? { id: row.id } : {}),
          project_id: pid,
          event_type: "custom",
          event_date: row.date,
          event_time: row.time || null,
          location: row.location || null,
          notes: row.name || "Custom event",
        })) as string;
        if (evId) await syncCrew(pid, evId, row.crew ?? []);
      } else if (row.id) {
        await delEvent.mutateAsync(row.id);
      }
    }

    if (!projectId) {
      setRows(buildRows([]));
      setCustomEvents([]);
    }
  };

  return (
    <RecordDialog
      title={title ?? (projectId ? "Edit project" : "New project")}
      fields={projectFields(clients, addClient)}
      initial={{ ...initial, advance_date: initial?.advance_date ?? todayISO() }}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onReset={() => {
        setRows(buildRows(events, assignments));
        setCustomEvents(buildCustomRows(events, assignments));
        setTravel(buildTravel(initial));
        setDeliverables(toDeliverables(initial?.deliverables));
        setPackageId(packageByName(initial?.package_name)?.id ?? "");
      }}
      onSubmit={submit}
      extra={(values, set) => {
        const client = clientRows.find((c) => c.id === values.client_id);
        const total = Number(values.total_amount ?? 0);
        const advance = Number(values.advance_amount ?? 0);
        return (
        <>
        <div className="mb-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <PackageIcon className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Package Details &amp; Deliverables</p>
          </div>
          <div className="mb-3">
            <Label htmlFor="pkg-combo" className="mb-1.5 block text-xs font-medium">
              Package
            </Label>
            <div className="relative">
              <Input
                id="pkg-combo"
                autoComplete="off"
                value={values.package_name ?? ""}
                placeholder="Choose or type a package e.g. ₹70,000 — Photography"
                onChange={(e) => {
                  const text = e.target.value;
                  set("package_name", text);
                  setPkgOpen(true);
                  const amount = parseAmount(text);
                  if (amount !== null) set("total_amount", amount);
                }}
                onFocus={() => setPkgOpen(true)}
                onBlur={() => window.setTimeout(() => setPkgOpen(false), 150)}
              />
              {pkgOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
                  {matchPackages(values.package_name).length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      No preset match — your typed package is kept as-is.
                    </p>
                  ) : (
                    matchPackages(values.package_name).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          applyPackage(p.id, set);
                          setPkgOpen(false);
                        }}
                      >
                        {p.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a package to fill deliverables, then edit the text (e.g. ₹80,000) right here — the
              amount saved follows what you type.
            </p>
          </div>


          <div className="space-y-2">
            {deliverables.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No deliverables yet — pick a package or add items manually.
              </p>
            )}
            {deliverables.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item}
                  placeholder="e.g. 80 page album"
                  onChange={(e) => setItem(index, e.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  aria-label="Remove deliverable"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-1 border-dashed text-primary hover:bg-primary/5 hover:text-primary"
              onClick={addItem}
            >
              <Plus className="h-4 w-4" />
              Add Extra Deliverable
            </Button>
          </div>
        </div>
        <div className="mb-3 rounded-xl border border-border bg-success/5 p-3">
          <p className="mb-2 text-sm font-semibold">Booking confirmation &amp; receipt</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Sends the client a formatted receipt with package amount, advance paid and balance payable.
          </p>
          <BookingReceiptButton
            className="w-full"
            data={{
              clientName: client?.name,
              clientPhone: client?.whatsapp ?? client?.phone,
              projectName: values.project_name,
              eventDate: firstEventDate() ?? initial?.event_date,
              venue: values.venue,
              total,
              advance,
              balance: Math.max(total - advance, 0),
              packageName: values.package_name,
              services: deliverables.map((d) => d.trim()).filter(Boolean),
            }}
          />
        </div>
        <div className="mb-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Travel &amp; Booking Details</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5">
              <Label htmlFor="travel-required" className="text-xs font-medium">
                Travel required?
              </Label>
              <Switch
                id="travel-required"
                checked={travel.travel_required}
                onCheckedChange={(v) => setTravel((p) => ({ ...p, travel_required: v }))}
              />
            </div>
            {travel.travel_required && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">Booking status</Label>
                  <Select
                    value={travel.travel_booking_status}
                    onValueChange={(v) => setTravel((p) => ({ ...p, travel_booking_status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {BOOKING_STATUS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">Mode of travel</Label>
                  <Select
                    value={travel.travel_mode}
                    onValueChange={(v) => setTravel((p) => ({ ...p, travel_mode: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {TRAVEL_MODES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs font-medium">Ticket notes / PNR details</Label>
                  <Textarea
                    placeholder="Train name / number, PNR, departure & arrival time, seat details…"
                    value={travel.travel_notes}
                    onChange={(e) => setTravel((p) => ({ ...p, travel_notes: e.target.value }))}
                  />
                </div>
                <TicketUpload
                  path={travel.travel_ticket_path}
                  name={travel.travel_ticket_name}
                  projectId={projectId}
                  onChange={({ path, name }) =>
                    setTravel((p) => ({ ...p, travel_ticket_path: path, travel_ticket_name: name }))
                  }
                />

              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Sub-events &amp; dates</p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Turn on each function and set its own date — every one appears on the dashboard and calendar.
          </p>
          <div className="space-y-2">
            {SUB_EVENTS.map((s) => {
              const row = rows[s.type] ?? emptyRow();
              return (
                <div key={s.type} className="rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`ev-${s.type}`} className="text-xs font-medium">
                      {s.label}
                    </Label>
                    <Switch
                      id={`ev-${s.type}`}
                      checked={row.enabled}
                      onCheckedChange={(v) => setRow(s.type, { enabled: v })}
                    />
                  </div>
                  {row.enabled && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => setRow(s.type, { date: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={row.time}
                        onChange={(e) => setRow(s.type, { time: e.target.value })}
                      />
                      <Input
                        className="sm:col-span-2"
                        placeholder="Venue / location"
                        value={row.location}
                        onChange={(e) => setRow(s.type, { location: e.target.value })}
                      />
                      <div className="sm:col-span-2">
                        <CrewPicker
                          staff={staff}
                          value={row.crew ?? []}
                          onChange={(crew) => setRow(s.type, { crew })}
                          date={row.date}
                          time={row.time}
                          eventId={row.id}
                          projectId={projectId}
                        />

                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {customEvents.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold text-primary">Custom events</p>
                <div className="space-y-2">
                  {customEvents.map((row, index) => (
                    <div key={index} className="rounded-lg border border-border bg-card p-2.5">
                      <div className="mb-2 flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Event name (e.g. Sangeet, Family Dinner)"
                          value={row.name ?? ""}
                          onChange={(e) => setCustomRow(index, { name: e.target.value })}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-destructive"
                          onClick={() => removeCustomEvent(index)}
                          disabled={delEvent.isPending}
                          aria-label="Remove custom event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => setCustomRow(index, { date: e.target.value })}
                        />
                        <Input
                          type="time"
                          value={row.time}
                          onChange={(e) => setCustomRow(index, { time: e.target.value })}
                        />
                        <Input
                          className="sm:col-span-2"
                          placeholder="Venue / location"
                          value={row.location}
                          onChange={(e) => setCustomRow(index, { location: e.target.value })}
                        />
                        <div className="sm:col-span-2">
                          <CrewPicker
                            staff={staff}
                            value={row.crew ?? []}
                            onChange={(crew) => setCustomRow(index, { crew })}
                            date={row.date}
                            time={row.time}
                            eventId={row.id}
                            projectId={projectId}
                          />

                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="mt-1 w-full gap-1 border-dashed text-primary hover:bg-primary/5 hover:text-primary"
              onClick={addCustomEvent}
            >
              <Plus className="h-4 w-4" />
              Add Custom Event
            </Button>
          </div>
        </div>
        </>
        );
      }}
    />
  );
}
