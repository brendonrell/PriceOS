-- ════════════════════════════════════════════════════════════════════════
--  PINGS — one open rollup row per group (rollup race guard)
--  2026-06-14 · a partial UNIQUE index so two concurrent pings sharing a
--  group_key can't create duplicate "+N" rollup rows for the same recipient.
--  createPing() bumps the existing open row; if a racing insert wins, it trips
--  this constraint (23505) and createPing routes back to the bump path.
--  Only OPEN (unread) rows are constrained — once read, a new group can start.
--  Additive; applied to live on Brendon's go.
-- ════════════════════════════════════════════════════════════════════════

create unique index if not exists pings_group_open_unique
  on public.pings (recipient_address, group_key)
  where read = false and group_key is not null;
