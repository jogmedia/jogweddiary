import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  project_name: string;
  event_date: string;
  venue: string | null;
  package_name: string | null;
  deliverables?: string[] | null;
  total_amount: number;
  advance_amount: number;
  advance_account?: string | null;
  balance_due: number;
  payment_due_date: string | null;
  payment_status: string;
  raw_backup_done?: boolean;
  backup_drive?: string | null;
  backup_folder?: string | null;

  photo_selection_done?: boolean;
  album_editing_done?: boolean;
  video_editing_done?: boolean;
  album_printed?: boolean;
  final_delivery_done?: boolean;
  project_status: string;
  shoot_status: string;
  editing_status: string;
  album_status: string;
  delivery_status: string;
  notes: string | null;
  travel_required?: boolean | null;
  travel_booking_status?: string | null;
  travel_mode?: string | null;
  travel_notes?: string | null;
  travel_ticket_path?: string | null;
  travel_ticket_name?: string | null;
  created_at: string;
  clients?: Client | null;
};

export type Payment = {
  id: string;
  project_id: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  account?: string | null;
  reference_no: string | null;
  received_by: string | null;
  notes: string | null;
  projects?: { project_name: string; clients?: { name: string } | null } | null;
};

export type Expense = {
  id: string;
  project_id: string | null;
  expense_date: string;
  category: string;
  amount: number;
  paid_to: string | null;
  payment_mode: string | null;
  notes: string | null;
  projects?: { project_name: string } | null;
};

export type Task = {
  id: string;
  project_id: string;
  task_name: string;
  task_status: string;
  due_date: string | null;
  assigned_to: string | null;
  projects?: { project_name: string } | null;
  staff?: { name: string } | null;
};

export type Staff = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  role: string;
  active_status: boolean;
};

export type ProjectEvent = {
  id: string;
  project_id: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  arrival_time: string | null;
  muhurtham_time: string | null;
  location: string | null;
  google_maps_link: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  notes: string | null;
  projects?: { project_name: string; clients?: Client | null } | null;
};

export type Assignment = {
  id: string;
  project_id: string;
  event_id?: string | null;
  staff_id: string;
  role_in_project: string | null;
  staff?: Staff | null;
  projects?: { project_name: string } | null;
};

export type Delivery = {
  id: string;
  project_id: string;
  delivery_type: string;
  delivery_date: string | null;
  file_link: string | null;
  delivered_by: string | null;
  notes: string | null;
  projects?: { project_name: string; clients?: { name: string } | null } | null;
};

export type Account = {
  id: string;
  account_code: string | null;
  account_name: string;
  account_type: string;
  is_cash: boolean;
  is_active: boolean;
};

export type JournalEntry = {
  id: string;
  entry_date: string;
  reference_no: string | null;
  memo: string | null;
  source_type: string | null;
  journal_entry_lines?: JournalLine[];
};

export type JournalLine = {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit: number;
  credit: number;
  project_id: string | null;
  chart_of_accounts?: Account | null;
};

export type LedgerTxn = {
  id: string;
  account_id: string | null;
  project_id: string | null;
  transaction_date: string;
  amount: number;
  is_cash: boolean;
  notes: string | null;
  chart_of_accounts?: Account | null;
  projects?: { project_name: string } | null;
};

export type ActivityRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

const anyDb = supabase as unknown as {
  from: (t: string) => any;
};

async function fetchList<T>(
  table: string,
  select: string,
  order?: { column: string; ascending?: boolean },
): Promise<T[]> {
  let q = anyDb.from(table).select(select);
  if (order) q = q.order(order.column, { ascending: order.ascending ?? false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export function logActivity(action: string, entityType: string, entityId?: string, details?: string) {
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    anyDb
      .from("activity_log")
      .insert({
        user_id: data.user.id,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        details: details ?? null,
      })
      .then(() => {});
  });
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: () => fetchList<Client>("clients", "*", { column: "created_at" }),
  });

