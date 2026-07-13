-- The Sentinel's server-side fired-ledger (Brendon, 2026-07-13: "make sure
-- sentinel works... part of workflow"). One row per (wallet, fire_key) —
-- fire_key encodes the to-do/workflow id AND its target, so a crossing
-- pings exactly once, and retargeting re-arms naturally (new key). Written
-- only by the sweep (RLS on, no public policies; service role only).
-- Applied to the live DB 2026-07-13.

create table if not exists public.sentinel_fires (
  wallet text not null,
  fire_key text not null,
  fired_at timestamptz not null default now(),
  primary key (wallet, fire_key)
);

alter table public.sentinel_fires enable row level security;
