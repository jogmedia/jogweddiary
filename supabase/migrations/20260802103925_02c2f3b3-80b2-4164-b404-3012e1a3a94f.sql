CREATE OR REPLACE FUNCTION public.recalc_project_balance(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare paid numeric(14,2); tot numeric(14,2);
begin
  select coalesce(sum(amount),0) into paid from public.project_payments where project_id = _project_id;
  select coalesce(total_amount,0) into tot from public.projects where id = _project_id;
  update public.projects set
    balance_due = greatest(tot - paid, 0),
    payment_status = case
      when paid <= 0 then 'pending'
      when tot > 0 and paid >= tot then 'completed'
      else 'partial' end
  where id = _project_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.tg_project_total_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform public.recalc_project_balance(new.id);
  return null;
end; $function$;

DROP TRIGGER IF EXISTS tg_project_total ON public.projects;
CREATE TRIGGER tg_project_total
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.tg_project_total_sync();

DROP TRIGGER IF EXISTS tg_project_total_upd ON public.projects;
CREATE TRIGGER tg_project_total_upd
AFTER UPDATE OF total_amount, advance_amount ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.tg_project_total_sync();

-- Backfill every existing project
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.projects LOOP
    PERFORM public.recalc_project_balance(r.id);
  END LOOP;
END $$;
