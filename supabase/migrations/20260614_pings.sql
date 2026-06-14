-- ════════════════════════════════════════════════════════════════════════
--  PINGS — the unified platform notification spine
--  2026-06-14 · one table for every DIRECTED notification (followed you,
--  collected / offered on / bought your piece, offer accepted, achievement,
--  person-to-person). The BROADCAST firehose ("someone you follow dropped X",
--  watchlist-sold) is NOT stored here — it is computed at read time off the
--  shared `events` table joined to the viewer's follow graph (see the Pings
--  read API), so a high-follower account acting writes ZERO extra rows.
--
--  Applied to Supabase project zspxpfwlwikdxwavffjn ONLY on Brendon's go.
--  Idempotent (IF NOT EXISTS / guards) so it's safe to re-run.
--  RLS pattern matches the repo: SELECT granted TO anon, authenticated (never
--  public). The inbox is PRIVATE — reads go through the SIWE-gated /api/pings
--  routes which enforce recipient === authed-address in app code on the
--  service-role client (the same trust boundary the rest of the API uses).
-- ════════════════════════════════════════════════════════════════════════

-- ── 0. Retire the two stale, empty placeholder tables ──────────────────────
-- Both are 0 rows (never wired to a producer) so there is no data to migrate.
-- The old `notifications` table was welded to `events` by a NOT-NULL FK, which
-- can't represent achievements / p2p / streak pings (they have no event row);
-- the old `pings` table was shaped only for p2p DMs. One unified table replaces
-- both and keeps the read path a single query.
drop table if exists public.notifications cascade;
drop table if exists public.pings cascade;

-- ── 1. PINGS — the directed inbox ──────────────────────────────────────────
create table if not exists public.pings (
  id                uuid primary key default gen_random_uuid(),

  -- WHO sees it. The only column the hot query filters on.
  recipient_address text not null references public.users(address) on delete cascade,

  -- WHAT kind. CHECK is the enum (cheaper to evolve than a pg enum type —
  -- adding a kind is a one-line swap, no type migration). Covers everything.
  kind text not null check (kind in (
    'PING',            -- person-to-person message
    'FOLLOW',          -- someone followed you
    'PROJECT_FOLLOW',  -- someone followed your project
    'ACHIEVEMENT',     -- you unlocked an achievement
    'STREAK',          -- a streak milestone
    'MINT',            -- someone collected from your project
    'SALE',            -- your listed piece sold
    'OFFER',           -- someone offered on your piece
    'OFFER_ACCEPTED',  -- your offer was accepted
    'XFER',            -- a transfer involving you
    'WISHLIST_HIT',    -- something you wishlisted moved (future slice)
    'WATCH_HIT'        -- something you watch moved (future slice)
  )),

  -- WHO did it — snapshotted at write time so the feed never needs a join and
  -- stays correct even if the actor later renames / unclaims their @name.
  actor_address     text,
  actor_name        text,                       -- @handle snapshot, nullable pre-claim

  -- Optional market / context anchors (all nullable — a FOLLOW/PING has none).
  project_id        text references public.projects(id) on delete cascade,
  token_id          text,
  amount_eth        numeric,                     -- offer / sale price; numeric for precision

  -- Free-form payload for anything the columns don't cover (message body,
  -- achievement_id, rollup actor list, etc.). Keep it SMALL.
  data              jsonb not null default '{}'::jsonb,

  -- Rollup key. Same key + still-unread within a window = bump count, don't
  -- insert. e.g. 'MINT:oracle:14' → "alex +12 others collected #14".
  group_key         text,

  read              boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- HOT QUERY: "this recipient's feed, newest first" + the unread-only slice.
create index if not exists pings_recipient_recent_idx
  on public.pings (recipient_address, created_at desc);
create index if not exists pings_recipient_unread_idx
  on public.pings (recipient_address, created_at desc)
  where read = false;
-- Rollup lookup: find an existing un-read group row to bump.
create index if not exists pings_group_idx
  on public.pings (recipient_address, group_key, created_at desc)
  where group_key is not null;
-- Prune scan path (delete read + old).
create index if not exists pings_prune_idx
  on public.pings (created_at)
  where read = true;

alter table public.pings enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='pings' and policyname='pings_read'
  ) then
    create policy "pings_read" on public.pings
      for select to anon, authenticated using (true);
  end if;
end $$;

-- ── 2. PING CURSORS — broadcast-feed read watermark ────────────────────────
-- One tiny row per user. The broadcast firehose has no per-user rows to flag
-- read, so "unread" for that stream = events newer than this watermark. Opening
-- the Pings panel bumps it to now(). Stored as unix seconds to compare directly
-- against events.timestamp (which is int seconds).
create table if not exists public.ping_cursors (
  user_address      text primary key references public.users(address) on delete cascade,
  broadcast_seen_at bigint not null default extract(epoch from now())::bigint,
  updated_at        timestamptz not null default now()
);

alter table public.ping_cursors enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='ping_cursors' and policyname='ping_cursors_read'
  ) then
    create policy "ping_cursors_read" on public.ping_cursors
      for select to anon, authenticated using (true);
  end if;
end $$;

-- ── 3. RETENTION — prune read pings after 30 days ──────────────────────────
-- Primary defence is opportunistic pruning inside the createPing() helper (runs
-- with no scheduler, survives a paused free-tier project). This pg_cron job is
-- the belt-and-suspenders nightly sweep; both target the same predicate so
-- they're idempotent. Guarded so a re-run doesn't error if already scheduled.
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if not exists (select 1 from cron.job where jobname = 'prune_pings') then
      perform cron.schedule(
        'prune_pings', '17 4 * * *',
        $prune$ delete from public.pings
                where read = true and created_at < now() - interval '30 days' $prune$
      );
    end if;
  end if;
exception when others then
  -- pg_cron not permitted on this tier / already managed — opportunistic prune
  -- in createPing() covers retention regardless. Never block the migration.
  null;
end $$;
