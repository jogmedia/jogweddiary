INSERT INTO public.project_payments (project_id, payment_date, amount, payment_mode, account, reference_no, notes)
SELECT p.id,
       COALESCE(p.advance_date, p.created_at::date, CURRENT_DATE),
       p.advance_amount,
       CASE p.advance_account
         WHEN 'gpay_phonepe_hdfc' THEN 'upi'
         WHEN 'hdfc_transfer' THEN 'bank'
         WHEN 'sbi_account' THEN 'bank'
         WHEN 'cash_in_hand' THEN 'cash'
         WHEN 'other_account' THEN 'bank'
         ELSE 'cash' END,
       p.advance_account,
       'ADVANCE',
       'Advance received on booking (backfilled)'
FROM public.projects p
WHERE COALESCE(p.advance_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.project_payments pp
    WHERE pp.project_id = p.id AND COALESCE(pp.reference_no,'') = 'ADVANCE'
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.projects LOOP
    PERFORM public.recalc_project_balance(r.id);
  END LOOP;
END $$;
