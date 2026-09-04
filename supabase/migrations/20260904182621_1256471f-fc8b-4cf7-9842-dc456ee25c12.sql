CREATE TABLE public.fixed_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  fd_number text,
  source_bank_account_id uuid REFERENCES public.bank_accounts(id),
  principal numeric NOT NULL DEFAULT 0,
  deposit_date date NOT NULL DEFAULT current_date,
  tenure_months integer NOT NULL DEFAULT 0,
  tenure_days integer NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  maturity_date date NOT NULL,
  maturity_amount numeric NOT NULL DEFAULT 0,
  auto_renew boolean NOT NULL DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'active',
  closed_date date,
  closed_amount numeric,
  payout_bank_account_id uuid REFERENCES public.bank_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_deposits TO authenticated;
GRANT ALL ON public.fixed_deposits TO service_role;

ALTER TABLE public.fixed_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fixed deposits"
ON public.fixed_deposits FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_fixed_deposits_updated_at
BEFORE UPDATE ON public.fixed_deposits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recalc_bank_balance(_bank_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if _bank_account_id is null then return; end if;
  update public.bank_accounts b
    set current_balance = b.opening_balance
      + coalesce((select sum(p.amount) from public.project_payments p where p.bank_account_id = b.id), 0)
      - coalesce((select sum(e.amount) from public.project_expenses e where e.bank_account_id = b.id), 0)
      - coalesce((select sum(r.amount) from public.project_reimbursables r where r.bank_account_id = b.id and r.kind = 'claim'), 0)
      + coalesce((select sum(r.amount) from public.project_reimbursables r where r.bank_account_id = b.id and r.kind = 'settlement'), 0)
      - coalesce((select sum(f.principal) from public.fixed_deposits f where f.source_bank_account_id = b.id), 0)
      + coalesce((select sum(coalesce(f.closed_amount, 0)) from public.fixed_deposits f where f.payout_bank_account_id = b.id and f.status = 'closed'), 0)
  where b.id = _bank_account_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.tg_fd_bank_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.recalc_bank_balance(old.source_bank_account_id);
    perform public.recalc_bank_balance(old.payout_bank_account_id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform public.recalc_bank_balance(new.source_bank_account_id);
    perform public.recalc_bank_balance(new.payout_bank_account_id);
  end if;
  return null;
end; $$;

CREATE TRIGGER tg_fd_bank_sync
AFTER INSERT OR UPDATE OR DELETE ON public.fixed_deposits
FOR EACH ROW EXECUTE FUNCTION public.tg_fd_bank_sync();