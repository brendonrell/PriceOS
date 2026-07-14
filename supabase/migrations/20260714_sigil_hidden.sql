-- MIRROR of live migration add_sigil_hidden_to_users (applied 2026-07-14).
-- The Supabase-side history is the applied record; this file is the git mirror.
--
-- Sigil visibility — the platform-wide show/hide toggle, flipped from the Forge.
-- Default false (shown). Written via the /api/me guarded service-role route only
-- (SIWE-authed, keyed on the session address); read publicly through
-- PUBLIC_USER_COLUMNS so every viewer's profile render respects the owner's
-- choice — hiding removes the mark for everyone, not just the owner's own view.
alter table public.users
  add column if not exists sigil_hidden boolean not null default false;

-- Public reads select PUBLIC_USER_COLUMNS via the anon client; a listed column
-- with no SELECT grant makes Postgres refuse the whole query. Match
-- sigil_forged_at's column-level SELECT so sigil_hidden reads publicly.
grant select (sigil_hidden) on public.users to anon;
grant select (sigil_hidden) on public.users to authenticated;
