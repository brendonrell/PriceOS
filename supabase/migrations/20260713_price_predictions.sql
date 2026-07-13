-- PRICE TARGETS, for real (Brendon greenlight 2026-07-13): the crowd's
-- 30-day floor calls, one per wallet per project per monthly window
-- (Montreal calendar). SEALED BY DESIGN: RLS is enabled with NO anon or
-- authenticated policies — every read/write goes through the service role
-- in /api/project/[slug]/predictions, which only ever reveals CLOSED
-- windows in aggregate. Applied to the live DB 2026-07-13.

create table if not exists public.price_predictions (
  project_id text not null,
  wallet text not null,
  window_key text not null,          -- 'YYYY-MM' (America/Montreal)
  floor_eth numeric not null check (floor_eth > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, window_key, wallet)
);

alter table public.price_predictions enable row level security;
