ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS travel_ticket_path text,
  ADD COLUMN IF NOT EXISTS travel_ticket_name text;

CREATE POLICY "Authenticated can read travel tickets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'travel-tickets');

CREATE POLICY "Authenticated can upload travel tickets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'travel-tickets');

CREATE POLICY "Authenticated can update travel tickets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'travel-tickets')
WITH CHECK (bucket_id = 'travel-tickets');

CREATE POLICY "Authenticated can delete travel tickets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'travel-tickets');