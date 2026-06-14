-- ════════════════════════════════════════════════════════════════════════
--  PINGS — events indexes for the broadcast firehose
--  2026-06-14 · the follow-feed reads `events` filtered to who/what you follow,
--  ordered by time. Without these, that's a sequential scan of the whole events
--  table on every read — fine at 25 users, a CPU cliff at social scale. These
--  index-serve the from/to-address and project filters + the time-desc sort.
--  Additive, non-destructive; applied to live on Brendon's go.
-- ════════════════════════════════════════════════════════════════════════

create index if not exists events_from_addr_ts
  on public.events (from_address, timestamp desc);

create index if not exists events_to_addr_ts
  on public.events (to_address, timestamp desc);

create index if not exists events_project_ts
  on public.events (project_id, timestamp desc);
