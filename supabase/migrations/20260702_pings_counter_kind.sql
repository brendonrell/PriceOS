-- COUNTER ping kind — the owner counters an offer with their price
-- (the community's price-discussion move, now a first-class ping).
-- APPLIED LIVE 2026-07-02 (pings_counter_kind).
alter table public.pings drop constraint if exists pings_kind_check;
alter table public.pings add constraint pings_kind_check check (kind in (
  'PING','FOLLOW','PROJECT_FOLLOW','OUTPUT_FOLLOW','ACHIEVEMENT','STREAK',
  'MINT','SALE','OFFER','OFFER_ACCEPTED','COUNTER','XFER','WISHLIST_HIT','WATCH_HIT'
));
