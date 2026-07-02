-- STICKER SECONDARY — the in-store sheet market (ERC-1155 semantics: balances,
-- quantities, partial fills). APPLIED LIVE 2026-07-02 (sticker_market).
-- Own tables — sheet copies are fungible; the art market's one-owner-per-token
-- model doesn't fit. Service-role only (RLS on, no policies): every read/write
-- rides the API. Listing escrow: LIST decrements the seller's holding; CANCEL
-- returns it. Prices are PER SHEET; fills can be partial.

create table public.sticker_holdings (
  owner_address text not null,
  sheet_id text not null,
  qty integer not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_address, sheet_id)
);

create table public.sticker_listings (
  id uuid primary key default gen_random_uuid(),
  sheet_id text not null,
  seller_address text not null,
  price_eth numeric not null check (price_eth > 0),  -- PER SHEET
  qty integer not null check (qty > 0),              -- remaining
  qty_start integer not null check (qty_start > 0),
  active boolean not null default true,
  end_time integer,
  currency text not null default 'ETH',
  source text not null default 'sim',
  order_hash text,
  order_json jsonb,
  tx_hash text,
  created_at timestamptz not null default now()
);
create index sticker_listings_sheet_idx on public.sticker_listings (sheet_id, active, price_eth);

create table public.sticker_offers (
  id uuid primary key default gen_random_uuid(),
  sheet_id text not null,
  bidder_address text not null,
  price_eth numeric not null check (price_eth > 0),  -- PER SHEET
  qty integer not null check (qty > 0),              -- remaining
  qty_start integer not null check (qty_start > 0),
  status text not null default 'open',
  end_time integer,
  currency text not null default 'ETH',
  source text not null default 'sim',
  order_hash text,
  order_json jsonb,
  tx_hash text,
  created_at timestamptz not null default now()
);
create index sticker_offers_sheet_idx on public.sticker_offers (sheet_id, status, price_eth);

create table public.sticker_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('CLAIM','LIST','OFFER','SALE')),
  sheet_id text not null,
  from_address text,
  to_address text,
  qty integer not null default 1,
  price_eth numeric,           -- PER SHEET (SALE/LIST/OFFER)
  timestamp integer not null,
  tx_hash text
);
create index sticker_events_sheet_idx on public.sticker_events (sheet_id, timestamp desc);

alter table public.sticker_holdings enable row level security;
alter table public.sticker_listings enable row level security;
alter table public.sticker_offers enable row level security;
alter table public.sticker_events enable row level security;

-- Atomic sheet buy: partial fills allowed, sim balance moves, holdings move.
create or replace function public.app_sticker_buy(p_buyer text, p_listing uuid, p_qty integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_sheet text; v_seller text; v_price numeric; v_qty int; v_end int;
  v_total numeric; v_bbal numeric; v_bhas boolean; v_sbal numeric;
  v_ts int := floor(extract(epoch from now()))::int;
begin
  if p_qty is null or p_qty < 1 then return jsonb_build_object('error','bad_qty'); end if;
  select sheet_id, seller_address, price_eth, qty, end_time
    into v_sheet, v_seller, v_price, v_qty, v_end
    from sticker_listings where id = p_listing and active = true for update;
  if not found then return jsonb_build_object('error','not_listed'); end if;
  if v_end is not null and v_end <= v_ts then return jsonb_build_object('error','not_listed'); end if;
  if lower(v_seller) = lower(p_buyer) then return jsonb_build_object('error','own_listing'); end if;
  if p_qty > v_qty then return jsonb_build_object('error','not_enough'); end if;

  v_total := v_price * p_qty;
  select sim_eth_balance into v_bbal from users where address = p_buyer for update;
  v_bhas := found;
  if v_bhas then
    v_bbal := coalesce(v_bbal, 0);
    if v_bbal < v_total then return jsonb_build_object('error','insufficient_balance'); end if;
    update users set sim_eth_balance = v_bbal - v_total where address = p_buyer;
  end if;
  select sim_eth_balance into v_sbal from users where address = v_seller for update;
  if found then update users set sim_eth_balance = coalesce(v_sbal,0) + v_total where address = v_seller; end if;

  -- Seller escrowed nothing: their holding decremented at LIST time.
  insert into sticker_holdings(owner_address, sheet_id, qty)
    values (p_buyer, v_sheet, p_qty)
    on conflict (owner_address, sheet_id) do update
    set qty = sticker_holdings.qty + excluded.qty, updated_at = now();

  update sticker_listings
    set qty = qty - p_qty, active = (qty - p_qty) > 0
    where id = p_listing;

  insert into sticker_events(type, sheet_id, from_address, to_address, qty, price_eth, timestamp)
    values ('SALE', v_sheet, v_seller, p_buyer, p_qty, v_price, v_ts);

  return jsonb_build_object('ok', true, 'bought', p_qty, 'total', v_total, 'sheet', v_sheet, 'seller', v_seller);
end; $function$;

-- Atomic offer accept: seller (any holder with qty) sells into a standing bid.
create or replace function public.app_sticker_accept(p_seller text, p_offer uuid, p_qty integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_sheet text; v_bidder text; v_price numeric; v_qty int; v_status text; v_end int;
  v_have int; v_total numeric; v_bbal numeric; v_sbal numeric;
  v_ts int := floor(extract(epoch from now()))::int;
begin
  if p_qty is null or p_qty < 1 then return jsonb_build_object('error','bad_qty'); end if;
  select sheet_id, bidder_address, price_eth, qty, status, end_time
    into v_sheet, v_bidder, v_price, v_qty, v_status, v_end
    from sticker_offers where id = p_offer for update;
  if not found or v_status <> 'open' then return jsonb_build_object('error','offer_not_open'); end if;
  if v_end is not null and v_end <= v_ts then return jsonb_build_object('error','offer_not_open'); end if;
  if lower(v_bidder) = lower(p_seller) then return jsonb_build_object('error','own_offer'); end if;
  if p_qty > v_qty then return jsonb_build_object('error','not_enough'); end if;

  select qty into v_have from sticker_holdings
    where owner_address = p_seller and sheet_id = v_sheet for update;
  if not found or v_have < p_qty then return jsonb_build_object('error','not_owner'); end if;

  v_total := v_price * p_qty;
  select sim_eth_balance into v_bbal from users where address = v_bidder for update;
  if found then update users set sim_eth_balance = coalesce(v_bbal,0) - v_total where address = v_bidder; end if;
  select sim_eth_balance into v_sbal from users where address = p_seller for update;
  if found then update users set sim_eth_balance = coalesce(v_sbal,0) + v_total where address = p_seller; end if;

  update sticker_holdings set qty = qty - p_qty, updated_at = now()
    where owner_address = p_seller and sheet_id = v_sheet;
  insert into sticker_holdings(owner_address, sheet_id, qty)
    values (v_bidder, v_sheet, p_qty)
    on conflict (owner_address, sheet_id) do update
    set qty = sticker_holdings.qty + excluded.qty, updated_at = now();

  update sticker_offers
    set qty = qty - p_qty, status = case when (qty - p_qty) > 0 then 'open' else 'accepted' end
    where id = p_offer;

  insert into sticker_events(type, sheet_id, from_address, to_address, qty, price_eth, timestamp)
    values ('SALE', v_sheet, p_seller, v_bidder, p_qty, v_price, v_ts);

  return jsonb_build_object('ok', true, 'sold', p_qty, 'total', v_total, 'sheet', v_sheet, 'bidder', v_bidder);
end; $function$;
