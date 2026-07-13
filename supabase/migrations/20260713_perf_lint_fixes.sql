-- MIRROR of live migration 20260713…_perf_lint_fixes_initplan_fks_follows_pk
-- (applied 2026-07-13 — hardening item 10, Architect Report §4.6).
-- 1) RLS initplan: wrap current_setting() in (SELECT …) on the 15 flagged
--    policies — evaluates once per statement instead of once per row.
-- 2) Covering indexes for the 3 unindexed foreign keys.
-- 3) follows primary key (table verified empty, 0 dupes at apply time).
-- Deliberately NOT dropping the advisor's "unused" indexes: pre-launch stats
-- are immature and several flagged indexes are days old. Revisit post-launch.

ALTER POLICY album_items_own_only ON public.album_items
  USING ((SELECT albums.user_address FROM albums WHERE albums.id = album_items.album_id)
         = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY albums_own_only ON public.albums
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY bench_own_only ON public.bench_items
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY budgets_own_only ON public.budgets
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY cart_own_only ON public.cart_items
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY follows_delete_own ON public.follows
  USING (follower_address = (SELECT users.address FROM users
         WHERE users.address = (SELECT current_setting('app.current_user_address'::text, true))));
ALTER POLICY follows_insert_own ON public.follows
  WITH CHECK (follower_address = (SELECT users.address FROM users
              WHERE users.address = (SELECT current_setting('app.current_user_address'::text, true))));
ALTER POLICY grail_pins_own_only ON public.grail_pins
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY muted_own_only ON public.muted
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY notes_own_only ON public.notes
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY portfolio_items_own_only ON public.portfolio_items
  USING ((SELECT portfolios.user_address FROM portfolios WHERE portfolios.id = portfolio_items.portfolio_id)
         = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY portfolios_own_only ON public.portfolios
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY price_anchors_own_only ON public.price_anchors
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY starred_artists_own_only ON public.starred_artists
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));
ALTER POLICY todos_own_only ON public.todos
  USING (user_address = (SELECT current_setting('app.current_user_address'::text, true)))
  WITH CHECK (user_address = (SELECT current_setting('app.current_user_address'::text, true)));

CREATE INDEX IF NOT EXISTS muted_muted_address_idx ON public.muted (muted_address);
CREATE INDEX IF NOT EXISTS pings_project_id_idx ON public.pings (project_id);
CREATE INDEX IF NOT EXISTS season_standings_user_idx ON public.season_standings (user_address);

ALTER TABLE public.follows ADD PRIMARY KEY (follower_address, following_address);
