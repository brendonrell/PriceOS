# PriceOS / PD — Full Security Audit

**Date:** 2026-06-14
**Scope:** `PriceOS` (frontend + API), `pd-contracts` (Solidity), `pd-price-token` ($PRICE ERC-20).
**Excluded:** `PriceOS-indexer` (being rewritten).
**Type:** Read-only audit. No code, specs, or config were modified to produce it.
**Method:** Six independent parallel auditors — auth/API, data/RLS/secrets, reputation-integrity, pd-contracts, pd-price-token — cross-corroborated on overlapping findings (rate limiter, secrets sweep, SIWE).

> **LIVE-STATUS CORRECTION (important):** the reputation auditor read a "staged,
> not yet applied" comment in the migration file and labelled the scoring holes
> "pre-ship." `docs/WIP.md` records the migration as **applied + verified on
> Supabase `zspxpfwlwikdxwavffjn` on 2026-06-14**, and the dev preview is
> publicly reachable. Deployed reality wins: **C1 / H1 / H2 below are LIVE on the
> dev app right now**, exploitable by anyone who can reach the preview. No real
> money is at stake (sim-ETH, pre-mainnet), but live PriceRank/PriceScore
> integrity is.

---

## Bottom line

Foundations are strong: no committed secrets anywhere, no IDOR (every write is bound to the authenticated wallet, never a client-supplied address), SIWE is correctly nonce-single-use and domain-bound, the service-role key is never client-exposed, and both smart-contract codebases are clean (no critical/high/medium).

The real exploitable risk is concentrated in the **PriceRank/PriceScore social subsystem**, now live on dev. The common root cause: **off-chain identity is free and unlimited, and there is no effective rate limiting**, so any "count of free off-chain actions" becomes farmable.

---

## Master findings — severity ranked

| # | Sev | Area | Finding | Status |
|---|-----|------|---------|--------|
| C1 | **CRITICAL** | Scoring | Self-grant whole curation achievement category via your own `/api/me` settings blob (~1,000+ points) | LIVE on dev |
| H1 | **HIGH** | Scoring | Streak length forgeable — day boundary is client-supplied | LIVE on dev |
| H2 | **HIGH** | Scoring | Followers / anoints / mutuals sybil-inflatable (free wallets, no throttle) | LIVE on dev |
| H3 | **HIGH** | API | Raw database error text returned to clients (schema recon) | LIVE |
| M1 | MED | Infra | Rate limiter fails open + per-instance without Upstash (flagged by 2 auditors) | LIVE |
| M2 | MED | Config | No HTTP security headers (CSP / X-Frame-Options / HSTS) | LIVE |
| M3 | MED | Data | RLS is read-only-by-convention; all writes ride service-role, no DB-level ownership guard | LIVE |
| M4 | MED | Infra | `x-forwarded-for` spoofable to dodge limits (Vercel edge mitigates) | LIVE |
| M5 | MED | Scoring | `evaluate` / `streak ping` unthrottled — amplifier for C1/H1 | LIVE |
| L1 | LOW | Auth | Public dev preview lets anyone log in as Brendon (by design) | LIVE |
| L2 | LOW | Market | Unfunded/unbounded phantom offers (sim-ETH; spam only) | LIVE |
| L3 | LOW | Data | Blanket `USING(true)` read policies expose full social graph to anon | LIVE |
| L4 | LOW | Auth | Discord `redirect_uri` derived from request origin (footgun, not exploitable today) | LIVE |
| L5 | LOW | Client | `data-external` link handler opens DOM href without re-checking scheme | LIVE |

**pd-contracts:** no CRITICAL/HIGH/MEDIUM. Only LOW/INFO (self-inflicted artist edge cases, trait-grinding fairness).
**pd-price-token:** no CRITICAL/HIGH/MEDIUM. Stock fixed-supply ERC-20, no owner. Only nit: pin GitHub Actions to commit SHAs.

---

## Detail — the exploitable cluster (PriceRank / PriceScore, LIVE on dev)

