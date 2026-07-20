-- Cooldown made REAL (Brendon, 2026-07-20 — "cooldown status needs to become
-- real if it isn't already").
--
-- The read side was always real (allowlist derives ☼/☽ off
-- projects.cooldown_until), but NOTHING ever wrote the column — every live
-- row was NULL, so no artist has ever shown ☽. The 60-day clock fires at
-- UPLOAD (core PD spec), so the truth is derivable: uploaded_at + 60 days.
--
-- 1) Trigger: any insert/update that sets uploaded_at without an explicit
--    cooldown_until gets the derived stamp — every write path (seeds, the
--    Studio publish row, the indexer at cutover) now produces a real clock.
--    An explicit cooldown_until always wins (the contract stays canonical
--    once on-chain drives this).
-- 2) Backfill: existing rows with an upload moment get their true stamp.

create or replace function public.derive_cooldown_until()
returns trigger
language plpgsql
as $$
begin
  if new.uploaded_at is not null and new.cooldown_until is null then
    new.cooldown_until := new.uploaded_at + interval '60 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_derive_cooldown on public.projects;
create trigger trg_derive_cooldown
  before insert or update of uploaded_at
  on public.projects
  for each row
  execute function public.derive_cooldown_until();

update public.projects
set cooldown_until = uploaded_at + interval '60 days'
where uploaded_at is not null
  and cooldown_until is null;
