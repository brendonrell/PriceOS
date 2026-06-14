-- ════════════════════════════════════════════════════════════════════════
--  PriceRank + Social Graph migration  (STAGED — not yet applied to live DB)
--  2026-06-14 · the PriceScore / PriceRank / PriceStreak / Achievements build,
--  project @names, project-follow graph, and the anointing system.
--
--  Applied to Supabase project zspxpfwlwikdxwavffjn ONLY on Brendon's go.
--  Idempotent (IF NOT EXISTS / IF NOT EXISTS guards) so it's safe to re-run.
--  RLS pattern matches the repo: SELECT granted TO anon, authenticated (never
--  public). All WRITES happen via the service-role client in the API, which
--  bypasses RLS — so no INSERT/UPDATE/DELETE policies are needed here.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. PROJECT @name (the shared /@name pool, alongside users.handle) ───────
-- citext = case-insensitive uniqueness, same as users.handle. Uniqueness is
-- enforced PER TABLE here; the cross-table (user vs project) collision check is
-- done in the app at claim time (see lib/project/projectHandle.ts).
alter table public.projects
  add column if not exists handle citext unique;

-- Backfill the 50 existing test projects from their title using the locked
-- derivation (lowercase + strip spaces). Only fills rows where handle is null
-- and the derived slug is non-empty + collision-free. Real uploads set this
-- explicitly via the upload flow.
update public.projects p
set handle = lower(regexp_replace(p.title, '\s+', '', 'g'))
where p.handle is null
  and length(regexp_replace(p.title, '\s+', '', 'g')) between 3 and 20
  and not exists (
    select 1 from public.projects q
    where q.id <> p.id
      and q.handle = lower(regexp_replace(p.title, '\s+', '', 'g'))
  )
  and not exists (
    select 1 from public.users u
    where u.handle = lower(regexp_replace(p.title, '\s+', '', 'g'))
  );

-- ── 2. PROJECT-FOLLOW graph (user → project) ───────────────────────────────
-- Mirrors public.follows: keyed on address (FK to users), with a nullable
-- @name snapshot for display. follower_name is null pre-claim (no @name yet).
create table if not exists public.project_follows (
  follower_address text not null references public.users(address) on delete cascade,
  follower_name    text,
  project_id       text not null references public.projects(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (follower_address, project_id)
);
create index if not exists project_follows_project_idx
  on public.project_follows (project_id);

alter table public.project_follows enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_follows'
      and policyname = 'project_follows_read'
  ) then
    create policy "project_follows_read" on public.project_follows
      for select to anon, authenticated using (true);
  end if;
end $$;

-- ── 3. ANOINTING (a user anoints a specific piece/output) ──────────────────
-- One anoint per (user, piece). Mirrors the stars table shape.
create table if not exists public.anointments (
  user_address text not null references public.users(address) on delete cascade,
  project_id   text not null references public.projects(id) on delete cascade,
  token_id     text not null,
  created_at   timestamptz not null default now(),
  primary key (user_address, project_id, token_id)
);
-- Count anoints received on a piece, and find the piece's owner for "Blessed".
create index if not exists anointments_piece_idx
  on public.anointments (project_id, token_id);
create index if not exists anointments_user_idx
  on public.anointments (user_address);

alter table public.anointments enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'anointments'
      and policyname = 'anointments_read'
  ) then
    create policy "anointments_read" on public.anointments
      for select to anon, authenticated using (true);
  end if;
end $$;

-- ── 4. USER PROGRESSION columns ────────────────────────────────────────────
--   price_score  — the NUMBER (sum of unlocked achievement points).
--   price_rank   — already exists; now used as the TIER derived from price_score.
--   price_streak — current PriceStreak day count (0 until a qualifying day).
--   streak_best  — longest streak ever reached (for the record / display only;
--                  it does NOT bank Score — a broken streak still resets to 0).
--   streak_last_active — the user's last qualifying-action LOCAL date (the
--                  streak day boundary is local midnight, stored as a date).
alter table public.users add column if not exists price_score        integer not null default 0;
alter table public.users add column if not exists price_streak       integer not null default 0;
alter table public.users add column if not exists streak_best        integer not null default 0;
alter table public.users add column if not exists streak_last_active date;

-- ── 5. ACHIEVEMENT UNLOCK ledger ───────────────────────────────────────────
-- One row per (user, achievement) the moment it unlocks. The achievement
-- DEFINITIONS live in code (lib/achievements/catalog.ts) — this table stores
-- only WHICH ids a user has unlocked + when. price_score is the summed cache.
create table if not exists public.user_achievements (
  user_address   text not null references public.users(address) on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_address, achievement_id)
);
create index if not exists user_achievements_user_idx
  on public.user_achievements (user_address);

alter table public.user_achievements enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_achievements'
      and policyname = 'user_achievements_read'
  ) then
    create policy "user_achievements_read" on public.user_achievements
      for select to anon, authenticated using (true);
  end if;
end $$;

-- ── 6. SEASONS (PriceRank ladder resets — scaffold for later) ──────────────
-- Minimal: a season is a window; final standings get snapshotted at close.
-- Wired now so the leaderboard/season achievements have a home; the reset job
-- lands in a later pass.
create table if not exists public.seasons (
  id         serial primary key,
  label      text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.season_standings (
  season_id    integer not null references public.seasons(id) on delete cascade,
  user_address text not null references public.users(address) on delete cascade,
  final_score  integer not null default 0,
  final_place  integer,
  primary key (season_id, user_address)
);
alter table public.seasons          enable row level security;
alter table public.season_standings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='seasons' and policyname='seasons_read') then
    create policy "seasons_read" on public.seasons for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='season_standings' and policyname='season_standings_read') then
    create policy "season_standings_read" on public.season_standings for select to anon, authenticated using (true);
  end if;
end $$;
