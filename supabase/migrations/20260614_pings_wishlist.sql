-- ════════════════════════════════════════════════════════════════════════
--  PINGS — wishlist-hit reverse lookup index
--  2026-06-14 · supports "who is wishlisting this token" so a listing / sale on
--  a wishlisted piece can ping its wishlisters (lib/pings/wishlist.ts).
--
--  Wishlists live per-user in users.settings.wishlist as `${slug}:${id}` keys.
--  The lookup is a jsonb-containment query:
--    select address from users where settings @> '{"wishlist":["oracle:14"]}'
--  A GIN index with jsonb_path_ops makes that @> probe fast as the user table
--  grows. Idempotent; applied to live only on Brendon's go.
-- ════════════════════════════════════════════════════════════════════════

create index if not exists users_settings_wishlist_gin
  on public.users using gin ((settings) jsonb_path_ops);
