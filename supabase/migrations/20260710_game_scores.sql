-- MIRROR of live migration 20260710122100_game_scores_table (backfilled into
-- the repo 2026-07-13 — hardening item 11; the Supabase-side history is the
-- applied record, this file is the git mirror).
-- Lane Runner (and future minigame) best scores — one row per (game, wallet).
-- Writes go through the app's service-role API route only (SIWE-authed);
-- clients read via RLS SELECT grants (TO anon / TO authenticated, never public).
create table if not exists public.game_scores (
  game text not null,
  address text not null,
  best integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (game, address)
);

alter table public.game_scores enable row level security;

create policy "game_scores_select_anon" on public.game_scores
  for select to anon using (true);

create policy "game_scores_select_authed" on public.game_scores
  for select to authenticated using (true);

create index if not exists game_scores_top_idx
  on public.game_scores (game, best desc);
