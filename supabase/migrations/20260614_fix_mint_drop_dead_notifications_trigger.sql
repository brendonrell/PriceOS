-- ════════════════════════════════════════════════════════════════════════
--  FIX · Minting 500s ("relation \"notifications\" does not exist")
--  2026-06-14 · Applied live to zspxpfwlwikdxwavffjn.
--
--  The 20260614_pings install dropped the old `notifications` table (replaced
--  by `pings`, with the broadcast/follower firehose now computed at READ time
--  off `events` — see 20260614_pings.sql). But the old AFTER-INSERT fan-out
--  trigger on `events` was left behind and still does INSERT INTO notifications.
--
--  It only fires when the transacting wallet has a @handle AND followers, so a
--  fresh test wallet mints fine while a wallet with followers 500s on EVERY mint
--  / transfer. Under the pings architecture this trigger is dead code — remove
--  it. (cascade on the table drop did not remove it: the dependency is by name
--  inside the function body, which cascade does not track.)
-- ════════════════════════════════════════════════════════════════════════
drop trigger if exists trg_events_fan_out on public.events;
drop function if exists public.fan_out_event_notifications();
