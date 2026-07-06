-- PROJECT ID (Brendon, 2026-07-06): every project carries a unique sequential
-- number in upload order — shown in the project Attributes and driving the
-- home New Gen Art sort. Auto-assigned on insert so future uploads keep the
-- sequence without app changes. APPLIED LIVE 2026-07-06.

alter table projects add column if not exists project_no integer;
create unique index if not exists projects_project_no_key on projects(project_no);

create or replace function assign_project_no() returns trigger
language plpgsql as $$
begin
  if new.project_no is null then
    select coalesce(max(project_no), 0) + 1 into new.project_no from projects;
  end if;
  return new;
end $$;

drop trigger if exists projects_project_no on projects;
create trigger projects_project_no
  before insert on projects
  for each row execute function assign_project_no();

-- Backfill 1..N in canonical upload order (the display order the app already
-- showed), then stagger colliding uploaded_at stamps 3 minutes apart so every
-- project owns a unique upload moment. Bulk-seeded test projects shared exact
-- timestamps, which made the New Uploads feed read "Today · 17:47" across a
-- whole row of cards.
with ordered as (
  select id, row_number() over (order by uploaded_at asc nulls last, title, id) as rn
  from projects
)
update projects p set project_no = o.rn from ordered o where p.id = o.id;

do $$
declare r record; prev timestamptz := null;
begin
  for r in select id, uploaded_at from projects order by project_no loop
    if r.uploaded_at is null then
      continue;
    end if;
    if prev is not null and r.uploaded_at <= prev then
      prev := prev + interval '3 minutes';
      update projects set uploaded_at = prev where id = r.id;
    else
      prev := r.uploaded_at;
    end if;
  end loop;
end $$;
