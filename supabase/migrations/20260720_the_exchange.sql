-- THE EXCHANGE ⇌ — head-to-head bilateral trading (ClickUp 86ba0apqr).
-- NOT YET APPLIED — apply live at ship approval, then update this line.
--
-- A trade is a two-sided proposal: the proposer commits pieces (+ optional
-- ETH on exactly one side), names what they want from the counterparty, and
-- the counterparty accepts / declines / counters. Sequential accept flow —
-- no live session. Settlement:
--   sim rail  — app_execute_trade (atomic, row-locked, same discipline as
--               app_buy / app_accept_offer).
--   chain rail — a proposer-signed Seaport order stored on the row; the
--               counterparty fills it on-chain and the route books the flip.
-- No fee, no royalty on trades — barter moves no sale price (the sticker
-- swap/gift precedent: no money event, no take).
--
-- Also: pings kind CHECK grows TRADE / TRADE_ACCEPTED / TRADE_DECLINED.

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_address     text not null,
  counterparty_address text not null,
  -- open → accepted | declined | cancelled | superseded (by a counter)
  status text not null default 'open'
    check (status in ('open','accepted','declined','cancelled','superseded')),
  -- The two sides. Each item: {"project_id": "...", "token_id": "..."}.
  give jsonb not null default '[]'::jsonb,  -- proposer's pieces
  get  jsonb not null default '[]'::jsonb,  -- counterparty's pieces requested
  give_eth numeric not null default 0,      -- ETH the proposer adds
  get_eth  numeric not null default 0,      -- ETH requested from the counterparty
  end_time int,                             -- unix expiry (open trades only)
  source text not null default 'sim',       -- 'sim' | 'seaport'
  order_hash text,
  order_json jsonb,
  tx_hash text,
  counter_of uuid references public.trades(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists trades_counterparty_open_idx
  on public.trades (counterparty_address, status);
create index if not exists trades_proposer_open_idx
  on public.trades (proposer_address, status);

-- Same posture as holders/offers: no anon reads, all access rides the
-- service-role API (the exchange route scopes reads to the two parties).
alter table public.trades enable row level security;

-- Atomic sim settlement. Verifies everything under row locks, flips every
-- holder, moves the one ETH leg, kills stale listings on traded pieces,
-- writes one XFER event per piece (sale_direction TRADE, no price — barter).
create or replace function public.app_execute_trade(p_acceptor text, p_trade_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_trade record;
  v_item jsonb;
  v_owner text;
  v_payer text; v_payee text; v_amount numeric;
  v_bal numeric;
  v_ts int := floor(extract(epoch from now()))::int;
begin
  select * into v_trade from trades where id = p_trade_id for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_trade.status <> 'open' then return jsonb_build_object('error','trade_not_open'); end if;
  if v_trade.end_time is not null and v_trade.end_time <= v_ts then
    return jsonb_build_object('error','trade_not_open');
  end if;
  if lower(v_trade.counterparty_address) <> lower(p_acceptor) then
    return jsonb_build_object('error','not_counterparty');
  end if;
  if v_trade.source <> 'sim' then return jsonb_build_object('error','not_sim'); end if;

  -- Ownership still holds on BOTH sides (row-locked so nothing moves under us).
  for v_item in select * from jsonb_array_elements(v_trade.give) loop
    select owner_address into v_owner from holders
      where project_id = v_item->>'project_id' and token_id = v_item->>'token_id' for update;
    if not found or lower(v_owner) <> lower(v_trade.proposer_address) then
      return jsonb_build_object('error','pieces_moved');
    end if;
  end loop;
  for v_item in select * from jsonb_array_elements(v_trade.get) loop
    select owner_address into v_owner from holders
      where project_id = v_item->>'project_id' and token_id = v_item->>'token_id' for update;
    if not found or lower(v_owner) <> lower(v_trade.counterparty_address) then
      return jsonb_build_object('error','pieces_moved');
    end if;
  end loop;

  -- The one ETH leg (propose-time validation guarantees at most one side).
  v_amount := 0;
  if v_trade.give_eth > 0 then
    v_payer := v_trade.proposer_address; v_payee := v_trade.counterparty_address;
    v_amount := v_trade.give_eth;
  elsif v_trade.get_eth > 0 then
    v_payer := v_trade.counterparty_address; v_payee := v_trade.proposer_address;
    v_amount := v_trade.get_eth;
  end if;
  if v_amount > 0 then
    select sim_eth_balance into v_bal from users where address = v_payer for update;
    if found then
      if coalesce(v_bal, 0) < v_amount then
        return jsonb_build_object('error','insufficient_balance');
      end if;
      update users set sim_eth_balance = coalesce(v_bal,0) - v_amount where address = v_payer;
    end if;
    select sim_eth_balance into v_bal from users where address = v_payee for update;
    if found then
      update users set sim_eth_balance = coalesce(v_bal,0) + v_amount where address = v_payee;
    end if;
  end if;

  -- Flip every piece + retire its listing (the seller is no longer the owner).
  for v_item in select * from jsonb_array_elements(v_trade.give) loop
    update holders set owner_address = v_trade.counterparty_address
      where project_id = v_item->>'project_id' and token_id = v_item->>'token_id';
    update listings set active = false
      where project_id = v_item->>'project_id' and token_id = v_item->>'token_id' and active = true;
    insert into events(type, project_id, token_id, from_address, to_address, price_eth, timestamp, sale_direction)
      values ('XFER', v_item->>'project_id', v_item->>'token_id',
              v_trade.proposer_address, v_trade.counterparty_address, null, v_ts, 'TRADE');
  end loop;
  for v_item in select * from jsonb_array_elements(v_trade.get) loop
    update holders set owner_address = v_trade.proposer_address
      where project_id = v_item->>'project_id' and token_id = v_item->>'token_id';
    update listings set active = false
      where project_id = v_item->>'project_id' and token_id = v_item->>'token_id' and active = true;
    insert into events(type, project_id, token_id, from_address, to_address, price_eth, timestamp, sale_direction)
      values ('XFER', v_item->>'project_id', v_item->>'token_id',
              v_trade.counterparty_address, v_trade.proposer_address, null, v_ts, 'TRADE');
  end loop;

  update trades set status = 'accepted', decided_at = now() where id = p_trade_id;
  return jsonb_build_object('ok', true);
end; $function$;

revoke execute on function public.app_execute_trade(text, uuid) from public, anon, authenticated;

-- Pings: the trade kinds.
alter table public.pings drop constraint if exists pings_kind_check;
alter table public.pings add constraint pings_kind_check check (kind in (
  'PING','FOLLOW','PROJECT_FOLLOW','OUTPUT_FOLLOW','ACHIEVEMENT','STREAK',
  'MINT','SALE','OFFER','OFFER_ACCEPTED','COUNTER','XFER','WISHLIST_HIT','WATCH_HIT',
  'TRADE','TRADE_ACCEPTED','TRADE_DECLINED'
));
