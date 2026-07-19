-- THE COUNTING HOUSE — gnome deals (Brendon, 2026-07-19: gnomes are a
-- NO-FEE system — "gnome ore fees"). A deal is struck against a hung sign:
-- the buyer pays the seller's ask straight to the seller's wallet (100%,
-- no platform cut, no custody), tagged with the deal id; the confirm step
-- verifies the payment on-chain and flips the gnome. Deals are written by
-- the SIWE-guarded deal route only.
create table if not exists public.gnome_deals (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  seller_address text not null,
  buyer_address text not null,
  ask_eth numeric not null,
  status text not null default 'open', -- open | settled
  tx_hash text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

alter table public.gnome_deals enable row level security;

-- Deal history is public record (the hill keeps open books); writes are
-- service-role only (no insert/update policies).
drop policy if exists gnome_deals_read on public.gnome_deals;
create policy gnome_deals_read on public.gnome_deals for select to anon, authenticated using (true);

create index if not exists gnome_deals_project_idx on public.gnome_deals (project_id);
create index if not exists gnome_deals_buyer_idx on public.gnome_deals (buyer_address);
-- One payment settles at most one deal, ever.
create unique index if not exists gnome_deals_tx_idx on public.gnome_deals (tx_hash) where tx_hash is not null;
