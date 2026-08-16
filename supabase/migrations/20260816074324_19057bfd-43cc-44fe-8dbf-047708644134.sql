ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS place_district text,
  ADD COLUMN IF NOT EXISTS nearest_railway_station text,
  ADD COLUMN IF NOT EXISTS google_maps_link text;