alter table public.projects
  add column if not exists raw_sent_date date,
  add column if not exists raw_drive_link text,
  add column if not exists selection_received_date date,
  add column if not exists layout_status text not null default 'pending',
  add column if not exists album_proof_link text,
  add column if not exists client_approval_status text not null default 'pending',
  add column if not exists client_revision_note text,
  add column if not exists client_selection_note text,
  add column if not exists sent_to_printing_date date,
  add column if not exists courier_dispatched_date date;

create or replace function public.get_portal(_project_id uuid)
returns table(
  project_id uuid,
  project_name text,
  client_name text,
  event_date date,
  venue text,
  package_name text,
  raw_sent_date date,
  raw_drive_link text,
  selection_received_date date,
  layout_status text,
  album_proof_link text,
  client_approval_status text,
  client_revision_note text,
  client_selection_note text,
  sent_to_printing_date date,
  courier_dispatched_date date,
  delivery_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.project_name, c.name, p.event_date, p.venue, p.package_name,
         p.raw_sent_date, p.raw_drive_link, p.selection_received_date, p.layout_status,
         p.album_proof_link, p.client_approval_status, p.client_revision_note,
         p.client_selection_note, p.sent_to_printing_date, p.courier_dispatched_date,
         p.delivery_status
  from public.projects p
  left join public.clients c on c.id = p.client_id
  where p.id = _project_id
$$;

create or replace function public.portal_submit_selection(_project_id uuid, _note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _note is null or length(btrim(_note)) = 0 or length(_note) > 4000 then
    raise exception 'Invalid selection note';
  end if;
  update public.projects
    set client_selection_note = btrim(_note),
        selection_received_date = coalesce(selection_received_date, current_date)
  where id = _project_id;
end; $$;

create or replace function public.portal_set_approval(_project_id uuid, _status text, _note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _status not in ('approved', 'revision') then
    raise exception 'Invalid status';
  end if;
  update public.projects
    set client_approval_status = _status,
        client_revision_note = case when _status = 'revision' then left(coalesce(_note, ''), 4000) else null end
  where id = _project_id;
end; $$;

revoke all on function public.get_portal(uuid) from public;
revoke all on function public.portal_submit_selection(uuid, text) from public;
revoke all on function public.portal_set_approval(uuid, text, text) from public;
grant execute on function public.get_portal(uuid) to anon, authenticated;
grant execute on function public.portal_submit_selection(uuid, text) to anon, authenticated;
grant execute on function public.portal_set_approval(uuid, text, text) to anon, authenticated;