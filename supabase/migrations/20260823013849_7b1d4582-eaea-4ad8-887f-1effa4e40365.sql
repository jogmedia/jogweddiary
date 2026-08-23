ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS venue_contact_name text,
  ADD COLUMN IF NOT EXISTS venue_contact_phone text;