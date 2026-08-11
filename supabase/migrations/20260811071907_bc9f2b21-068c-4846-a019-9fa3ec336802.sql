CREATE TABLE public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_number text,
  opening_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read bank accounts" ON public.bank_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert bank accounts" ON public.bank_accounts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update bank accounts" ON public.bank_accounts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete bank accounts" ON public.bank_accounts
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.project_payments
  ADD COLUMN bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX project_payments_bank_account_id_idx ON public.project_payments(bank_account_id);

CREATE OR REPLACE FUNCTION public.recalc_bank_balance(_bank_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if _bank_account_id is null then return; end if;
  update public.bank_accounts b
    set current_balance = b.opening_balance
      + coalesce((select sum(p.amount) from public.project_payments p where p.bank_account_id = b.id), 0)
  where b.id = _bank_account_id;
end; $$;

CREATE OR REPLACE FUNCTION public.tg_bank_balance_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.recalc_bank_balance(old.bank_account_id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform public.recalc_bank_balance(new.bank_account_id);
  end if;
  return null;
end; $$;

CREATE TRIGGER tg_bank_balance_sync
AFTER INSERT OR UPDATE OR DELETE ON public.project_payments
FOR EACH ROW EXECUTE FUNCTION public.tg_bank_balance_sync();

CREATE OR REPLACE FUNCTION public.tg_bank_opening_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  new.current_balance := new.opening_balance
    + coalesce((select sum(p.amount) from public.project_payments p where p.bank_account_id = new.id), 0);
  return new;
end; $$;

CREATE TRIGGER tg_bank_opening_sync BEFORE INSERT OR UPDATE OF opening_balance ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_bank_opening_sync();