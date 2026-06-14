-- ════════════════════════════════════════════════════════════════════════
--  PINGS — tiered retention (archival)
--  2026-06-14 · the inbox is a financial LEDGER, not disposable alerts. Reads
--  are never deleted on view; they age out by TIER:
--    • social / ephemeral (PING, FOLLOW, PROJECT_FOLLOW, ACHIEVEMENT, STREAK,
--      MINT-milestone) → 30 days
--    • financial signal (OFFER, OFFER_ACCEPTED, SALE, XFER, WISHLIST_HIT,
--      WATCH_HIT) → 365 days (a year of history)
--  Unread is NEVER pruned, regardless of age.
--
--  Replaces the flat 30-day prune_pings job from 20260614_pings.sql. The
--  opportunistic prune in createPing() applies the same two-tier predicate.
--  Idempotent; applied to live on Brendon's go.
-- ════════════════════════════════════════════════════════════════════════

do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'prune_pings') then
      perform cron.unschedule('prune_pings');
    end if;
    perform cron.schedule(
      'prune_pings', '17 4 * * *',
      $prune$
        delete from public.pings
        where read = true and (
          (kind in ('PING','FOLLOW','PROJECT_FOLLOW','ACHIEVEMENT','STREAK','MINT')
            and created_at < now() - interval '30 days')
          or
          (kind in ('OFFER','OFFER_ACCEPTED','SALE','XFER','WISHLIST_HIT','WATCH_HIT')
            and created_at < now() - interval '365 days')
        )
      $prune$
    );
  end if;
exception when others then
  -- pg_cron unavailable / not permitted — the opportunistic prune in
  -- createPing() covers retention. Never block the migration.
  null;
end $$;