### C1 — CRITICAL · Self-grant the entire curation achievement category
- **Where:** `app/api/me/route.ts` PATCH (`sanitisePatch`, ~L118-137) writes the `settings` JSONB with only a shallow `typeof === 'object'` guard — no length cap, no validation that array contents reference anything real. The engine (`lib/achievements/engine.ts:533-549`) counts `settings.starred.length`, `settings.wishlist.length`, `settings.albums[].keys.length` directly.
- **Exploit:** one `PATCH /api/me` with `{settings:{starred:[1..500], wishlist:[1..50], albums:[{keys:[1..50]}, …]}}`, then `POST /api/achievements/evaluate`. Instantly unlocks the star / wishlist / album ladders + `showcase_full` — ~1,000+ PriceScore points from arrays of integers that map to nothing.
- **Fix:** derive curation counts from constrained server state (a `stars`/`wishlist` table FK'd to real outputs), or validate array contents against owned ids before counting.

### H1 — HIGH · Forge any streak length
- **Where:** `app/api/streak/ping/route.ts:48` trusts `body.localDate` (client's own `YYYY-MM-DD`); the server never reads a clock by design.
- **Exploit:** call `streak/ping` repeatedly, incrementing `localDate` by a day each time → 365 instant calls unlock every streak badge + ladder (~3,800 catalog points). The "idempotent within a day" guard only blocks the *same* date.
- **Fix:** bound `localDate` against server `now()` ± a timezone window so a streak advances at most one day per real day.

### H2 — HIGH · Sybil-inflate the social graph
- **Where:** follower/anoint/mutual counts feed rank (`lib/achievements/catalog.ts`, `anoint/levels.ts`). Sybil cost is zero: a new wallet needs only a SIWE signature (`users/create` gates nothing on funds/captcha), and there is no rate limiting on any `app/api` route.
- **Exploit:** spin up N free wallets → each follows/anoints a target → drives `followers_*`, `mutuals_*`, project `The Cult`/`The Egregore` levels and the cabal's `anoint_cult`/`anoint_egregore` badges. Inflate your own rank or any victim's.
- **Fix:** weight/gate social credit on the source wallet having on-chain presence (a mint/hold) or by the source's own rank; add rate limiting on `follows`/`anoint`/`users/create`. (This is the deferred "PriceRank-weighted anoint votes / Sybil resistance" item — now load-bearing.)

### M5 — MEDIUM · `evaluate` / `streak ping` unthrottled
- Both are correctly auth-scoped to the session wallet (can't act for others — verified safe), but unthrottled, so they're the free "commit" step that multiplies C1/H1. Rate-limit them.

**Verified safe here:** scores are *recomputed* server-side, not incrementable counters (no add-points replay); every score write is attributed to the SIWE session wallet, never a client `address`; achievement inserts are PK-deduped (no double-insert race); self-follow is blocked; anoint has one-pledge-per-wallet + 60-day lock; the move/withdraw lock uses the *server* clock (not forgeable, unlike the streak date).

---

## Detail — live infrastructure & data findings

### H3 — HIGH · Raw DB errors leaked to clients
- **Where:** ~30 routes return `serverError(error.message)` with the verbatim Postgres error (`app/api/me/route.ts:55`, `anoint/route.ts:140`, `follows/route.ts:99`, `output/[id]/market/route.ts:141`, …). `lib/errors.ts` puts the raw message in the response body.
- **Impact:** leaks table/column/constraint names + RPC signatures — free recon.
- **Fix:** log `error.message` server-side; return the generic `'Internal server error'` the function already defaults to.

### M1 — MEDIUM · Rate limiter fails open + per-instance (flagged by both auth and data auditors)
- **Where:** `middleware.ts:54-113`. No Upstash env → per-warm-instance in-memory counter (not a real limit). Any Upstash error → request allowed (fails open).
- **Impact:** if Upstash isn't configured in the deployed env, there is no effective rate limit — auth brute-force, handle-squatting, Alchemy-budget burn, and the H2 sybil farming.
- **Action:** confirm `UPSTASH_REDIS_REST_URL` + `_TOKEN` are set in Vercel. Consider fail-closed on auth + Alchemy routes.

### M2 — MEDIUM · No HTTP security headers
- **Where:** `next.config.mjs` has no `headers()` block; middleware adds none. No CSP, X-Frame-Options, X-Content-Type-Options, HSTS.
- **Impact:** fully framable (clickjacking); no CSP backstop for any future HTML-injection bug; no HSTS.
- **Fix:** add a `headers()` block: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, and a `Content-Security-Policy`.

### M3 — MEDIUM · RLS is read-only-by-convention
- **Where:** every table has only `FOR SELECT TO anon, authenticated USING(true)` — no INSERT/UPDATE/DELETE policies. All writes go through the service-role client (`lib/supabase.ts`), bypassing RLS.
- **Impact:** the DB enforces zero row-ownership of its own. The only guard against writing another user's row is that the app code keys on the session address. Correct today — but one future route that writes a body-supplied address = account takeover with no DB-level catch. Blanket `USING(true)` reads also expose every social-table row to anon (L3).
- **Fix:** keep service-role for writes, add owner-scoped policies as defense-in-depth, and add a test asserting no route writes a body-supplied address. Keep new private columns off the anon grant (the `PUBLIC_USER_COLUMNS` pattern is correct today).

### M4 / L1–L5 — see master table. None are live-critical; L1 (public preview = anyone becomes Brendon, preview env only) is by design but worth a conscious note.

**Live data/auth verified safe:** no committed secrets (full-repo grep for JWTs, private keys, keyed RPC URLs, client secrets — only `process.env` refs + `.env.example` placeholders); `.gitignore` ignores `.env*`; service-role key server-only, never `NEXT_PUBLIC_`; SIWE cookie httpOnly + encrypted + `secure` in prod + `sameSite:lax`, secret length-checked ≥32; Discord OAuth one-time `state` CSRF check; **no SSRF** (all external fetches hardcoded/env URLs); no CORS exposure; XSS surfaces closed (`markdown.tsx` returns React nodes, escapers in place, `dangerouslySetInnerHTML` only on static templates); deps current (next 14.2.35, siwe 2.3.2, iron-session 8.0.4, viem 2.48.11, supabase-js 2.105.4).

---

## Detail — smart contracts (both clean)

### pd-contracts — no CRITICAL/HIGH/MEDIUM
Solidity 0.8.24, OZ v5.6.1 + Solady, immutable. Strict CEI throughout, push-payments with zero stored balance in `PDProject`, complement-based splits that strand no dust, `_mint` (not `_safeMint`) so supply cap holds under reentrant payout, all four privilege transfers two-step propose/accept, every low-level `.call` return checked, no `tx.origin`, no signatures, no upgradeability.
- **LOW/INFO only:** malformed-UTF-8 metadata (self-inflicted); URL-guard bypassable across script-chunk boundaries (curation is the stated final layer); a contract artist that reverts on ETH receipt strands its *own* royalties; predictable per-token seed allows cross-block trait-grinding (fairness, no funds); compromised `storageFeeWriter` key can deface unpinned thumbnails (canonical art is fully on-chain, unaffected).
- **Recommendation:** strong internal multi-model + fuzz passes, but given the immutable deploy and hand-rolled (not-memory-safe) library-reader assembly, **one external-firm audit + a symbolic byte-equivalence proof of that assembly before mainnet** (README already flags this).

### pd-price-token — no CRITICAL/HIGH/MEDIUM
14-line contract: stock OZ v5.0.2 ERC-20, fixed 100M supply minted once at deploy. No mint authority, no owner, no pause/blacklist/tax/permit/hooks/upgradeability — nothing to rug, nothing to renounce. No committed keys/mnemonics. Source ↔ flattened ↔ `input.json` byte-identical; embedded bytecode metadata matches the claimed compiler (0.8.20, pinned exact). Airdrop/deploy pages non-custodial; recipient list 3,005 unique addresses with matching integrity hash.
- **Only nit (LOW):** pin the GitHub Pages workflow's actions to commit SHAs rather than tags. One post-deploy step remains: verify on-chain bytecode at the final mainnet address on Etherscan.

---

## Prioritized fix order (= the 9 tracked items for ClickUp)

1. **C1** — constrain the curation blob (self-grant). *Urgent — live on dev.*
2. **H1** — bound streak dates to server time. *Urgent — live on dev.*
3. **H2 + M5** — weight/gate social inputs + rate-limit `follows`/`anoint`/`users-create`/`evaluate`/`streak`. *Urgent — live on dev.*
4. **H3** — stop returning raw DB errors to clients.
5. **M1** — confirm Upstash limiter is actually configured in prod.
6. **M2** — add HTTP security headers.
7. **M3** — owner-scoped RLS policies + "no body-supplied address in writes" test.
8. **Contracts** — external-firm audit + assembly equivalence proof before mainnet.
9. **Token** — pin GitHub Action SHAs + post-deploy Etherscan bytecode verify.

*No app code was changed in producing this audit.*
