-- ════════════════════════════════════════════════════════════════════════
--  $PRICE Holdings Rank  (STAGED — applied to zspxpfwlwikdxwavffjn on go)
--  2026-07-23 · the $PRICE holder leaderboard (Top Holders) + the "$PRICE
--  Top N · #r" earned profile tag.
--
--  Adds two columns the price-holdings sweep (app/api/cron/price-holdings)
--  fills each run:
--    price_held      — the wallet's $PRICE balance in whole tokens (display +
--                      ordering). Non-null, default 0.
--    price_hold_rank — the wallet's position among NAMED holders (1 = most,
--                      ties → earlier joiner); null when it holds none / isn't
--                      ranked. Drives the Top Holders board + the earned tag.
--
--  Additive + idempotent (IF NOT EXISTS) — no existing data touched. The users
--  table's existing anon/authenticated SELECT policy already covers new
--  columns; the sweep writes them via the service role (bypasses RLS), so no
--  new policy is needed.
-- ════════════════════════════════════════════════════════════════════════

alter table public.users add column if not exists price_held      numeric not null default 0;
alter table public.users add column if not exists price_hold_rank integer;

-- The board reads named holders ordered by rank asc (nulls excluded); this
-- partial index keeps that ordering cheap.
create index if not exists users_price_hold_rank_idx
  on public.users (price_hold_rank)
  where price_hold_rank is not null;
