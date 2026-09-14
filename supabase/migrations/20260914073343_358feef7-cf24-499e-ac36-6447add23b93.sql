ALTER TABLE public.projects ADD COLUMN cloud_backup_destination text NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.projects.cloud_backup_destination IS 'Simplified cloud backup status: jog_media, client_drive, or none';