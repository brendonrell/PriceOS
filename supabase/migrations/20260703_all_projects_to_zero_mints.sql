-- THE ZERO-OUT (Brendon, 2026-07-03): every project back to freshly-uploaded
-- status — 0 mints, no floor/volume/ATH, no graduation. Projects and user
-- identities stay; the sim mint ledger and everything derived from it goes.
-- APPLIED LIVE 2026-07-03 (with full prior snapshot in schema
-- zeroout_backup_20260703: outputs/events/holders/pings/ping_cursors/
-- user_achievements/output_views/projects/wallets/users).
delete from public.output_views;
delete from public.holders;
delete from public.events;
delete from public.outputs;
delete from public.pings;
delete from public.ping_cursors;
delete from public.user_achievements;
update public.projects set
  minted_count = 0,
  floor_price_eth = null,
  volume_eth = 0,
  all_time_high_eth = 0,
  graduated_at = null,
  sold_out_at = null,
  milestones = '{}'::jsonb,
  showcase_ids = '[]'::jsonb;
update public.wallets set events_count = 0, volume_eth = 0;
update public.users set
  sim_eth_balance = 10,
  price_score = 0,
  price_rank = 0,
  price_streak = 0,
  streak_best = 0,
  streak_last_active = null,
  showcase = '{"slots": [null, null, null, null, null, null]}'::jsonb;
