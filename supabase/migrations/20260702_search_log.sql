-- Search log (Brendon, 2026-07-02 — part of the Global Search build).
--
-- One row per Global Search query: what was typed and how many results came
-- back. "No matches" rows are the roadmap — they show exactly what people
-- expect search to do that it doesn't yet.
--
-- Writes go through the service client only (fire-and-forget from the search
-- route). RLS is enabled with NO anon/authenticated policies, so the log is
-- never publicly readable — same posture as the pings write path.

create table if not exists public.search_log (
  id         uuid primary key default gen_random_uuid(),
  q          text not null,
  hits       integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists search_log_created_idx on public.search_log (created_at desc);

alter table public.search_log enable row level security;
-- No SELECT/INSERT policies on purpose: service-role only.
