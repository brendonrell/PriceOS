# 02 — API Surface · Rate Limiting · DDoS / Cost-Amplification

**Date:** 2026-06-14
**Auditor focus:** API rate-limiting, DDoS/abuse resilience, cost-amplification (Alchemy + Supabase budget), input validation, error leakage, caching, SSRF/redirects, ping abuse.
**Type:** READ-ONLY. No app code changed. Line numbers are from the code as read this session.
**Deploy:** Vercel (preview = `dev`, publicly reachable, Deployment Protection OFF). External paid/limited calls: Alchemy (RPC), Supabase, Discord.

> **Re-verification note — prior audit (`SECURITY_AUDIT_2026-06-14.md`) is partly STALE.** Reading the live code: **H3 (raw DB errors) is FIXED**, **H1 (streak forgery) is FIXED**, **M2 (security headers) is FIXED** (minus a script-src CSP, deliberately). **M1 and M4 remain live.** **C1 (curation blob self-grant) remains live** — same root as my D1 below. Details under each finding.

---

## Severity table

| # | Sev | Area | Finding | File:line | Status |
|---|-----|------|---------|-----------|--------|
| D1 | **HIGH** | Cost / DDoS | `price/[address]` cache key is the address path param → unlimited distinct keys defeat the 10s cache, every request a fresh Alchemy hit (2 CU). Unauthenticated. | `app/api/price/[address]/route.ts:7,81-111` | LIVE |
| D2 | **HIGH** | Infra | Rate limiter FAILS OPEN and is per-instance without Upstash; confirm Upstash is set in Vercel or there is effectively NO limit. (= prior M1) | `middleware.ts:72-99,129-139` | LIVE (env-dependent) |
| D3 | **HIGH** | Cost / DDoS | `home`, `stats`, `feed`, project `feed/outputs`, `artist`, `anoint?project=` pull **whole tables with no row cap** (`select` without `.limit()` on `events`/`holders`/`projects`/`anointments`) and recompute in JS each call. Egress + CPU scale with table size; `home`/`me` are uncached. | `lib/home/homeData.ts:62-70`; `app/api/stats/route.ts:29-33`; `app/api/feed/route.ts:73-77`; `app/api/anoint/route.ts:315-318` | LIVE |
| D4 | **MED** | DoS | No request **body-size limit** on any POST. `req.json()`/`req.text()` read the whole body; `me` PATCH + `evaluate` accept large/deep JSON. | `app/api/me/route.ts:148`; `achievements/evaluate/route.ts:47`; all POST routes | LIVE |
| D5 | **MED** | Infra | Client IP falls back to spoofable `x-forwarded-for` / `x-real-ip` when `req.ip` is absent. (= prior M4) | `middleware.ts:49-59` | LIVE (Vercel edge mitigates) |
| D6 | **MED** | Cost | `rpc-ping` (4s cache) + `gas` (12s) hit Alchemy and are **unauthenticated, edge, single-key bucket**. Cache-bustable via query string; distributed clients can force per-window cold fetches. | `app/api/rpc-ping/route.ts:41-78`; `app/api/gas/route.ts:38-126` | LIVE |
| D7 | **MED** | Validation | Several path/body params are **unvalidated** before hitting Supabase: project `slug` (feed/outputs), `feed?project_id=`, `anoint` `output_token_id`, `project-follows` project ref. Used as `.eq()` filter values — not injection (parameterised) but unbounded fan-in / probing. | `app/api/feed/route.ts:62,78`; `project/[slug]/outputs/route.ts:61-71` | LIVE |
| D8 | **MED** | Scoring/DoS | `me` PATCH writes `settings` JSONB with only a shallow `typeof==='object'` guard — **no size/array-length cap**. Self-grants curation achievements (= prior C1) AND is an unbounded-write/storage vector. | `app/api/me/route.ts:118-137` | LIVE |
| L1 | LOW | Cost | Self-DoS amplifiers: `evaluate` / `streak ping` re-run the full achievement engine per call; not in a tight enough cap to stop a scripted loop burning Supabase CPU on the attacker's own row. | `achievements/evaluate/route.ts`; `streak/ping/route.ts` | LIVE |
| L2 | LOW | Market | `offer`/`list` actions: no price ceiling, no funds check on offer (sim-ETH; spam rows only). | `output/[id]/market/route.ts:178-197` | LIVE |
| L3 | LOW | Auth | `auth/dev-login` exists; gated to non-production by `VERCEL_ENV` — correct, but it's a real "become Brendon" door on the public dev preview by design. | `auth/dev-login/route.ts:33-50` | LIVE (by design) |
| I1 | INFO | Redirect/SSRF | Discord `redirect_uri` derived from request origin; no open-redirect or SSRF anywhere (all upstreams hardcoded/env). | `auth/discord/route.ts:41`; `callback:51` | OK |

