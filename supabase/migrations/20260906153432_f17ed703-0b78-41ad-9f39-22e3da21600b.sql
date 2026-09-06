CREATE TABLE public.gold_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  loan_number text,
  gold_grams numeric,
  loan_amount numeric NOT NULL DEFAULT 0,
  loan_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date NOT NULL,
  interest_rate numeric NOT NULL DEFAULT 0,
  periodic_interest numeric,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL DEFAULT 'active',
  closed_date date,
  closed_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gold_loans TO authenticated;
GRANT ALL ON public.gold_loans TO service_role;

ALTER TABLE public.gold_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage gold loans"
  ON public.gold_loans FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_gold_loans_updated_at
  BEFORE UPDATE ON public.gold_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();