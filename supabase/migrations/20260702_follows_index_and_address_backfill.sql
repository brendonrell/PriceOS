-- ════════════════════════════════════════════════════════════════════════
--  FOLLOWS — reverse-lookup index + address-column backfill (launch fixes)
--  2026-07-02 ·
--  1. "Who follows X" (following_name filter) is the hottest social query —
--     follow buttons, profile counts, circle-stats, cartel — and the only
--     name index was the composite (follower_name, following_name), which
--     can't serve a following_name-only filter. Sequential scan every time.
--  2. The API historically wrote follows rows NAME-ONLY, leaving
--     follower_address/following_address NULL — which kept the DB's
--     rename-sync trigger, user-deletion cascades, and self-follow CHECK
--     dead (NULLs match nothing). The API now writes both columns on every
--     new edge; this backfills the existing rows from users by handle so
--     the whole graph is covered.
--  Additive; applied live 2026-07-02 (Brendon's "fix all of these" go).
-- ════════════════════════════════════════════════════════════════════════

create index if not exists follows_following_name_idx
  on public.follows (following_name);

update public.follows f
set follower_address = u.address
from public.users u
where f.follower_address is null
  and u.handle = f.follower_name;

update public.follows f
set following_address = u.address
from public.users u
where f.following_address is null
  and u.handle = f.following_name;
