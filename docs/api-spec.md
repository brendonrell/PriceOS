# PriceOS API Spec

Production base: `https://pricediscussion.pricediscussion.workers.dev` (the app Worker serves the API; a custom domain comes with mainnet)
Stack: Next.js 15 (App Router) on a Cloudflare Worker (OpenNext) · Supabase (Postgres) · Alchemy (chain reads)
**Verified against code: 2026-07-17 — 96 route files.** This document is the
verified route INDEX plus the platform-wide contracts (auth, errors, rate
limits). Per-route request/response shapes live as header comments in each
route file — that's the always-true source; this page is the map.

> History: the pre-2026-07 version of this file described the original
> scaffold (mocked indexer routes, a `/api/notifications` surface that became
> Pings, "future" auth routes that have long shipped). All of that is gone —
> what follows was generated from the actual route tree and spot-verified.

## Auth model

- **Reads are mostly open** — no API key. Public reads go through the anon
  Supabase client and RLS.
- **Writes require a SIWE session** (Sign-In With Ethereum), stored in an
  httpOnly encrypted cookie (`iron-session`, 14-day rolling TTL). The wrapped
  handler receives the session address — clients never send their own
  identity.
- **Deliberate open-write exceptions:** the ascii/preview pin routes
  (write-once, first-viewer-wins), `/api/telemetry` (rate-limited error
  beacon), newsletter subscribe, the auth flow itself, the HMAC-verified
  Alchemy webhook, and the CRON_SECRET-gated sweeps.

## Error envelope (every non-2xx, all routes — `lib/errors.ts`)

```ts
interface ApiError {
  error: string;
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'SERVER_ERROR' | 'RATE_LIMITED';
  details?: unknown;
}
```

500s never leak internals (fingerprinted into the `app_errors` sink instead).

## Rate limiting (`middleware.ts`)

Per-IP, on every `/api/*` request: **100/min normal bucket · 15/min sensitive
bucket** (auth flows, account creation, anoint/streak/achievement writes,
handle-check enumeration, and the scriptable social writes). Distributed
limiting rides Upstash Redis when its two secrets are set on the Worker;
without them it falls back to per-instance memory (≈ no real limit on
Workers). **As of 2026-07-17 the Upstash secrets are NOT set — turning them
on is a standing Brendon tap (ClickUp 86bax31xd).** Limiter fails open.

## Caching

Hot public reads carry short timed caches (5–300s, via `revalidate` /
KV-backed data cache); everything session-scoped or state-changing is
force-dynamic. The home surface is deliberately no-store (Realtime re-pulls).

## Money paths

All value movement happens inside atomic Postgres RPCs locked to the service
role (`app_mint`, `app_buy`, `app_accept_offer`, `app_sticker_buy`,
`app_sticker_accept`, …). The five money POST routes accept an
`Idempotency-Key` header; replays return the recorded outcome. The market
route runs **two rails** switched per project by `projects.contract_address`
(NULL = sim economy, set = real Seaport orders).

---

## Route index (96 files · method(s) · auth · purpose)

### Auth & account
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/auth/nonce` | POST | open | Issue SIWE nonce into session |
| `/api/auth/siwe` | GET·POST·DELETE | open | Session read / verify sign-in / sign-out |
| `/api/auth/dev-login` | POST | env-gated | Dev-preview login shortcut (404 unless enabled) |
| `/api/auth/discord` | GET·DELETE | SIWE | Start Discord link / unlink |
| `/api/auth/discord/callback` | GET | open (state-CSRF) | Discord OAuth return leg |
| `/api/users/create` | POST | SIWE | Create the account row (grant on new rows only) |
| `/api/me` | GET·PATCH | SIWE | Own row hydrate / whitelisted state writes (atomic merge) |
| `/api/me/artist` | GET | SIWE | Own artist/whitelist status |
| `/api/me/bench` | GET·PUT | SIWE (session-scoped handler) | The Bench collection |
| `/api/me/cart` | GET·PUT | SIWE (session-scoped handler) | The Cart collection |
| `/api/handle/check` · `/api/project-handle/check` | GET | open (sensitive-bucket) | Handle availability |

### Identity & profiles
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/user/[address]` | GET | open | Public profile (never private state) |
| `/api/user/[address]/count` · `/outputs` · `/owned-projects` | GET | open | Profile sub-reads |
| `/api/user/by-handle/[handle]` | GET | open | Handle → profile |
| `/api/anoint` | GET·POST·DELETE | SIWE | Anointment |
| `/api/achievements/[address]` | GET | open | Achievement reads |
| `/api/achievements/evaluate` | POST | SIWE | Own achievement evaluation |
| `/api/streak/ping` | POST | SIWE | Daily streak |
| `/api/game-score` | GET·POST | SIWE | Lane Runner board |
| `/api/leaderboard` | GET | open | Boards |

