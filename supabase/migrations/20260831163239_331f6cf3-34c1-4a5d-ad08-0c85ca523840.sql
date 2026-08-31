CREATE TABLE public.hard_disks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  capacity text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hard_disks TO authenticated;
GRANT ALL ON public.hard_disks TO service_role;

ALTER TABLE public.hard_disks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view hard disks" ON public.hard_disks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage hard disks" ON public.hard_disks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_hard_disks_updated_at
  BEFORE UPDATE ON public.hard_disks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hard_disks (name, sort_order)
SELECT 'Hard Disk ' || i, i FROM generate_series(1, 10) AS i
ON CONFLICT (name) DO NOTHING;