**Fixed since prior audit (verified live):** H3 raw-error leak (`lib/errors.ts:40-55` logs detail, returns generic `'Internal server error'`; every `serverError(err.message)` caller now only feeds the logger). H1 streak forgery (`streak/ping/route.ts:59-69` bounds `localDate` to server UTC+1day). M2 headers (`next.config.mjs:13-33`: X-Frame-Options, CSP frame-ancestors, nosniff, HSTS, Referrer-Policy, Permissions-Policy).

---

## Rate-limiting map (which routes are limited, and how)

The limiter is global on `/api/:path*` (`middleware.ts:142-144`). Two buckets per IP:

- **SENSITIVE (15/60s)** — prefixes at `middleware.ts:28-38`: `auth`, `users/create`, `follows`, `project-follows`, `anoint`, `streak`, `achievements/evaluate`, `handle/check`, `project-handle/check`.
- **NORMAL (100/60s)** — everything else, including the **money-write market route** (`output/[id]/market`), `mint`, `pings/send`, `me`, and **all the Alchemy/heavy-read routes** (`price`, `gas`, `rpc-ping`, `search`, `home`, `feed`, `stats`).

Gaps in the map:
- `output/[id]/market` (POST list/buy/offer/accept) and `project/[slug]/mint` write rows + money but sit in the **100/min** bucket — far looser than `follows`. A scripted offer/list spam loop gets 100 writes/min/IP.
- `pings/send` (DM) is **100/min** — see ping-abuse section.
- The Alchemy-burning reads (`price`, `gas`, `rpc-ping`) are **100/min** — at 100 req/min/IP × distinct addresses (D1) that is a real CU faucet.

**D2 — fail-open + per-instance (env-dependent).** `upstashIncr` returns `null` (→ allow / fall to in-memory) when Upstash env is unset OR on any fetch error (`middleware.ts:75,92,97`). In-memory `buckets` Map is per warm Lambda, so under load N instances each allow the full quota. **If `UPSTASH_REDIS_REST_URL`/`_TOKEN` are not set in the Vercel dev+prod env, there is no effective shared rate limit at all.** This must be confirmed in the Vercel dashboard — it can't be verified from the repo. Recommend **fail-closed on the SENSITIVE bucket** (auth + write + Alchemy) so an Upstash outage can't open the floodgates on the expensive routes.

**D5 — spoofable IP.** `getClientIp` prefers `req.ip` (Vercel-trusted) but falls back to `x-forwarded-for`/`x-real-ip` (`middleware.ts:54-57`), both client-set. On Vercel `req.ip` is populated so this is mitigated in production; it matters only if the app ever runs behind a proxy that doesn't set `req.ip`. Low-to-medium. Fix: when not on a trusted platform, take the **rightmost** XFF hop, or key on a value the edge controls.

---

## DDoS / cost-amplification (the part that costs real money)

### D1 — HIGH · `price/[address]` Alchemy faucet
`route.ts:7` sets `revalidate = 10`, but the only varying input is the **address path param**, which is the cache key. An attacker iterates random addresses (`0x` + 40 hex) — each is a cache miss → 2 Alchemy `eth_call`s (`balanceOf` + `decimals`, lines 99-111). Unauthenticated, 100/min/IP, parallelisable across IPs. Concrete impact: this is the single cheapest way to burn Alchemy compute units / push past the free 300M CU/mo onto a paid overage. **Fix:** cache the balance behind a short server-side TTL keyed on `(token, address)` with an LRU cap, or require auth, or move the per-address read off Alchemy onto the indexer once it runs. At minimum put `price` in the SENSITIVE bucket.

