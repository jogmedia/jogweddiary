-- ROLES & PERMISSIONS
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.roles to authenticated;
grant all on public.roles to service_role;
alter table public.roles enable row level security;
create policy roles_admin_all on public.roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy roles_read on public.roles for select to authenticated using (true);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(resource, action)
);
grant select on public.permissions to authenticated;
grant all on public.permissions to service_role;
alter table public.permissions enable row level security;
create policy permissions_admin_all on public.permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy permissions_read on public.permissions for select to authenticated using (true);

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.staff(id),
  unique(staff_id, role_id)
);
grant select on public.staff_roles to authenticated;
grant all on public.staff_roles to service_role;
alter table public.staff_roles enable row level security;
create policy staff_roles_admin_all on public.staff_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy staff_roles_read on public.staff_roles for select to authenticated using (true);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(role_id, permission_id)
);
grant select on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;
alter table public.role_permissions enable row level security;
create policy role_permissions_admin_all on public.role_permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

-- PROJECT PRODUCTION TABLES
create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null,
  event_date date not null,
  event_time time,
  location text,
  arrival_time time,
  contact_name text,
  contact_phone text,
  google_maps_link text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.project_events to authenticated;
grant all on public.project_events to service_role;
alter table public.project_events enable row level security;
create policy project_events_admin_all on public.project_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy project_events_staff_read on public.project_events for select to authenticated using (public.is_assigned(project_id));
create policy project_events_staff_update on public.project_events for update to authenticated using (public.is_assigned(project_id)) with check (public.is_assigned(project_id));
create trigger update_project_events_updated_at before update on public.project_events for each row execute function public.update_updated_at_column();

create table if not exists public.project_logistics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  travel_required boolean not null default false,
  vehicle_details text,
  equipment_notes text,
  accommodation_notes text,
  team_arrival_time time,
  client_contact_name text,
  client_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.project_logistics to authenticated;
grant all on public.project_logistics to service_role;
alter table public.project_logistics enable row level security;
create policy project_logistics_admin_all on public.project_logistics for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy project_logistics_staff_read on public.project_logistics for select to authenticated using (public.is_assigned(project_id));
create trigger update_project_logistics_updated_at before update on public.project_logistics for each row execute function public.update_updated_at_column();

create table if not exists public.project_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item_name text not null,
  item_type text,
  item_status text not null default 'pending',
  event_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.project_checklist_items to authenticated;
grant all on public.project_checklist_items to service_role;
alter table public.project_checklist_items enable row level security;
create policy project_checklist_admin_all on public.project_checklist_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy project_checklist_staff_read on public.project_checklist_items for select to authenticated using (public.is_assigned(project_id));
create policy project_checklist_staff_update on public.project_checklist_items for update to authenticated using (public.is_assigned(project_id)) with check (public.is_assigned(project_id));
create policy project_checklist_staff_insert on public.project_checklist_items for insert to authenticated with check (public.is_assigned(project_id));
create trigger update_project_checklist_updated_at before update on public.project_checklist_items for each row execute function public.update_updated_at_column();

create table if not exists public.project_exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  export_type text not null,
  file_name text,
  file_url text,
  sent_to_whatsapp boolean not null default false,
  exported_at timestamptz not null default now(),
  created_by uuid references public.staff(id)
);
grant select, insert on public.project_exports to authenticated;
grant all on public.project_exports to service_role;
alter table public.project_exports enable row level security;
create policy project_exports_admin_all on public.project_exports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy project_exports_staff_read on public.project_exports for select to authenticated using (public.is_assigned(project_id));
create policy project_exports_staff_insert on public.project_exports for insert to authenticated with check (public.is_assigned(project_id));

create table if not exists public.project_permissions_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select on public.project_permissions_log to authenticated;
grant all on public.project_permissions_log to service_role;
alter table public.project_permissions_log enable row level security;
create policy project_perm_log_admin_all on public.project_permissions_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- SEED LOOKUP DATA
insert into public.roles (name, description) values
('Admin', 'Full access'),
('Project Manager', 'Manage projects and team'),
('Photographer', 'Shoot related access'),
('Videographer', 'Video shoot access'),
('Editor', 'Editing and delivery access'),
('Accounts', 'Payments and reports access'),
('Assistant', 'Checklist and support access'),
('Driver', 'Transport and arrival access')
on conflict (name) do nothing;

