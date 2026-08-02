ALTER TABLE public.project_payments ADD COLUMN IF NOT EXISTS account text;
CREATE INDEX IF NOT EXISTS project_payments_account_idx ON public.project_payments (account);