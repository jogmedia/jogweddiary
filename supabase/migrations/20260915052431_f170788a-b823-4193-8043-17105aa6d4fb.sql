ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS photo_handover_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS photo_handover_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_backup_disk text,
  ADD COLUMN IF NOT EXISTS photo_cloud_uploaded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_handover_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS video_handover_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_backup_disk text,
  ADD COLUMN IF NOT EXISTS video_cloud_uploaded boolean NOT NULL DEFAULT false;