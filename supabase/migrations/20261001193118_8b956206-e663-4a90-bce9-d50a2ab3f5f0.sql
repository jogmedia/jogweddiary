CREATE TABLE public.crew_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.project_events(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, staff_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_handovers TO authenticated;
GRANT ALL ON public.crew_handovers TO service_role;
ALTER TABLE public.crew_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage crew handovers" ON public.crew_handovers FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_assigned(project_id))
  WITH CHECK (public.is_admin() OR public.is_assigned(project_id));
CREATE TRIGGER update_crew_handovers_updated_at BEFORE UPDATE ON public.crew_handovers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();