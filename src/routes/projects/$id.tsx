import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Plus,
  Printer,
  Trash2,
  CheckCircle2,
  Pencil,
  FileDown,
  Send,
  HardDrive,
} from "lucide-react";
import { BankAccountField, needsBankAccount } from "@/components/BankAccountField";
import { crewRoleOptions } from "@/lib/roles";

import {
  buildDateBlockMessage,
  buildEventReminderMessage,
  sendWhatsApp,
  type CrewAssignment,
  type CrewGroup,
} from "@/lib/crew-notify";
import { BookingReceiptButton } from "@/components/BookingReceiptButton";
import { toDeliverables } from "@/lib/packages";
import { AppShell } from "@/components/AppShell";
import { PostProduction } from "@/components/PostProduction";

import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { RecordDialog, type Field } from "@/components/RecordDialog";
import { Button } from "@/components/ui/button";

import { DrivePicker } from "@/components/DrivePicker";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAssignments,
  useClients,
  useDeliveries,
  useExpenses,
  usePayments,
  useProject,
  useProjectEvents,
  useRemove,
  useSettings,
  useStaff,
  useTasks,
  useUpsert,
} from "@/lib/db";
import { digitsOnly, fmtDate, inr, todayISO } from "@/lib/format";
import { exportPdf } from "@/lib/exporters";
import { downloadElementPdf } from "@/lib/pdf";
import { EventSchedule } from "@/components/EventSchedule";
import { WorkBrief } from "@/components/WorkBrief";
import { BookingAgreement, agreementShareText, agreementWaLink } from "@/components/BookingAgreement";
import { sharePdfViaWhatsApp } from "@/lib/pdf-share";

import { buildScheduleMessage, openWhatsApp } from "@/lib/whatsapp";
import { ProjectDialog } from "@/components/ProjectDialog";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project details — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content:
          "Full wedding project view: payments, expenses, tasks, assigned crew, timeline, checklist and delivery.",
      },
      { property: "og:title", content: "Project details — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Payments, expenses, tasks, crew and delivery for a single wedding project.",
      },
    ],
  }),
  component: ProjectDetail,
});

const PAY_MODES = ["cash", "upi", "bank", "cheque", "card"].map((v) => ({ value: v, label: v }));
const EXPENSE_CATEGORIES = [
  "Editing Expense",
  "Album Cost",
  "Staff Payment Expense",
  "Travel Expense",
  "Equipment Rent",
  "Food",
  "Other",
].map((v) => ({ value: v, label: v }));

const WORKFLOW = [
  { key: "raw_backup_done", label: "Raw data backed up" },
  { key: "photo_selection_done", label: "Photo selection done" },
  { key: "album_editing_done", label: "Album editing" },
  { key: "video_editing_done", label: "Video editing" },
  { key: "album_printed", label: "Album printed" },
  { key: "final_delivery_done", label: "Final delivery" },
];

