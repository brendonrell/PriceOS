-- THE CONVICTION / CALL LEDGER (Brendon approved 2026-07-26): one tap posts a
-- signed, server-timestamped, PUBLIC, IMMUTABLE price call that settles
-- CROWNED or REKT against the project floor. Distinct from price_predictions
-- (the sealed monthly Targets crowd game) on purpose — a call is public from
-- the second it's posted and can never be edited or deleted, by anyone,
-- including its author.
--
-- Reads are open (the ledger is the public record); every WRITE goes through
-- the service role in /api/calls — no INSERT/UPDATE/DELETE policies exist, so
-- immutability is structural, not honor-system. Applied to the live DB
-- 2026-07-26.

create table if not exists public.calls (
  id bigint generated always as identity primary key,
  user_address text not null,
  project_id text not null,
  -- 'floor_gte' = bull (floor reaches X) · 'floor_lte' = bear (floor at/below X)
  claim_type text not null check (claim_type in ('floor_gte', 'floor_lte')),
  target_eth numeric not null check (target_eth > 0),
  window_end timestamptz not null,
  floor_at_call numeric,
  status text not null default 'open' check (status in ('open', 'crowned', 'rekt')),
  resolved_at timestamptz,
  floor_at_resolve numeric,
  created_at timestamptz not null default now()
);

create index if not exists calls_project_idx on public.calls (project_id, created_at desc);
create index if not exists calls_user_idx on public.calls (user_address, created_at desc);
create index if not exists calls_open_idx on public.calls (status, window_end) where status = 'open';

alter table public.calls enable row level security;

-- Public record: anyone can read the ledger. (SELECT to anon/authenticated,
-- never TO public — house RLS pattern.)
create policy calls_read_anon on public.calls for select to anon using (true);
create policy calls_read_auth on public.calls for select to authenticated using (true);

grant select on public.calls to anon, authenticated;
