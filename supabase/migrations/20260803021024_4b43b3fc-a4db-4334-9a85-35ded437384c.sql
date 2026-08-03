ALTER TABLE public.project_assignments
  ADD COLUMN IF NOT EXISTS block_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;