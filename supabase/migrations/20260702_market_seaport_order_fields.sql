-- Seaport order layer on the existing market tables (additive; sim rows
-- untouched). APPLIED LIVE 2026-07-02 (market_seaport_order_fields).
--
-- listings/offers gain the signed-order fields so a row can carry a real
-- Seaport order (hash + full signed JSON + validity window + currency) while
-- sim rows keep working with all of it null. `source` says which rail wrote
-- the row: 'sim' | 'seaport' (ours) | 'opensea' (ingested later via API).
-- projects.royalty_receiver caches the per-project PaymentSplitter address
-- (read once from royaltyInfo on chain) so order validation doesn't RPC on
-- every post.

alter table public.listings
  add column if not exists order_hash text,
  add column if not exists order_json jsonb,
  add column if not exists start_time integer,
  add column if not exists end_time integer,
  add column if not exists currency text not null default 'ETH',
  add column if not exists source text not null default 'sim',
  add column if not exists tx_hash text;

create unique index if not exists listings_order_hash_uniq
  on public.listings (order_hash) where order_hash is not null;
create index if not exists listings_active_end_idx
  on public.listings (active, end_time);

-- Criteria offers (collection / trait) have no single token.
alter table public.offers alter column token_id drop not null;

alter table public.offers
  add column if not exists order_hash text,
  add column if not exists order_json jsonb,
  add column if not exists start_time integer,
  add column if not exists end_time integer,
  add column if not exists currency text not null default 'ETH',
  add column if not exists source text not null default 'sim',
  add column if not exists scope text not null default 'item',
  add column if not exists criteria jsonb,
  add column if not exists tx_hash text;

create unique index if not exists offers_order_hash_uniq
  on public.offers (order_hash) where order_hash is not null;
create index if not exists offers_project_status_scope_idx
  on public.offers (project_id, status, scope);
create index if not exists offers_bidder_idx
  on public.offers (bidder_address, status);

alter table public.projects
  add column if not exists royalty_receiver text;
