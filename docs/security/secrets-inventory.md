# Secrets & config inventory — names only, NEVER values
**Created 2026-07-13 (hardening item 18 / ClickUp 86b9g04cr). Update whenever
a secret is added, moved, or rotated.**

## Cloudflare Worker `pricediscussion` — secrets (survive redeploys; set via
`wrangler secret put` or the dash → Workers → Settings → Variables)

| Name | What it is | Rotation note |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — bypasses RLS, server-only | Rotate in Supabase dash → update here same minute; app is down for writes in between |
| `SIWE_SESSION_SECRET` | iron-session cookie encryption (≥32 chars) | Rotating signs every user out (cookies undecodable) — do deliberately |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | HMAC key for /api/webhooks/alchemy raw-body verification | Rotate in Alchemy dash first, then here; webhook 401s in the gap are caught by the reconcile sweep |
| `CRON_SECRET` | Bearer gate for all /api/cron/* sweeps (fail-closed: unset = sweeps never run) | Internal only — rotate freely |
| `ALCHEMY_RPC_URL` | Server-side RPC endpoint (reconcile sweep log reads) | Key embedded in URL; rotate at Alchemy |
| `VAPID_PRIVATE_KEY` / webpush private | Web-push signing (pair of NEXT_PUBLIC_VAPID_PUBLIC_KEY) | Rotating both keys invalidates every push subscription — avoid |
| `SIGNUP_SIM_ETH_GRANT` | New-account sim-ETH grant (default 1,000,000) | **Set to `0` at mainnet cutover** (cutover contract §6) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Distributed rate-limiter backend | **NOT CONFIRMED SET as of 2026-07-13 — the deployed limiter passed 20 rapid hits with zero 429s.** Setting these turns the real limiter on with no code change |

## Committed PUBLIC config — `.env.production` (browser-bundle values, by design)
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` ·
`NEXT_PUBLIC_CHAIN_ID` · `NEXT_PUBLIC_ALCHEMY_RPC_URL` ·
`NEXT_PUBLIC_ALCHEMY_API_KEY` · `NEXT_PUBLIC_ART_IMAGE_BASE` ·
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `NEXT_PUBLIC_WEBPUSH_KEY`
(All ship in every visitor's browser already; committing exposes nothing new.
Chain values flip at mainnet — cutover contract §7.)

## Other Workers (repo `price-discussion`, separate from this app)
- Discord feed Workers (fx-sales, fx-listings, pd-sales…): per-worker
  `WEBHOOK_*` Discord URLs + `RUN_SECRET` manual-run bearer.
- `pd-mcp`: reaches the app via service binding (no secret hop).

## Deliberately NOT stored anywhere
- Brendon's Cloudflare API token — pasted per session when ever needed,
  never persisted (and with git-connected auto-deploy, rarely needed at all).

## Where secrets must NEVER appear
Repo files (any repo) · ClickUp · docs/briefs · chat summaries · this file.
