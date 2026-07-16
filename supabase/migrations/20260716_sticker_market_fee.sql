-- STICKER SECONDARY FEE — 5% on every money trade, the art split: 3% creator
-- + 2% platform (Brendon, 2026-07-16). The creator share defaults to
-- Brendon's personal wallet; a sheet with a collab row (set from Sticker
-- Studio — collector collabs) routes its 3% to that collaborator instead.
-- Swaps and gifts move no money → no fee, unchanged.
--
-- ⛔ NOT YET APPLIED — apply live at the ship, together with the dev push
-- (the deployed app calls these RPCs the moment they change).

-- Fee routing config — one row, editable without a deploy.
create table public.sticker_fee_config (
  id integer primary key check (id = 1),
  creator_address text not null,   -- default 3% recipient (no collab on the sheet)
  platform_address text not null,  -- 2% recipient, always
  updated_at timestamptz not null default now()
);
insert into public.sticker_fee_config (id, creator_address, platform_address) values
  (1,
   '0x65c34afda745c12745db70ffa809311339279395',  -- @brendon (personal wallet)
   '0x146034ec25c277f30f63933b151297689e15b9b8'); -- @pricediscussion (platform)

-- Collector collabs — a sheet with a row here pays its 3% to the collaborator.
create table public.sticker_sheet_collabs (
  sheet_id text primary key,
  collab_address text not null,
  collab_handle text,
  added_by text not null,
  created_at timestamptz not null default now()
);

alter table public.sticker_fee_config enable row level security;
alter table public.sticker_sheet_collabs enable row level security;
-- Service-role only (no policies) — every read/write rides the API.

-- Resolve the 3%/2% recipients for a sheet. definer + locked like the money
-- RPCs that call it.
create or replace function public.sticker_fee_recipients(p_sheet text)
 returns table (creator_address text, platform_address text)
 language sql
 security definer
 set search_path to 'public', 'pg_catalog'
 stable
as $function$
  select coalesce(c.collab_address, f.creator_address), f.platform_address
    from sticker_fee_config f
    left join sticker_sheet_collabs c on c.sheet_id = p_sheet
   where f.id = 1;
$function$;

-- ── app_sticker_buy — unchanged mechanics + the 5% fee on settlement ─────────
create or replace function public.app_sticker_buy(p_buyer text, p_listing uuid, p_qty integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_sheet text; v_seller text; v_price numeric; v_qty int; v_end int;
  v_total numeric; v_bbal numeric; v_bhas boolean; v_sbal numeric;
  v_creator text; v_platform text;
  v_fee_creator numeric; v_fee_platform numeric; v_net numeric; v_bal numeric;
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
  -- The 5% (buyer pays gross; seller nets 95%; 3% creator/collab + 2% platform).
  select f.creator_address, f.platform_address into v_creator, v_platform
    from sticker_fee_recipients(v_sheet) f;
  v_fee_creator  := round(v_total * 0.03, 12);
  v_fee_platform := round(v_total * 0.02, 12);
  v_net := v_total - v_fee_creator - v_fee_platform;

  select sim_eth_balance into v_bbal from users where address = p_buyer for update;
  v_bhas := found;
  if v_bhas then
    v_bbal := coalesce(v_bbal, 0);
    if v_bbal < v_total then return jsonb_build_object('error','insufficient_balance'); end if;
    update users set sim_eth_balance = v_bbal - v_total where address = p_buyer;
  end if;
  select sim_eth_balance into v_sbal from users where address = v_seller for update;
  if found then update users set sim_eth_balance = coalesce(v_sbal,0) + v_net where address = v_seller; end if;
  if v_creator is not null then
    select sim_eth_balance into v_bal from users where address = v_creator for update;
    if found then update users set sim_eth_balance = coalesce(v_bal,0) + v_fee_creator where address = v_creator; end if;
  end if;
  if v_platform is not null then
    select sim_eth_balance into v_bal from users where address = v_platform for update;
    if found then update users set sim_eth_balance = coalesce(v_bal,0) + v_fee_platform where address = v_platform; end if;
  end if;

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

-- ── app_sticker_accept — unchanged mechanics + the same 5% fee ───────────────
create or replace function public.app_sticker_accept(p_seller text, p_offer uuid, p_qty integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_sheet text; v_bidder text; v_price numeric; v_qty int; v_status text; v_end int;
  v_have int; v_total numeric; v_bbal numeric; v_sbal numeric;
  v_creator text; v_platform text;
  v_fee_creator numeric; v_fee_platform numeric; v_net numeric; v_bal numeric;
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
  select f.creator_address, f.platform_address into v_creator, v_platform
    from sticker_fee_recipients(v_sheet) f;
  v_fee_creator  := round(v_total * 0.03, 12);
  v_fee_platform := round(v_total * 0.02, 12);
  v_net := v_total - v_fee_creator - v_fee_platform;

  select sim_eth_balance into v_bbal from users where address = v_bidder for update;
  if found then update users set sim_eth_balance = coalesce(v_bbal,0) - v_total where address = v_bidder; end if;
  select sim_eth_balance into v_sbal from users where address = p_seller for update;
  if found then update users set sim_eth_balance = coalesce(v_sbal,0) + v_net where address = p_seller; end if;
  if v_creator is not null then
    select sim_eth_balance into v_bal from users where address = v_creator for update;
    if found then update users set sim_eth_balance = coalesce(v_bal,0) + v_fee_creator where address = v_creator; end if;
  end if;
  if v_platform is not null then
    select sim_eth_balance into v_bal from users where address = v_platform for update;
    if found then update users set sim_eth_balance = coalesce(v_bal,0) + v_fee_platform where address = v_platform; end if;
  end if;

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

-- Same grant posture as every money RPC (server only).
REVOKE EXECUTE ON FUNCTION public.sticker_fee_recipients(text)                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.app_sticker_buy(text, uuid, integer)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.app_sticker_accept(text, uuid, integer)     FROM PUBLIC, anon, authenticated;
