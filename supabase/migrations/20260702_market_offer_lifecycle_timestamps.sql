-- Offer lifecycle + listing-age fidelity (Feature Atlas sweep 2026-07-02).
-- APPLIED LIVE 2026-07-02 (market_offer_lifecycle_timestamps).
--
-- ~20 planned features (Sniped, Holdout, Volley, Offer Archaeology, listing
-- age, Replay series…) need WHEN an offer resolved and WHEN a listing went
-- live — not just current state:
--   offers.resolved_at  — stamped on accept / decline / cancel (route + RPC).
--   listings.listed_at  — stamped on every list / re-list (created_at keeps
--                         the FIRST listing time because upserts don't touch
--                         it; listed_at is the current listing's birth).
-- The accept RPCs (app_accept_offer / app_accept_criteria_offer) were
-- re-applied with `resolved_at = now()` on the status flip — otherwise
-- identical to 20260702_market_sim_expiry_and_criteria_accept.sql.

alter table public.offers add column if not exists resolved_at timestamptz;
alter table public.listings add column if not exists listed_at timestamptz;