function ProjectDetail() {
  const { id } = useParams({ from: "/projects/$id" });
  const { data: project, isLoading } = useProject(id);
  const { data: clients = [] } = useClients();
  const { data: payments = [] } = usePayments(id);
  const { data: expenses = [] } = useExpenses(id);
  const { data: tasks = [] } = useTasks(id);
  const { data: staff = [] } = useStaff();
  const { data: assignments = [] } = useAssignments(id);
  const { data: deliveries = [] } = useDeliveries(id);
  const { data: events = [] } = useProjectEvents(id);

  const notifyCrew = async (a: CrewAssignment, kind: "block" | "reminder") => {
    const mine = (assignments as CrewAssignment[]).filter(
      (x) => x.staff_id === a.staff_id && (kind === "block" ? true : x.id === a.id),
    );
    const rows = mine
      .map((x) => {
        const ev = events.find((v) => v.id === x.event_id);
        return ev ? { assignmentId: x.id, event: ev, role: x.role_in_project ?? null } : null;
      })
      .filter(Boolean) as CrewGroup["rows"];
    if (rows.length === 0) return;
    const group: CrewGroup = {
      key: a.id,
      staffId: a.staff_id,
      staffName: a.staff?.name ?? "Crew",
      phone: (a.staff as any)?.whatsapp ?? a.staff?.phone ?? null,
      projectId: id,
      projectName: project?.project_name ?? "Project",
      clientName: project?.clients?.name ?? "Client",
      project,
      rows,
      assignmentIds: rows.map((r) => r.assignmentId),
      sent: false,
    };
    const business = settings?.business_name ?? "JOG MEDIA";
    sendWhatsApp(
      group,
      kind === "block"
        ? buildDateBlockMessage(group, business, settings?.phone)
        : buildEventReminderMessage(group, business, settings?.phone),
    );
    const field = kind === "block" ? "block_sent_at" : "reminder_sent_at";
    for (const aid of group.assignmentIds) {
      await saveAssignment.mutateAsync({ id: aid, [field]: new Date().toISOString() });
    }
  };

  const { data: settings } = useSettings();

  const saveProject = useUpsert("projects", "Project");
  const savePayment = useUpsert("project_payments", "Payment");
  const saveExpense = useUpsert("project_expenses", "Expense");
  const saveTask = useUpsert("project_tasks", "Task");
  const saveAssignment = useUpsert("project_assignments", "Crew assignment");
  const saveDelivery = useUpsert("delivery_records", "Delivery");
  const saveEvent = useUpsert("project_events", "Event");
  const delEvent = useRemove("project_events", "Event");
  const delPayment = useRemove("project_payments", "Payment");
  const delExpense = useRemove("project_expenses", "Expense");
  const delTask = useRemove("project_tasks", "Task");
  const delAssignment = useRemove("project_assignments", "Crew assignment");
  const delDelivery = useRemove("delivery_records", "Delivery");

  const [editOpen, setEditOpen] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [driveEdit, setDriveEdit] = useState<string | null>(null);
  const drive = driveEdit ?? project?.backup_drive ?? "";
  const setDrive = (v: string) => setDriveEdit(v);


  const totals = useMemo(() => {
    const received = payments.reduce((a, p) => a + Number(p.amount ?? 0), 0);
    const spent = expenses.reduce((a, e) => a + Number(e.amount ?? 0), 0);
    return { received, spent, profit: received - spent };
  }, [payments, expenses]);

  if (isLoading) return <AppShell><EmptyState message="Loading project…" /></AppShell>;
  if (!project) return <AppShell><EmptyState message="Project not found." /></AppShell>;

  const phone = digitsOnly(project.clients?.phone);
  const wa = digitsOnly(project.clients?.whatsapp ?? project.clients?.phone);

  const checklist = [
    { label: "Shoot", value: project.shoot_status },
    { label: "Editing", value: project.editing_status },
    { label: "Album", value: project.album_status },
    { label: "Delivery", value: project.delivery_status },
  ];

  const timeline = [
    { date: project.created_at?.slice(0, 10), label: "Project created" },
    { date: project.event_date, label: "Event day" },
    ...payments.map((p) => ({ date: p.payment_date, label: `Payment received ${inr(p.amount)}` })),
    ...expenses.map((e) => ({ date: e.expense_date, label: `${e.category} expense ${inr(e.amount)}` })),
    ...deliveries.map((d) => ({ date: d.delivery_date ?? "", label: `Delivered: ${d.delivery_type}` })),
  ]
    .filter((t) => t.date)
    .sort((a, b) => (a.date! < b.date! ? 1 : -1));

  return (
    <AppShell>
      <Link to="/projects" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> All projects
      </Link>

      <PageHeader
        title={project.project_name}
        subtitle={`${project.clients?.name ?? "—"} · ${fmtDate(project.event_date)} · ${project.venue ?? "Venue TBD"} · ${project.package_name ?? "No package"}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportPdf("invoice-print", "Invoice")}>
              <Printer className="mr-1.5 h-4 w-4" /> Invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadElementPdf("work-brief", `Jog Media Event Brief - ${project.project_name}`)
              }
            >
              <FileDown className="mr-1.5 h-4 w-4" /> Work Brief PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadElementPdf(
                  "booking-agreement",
                  `Jog Media Booking Agreement - ${project.project_name}`,
                )
              }
            >
              <FileDown className="mr-1.5 h-4 w-4" /> Download PDF
            </Button>
            <Button
              size="sm"
              className="bg-[#25D366] text-white hover:bg-[#1EB855]"
              onClick={() =>
                sharePdfViaWhatsApp({
                  elementId: "booking-agreement",
                  filename: `Jog Media Booking Agreement - ${project.project_name}`,
                  text: agreementShareText(
                    project.clients?.name,
                    settings?.business_name ?? "JOG MEDIA",
                  ),
                  waLink: agreementWaLink(
                    project.clients?.whatsapp ?? project.clients?.phone,
                    project.clients?.name,
                    settings?.business_name ?? "JOG MEDIA",
                  ),
                })
              }
            >
              <Send className="mr-1.5 h-4 w-4" /> Share via WhatsApp
            </Button>

            <Button
              size="sm"
              onClick={() =>
                openWhatsApp(
                  project.clients?.whatsapp ?? project.clients?.phone,
                  buildScheduleMessage(
                    project.clients?.name ?? "Client",
                    events,
                    settings?.business_name ?? "JOG MEDIA",
                    settings?.phone,
                  ),
                )
              }
            >
              <Send className="mr-1.5 h-4 w-4" /> Share Schedule
            </Button>
            <BookingReceiptButton
              data={{
                clientName: project.clients?.name,
                clientPhone: project.clients?.whatsapp ?? project.clients?.phone,
                projectName: project.project_name,
                eventDate: project.event_date,
                venue: project.venue,
                total: project.total_amount,
                advance: totals.received,
                balance: project.balance_due,
                packageName: project.package_name,
                services: toDeliverables((project as any).deliverables),
              }}
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Agreed amount" value={inr(project.total_amount)} />
        <StatCard label="Received" value={inr(totals.received)} tone="success" />
        <StatCard label="Balance due" value={inr(project.balance_due)} tone={Number(project.balance_due) > 0 ? "destructive" : "success"} />
        <StatCard label="Project profit" value={inr(totals.profit)} tone={totals.profit >= 0 ? "success" : "destructive"} hint={`Expenses ${inr(totals.spent)}`} />
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&_button]:w-full [&_button]:h-11 sm:[&_button]:w-auto sm:[&_button]:h-9">
        <Button size="sm" variant="outline" asChild>
          <a href={`tel:${phone}`}>
            <Phone className="mr-1.5 h-4 w-4" /> Call
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
          </a>
        </Button>
        <RecordDialog
          title="Add payment"
          fields={[
            { name: "payment_date", label: "Date", type: "date", required: true },
            { name: "amount", label: "Amount", type: "number", required: true },
            { name: "payment_mode", label: "Mode", type: "select", options: PAY_MODES, required: true },
            { name: "reference_no", label: "Reference no." },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initial={{ payment_date: todayISO(), payment_mode: "cash" }}
          extra={(values, set) =>
            needsBankAccount(values.payment_mode) ? (
              <BankAccountField
                value={values.bank_account_id ?? null}
                onChange={(v) => set("bank_account_id", v)}
              />
            ) : null
          }
          onSubmit={(v) =>
            savePayment.mutateAsync({
              ...v,
              project_id: id,
              bank_account_id: needsBankAccount(v.payment_mode) ? (v.bank_account_id ?? null) : null,
            })
          }
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add payment
            </Button>
          }
        />

        <RecordDialog
          title="Add expense"
          fields={[
            { name: "expense_date", label: "Date", type: "date", required: true },
            { name: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES, required: true },
            { name: "amount", label: "Amount", type: "number", required: true },
            { name: "paid_to", label: "Paid to" },
            { name: "payment_mode", label: "Mode", type: "select", options: PAY_MODES },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initial={{ expense_date: todayISO(), payment_mode: "cash" }}
          onSubmit={(v) => saveExpense.mutateAsync({ ...v, project_id: id })}
          trigger={
            <Button size="sm" variant="secondary">
              <Plus className="mr-1.5 h-4 w-4" /> Add expense
            </Button>
          }
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            saveProject.mutate({
              id,
              delivery_status: "delivered",
              project_status: "completed",
              album_status: "completed",
            })
          }
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark delivery complete
        </Button>
      </div>

      <PostProduction project={project} onSave={(v: Record<string, unknown>) => saveProject.mutateAsync(v)} />

      {/* Checklist */}

      <div className="surface mb-6 p-4">
        <p className="mb-3 text-sm font-semibold">Production checklist</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {checklist.map((c) => (
            <div key={c.label} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <div className="mt-1.5">
                <StatusBadge value={c.value} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Post-production workflow */}
      <div className="surface mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Post-production workflow</p>
          <p className="text-xs text-muted-foreground">
            Balance {inr(project.balance_due)}
            {project.payment_due_date ? ` · due ${fmtDate(project.payment_due_date)}` : ""}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {WORKFLOW.map((w) => {
            const done = Boolean((project as any)[w.key]);
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => saveProject.mutate({ id, [w.key]: !done })}
                className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-left text-xs transition-colors ${
                  done ? "border-success/40 bg-success/10 text-success" : "border-border hover:bg-muted/60"
                }`}
              >
                <span className="font-medium">{w.label}</span>
                <CheckCircle2 className={`h-4 w-4 ${done ? "" : "text-muted-foreground/40"}`} />
              </button>
            );
          })}
        </div>
        <div className="mt-3 border-t border-border pt-3">
          {(project.backup_drive ?? "").trim() ? (
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success">
              <HardDrive className="h-3.5 w-3.5" /> Backup Location: {project.backup_drive}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <DrivePicker className="flex-1" value={drive} onChange={setDrive} />
            <Button
              variant="outline"
              className="h-9 shrink-0"
              disabled={saveProject.isPending || drive === (project.backup_drive ?? "")}
              onClick={() => saveProject.mutate({ id, backup_drive: drive.trim() || null })}
            >
              Save drive
            </Button>
          </div>

        </div>
      </div>


      <Tabs defaultValue="schedule">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <EventSchedule
            project={project}
            events={events}
            staff={staff}
            assignments={assignments}
            settings={settings}
            onSaveEvent={(v) => saveEvent.mutateAsync({ ...v, project_id: id })}
            onDeleteEvent={(eid) => delEvent.mutate(eid)}
            onAssign={(v) => saveAssignment.mutateAsync({ ...v, project_id: id })}
            onUnassign={(aid) => delAssignment.mutate(aid)}
          />
        </TabsContent>

        <TabsContent value="payments">
          <div className="surface divide-y divide-border">
            {payments.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No payments yet.</p>}
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{inr(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(p.payment_date)} · {p.payment_mode} {p.reference_no ? `· ${p.reference_no}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setReceipt(p)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => delPayment.mutate(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="surface divide-y divide-border">
            {expenses.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No expenses yet.</p>}
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">
                    {e.category} — {inr(e.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(e.expense_date)} {e.paid_to ? `· ${e.paid_to}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => delExpense.mutate(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="mb-3">
            <RecordDialog
              title="Add task"
              fields={[
                { name: "task_name", label: "Task", required: true, full: true },
                { name: "due_date", label: "Due date", type: "date" },
                {
                  name: "task_status",
                  label: "Status",
                  type: "select",
                  options: ["pending", "in_progress", "done"].map((v) => ({ value: v, label: v })),
                },
                {
                  name: "assigned_to",
                  label: "Assign to",
                  type: "select",
                  options: staff.map((s) => ({ value: s.id, label: s.name })),
                },
              ]}
              initial={{ task_status: "pending" }}
              onSubmit={(v) => saveTask.mutateAsync({ ...v, project_id: id })}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add task
                </Button>
              }
            />
          </div>
          <div className="surface divide-y divide-border">
            {tasks.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No tasks yet.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{t.task_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {fmtDate(t.due_date)} {t.staff?.name ? `· ${t.staff.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={t.task_status} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveTask.mutate({ id: t.id, task_status: t.task_status === "done" ? "pending" : "done" })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => delTask.mutate(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="crew">
          <div className="mb-3">
            <RecordDialog
              title="Assign crew"
              fields={[
                {
                  name: "staff_id",
                  label: "Staff member",
                  type: "select",
                  required: true,
                  options: staff.map((s) => ({ value: s.id, label: s.name })),
                },
                {
                  name: "role_in_project",
                  label: "Role in project",
                  type: "select",
                  options: crewRoleOptions,
                  allowCustom: true,
                  placeholder: "Select role",
                },
              ]}
              onSubmit={(v) => saveAssignment.mutateAsync({ ...v, project_id: id })}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Assign crew
                </Button>
              }
            />
          </div>
          <div className="surface divide-y divide-border">
            {assignments.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nobody assigned yet.</p>
            )}
            {assignments.map((a) => {
              const an = a as CrewAssignment;
              return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{a.staff?.name}</p>
                  <p className="text-xs text-muted-foreground">{a.role_in_project ?? "Crew"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge value={an.block_sent_at ? "dates sent" : "dates pending"} />
                  <Button size="sm" variant="outline" onClick={() => notifyCrew(an, "block")}>
                    <Send className="mr-1.5 h-4 w-4" /> Send WhatsApp Schedule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => notifyCrew(an, "reminder")}>
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Send Reminder
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => delAssignment.mutate(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );})}
          </div>
        </TabsContent>

        <TabsContent value="delivery">
          <div className="mb-3">
            <RecordDialog
              title="Add delivery record"
              fields={[
                {
                  name: "delivery_type",
                  label: "Delivery type",
                  type: "select",
                  required: true,
                  options: ["Photos", "Video", "Album", "Pen drive", "Online gallery"].map((v) => ({
                    value: v,
                    label: v,
                  })),
                },
                { name: "delivery_date", label: "Delivery date", type: "date" },
                { name: "file_link", label: "File link", full: true },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              initial={{ delivery_date: todayISO() }}
              onSubmit={(v) => saveDelivery.mutateAsync({ ...v, project_id: id })}
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add delivery
                </Button>
              }
            />
          </div>
          <div className="surface divide-y divide-border">
            {deliveries.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nothing delivered yet.</p>
            )}
            {deliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{d.delivery_type}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(d.delivery_date)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => delDelivery.mutate(d.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <div className="surface p-4">
            <ol className="relative border-l border-border pl-5">
              {timeline.map((t, i) => (
                <li key={i} className="mb-4 last:mb-0">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(t.date!)}</p>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>
      </Tabs>

      <div id="work-brief" className="hidden">
        <WorkBrief
          settings={settings}
          project={project}
          events={events}
          crew={assignments.map((a) => ({
            name: a.staff?.name ?? "—",
            role: a.role_in_project,
            eventId: a.event_id ?? null,
          }))}
        />
      </div>

      <div id="booking-agreement" className="hidden">
        <BookingAgreement
          settings={settings}
          project={project}
          events={events}
          advance={totals.received}
        />
      </div>

      {/* Printable invoice */}
      <div id="invoice-print" className="hidden">
        <PrintDoc
          heading="INVOICE"
          settings={settings}
          project={project}
          lines={[
            { label: project.package_name ?? "Wedding coverage package", amount: Number(project.total_amount) },
          ]}
          footer={[
            { label: "Received", amount: totals.received },
            { label: "Balance due", amount: Number(project.balance_due) },
          ]}
        />
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5">
            <div id="receipt-print">
              <PrintDoc
                heading="PAYMENT RECEIPT"
                settings={settings}
                project={project}
                lines={[
                  {
                    label: `Payment on ${fmtDate(receipt.payment_date)} (${receipt.payment_mode})`,
                    amount: Number(receipt.amount),
                  },
                ]}
                footer={[{ label: "Balance due", amount: Number(project.balance_due) }]}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2 no-print">
              <Button variant="outline" onClick={() => setReceipt(null)}>
                Close
              </Button>
              <Button onClick={() => exportPdf("receipt-print", "Receipt")}>
                <Printer className="mr-1.5 h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProjectDialog
        title="Edit project"
        clients={clients}
        projectId={id}
        initial={project as any}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </AppShell>
  );
}

function PrintDoc({
  heading,
  settings,
  project,
  lines,
  footer,
}: {
  heading: string;
  settings: any;
  project: any;
  lines: { label: string; amount: number }[];
  footer: { label: string; amount: number }[];
}) {
  return (
    <div className="text-sm">
      <div className="mb-4 border-b border-border pb-3">
        <p className="font-display text-2xl font-semibold">{settings?.business_name ?? "JOG MEDIA"}</p>
        <p className="text-xs text-muted-foreground">{settings?.address ?? "Kozhikode, Kerala, India"}</p>
        {settings?.phone && <p className="text-xs text-muted-foreground">{settings.phone}</p>}
      </div>
      <p className="mb-3 font-semibold tracking-wide">{heading}</p>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Client</p>
          <p className="font-medium">{project.clients?.name ?? "—"}</p>
          <p>{project.clients?.phone ?? ""}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Project</p>
          <p className="font-medium">{project.project_name}</p>
          <p>Event {fmtDate(project.event_date)}</p>
        </div>
      </div>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-y border-border">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-border">
              <td className="py-2">{l.label}</td>
              <td className="py-2 text-right">{inr(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {toDeliverables(project.deliverables).length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold tracking-wide">PACKAGE DETAILS &amp; DELIVERABLES</p>
          {project.package_name && (
            <p className="mb-1 text-xs font-medium">{project.package_name}</p>
          )}
          <ul className="grid grid-cols-2 gap-x-4 text-xs">
            {toDeliverables(project.deliverables).map((d: string, i: number) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 space-y-1 text-xs">
        {footer.map((f, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-semibold">{inr(f.amount)}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[10px] text-muted-foreground">
        Thank you for choosing {settings?.business_name ?? "JOG MEDIA"}.
      </p>
    </div>
  );
}
