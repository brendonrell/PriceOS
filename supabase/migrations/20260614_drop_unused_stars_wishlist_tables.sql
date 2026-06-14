-- ════════════════════════════════════════════════════════════════════════
--  CLEANUP · Remove the unused stars / wishlist tables
--  2026-06-14 · Applied live to zspxpfwlwikdxwavffjn.
--
--  Stars and Wishlist are intentionally PRIVATE per-user lists, stored in the
--  users.settings envelope (localStorage-first, write-through for cross-device
--  sync — see PersistedSettings.starred / .wishlist in lib/supabase.ts) so a
--  visitor can never see what you starred or want to buy.
--
--  These two standalone tables were old scaffolding for that feature, never
--  wired to any producer or reader: both 0 rows, no foreign-key dependents.
--  They also had RLS enabled with no read policy, so they showed up in audits
--  as "no public access" noise. Drop them so the schema reflects reality.
-- ════════════════════════════════════════════════════════════════════════
drop table if exists public.stars;
drop table if exists public.wishlist;
