DELETE FROM public.income_transactions
WHERE notes = 'Advance received on booking (backfilled)'
  AND project_id IN (
    SELECT pp.project_id FROM public.project_payments pp
    WHERE pp.notes = 'Advance received on booking (backfilled)'
      AND EXISTS (
        SELECT 1 FROM public.project_payments o
        WHERE o.project_id = pp.project_id AND o.id <> pp.id
      )
  );

DELETE FROM public.project_payments pp
WHERE pp.notes = 'Advance received on booking (backfilled)'
  AND EXISTS (
    SELECT 1 FROM public.project_payments o
    WHERE o.project_id = pp.project_id AND o.id <> pp.id
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.projects LOOP
    PERFORM public.recalc_project_balance(r.id);
  END LOOP;
END $$;