insert into public.permissions (resource, action, description) values
('project', 'view', 'View project'),
('project', 'edit', 'Edit project'),
('team', 'assign', 'Assign team members'),
('payment', 'add', 'Add payment'),
('expense', 'add', 'Add expense'),
('task', 'update', 'Update tasks'),
('shoot', 'update', 'Update shoot status'),
('editing', 'update', 'Update editing status'),
('delivery', 'update', 'Update delivery status'),
('reports', 'view', 'View reports'),
('accounts', 'manage', 'Manage accounts'),
('users', 'manage', 'Manage users'),
('export', 'pdf', 'Export PDF'),
('export', 'whatsapp', 'Send to WhatsApp')
on conflict (resource, action) do nothing;

-- REPORT FUNCTIONS
create or replace function public.get_project_profit_report()
returns table (project_id uuid, project_name text, total_amount numeric, total_received numeric, total_expenses numeric, project_profit numeric, balance_due numeric)
language sql stable security invoker set search_path = public as $$
  select p.id, p.project_name, p.total_amount,
    coalesce((select sum(pp.amount) from public.project_payments pp where pp.project_id = p.id), 0),
    coalesce((select sum(pe.amount) from public.project_expenses pe where pe.project_id = p.id), 0),
    p.total_amount - coalesce((select sum(pe.amount) from public.project_expenses pe where pe.project_id = p.id), 0),
    p.total_amount - coalesce((select sum(pp.amount) from public.project_payments pp where pp.project_id = p.id), 0)
  from public.projects p order by p.project_name;
$$;

create or replace function public.get_pending_dues_report()
returns table (project_id uuid, project_name text, event_date date, total_amount numeric, received_amount numeric, pending_due numeric)
language sql stable security invoker set search_path = public as $$
  select p.id, p.project_name, p.event_date, p.total_amount,
    coalesce((select sum(pp.amount) from public.project_payments pp where pp.project_id = p.id), 0),
    p.total_amount - coalesce((select sum(pp.amount) from public.project_payments pp where pp.project_id = p.id), 0)
  from public.projects p
  where p.total_amount - coalesce((select sum(pp.amount) from public.project_payments pp where pp.project_id = p.id), 0) > 0
  order by p.event_date desc;
$$;

create or replace function public.get_profit_and_loss(start_date date, end_date date)
returns table (total_income numeric, total_direct_costs numeric, total_operating_expenses numeric, net_profit numeric)
language sql stable security invoker set search_path = public as $$
  with income as (select coalesce(sum(amount),0) v from public.income_transactions where transaction_date between start_date and end_date),
  direct as (select coalesce(sum(amount),0) v from public.project_expenses where expense_date between start_date and end_date),
  opex as (select coalesce(sum(amount),0) v from public.expense_transactions where transaction_date between start_date and end_date and project_id is null)
  select income.v, direct.v, opex.v, income.v - direct.v - opex.v from income, direct, opex;
$$;

create or replace function public.get_balance_sheet(as_of_date date)
returns table (total_assets numeric, total_liabilities numeric, total_equity numeric, liabilities_plus_equity numeric)
language sql stable security invoker set search_path = public as $$
  with a as (select coalesce(sum(asset_value),0) v from public.assets where acquired_date is null or acquired_date <= as_of_date),
  l as (select coalesce(sum(liability_value),0) v from public.liabilities where due_date is null or due_date <= as_of_date),
  e as (select coalesce(sum(amount),0) v from public.equity_transactions where transaction_date <= as_of_date)
  select a.v, l.v, e.v, l.v + e.v from a, l, e;
$$;

create or replace function public.get_cash_flow_report(start_date date, end_date date)
returns table (opening_cash numeric, cash_in numeric, cash_out numeric, closing_cash numeric)
language sql stable security invoker set search_path = public as $$
  with o as (
    select coalesce((select sum(amount) from public.income_transactions where transaction_date < start_date),0)
         + coalesce((select sum(amount) from public.equity_transactions where transaction_date < start_date),0)
         - coalesce((select sum(amount) from public.expense_transactions where transaction_date < start_date),0) v),
  ci as (select coalesce(sum(amount),0) v from public.income_transactions where transaction_date between start_date and end_date),
  co as (select coalesce(sum(amount),0) v from public.expense_transactions where transaction_date between start_date and end_date)
  select o.v, ci.v, co.v, o.v + ci.v - co.v from o, ci, co;
$$;