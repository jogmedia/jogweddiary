alter table public.project_assignments
  add column if not exists event_id uuid references public.project_events(id) on delete cascade;

alter table public.projects
  add column if not exists payment_due_date date,
  add column if not exists raw_backup_done boolean not null default false,
  add column if not exists photo_selection_done boolean not null default false,
  add column if not exists album_editing_done boolean not null default false,
  add column if not exists video_editing_done boolean not null default false,
  add column if not exists album_printed boolean not null default false,
  add column if not exists final_delivery_done boolean not null default false;

alter table public.project_events
  add column if not exists muhurtham_time time,
  add column if not exists sort_order integer not null default 0;

create index if not exists idx_project_assignments_event on public.project_assignments(event_id);
create index if not exists idx_project_events_date on public.project_events(event_date);