ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS travel_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_booking_status text DEFAULT 'not_needed',
  ADD COLUMN IF NOT EXISTS travel_mode text,
  ADD COLUMN IF NOT EXISTS travel_notes text;