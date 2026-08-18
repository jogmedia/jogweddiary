CREATE TABLE public.event_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_types TO authenticated;
GRANT SELECT ON public.event_types TO anon;
GRANT ALL ON public.event_types TO service_role;

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_types_read_all" ON public.event_types FOR SELECT USING (true);
CREATE POLICY "event_types_write_auth" ON public.event_types FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER event_types_updated_at BEFORE UPDATE ON public.event_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.event_types (slug, label, emoji, sort_order) VALUES
  ('save_the_date', 'Save The Date', '📅', 10),
  ('engagement', 'Engagement', '💐', 20),
  ('haldi', 'Haldi', '🌼', 30),
  ('mehendi', 'Mehendi', '🖐️', 40),
  ('sangeet', 'Sangeet', '🎶', 50),
  ('wedding_evening', 'Wedding Evening / Pre-Wedding', '🌙', 60),
  ('wedding_eve', 'Wedding Eve / Sangeeth', '🌙', 70),
  ('wedding_day', 'Wedding Day / Muhurtham', '💍', 80),
  ('reception', 'Reception', '🎉', 90);