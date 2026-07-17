# BRIEF — Money-logic pass: kill conjured ETH + conservation invariants for art AND stickers

**For a fresh Opus 4.8 chat. Read `CLAUDE.md` first and obey all of it.
Origin: Architect Report round 2 §3.2 + the 2026-07-11 security audit's
queued items (ClickUp `86bawbb7j`). Run AFTER `rpc-test-rig.md` — every
change here must land with rig tests proving it.**

## The three strands (one session)

### 1. The conjured-ETH gap (the real bug)
In the trade functions, the seller/owner is always credited but the buyer is
only debited **if they have a users row** — a signed-in session without a
finished account can pay nothing. Play-money era: quirk. Real-money era:
headline. Fix in every value-moving function (`app_buy`,
`app_accept_offer`, sticker buy/accept/swap, accept-criteria-offer):
**select the buyer row FOR UPDATE; missing row = the function aborts with a
clear error code** (surface as the standard 400 envelope; the client flow
already forces account creation before trading, so users never see it —
this closes the API-level hole, changes no UX).

### 2. Conservation invariants into the daily audit
`/api/cron/economy-audit` (KV-gated daily sweep) gains per-trade assertions
over the ledger: art sim trades sum to zero including fees; sticker trades
route exactly 95/3/2 (with per-sheet collab rerouting from
`sticker_sheet_collabs` / `sticker_fee_config`); anomalies land in
`app_errors` like the existing checks. One full-history backfill run on
first deploy, then daily increments.

### 3. The 07-11 hygiene remainder (same PR, one migration batch)
- Revoke the 11 dead anon SELECT grants (tables where RLS already denies all
  rows — dropping them off the public API surface entirely).
- Pin `search_path` on `zero_out`, `apply_sale_price_to_wallets`,
  `assign_project_no`.
- Move the `citext` extension out of `public`.

## Gates (non-negotiable)

- **Every migration is presented to Brendon and applied to the live DB only
  on his explicit word** (CLAUDE.md §4 — prod data gate). Prepare + rig-test
  first; the rig is the proof it's safe.
- Zero product/UI change. If a fix seems to need one, stop and ask.
- Mirror every applied migration in `supabase/migrations/` same-session.
- Comment the outcome on ClickUp `86bawbb7j` (this brief executes its queue).
- Out of scope, deliberately: CSP enforcement (report-only stays),
  `SIGNUP_SIM_ETH_GRANT` (cutover checklist item), anything sticker-PRIMARY
  (that's `sticker-primary-serverside.md`).

## Done when

Rig tests prove: no-buyer-row trades REJECT · all trade paths conserve to
the wei · sticker splits exact incl. collabs. Daily audit runs the new
assertions live with a clean baseline. Advisor re-read shows the grants/
search_path/citext items cleared. Brief deleted in the completing PR.