### Projects, outputs, art
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/project/[slug]` | GET | open | Project detail |
| `/api/project/[slug]/outputs` · `/feed` · `/floor` · `/story` · `/replay` · `/cartel` · `/factions` · `/gnome` · `/sentiment` | GET | open | Project sub-surfaces |
| `/api/project/[slug]/mint` | POST | SIWE | Mint (server-priced, atomic, idempotent) |
| `/api/project/[slug]/predictions` | GET·POST | SIWE | Price Targets (sealed monthly window) |
| `/api/project/[slug]/artist-push` | GET·POST | SIWE | Artist ping to holders |
| `/api/home` · `/api/artists` · `/api/artist/[address]` | GET | open | Home / catalog / artist reads |
| `/api/output/[id]` · `/feed` · `/story` | GET | open | Output detail surfaces |
| `/api/output/[id]/market` | GET open · POST SIWE | mixed | Market read / list·buy·offer·accept (two rails) |
| `/api/outputs/colors` | GET | open | Color-bucket reads |
| `/api/outputs/color` · `/api/outputs/traits` | POST | SIWE (first-writer-wins) | Fingerprint/trait self-population |
| `/api/preview/[slug]/[id]` · `/api/ascii/[slug]/[id]` | POST | open by design | Write-once render pins (R2) |
| `/api/output-views` | POST | SIWE | View counter |
| `/api/output-follows` | GET·POST·DELETE | SIWE (reads open bucket) | Piece follows |

### Social & signals
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/follows` | POST·DELETE | SIWE | Follow graph writes |
| `/api/follows/[address]` | GET | open | Follow lists |
| `/api/project-follows` (+`/[id]`) | GET·POST·DELETE | SIWE writes | Project follows |
| `/api/pings` · `/count` · `/read` | GET·POST | SIWE | The Pings inbox |
| `/api/social/circle-stats` | GET | open | Circle stats |
| `/api/social/mute` | POST | SIWE | Mutes |
| `/api/feed` | GET | open | Global ledger feed |
| `/api/history` | GET·DELETE | SIWE | Own browse history |
| `/api/search` | GET | open | Global search (+ query log) |
| `/api/takeover` | GET·POST | SIWE | Takeovers |
| `/api/war` · `/api/war/piece` | GET | open | Faction war reads |
| `/api/cartography` | GET | open | The map (incl. Sybil nets) |
| `/api/completionism` | GET | open | Sticker-month completion |
| `/api/rewind` | GET | open | The Rewind |
| `/api/priceday/[n]` | GET | open | PriceDay |
| `/api/calendar` | GET·POST | SIWE | Calendar items |

### Stickers & studio
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/stickers/market` | GET open · POST SIWE | mixed | Sticker marketplace (atomic RPCs, 95/3/2 fees; store catalog is client-side) |
| `/api/studio/playlist` | GET | open | Studio reads |
| `/api/studio/soundtrack` | PATCH | SIWE (artist-gated) | Soundtrack manager |
| `/api/studio/vouch` | GET·POST | SIWE (whitelisted) | Artist vouches |
| `/api/studio/sticker-collabs` | GET·POST | SIWE (studio-gated) | Collector-collab routing |

### Platform, chain, ops
| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/stats` | GET | open | Platform stats |
| `/api/market/orders` | GET·POST | SIWE writes | Seaport order book |
| `/api/price/[address]` | GET | open | $PRICE balance (chain read) |
| `/api/gas` · `/api/fx` · `/api/rpc-ping` | GET | open | Gas / fiat / RPC probes |
| `/api/newsletter/subscribe` | GET·POST | open | Digest signup (Resend-backed; the Dispatch itself prints via its cron and renders as pages) |
| `/api/push/pubkey` | GET | open | VAPID public key |
| `/api/push/subscribe` · `/unsubscribe` | POST | SIWE | Push subscriptions |
| `/api/telemetry` | POST | open (rate-limited) | Client error beacon → app_errors |
| `/api/health` | GET | open | Platform health (db · sweep · ledger · Dispatch + system stamps) |
| `/api/webhooks/alchemy` | POST | HMAC (raw-body) | Indexer ingest |
| `/api/cron/*` (9 sweeps) | GET | CRON_SECRET bearer, fail-closed | todo-reminders · indexer-reconcile · social-snapshot · dispatch · takeover-sweep · newsletter · sentinel · war-sweep · economy-audit |

Secrets/env inventory lives in `docs/security/secrets-inventory.md` (names
only). Keep this page honest: when routes are added or re-shaped, update the
index and the verified stamp in the same session.
