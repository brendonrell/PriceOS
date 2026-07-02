-- ════════════════════════════════════════════════════════════════════════
--  PINGS — wishlist fan-out goes per-row upsert (launch-readiness fix)
--  2026-07-02 · The old path bulk-INSERTed WISHLIST_HIT rows in chunks of
--  500. A Postgres multi-row INSERT is atomic, so ONE recipient still
--  holding an unread row for the same group_key (piece listed → delisted →
--  relisted) tripped the pings_group_open_unique partial index and killed
--  the ENTIRE chunk — up to 500 innocent wishlisters silently got nothing.
--  PostgREST upsert can't target a partial unique index, so the fix is this
--  RPC: per-row ON CONFLICT that bumps the existing open row exactly like
--  createPing's rollup bump (count+1, resurface, refresh actor/amount).
--  Additive; applied live 2026-07-02 (Brendon's "fix all of these" go).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.app_ping_wishlist_fanout(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_count integer := 0;
begin
  with rows as (
    select * from jsonb_to_recordset(p_rows) as r(
      recipient_address text,
      kind text,
      actor_address text,
      actor_name text,
      project_id text,
      token_id text,
      amount_eth numeric,
      data jsonb,
      group_key text
    )
  ), written as (
    insert into public.pings
      (recipient_address, kind, actor_address, actor_name, project_id,
       token_id, amount_eth, data, group_key, read)
    select recipient_address, kind, actor_address, actor_name, project_id,
           token_id, amount_eth, coalesce(data, '{}'::jsonb), group_key, false
    from rows
    -- Predicate must match pings_group_open_unique EXACTLY (both clauses)
    -- or Postgres refuses the inference (42P10).
    on conflict (recipient_address, group_key)
      where read = false and group_key is not null
    do update set
      created_at = now(),
      updated_at = now(),
      actor_address = excluded.actor_address,
      actor_name = excluded.actor_name,
      amount_eth = excluded.amount_eth,
      data = jsonb_set(
        excluded.data, '{count}',
        to_jsonb(coalesce((pings.data->>'count')::int, 1) + 1)
      )
    returning 1
  )
  select count(*) into v_count from written;
  return v_count;
end; $$;

revoke all on function public.app_ping_wishlist_fanout(jsonb) from public;
revoke all on function public.app_ping_wishlist_fanout(jsonb) from anon;
revoke all on function public.app_ping_wishlist_fanout(jsonb) from authenticated;
