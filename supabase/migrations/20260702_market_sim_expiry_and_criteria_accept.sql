-- Sim-market money RPCs: expiry awareness + criteria-offer accept.
-- APPLIED LIVE 2026-07-02 (market_sim_expiry_and_criteria_accept).
--
-- 1) app_buy — expired sim listings (end_time set + past) are not buyable.
-- 2) app_accept_offer — expired offers are not acceptable; own-offer guard.
-- 3) app_accept_criteria_offer — NEW: collection/trait offers are accepted
--    WITH a specific token the owner holds. The API route validates trait
--    criteria before calling; the RPC re-checks ownership + offer state +
--    project scope atomically (row-locked, same discipline as app_buy).
--
-- All three are backward compatible: existing rows have null end_time.

create or replace function public.app_buy(p_buyer text, p_slug text, p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_price numeric; v_seller text; v_bbal numeric; v_bhas boolean; v_sbal numeric;
  v_ts int := floor(extract(epoch from now()))::int;
begin
  select price_eth, seller_address into v_price, v_seller
    from listings where project_id = p_slug and token_id = p_token and active = true
      and (end_time is null or end_time > v_ts) for update;
  if not found then return jsonb_build_object('error','not_listed'); end if;
  if lower(v_seller) = lower(p_buyer) then return jsonb_build_object('error','own_output'); end if;

  select sim_eth_balance into v_bbal from users where address = p_buyer for update;
  v_bhas := found;
  if v_bhas then
    v_bbal := coalesce(v_bbal, 0);
    if v_bbal < v_price then return jsonb_build_object('error','insufficient_balance'); end if;
  end if;

  update holders set owner_address = p_buyer where project_id = p_slug and token_id = p_token;
  update listings set active = false where project_id = p_slug and token_id = p_token;

  if v_bhas then update users set sim_eth_balance = v_bbal - v_price where address = p_buyer; end if;
  select sim_eth_balance into v_sbal from users where address = v_seller for update;
  if found then update users set sim_eth_balance = coalesce(v_sbal,0) + v_price where address = v_seller; end if;

  insert into events(type, project_id, token_id, from_address, to_address, price_eth, timestamp, sale_direction)
    values ('XFER', p_slug, p_token, v_seller, p_buyer, v_price, v_ts, 'LIST_FILL');

  return jsonb_build_object('ok', true, 'bought', v_price);
end; $function$;

create or replace function public.app_accept_offer(p_owner text, p_slug text, p_token text, p_offer_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_owner text; v_bidder text; v_price numeric; v_status text; v_end int;
  v_bbal numeric; v_bhas boolean; v_obal numeric;
  v_ts int := floor(extract(epoch from now()))::int;
begin
  select owner_address into v_owner from holders where project_id = p_slug and token_id = p_token for update;
  if not found or lower(v_owner) <> lower(p_owner) then return jsonb_build_object('error','not_owner'); end if;

  select bidder_address, price_eth, status, end_time into v_bidder, v_price, v_status, v_end
    from offers where id = p_offer_id for update;
  if not found or v_status <> 'open' then return jsonb_build_object('error','offer_not_open'); end if;
  if v_end is not null and v_end <= v_ts then return jsonb_build_object('error','offer_not_open'); end if;
  if lower(v_bidder) = lower(p_owner) then return jsonb_build_object('error','own_offer'); end if;

  update holders set owner_address = v_bidder where project_id = p_slug and token_id = p_token;
  update listings set active = false where project_id = p_slug and token_id = p_token;
  update offers set status = 'accepted' where id = p_offer_id;

  select sim_eth_balance into v_bbal from users where address = v_bidder for update;
  v_bhas := found;
  if v_bhas then update users set sim_eth_balance = coalesce(v_bbal,0) - v_price where address = v_bidder; end if;
  select sim_eth_balance into v_obal from users where address = p_owner for update;
  if found then update users set sim_eth_balance = coalesce(v_obal,0) + v_price where address = p_owner; end if;

  insert into events(type, project_id, token_id, from_address, to_address, price_eth, timestamp, sale_direction)
    values ('XFER', p_slug, p_token, p_owner, v_bidder, v_price, v_ts, 'OFFER_ACCEPT');

  return jsonb_build_object('ok', true, 'sold', v_price);
end; $function$;

create or replace function public.app_accept_criteria_offer(p_owner text, p_slug text, p_token text, p_offer_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_owner text; v_bidder text; v_price numeric; v_status text; v_scope text; v_proj text; v_end int;
  v_bbal numeric; v_bhas boolean; v_obal numeric;
  v_ts int := floor(extract(epoch from now()))::int;
begin
  select owner_address into v_owner from holders where project_id = p_slug and token_id = p_token for update;
  if not found or lower(v_owner) <> lower(p_owner) then return jsonb_build_object('error','not_owner'); end if;

  select bidder_address, price_eth, status, scope, project_id, end_time
    into v_bidder, v_price, v_status, v_scope, v_proj, v_end
    from offers where id = p_offer_id for update;
  if not found or v_status <> 'open' then return jsonb_build_object('error','offer_not_open'); end if;
  if v_end is not null and v_end <= v_ts then return jsonb_build_object('error','offer_not_open'); end if;
  if v_scope not in ('collection','trait') then return jsonb_build_object('error','not_criteria'); end if;
  if v_proj <> p_slug then return jsonb_build_object('error','wrong_project'); end if;
  if lower(v_bidder) = lower(p_owner) then return jsonb_build_object('error','own_offer'); end if;

  update holders set owner_address = v_bidder where project_id = p_slug and token_id = p_token;
  update listings set active = false where project_id = p_slug and token_id = p_token;
  update offers set status = 'accepted', token_id = p_token where id = p_offer_id;

  select sim_eth_balance into v_bbal from users where address = v_bidder for update;
  v_bhas := found;
  if v_bhas then update users set sim_eth_balance = coalesce(v_bbal,0) - v_price where address = v_bidder; end if;
  select sim_eth_balance into v_obal from users where address = p_owner for update;
  if found then update users set sim_eth_balance = coalesce(v_obal,0) + v_price where address = p_owner; end if;

  insert into events(type, project_id, token_id, from_address, to_address, price_eth, timestamp, sale_direction)
    values ('XFER', p_slug, p_token, p_owner, v_bidder, v_price, v_ts, 'OFFER_ACCEPT');

  return jsonb_build_object('ok', true, 'sold', v_price);
end; $function$;
