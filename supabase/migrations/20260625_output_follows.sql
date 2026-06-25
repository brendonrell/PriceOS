-- Output follows (Brendon, 2026-06-25).
--
-- A user can follow an individual OUTPUT, mirroring project_follows. The parent
-- project's "parental support" follow is NOT stored — it's synthesised at read
-- time (+1 to the follower count, shown as the project in the followers list),
-- so an output is never at 0 followers and minting needs no change.
--
-- Writes go through the service client (bypasses RLS), so only a public read
-- policy is needed — identical to project_follows.

create table if not exists public.output_follows (
  follower_address text not null references public.users(address) on delete cascade,
  follower_name    text,
  project_id       text not null references public.projects(id) on delete cascade,
  token_id         text not null,
  created_at       timestamptz not null default now(),
  primary key (follower_address, project_id, token_id)
);
create index if not exists output_follows_output_idx
  on public.output_follows (project_id, token_id);
create index if not exists output_follows_follower_idx
  on public.output_follows (follower_address);

alter table public.output_follows enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'output_follows'
      and policyname = 'output_follows_read'
  ) then
    create policy "output_follows_read" on public.output_follows
      for select to anon, authenticated using (true);
  end if;
end $$;

-- Allow the OUTPUT_FOLLOW ping kind (recipient = the output's owner).
alter table public.pings drop constraint if exists pings_kind_check;
alter table public.pings add constraint pings_kind_check
  check (kind = any (array[
    'PING','FOLLOW','PROJECT_FOLLOW','OUTPUT_FOLLOW','ACHIEVEMENT','STREAK',
    'MINT','SALE','OFFER','OFFER_ACCEPTED','XFER','WISHLIST_HIT','WATCH_HIT'
  ]));