export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () =>
      fetchList<Project>("projects", "*, clients(*)", { column: "event_date", ascending: false }),
  });

export const useProject = (id: string) =>
  useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await anyDb.from("projects").select("*, clients(*)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
  });

export const usePayments = (projectId?: string) =>
  useQuery({
    queryKey: ["payments", projectId ?? "all"],
    queryFn: async () => {
      let q = anyDb
        .from("project_payments")
        .select("*, projects(project_name, clients(name))")
        .order("payment_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

export const useExpenses = (projectId?: string) =>
  useQuery({
    queryKey: ["expenses", projectId ?? "all"],
    queryFn: async () => {
      let q = anyDb
        .from("project_expenses")
        .select("*, projects(project_name)")
        .order("expense_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });

export const useTasks = (projectId?: string) =>
  useQuery({
    queryKey: ["tasks", projectId ?? "all"],
    queryFn: async () => {
      let q = anyDb
        .from("project_tasks")
        .select("*, projects(project_name), staff(name)")
        .order("due_date", { ascending: true });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

export const useStaff = () =>
  useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchList<Staff>("staff", "*", { column: "created_at" }),
  });

export const useAssignments = (projectId?: string) =>
  useQuery({
    queryKey: ["assignments", projectId ?? "all"],
    queryFn: async () => {
      let q = anyDb.from("project_assignments").select("*, staff(*), projects(project_name)");
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

export const useProjectEvents = (projectId?: string) =>
  useQuery({
    queryKey: ["project_events", projectId ?? "all"],
    queryFn: async () => {
      let q = anyDb
        .from("project_events")
        .select("*, projects(project_name, clients(*))")
        .order("event_date", { ascending: true });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProjectEvent[];
    },
  });

export const useDeliveries = (projectId?: string) =>
  useQuery({
    queryKey: ["deliveries", projectId ?? "all"],
    queryFn: async () => {
      let q = anyDb
        .from("delivery_records")
        .select("*, projects(project_name, clients(name))")
        .order("delivery_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Delivery[];
    },
  });

export const useAccounts = () =>
  useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchList<Account>("chart_of_accounts", "*", { column: "account_code", ascending: true }),
  });

export const useJournalEntries = () =>
  useQuery({
    queryKey: ["journal_entries"],
    queryFn: () =>
      fetchList<JournalEntry>(
        "journal_entries",
        "*, journal_entry_lines(*, chart_of_accounts(*))",
        { column: "entry_date" },
      ),
  });

export const useIncomeTxns = () =>
  useQuery({
    queryKey: ["income_transactions"],
    queryFn: () =>
      fetchList<LedgerTxn>("income_transactions", "*, chart_of_accounts(*), projects(project_name)", {
        column: "transaction_date",
      }),
  });

export const useExpenseTxns = () =>
  useQuery({
    queryKey: ["expense_transactions"],
    queryFn: () =>
      fetchList<LedgerTxn>("expense_transactions", "*, chart_of_accounts(*), projects(project_name)", {
        column: "transaction_date",
      }),
  });

export const useAssets = () =>
  useQuery({ queryKey: ["assets"], queryFn: () => fetchList<any>("assets", "*, chart_of_accounts(*)") });

export const useLiabilities = () =>
  useQuery({
    queryKey: ["liabilities"],
    queryFn: () => fetchList<any>("liabilities", "*, chart_of_accounts(*)"),
  });

export const useEquityTxns = () =>
  useQuery({
    queryKey: ["equity_transactions"],
    queryFn: () => fetchList<any>("equity_transactions", "*, chart_of_accounts(*)"),
  });

export const useActivity = () =>
  useQuery({
    queryKey: ["activity_log"],
    queryFn: () => fetchList<ActivityRow>("activity_log", "*", { column: "created_at" }),
  });

export const useSettings = () =>
  useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await anyDb.from("app_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

const RELATED: Record<string, string[]> = {
  project_payments: ["payments", "projects", "project", "income_transactions", "activity_log"],
  project_expenses: ["expenses", "projects", "project", "expense_transactions", "activity_log"],
  projects: ["projects", "project", "activity_log"],
  clients: ["clients", "projects", "activity_log"],
  project_tasks: ["tasks", "activity_log"],
  staff: ["staff", "assignments", "activity_log"],
  project_assignments: ["assignments", "activity_log"],
  project_events: ["project_events", "activity_log"],
  delivery_records: ["deliveries", "projects", "project", "activity_log"],
  chart_of_accounts: ["accounts", "activity_log"],
  journal_entries: ["journal_entries", "activity_log"],
  assets: ["assets", "activity_log"],
  liabilities: ["liabilities", "activity_log"],
  equity_transactions: ["equity_transactions", "activity_log"],
  income_transactions: ["income_transactions", "activity_log"],
  expense_transactions: ["expense_transactions", "activity_log"],
  app_settings: ["app_settings"],
};

function useInvalidate() {
  const qc = useQueryClient();
  return (table: string) => {
    (RELATED[table] ?? [table]).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
}

/** Removes joined relation objects and read-only columns before writing. */
function sanitize(values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (k === "created_at" || k === "updated_at") continue;
    // nested relation payloads (e.g. `clients`, `projects`, `staff`) are not columns
    if (v !== null && typeof v === "object") continue;
    out[k] = v;
  }
  return out;
}

export function useUpsert(table: string, label: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { id, ...raw } = values as { id?: string };
      const rest = sanitize(raw);
      if (id) {
        const { error } = await anyDb.from(table).update(rest).eq("id", id);
        if (error) throw error;
        logActivity("updated", table, id, label);
        return id;
      }
      const { data, error } = await anyDb.from(table).insert(rest).select("id").single();
      if (error) throw error;
      logActivity("created", table, data?.id, label);
      return data?.id as string;
    },

    onSuccess: () => {
      invalidate(table);
      toast.success(`${label} saved`);
    },
    onError: (e: any) => toast.error(e?.message ?? `Could not save ${label}`),
  });
}

export function useRemove(table: string, label: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await anyDb.from(table).delete().eq("id", id);
      if (error) throw error;
      logActivity("deleted", table, id, label);
    },
    onSuccess: () => {
      invalidate(table);
      toast.success(`${label} deleted`);
    },
    onError: (e: any) => toast.error(e?.message ?? `Could not delete ${label}`),
  });
}

/** Creates a journal entry together with its balanced debit/credit lines. */
export function useCreateJournalEntry() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: {
      entry_date: string;
      reference_no?: string;
      memo?: string;
      lines: { account_id: string; description?: string; debit: number; credit: number; project_id?: string | null }[];
    }) => {
      const debit = payload.lines.reduce((a, l) => a + Number(l.debit || 0), 0);
      const credit = payload.lines.reduce((a, l) => a + Number(l.credit || 0), 0);
      if (Math.abs(debit - credit) > 0.009) throw new Error("Debit and credit totals must match");
      if (debit <= 0) throw new Error("Entry amount must be greater than zero");
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await anyDb
        .from("journal_entries")
        .insert({
          entry_date: payload.entry_date,
          reference_no: payload.reference_no || null,
          memo: payload.memo || null,
          source_type: "manual",
          created_by: user.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const lines = payload.lines
        .filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0)
        .map((l) => ({
          journal_entry_id: data.id,
          account_id: l.account_id,
          description: l.description || null,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          project_id: l.project_id || null,
        }));
      const { error: lineErr } = await anyDb.from("journal_entry_lines").insert(lines);
      if (lineErr) throw lineErr;
      logActivity("created", "journal_entries", data.id, "Journal entry");
      return data.id as string;
    },
    onSuccess: () => {
      invalidate("journal_entries");
      toast.success("Journal entry posted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not post entry"),
  });
}