### D3 — HIGH · Unbounded full-table reads
Multiple hot, mostly-unauthenticated routes `select` entire tables and aggregate in Node:
- `lib/home/homeData.ts:62-70` — pulls **all** `projects`, **all** MINT `events`, **all** priced `events`. `/api/home` is `revalidate=0, force-dynamic, no-store` (`home/route.ts:10-19`) → **every call recomputes from full tables, zero cache.**
- `stats/route.ts:29-33` — all `projects`, all `holders`, all `events` (60s cache softens it, but cold every minute).
- `feed/route.ts:73-77` and `project/[slug]/feed:61-66` — `.limit(200)` then slice; OK-ish but 200 rows + handle-join every 5s.
- `anoint?project=` `route.ts:315-318` — all anointments for a project, then a per-distinct-owner users `.in()`.
- `project/[slug]/outputs:66-71` — all holders + all priced events for the project, unbounded by supply.

Today's tables are tiny (test phase) so this is cheap now; it becomes a **CPU + egress cliff** as data grows, and `home` (no cache) is hammerable immediately. **Fix:** paginate/limit every list read; precompute `stats`/`home` aggregates into a cached row or a Postgres view/RPC rather than summing full tables in JS on each request; give `home` a short edge cache.

### D6 — MED · `gas` / `rpc-ping` cache-bust
Both are edge + revalidated (4s/12s) and collapse coincident clients to one Alchemy hit *for the canonical URL*. But they take no params, so a query-string suffix (`/api/gas?x=1`, `?x=2`, …) is a different cache entry → forces a cold Alchemy fetch each time. Unauthenticated, single shared key. **Fix:** ignore/strip query strings (route reads none), and/or add these to a tighter cap. Lower impact than D1 (no per-address explosion) but same class.

### D4 — MED · No body-size cap
No route sets a body-size limit; App Router handlers read the full body via `req.json()`/`req.text()` (`me:148`, `evaluate:47`, every POST). A large or deeply-nested JSON body forces full parse + (for `me`) a JSONB write. Combined with D8 (no settings size cap) this is a memory/storage amplification vector. **Fix:** cap `Content-Length` in middleware (e.g. reject > 64–256 KB on `/api`), and size-cap the `settings` blob specifically.

---

## Input validation

