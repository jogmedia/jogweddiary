create table if not exists public.project_reimbursables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'claim' check (kind in ('claim','settlement')),
  item_name text not null,
  amount numeric not null default 0,
  entry_date date not null default current_date,
  payment_mode text not null default 'cash',
  bank_account_id uuid references public.bank_accounts(id),
  reference_no text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.project_reimbursables to authenticated;
grant all on public.project_reimbursables to service_role;
alter table public.project_reimbursables enable row level security;
drop policy if exists admin_all on public.project_reimbursables;
create policy admin_all on public.project_reimbursables for all to authenticated using (is_admin()) with check (is_admin());

create index if not exists idx_reimb_project on public.project_reimbursables(project_id);
create index if not exists idx_reimb_bank on public.project_reimbursables(bank_account_id);

drop trigger if exists trg_reimb_updated on public.project_reimbursables;
create trigger trg_reimb_updated before update on public.project_reimbursables
for each row execute function public.update_updated_at_column();

create or replace function public.recalc_bank_balance(_bank_account_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if _bank_account_id is null then return; end if;
  update public.bank_accounts b
    set current_balance = b.opening_balance
      + coalesce((select sum(p.amount) from public.project_payments p where p.bank_account_id = b.id), 0)
      - coalesce((select sum(e.amount) from public.project_expenses e where e.bank_account_id = b.id), 0)
      - coalesce((select sum(r.amount) from public.project_reimbursables r where r.bank_account_id = b.id and r.kind = 'claim'), 0)
      + coalesce((select sum(r.amount) from public.project_reimbursables r where r.bank_account_id = b.id and r.kind = 'settlement'), 0)
  where b.id = _bank_account_id;
end; $function$;

drop trigger if exists trg_reimb_bank_sync on public.project_reimbursables;
create trigger trg_reimb_bank_sync after insert or update or delete on public.project_reimbursables
for each row execute function public.tg_bank_balance_sync();