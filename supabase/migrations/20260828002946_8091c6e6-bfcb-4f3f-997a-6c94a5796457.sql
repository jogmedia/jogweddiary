ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS primary_hard_disk text,
  ADD COLUMN IF NOT EXISTS secondary_hard_disk text;

UPDATE public.projects
  SET primary_hard_disk = NULLIF(btrim(backup_drive), '')
  WHERE primary_hard_disk IS NULL AND NULLIF(btrim(coalesce(backup_drive,'')), '') IS NOT NULL;