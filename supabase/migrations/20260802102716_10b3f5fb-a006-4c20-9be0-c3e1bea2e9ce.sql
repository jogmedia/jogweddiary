ALTER TABLE public.project_assignments
  DROP CONSTRAINT IF EXISTS project_assignments_project_id_staff_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS project_assignments_event_staff_key
  ON public.project_assignments (event_id, staff_id)
  WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_assignments_project_staff_noevent_key
  ON public.project_assignments (project_id, staff_id)
  WHERE event_id IS NULL;