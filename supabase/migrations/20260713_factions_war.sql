-- FACTIONS · MARGINALIA · THE WAR — working spec v3.1 (2026-07-13 build).
--
-- Architecture principle (spec §5): ONE new write path — the marks chain,
-- fed by the ownership changes the events ledger already records. Everything
-- else (grip, sieges, conquests, corners, Pedigree, Spread, titles, grudges)
-- is DERIVED. The war tables below are the derivation's memory (sieges need a
-- raised-at instant, the Book is permanent history) — they are written ONLY
-- by the war sweep (service role), never by users.
--
-- RLS: SELECT to anon + authenticated (the war record is public, like the
-- ledger it derives from). All writes are service-role only.

-- ── The marks chain — the art remembers every hand ─────────────────────────
create table if not exists public.marks (
  project_id   text not null,
  token_id     text not null,
  seq          integer not null,
  owner_address text not null,
  -- MINT = the founding hand · SOLD = marketplace sale (strikes deep) ·
  -- PASSED = private/unpriced transfer (lands faint)
  kind         text not null check (kind in ('MINT','SOLD','PASSED')),
  -- struck = erased to the crypt when the margin overflowed (still counted
  -- for one-mark-per-wallet dedup; render from marks_crypt).
  struck       boolean not null default false,
  ts           integer not null,
  primary key (project_id, token_id, seq),
  unique (project_id, token_id, owner_address)
);

create table if not exists public.marks_crypt (
  project_id    text not null,
  token_id      text not null,
  owner_address text not null,
  original_seq  integer not null,
  struck_at     timestamptz not null default now(),
  struck_by     text,
  primary key (project_id, token_id, owner_address)
);

-- ── The oath ledger — one row per wallet that ever enlisted ────────────────
create table if not exists public.faction_oaths (
  address       text primary key,
  faction       text not null,
  -- Time-under-flag accrues from here. Defection resets it.
  sworn_at      timestamptz not null default now(),
  prev_faction  text,
  defected_at   timestamptz,
  -- Scars are permanent.
  defections    integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- ── Per-collection war state — written by the sweep, read by everything ────
create table if not exists public.war_state (
  project_id     text primary key,
  -- OPEN (no hold) · HELD · STRONGHOLD · CONQUERED
  status         text not null default 'OPEN',
  leader_faction text,
  leader_since   timestamptz,
  -- Live siege (null when quiet). The challenger must hold the line for the
  -- full window before the corner falls — no sniping.
  siege_faction  text,
  siege_since    timestamptz,
  conquered_by   text,
  conquered_at   timestamptz,
  -- The sweep's computed grips per faction: { "GOLD": 123.4, ... } plus
  -- per-faction member/piece counts for the read routes.
  grips          jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- ── The Book of Conquests — permanent, chronicled in Ages ──────────────────
create table if not exists public.book_of_conquests (
  id          bigint generated always as identity primary key,
  age         integer not null default 1,
  -- AGE_DECLARED · SIEGE_RAISED · SIEGE_REPELLED · CONQUEST · STRONGHOLD ·
  -- STONE_STRUCK · RELIC_SEALED
  kind        text not null,
  project_id  text,
  token_id    text,
  faction     text,
  rival       text,
  -- The chronicle line (templated, mono, dated, permanent).
  line        text not null,
  ts          timestamptz not null default now()
);
create index if not exists book_of_conquests_ts_idx on public.book_of_conquests (ts desc);

-- ── Sweep memory (watermark + current Age) ──────────────────────────────────
create table if not exists public.war_meta (
  key   text primary key,
  value jsonb not null
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.marks enable row level security;
alter table public.marks_crypt enable row level security;
alter table public.faction_oaths enable row level security;
alter table public.war_state enable row level security;
alter table public.book_of_conquests enable row level security;
alter table public.war_meta enable row level security;

drop policy if exists marks_read on public.marks;
create policy marks_read on public.marks for select to anon, authenticated using (true);
drop policy if exists marks_crypt_read on public.marks_crypt;
create policy marks_crypt_read on public.marks_crypt for select to anon, authenticated using (true);
drop policy if exists faction_oaths_read on public.faction_oaths;
create policy faction_oaths_read on public.faction_oaths for select to anon, authenticated using (true);
drop policy if exists war_state_read on public.war_state;
create policy war_state_read on public.war_state for select to anon, authenticated using (true);
drop policy if exists book_read on public.book_of_conquests;
create policy book_read on public.book_of_conquests for select to anon, authenticated using (true);
-- war_meta: no public read (sweep internals).
