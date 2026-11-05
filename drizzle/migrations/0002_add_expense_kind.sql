ALTER TABLE public.project_expenses
  ADD COLUMN IF NOT EXISTS expense_kind text;

UPDATE public.project_expenses
SET expense_kind = 'studio'
WHERE expense_kind IS NULL;

COMMENT ON COLUMN public.project_expenses.expense_kind IS 'studio = business / shoot expense; personal = owner''s Personal / Home spend (sub-category stored in category)';