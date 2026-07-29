
-- ROLES
create type public.app_role as enum ('admin','staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
$$;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- first user becomes admin, others staff
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  select count(*) into cnt from public.user_roles where role = 'admin';
  insert into public.user_roles (user_id, role) values (new.id, case when cnt = 0 then 'admin'::public.app_role else 'staff'::public.app_role end);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create policy "profiles_select" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin());
create policy "user_roles_select" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- CORE
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text, whatsapp text, email text, address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  role text not null default 'staff',
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_name text not null,
  event_date date not null,
  venue text, package_name text,
  total_amount numeric(14,2) not null default 0,
  advance_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  payment_status text not null default 'pending',
  project_status text not null default 'open',
  shoot_status text not null default 'pending',
  editing_status text not null default 'pending',
  album_status text not null default 'pending',
  delivery_status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount >= 0),
  payment_mode text not null default 'cash',
  reference_no text,
  received_by uuid references public.staff(id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  paid_to text, payment_mode text, notes text,
  created_at timestamptz not null default now()
);

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_name text not null,
  task_status text not null default 'pending',
  due_date date,
  assigned_to uuid references public.staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  role_in_project text,
  assigned_at timestamptz not null default now(),
  unique(project_id, staff_id)
);

create table public.delivery_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  delivery_type text not null,
  delivery_date date,
  file_link text,
  delivered_by uuid references public.staff(id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text unique,
  account_name text not null,
  account_type text not null,
  is_cash boolean not null default false,
  parent_id uuid references public.chart_of_accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  reference_no text, memo text, source_type text, source_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id),
  description text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.chart_of_accounts(id),
  asset_name text not null,
  asset_value numeric(14,2) not null default 0,
  acquired_date date, notes text,
  created_at timestamptz not null default now()
);

create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.chart_of_accounts(id),
  liability_name text not null,
  liability_value numeric(14,2) not null default 0,
  due_date date, notes text,
  created_at timestamptz not null default now()
);

create table public.equity_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.chart_of_accounts(id),
  transaction_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table public.income_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.chart_of_accounts(id),
  project_id uuid references public.projects(id) on delete cascade,
  transaction_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  is_cash boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table public.expense_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.chart_of_accounts(id),
  project_id uuid references public.projects(id) on delete cascade,
  transaction_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  is_cash boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details text,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'JOG MEDIA',
  address text default 'Kozhikode, Kerala, India',
  phone text, email text, gstin text,
  currency text not null default 'INR',
  invoice_prefix text not null default 'JM',
  updated_at timestamptz not null default now()
);

-- GRANTS
grant select, insert, update, delete on public.clients, public.staff, public.projects,
  public.project_payments, public.project_expenses, public.project_tasks,
  public.project_assignments, public.delivery_records, public.chart_of_accounts,
  public.journal_entries, public.journal_entry_lines, public.assets, public.liabilities,
  public.equity_transactions, public.income_transactions, public.expense_transactions,
  public.activity_log, public.app_settings to authenticated;
grant all on public.clients, public.staff, public.projects,
  public.project_payments, public.project_expenses, public.project_tasks,
  public.project_assignments, public.delivery_records, public.chart_of_accounts,
  public.journal_entries, public.journal_entry_lines, public.assets, public.liabilities,
  public.equity_transactions, public.income_transactions, public.expense_transactions,
  public.activity_log, public.app_settings to service_role;

alter table public.clients enable row level security;
alter table public.staff enable row level security;
alter table public.projects enable row level security;
alter table public.project_payments enable row level security;
alter table public.project_expenses enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_assignments enable row level security;
alter table public.delivery_records enable row level security;
alter table public.chart_of_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;
alter table public.assets enable row level security;
alter table public.liabilities enable row level security;
alter table public.equity_transactions enable row level security;
alter table public.income_transactions enable row level security;
alter table public.expense_transactions enable row level security;
alter table public.activity_log enable row level security;
alter table public.app_settings enable row level security;

-- helper: is current user assigned to project
create or replace function public.is_assigned(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_assignments pa
    join public.staff s on s.id = pa.staff_id
    where pa.project_id = _project_id and s.user_id = auth.uid()
  )
$$;