- **No SQL/PostgREST injection found.** Supabase `.eq()/.in()/.ilike()` are parameterised. `search/route.ts:40-41` correctly escapes `%_\` and quotes the `.or()` value to stop filter break-out — good.
- **Address/handle/token validation is solid** where present: `ADDRESS_RE` on `price`, `user/[address]`, `anoint`, `follows`, `artist`; `DATE_RE` on streak; `/^\d+$/` on token ids in `output`/`market`; `HANDLE_RE` on by-handle.
- **Pagination caps are good** where they exist: `feed`/`project feed` clamp `limit` to 100 (`feed:61`), `pings` to 200 (`pings:36-39`), `pings/read` batch to 200. **No route honours an attacker `limit=1000000`.**
- **D7 gaps:** project `slug` (feed/outputs/mint) and `feed?project_id=` and `anoint output_token_id` are passed to `.eq()` unvalidated (only `getProject(slug)` gates *mint*/*market*/*output*, NOT *feed*/*outputs*). Not injection, but lets an attacker probe arbitrary ids and trigger the heavy reads in D3. Validate slug against the registry on the read routes too.

## Error leakage — H3 RE-VERIFIED: FIXED
`lib/errors.ts:40-55`: `serverError(detail)` logs `detail` server-side and returns the constant `{ error: 'Internal server error', code: 'SERVER_ERROR' }`. The ~30 `serverError(error.message)` callsites now only feed the logger — **no raw Postgres/Alchemy text reaches the client.** The prior H3 is resolved; no route still leaks DB schema in the body. (`badRequest` messages are app-authored strings, safe.)

## Caching / CDN
- `price`/`gas`/`stats` set sane `Cache-Control` matching their edge windows — no poisoning vector (no user input reflected into cached responses).
- `home` is intentionally `no-store` (D3 ties in — it's the uncached heavy one).
- No `Vary`/auth-keyed caching mistakes spotted (auth'd routes are `force-dynamic`). No cache-poisoning finding.

## Open redirects / SSRF — NONE (I1)
All outbound fetches target hardcoded/env hosts (Alchemy URL from env, Discord `discord.com` constants). Discord `redirect_uri` is built from `req.nextUrl.origin` (`discord/route.ts:41`, `callback:51`) — a footgun if the origin were attacker-controlled, but Vercel sets a trusted origin and the OAuth `state` is a one-time CSRF token checked at `callback:36`. The post-link redirect goes to an internal path (`/${handle}`), not a user-supplied URL. No open redirect, no SSRF.

## pings/send abuse — mutuals gate IS enforced server-side
`pings/send/route.ts:91-102`: server resolves both handles and requires **bidirectional follow** (`areMutuals`, lines 60-70) before delivering; self-ping blocked (`:89`); message capped 280 (`:82`); `createPing` also drops muted actors. **You cannot DM-bomb an arbitrary user** — only mutuals. Residual: a mutual *can* spam a mutual at 100/min (NORMAL bucket) since `pings/send` isn't in SENSITIVE, and the sybil path (cheap wallets → mutual-follow a target → DM) is bounded only by the rate limiter. The real DM-bomb amplifier is `pingWishlisters` (`lib/pings/wishlist.ts`) — a list/sale fans out up to 5000 ping rows; bulk-inserted (not N+1) and capped at `MAX_WISHLISTERS=5000`, so bounded, but a wishlisted-token list/relist loop writes many rows cheaply. **Fix:** add `pings/send` to SENSITIVE; consider a per-recipient/day p2p ping cap.

---

## DDoS-hardening checklist for a solo founder

**Free / Vercel-native (do first):**
1. **Confirm `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set** in Vercel for both `dev` (preview) and `prod`. Without them D2 means *no real limit*. (Upstash free tier exists but has its own request quota — verify, don't assume "free forever.")
2. **Make the limiter fail-closed on the SENSITIVE bucket** (auth + writes + Alchemy reads). An Upstash outage should reject the expensive routes, not open them.
3. **Add `price`, `gas`, `rpc-ping`, `pings/send`, `output/[id]/market`, `mint` to the SENSITIVE prefix list** (or a new tighter tier). The current 100/min on money-writes and the Alchemy faucet is too loose.
4. **Add a request body-size guard** in middleware (reject `/api` bodies over ~128 KB) — kills D4 and the settings-blob bloat in one line.
5. **Vercel Spend Management / budget alerts** on the project, and **Alchemy usage alerts/cap** on the RPC app, so a CU-burn attack pages you instead of billing you.
6. **Strip query strings on the param-less cached routes** (`gas`, `rpc-ping`) to stop cache-bust (D6).
7. **Cache `/api/home`** (even 5–10s edge) and bound every full-table read with `.limit()` (D3).

**Cloudflare (next step, free tier covers most):**
8. Put the domain behind **Cloudflare** (proxied DNS) — gets you network-layer DDoS absorption, a real **WAF rate-limiting rule** (e.g. per-IP cap on `/api/price/*` and `/api/auth/*`) that runs *before* Vercel bills you, and Bot Fight Mode. This is the single biggest resilience upgrade for a solo founder and is largely free.
9. Cloudflare **caching rules** for the GET read routes by true cache key (path only) as a second layer in front of Vercel.

**Structural (when the indexer lands):**
10. Move per-address chain reads (`price`) off live Alchemy onto the indexer/DB so the most cache-bustable route stops touching the paid RPC at all.
11. Replace JS full-table aggregation in `stats`/`home` with a Postgres materialised view / RPC refreshed on write.

---

*Read-only audit. No app code, specs, or config were modified.*
