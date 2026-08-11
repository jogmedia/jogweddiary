alter table public.project_expenses add column if not exists bank_account_id uuid references public.bank_accounts(id);

create or replace function public.recalc_bank_balance(_bank_account_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if _bank_account_id is null then return; end if;
  update public.bank_accounts b
    set current_balance = b.opening_balance
      + coalesce((select sum(p.amount) from public.project_payments p where p.bank_account_id = b.id), 0)
      - coalesce((select sum(e.amount) from public.project_expenses e where e.bank_account_id = b.id), 0)
  where b.id = _bank_account_id;
end; $$;

create or replace function public.tg_bank_opening_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.current_balance := new.opening_balance
    + coalesce((select sum(p.amount) from public.project_payments p where p.bank_account_id = new.id), 0)
    - coalesce((select sum(e.amount) from public.project_expenses e where e.bank_account_id = new.id), 0);
  return new;
end; $$;

drop trigger if exists tg_expense_bank_balance_sync on public.project_expenses;
create trigger tg_expense_bank_balance_sync
after insert or update or delete on public.project_expenses
for each row execute function public.tg_bank_balance_sync();

update public.bank_accounts b set current_balance = b.opening_balance
  + coalesce((select sum(p.amount) from public.project_payments p where p.bank_account_id = b.id), 0)
  - coalesce((select sum(e.amount) from public.project_expenses e where e.bank_account_id = b.id), 0);