-- Admin full access everywhere
create policy "admin_all" on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.project_payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.project_expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.project_tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.project_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.delivery_records for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.chart_of_accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.journal_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.journal_entry_lines for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.assets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.liabilities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.equity_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.income_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.expense_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.activity_log for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_all" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Staff limited access
create policy "staff_read_assigned_projects" on public.projects for select to authenticated using (public.is_assigned(id));
create policy "staff_read_clients" on public.clients for select to authenticated using (public.has_role(auth.uid(),'staff'));
create policy "staff_read_staff" on public.staff for select to authenticated using (public.has_role(auth.uid(),'staff'));
create policy "staff_read_assignments" on public.project_assignments for select to authenticated using (public.is_assigned(project_id));
create policy "staff_read_tasks" on public.project_tasks for select to authenticated using (public.is_assigned(project_id));
create policy "staff_update_tasks" on public.project_tasks for update to authenticated using (public.is_assigned(project_id)) with check (public.is_assigned(project_id));
create policy "staff_read_delivery" on public.delivery_records for select to authenticated using (public.is_assigned(project_id));
create policy "staff_insert_delivery" on public.delivery_records for insert to authenticated with check (public.is_assigned(project_id));
create policy "staff_update_delivery" on public.delivery_records for update to authenticated using (public.is_assigned(project_id)) with check (public.is_assigned(project_id));
create policy "staff_log_insert" on public.activity_log for insert to authenticated with check (user_id = auth.uid());
create policy "settings_read" on public.app_settings for select to authenticated using (true);

-- triggers updated_at
create trigger t1 before update on public.clients for each row execute function public.update_updated_at_column();
create trigger t2 before update on public.staff for each row execute function public.update_updated_at_column();
create trigger t3 before update on public.projects for each row execute function public.update_updated_at_column();
create trigger t4 before update on public.project_tasks for each row execute function public.update_updated_at_column();
create trigger t5 before update on public.chart_of_accounts for each row execute function public.update_updated_at_column();
create trigger t6 before update on public.profiles for each row execute function public.update_updated_at_column();

-- keep balance_due + payment_status in sync
create or replace function public.recalc_project_balance(_project_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare paid numeric(14,2); tot numeric(14,2);
begin
  select coalesce(sum(amount),0) into paid from public.project_payments where project_id = _project_id;
  select total_amount into tot from public.projects where id = _project_id;
  update public.projects set
    balance_due = coalesce(tot,0) - paid,
    payment_status = case when paid <= 0 then 'pending' when paid >= coalesce(tot,0) then 'paid' else 'partial' end
  where id = _project_id;
end; $$;

create or replace function public.tg_payment_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_project_balance(coalesce(new.project_id, old.project_id));
  -- mirror into income_transactions ledger
  if tg_op = 'INSERT' then
    insert into public.income_transactions (project_id, transaction_date, amount, is_cash, notes, account_id)
    values (new.project_id, new.payment_date, new.amount, true, coalesce(new.notes,'Project payment'),
      (select id from public.chart_of_accounts where account_code = '4001'));
  end if;
  return null;
end; $$;

create trigger tg_payment_sync after insert or update or delete on public.project_payments
for each row execute function public.tg_payment_sync();

create or replace function public.tg_project_total_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.total_amount is distinct from old.total_amount then
    perform public.recalc_project_balance(new.id);
  end if;
  return null;
end; $$;
create trigger tg_project_total after update on public.projects
for each row execute function public.tg_project_total_sync();

create or replace function public.tg_expense_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.expense_transactions (project_id, transaction_date, amount, is_cash, notes, account_id)
  values (new.project_id, new.expense_date, new.amount, true, coalesce(new.category,'Expense'),
    (select id from public.chart_of_accounts where account_name = new.category limit 1));
  return null;
end; $$;
create trigger tg_expense_sync after insert on public.project_expenses
for each row execute function public.tg_expense_sync();

-- SEED chart of accounts
insert into public.app_settings (business_name) values ('JOG MEDIA');
insert into public.chart_of_accounts (account_code, account_name, account_type, is_cash) values
 ('1001','Cash','Assets',true),
 ('1002','Bank','Assets',true),
 ('1003','Accounts Receivable','Assets',false),
 ('1004','Camera Equipment','Assets',false),
 ('2001','Accounts Payable','Liabilities',false),
 ('2002','Loans Payable','Liabilities',false),
 ('3001','Owner''s Capital','Equity',false),
 ('3002','Drawings','Equity',false),
 ('4001','Wedding Photography Income','Income',false),
 ('4002','Videography Income','Income',false),
 ('4003','Album Sales Income','Income',false),
 ('5001','Editing Expense','Cost of Goods Sold',false),
 ('5002','Album Cost','Cost of Goods Sold',false),
 ('5003','Staff Payment Expense','Cost of Goods Sold',false),
 ('5004','Travel Expense','Cost of Goods Sold',false),
 ('6001','Rent Expense','Expenses',false),
 ('6002','Utilities Expense','Expenses',false),
 ('6003','Marketing Expense','Expenses',false),
 ('6004','Office Expense','Expenses',false);
