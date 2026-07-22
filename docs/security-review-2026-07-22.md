# PD Full-App Security Review — 2026-07-22

Whole-app review across all four repos (PriceOS, pd-contracts, pd-price-token,
PriceOS-indexer), run via the Claude Security skill at whole-repo scope.

**Method:** 18 security cells, each read by a dedicated senior-security-engineer
agent against the real files; every candidate finding then put through a 3-lens
adversarial verification panel (exploitability / trust-boundary / refute) and
dropped unless a majority confirmed at ≥8/10 confidence. The database-function
findings were verified against the **live** Supabase project (`zspxpfwlwikdxwavffjn`)
via `pg_proc` ACLs, not just the migration files.

**Result:** 8 candidate findings → **4 confirmed** (3 MEDIUM, 1 LOW). No HIGH /
critical issues. No fund-loss, RCE, auth-bypass, secret-leak, XSS, SSRF, or
contract vulnerability found.

---

## Confirmed findings

### 1. MEDIUM — Off-chain trade "accept" trusts the client; no on-chain check
`app/api/exchange/route.ts` (~line 343, `bookChainSettle`)

For a **chain-rail** trade, the `accept` branch flips ownership rows in the
off-chain `holders` mirror and marks the trade accepted **without verifying any
on-chain fill happened** — `body.txHash` is optional and stored raw, with no
receipt/log check and no ownership re-check (the sim rail *does* re-verify inside
its RPC; the chain rail does not).

**Impact:** `holders` is the authoritative source for the achievements engine,
PriceScore, and the leaderboard. Because achievement unlocks are only ever added,
never revoked, a user controlling two wallets can propose→accept a trade of an
edition-of-1 (or first-project) piece **without ever executing it on-chain**,
flip the mirror, and permanently mint high-value un-capped achievement unlocks on
their main wallet — surviving the later indexer reconcile that corrects `holders`.
Score/leaderboard integrity, not funds.

**Fix:** Don't treat a client-asserted `accept` as settlement on the chain rail.
Verify the receipt for `body.txHash` (confirmed, correct Seaport contract,
matching order hash, correct transfers) before touching `holders` — or drop the
manual settle entirely and let **only** the Alchemy indexer webhook (which sees
real Transfer events) mutate `holders`. At minimum, re-verify current ownership
of both sides at accept time like the sim rail does.

### 2. MEDIUM — `confirm_fills` lets any logged-in user close anyone's listing
`app/api/market/orders/route.ts` (~line 532, `confirm_fills` action)

The action is login-gated but never checks that the caller is the buyer/filler,
and never verifies `txHash` on-chain. It finds the active listing by
`(project_id, token_id)` supplied by the caller, marks it inactive, and fires a
`sold` ping — the only guard (`orderHash` match) is skipped entirely by sending
`orderHash: null`.

**Impact:** Any authenticated wallet can (a) **de-list any/every on-chain listing
on the platform** — sellers' items silently vanish from the market surface; (b)
close a competitor's cheaper listing so their own pricier one becomes the visible
floor; (c) mass-fire fake "SOLD at X" notifications. The signed Seaport order
survives on-chain, so no direct fund theft — but book integrity and seller
presence are attacker-controlled.

**Fix:** Require proof the caller actually filled the order before closing the
row — verify `txHash` on-chain (seller, order hash, buyer == session address) the
way `gnomes/deal` confirm already does — or only close rows whose on-chain fill is
attributable to the session address. Don't fan out `sold` pings until the
indexer's authoritative sale row exists.

### 3. MEDIUM — `record_output_view` DB function is anon-executable (forges history)
DB function `public.record_output_view(text, text, integer)` — used by
`app/api/output-views/route.ts`

The function is `SECURITY DEFINER` and **still has EXECUTE granted to `anon` +
`authenticated`** (confirmed live). The intended path is the login-gated route,
which resolves the viewer server-side from the session. But because `anon` holds
EXECUTE, anyone can skip the route and call `/rest/v1/rpc/record_output_view`
directly with the **public anon key** (shipped in the browser), passing an
**arbitrary `p_viewer`**. Being definer, it bypasses the RLS on `output_views`.

**Impact:** With zero authentication, an attacker sets `p_viewer` to any victim's
public @name and writes view rows under their identity — the victim's own History
list shows Outputs they never opened, and view/viewer counts inflate arbitrarily
in a loop. Pure cross-user data forgery, bypassing the login gate. This is the
**exact class** migration `20260711_revoke_public_execute_sticker_offer_rpcs.sql`
fixed for the money RPCs — `record_output_view` was simply never given the same
REVOKE.

**Fix:** One migration mirroring 20260711 —
`REVOKE EXECUTE ON FUNCTION public.record_output_view(...) FROM PUBLIC, anon,
authenticated; GRANT ... TO service_role;`. The login-gated route already calls it
on the service-role client, so this is subtractive with no legitimate-path change.

### 4. LOW — `output_view_stats` DB function is anon-executable (leaks viewer/follow data)
DB function `public.output_view_stats(text, integer, text)` — same file/area

Same root cause: `SECURITY DEFINER`, EXECUTE granted to `anon` (confirmed live).
It reads the RLS-protected `output_views` and computes a mutual-follow
intersection for a caller-supplied `p_viewer`.

**Impact:** An unauthenticated caller can read per-output viewer/view counts for
any piece and probe mutual-follow relationships for arbitrary users — data the
login-gated surfaces are meant to control. Lower severity (read-only, aggregate).

**Fix:** Same REVOKE-to-service-role migration; expose stats through a login-gated
route so `p_viewer` is server-attributed. Bundles with finding 3 in one migration.

---

## Near-misses (reviewed, not confirmed as exploitable — cheap hardening)

- **Unvalidated `address` → raw PostgREST `.or()` filter** in `app/api/takeover/route.ts`
  (~line 92) and `app/api/feed/route.ts` (~line 89). A genuine filter-injection
  *primitive* exists (the value is only lowercased, never format-checked — and a
  **sibling param in the same takeover file *is* regex-validated**, so it's an
  inconsistency). The panel judged both non-exploitable: read-only, fixed column
  lists, no embedded resources to pivot into, no cross-table leak. Worth a cheap
  `/^0x[0-9a-f]{40}$/` guard for consistency/defense-in-depth, not urgent.
- **`completionism` ILIKE wildcard** (`?address=0x%`) — read-only, crosses no
  privilege boundary. Not a vuln.

## Areas reviewed and clean (no findings)

Wallet auth / SIWE / sessions · Discord OAuth link flow · identity & "me" writes ·
address-keyed read endpoints (no PII leak) · follows/social writes · studio content
& push subscriptions · **all 9 cron routes** (fail-closed on `CRON_SECRET`) ·
**Alchemy webhook** (HMAC verified against raw body, timing-safe) · XSS sinks
(`dangerouslySetInnerHTML` sources are static/authored) · SSRF / outbound fetch ·
edge config & secret exposure (no client-bundle secret leak) · **Solidity
contracts** (PDFactory / PDProject / PaymentSplitter / contested-mint) · **$PRICE
ERC-20** (no hidden mint, no owner backdoor) · the (idle) indexer repo.

## Note

`record_output_view` and `output_view_stats` were confirmed against the **live**
database, so findings 3 & 4 are exploitable on the deployed app right now, not
just in the migration history. Findings 1 & 2 are code-verified in the current
`dev`-equivalent source.
