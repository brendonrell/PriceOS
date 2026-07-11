# OPUS BRIEF — Discord feeds → Cloudflare Worker migration

> **⚡ STATUS 2026-07-11 (Fable session): THE TEMPLATE IS BUILT.** The shared
> lib + `fx-sales-feed` (objkt-sourced, locally verified on 40 real sales) +
> `pd-sales-feed` (verified on the real Sepolia T9 sale) live in the
> **`price-discussion` repo under `workers/`**, with the full porting guide in
> **`workers/README.md`** — start THERE, it carries every hard-won objkt fact
> (role inversion, contracts, media CDN) and the Apps Script→Worker seam
> table. KV namespaces already exist for both. Remaining: deploy + secrets
> (needs Brendon's CF API token), parallel-run, then port the remaining feeds
> per the README. Everything below is the original context.

**For a fresh Opus 4.8 session.** Read `CLAUDE.md` first (operating contract).
Subagents are fine in Opus sessions.

## Why now (the tripwire fired)

The Discord feeds run on Google Apps Script and have started randomly failing
with **HTTP 429, Cloudflare error code 1015** ("You are being rate limited",
banned IP) when posting to Discord webhooks — seen live on `runFeatureFeed`,
2026-07-05. Diagnosis: Discord sits behind Cloudflare, which throttles by
source IP; Apps Script's `UrlFetchApp` egresses from Google's **shared IP
pool**, so other tenants' spam gets our IPs rate-limited. Nothing in our code
causes it and nothing in Apps Script can fix it — the egress reputation is not
ours to control. This is tripwire condition 3 of decision task `86b9g4e55`
("a capability Apps Script fundamentally can't do"), and Brendon has confirmed
the migration is justified.

## What exists today (the source system)

All on Google Apps Script + Google Sheets, spread across ~5 Google accounts
(UrlFetch quota workaround):

- `fx-sales-feed` — fxhash sales
- `ab-sales-feed` — Art Blocks sales (**2,151 lines, 1.5 months of hardened
  edge cases** — survived Alchemy randomly dropping AB data, etc.)
- `verse-sales-feed`
- tiered sales feeds — 500 / 1k / 5k / 10k
- feature feed (`runFeatureFeed` — the one that threw the 429)

⚠ **The scripts are NOT in any repo this container can reach.** Step 1 is
getting the source from Brendon — he exports from the Apps Script editor (or
`clasp clone`) and pastes/attaches per feed. Do not start designing around
guessed code; read the real scripts first (CLAUDE.md Rule #1).

## The chosen architecture (pre-drawn in `86b9g4e55`, 18-Apr Opus session)

Cloudflare **Workers + Cron Triggers**:

- A shared library (`@pd/nft-sales` shape): Seaport decoder, price
  normalizer, USD conversion, media resolver, Discord embed formatter.
- **Thin per-feed workers** composing the shared lib — each feed keeps its
  own schedule and failure isolation.
- **State in Workers KV** (replaces the Google Sheets state — last-seen
  cursors, dedupe sets, etc.).
- **Separate failure domain from PD:** do NOT fold the feeds into the
  `pricediscussion` app Worker, PD's Supabase, or pg_cron. Feeds are their
  own worker(s) so a feed bug can never touch the app and vice versa.
  (Blast-radius call made in the decision task — respect it.)

Cloudflare account: `9ac4108b1b152994d7a91d4979908317`, Workers Paid plan is
active. The Cloudflare MCP connector can create KV namespaces.

## fx feed: switch the data source to the Objkt API (Brendon, 2026-07-06)

**fxhash the platform is dead — its own API is no longer the source.** The
fx sales feed migrates to **objkt.com's public API** (docs:
https://data.objkt.com/docs/ · GraphQL endpoint `https://data.objkt.com/v3/graphql`),
which indexes all of Tezos including the fxhash contracts, so fxhash mints
and sales still flow through it. Verified from the docs (2026-07-06):

- GraphQL v3, free/best-effort, **120 requests/min**, **max 500 rows per
  query** — paginate on pk/id/timestamp.
- **No subscriptions/websockets** — polling only, which fits the cron
  Worker model exactly.
- Sales come from the `event` entity: `marketplace_event_type` in
  `list_buy · english_auction_settle · dutch_auction_buy · offer_accept ·
  offer_floor_accept`, filtered to the fxhash FA2 contracts (pull the exact
  contract list from the current fx script's filters). Prices are in mutez;
  the shared lib needs an XTZ→USD leg alongside ETH→USD.
- Sign up for their API mailing list (breaking-change warnings) — Brendon's
  address, flag it as a tap.

Note this narrows port-don't-rewrite for the fx feed specifically: the
posting/formatting/dedupe logic still ports, but its **data-fetch layer is a
fresh build against Objkt** (the old fxhash-API/Alchemy plumbing it replaces
is dead weight — confirm with Brendon what the current script actually
queries before discarding anything).

## Port, don't rewrite

The AB feed's 2,151 lines are scar tissue, not bloat. **Port the logic
faithfully** — same filters, same edge-case handling, same embed shapes —
translating only the platform seams (UrlFetchApp→fetch, Sheets→KV,
time-driven triggers→cron). A from-scratch rewrite restarts months of
debugging; the decision task explicitly warns against it. Where a script is
obviously dead code, flag it to Brendon, don't silently drop it.

## Migration plan

1. Brendon supplies the scripts + the Discord webhook URLs + any API keys
   the scripts embed (Alchemy/OpenSea/etc. — move them to Worker secrets,
   never commit).
2. Build the shared lib + per-feed workers; state in KV, one namespace per
   feed (or one namespace, per-feed key prefixes — implementer's call).
3. Seed each feed's KV cursor from the current Sheets state so nothing
   double-posts or gaps at cutover.
4. **Parallel run:** point the Worker versions at a private test channel's
   webhooks first; compare output against the live Apps Script feeds for a
   day or two of real events.
5. Cutover per feed: swap to the real webhook, disable that Apps Script
   trigger. Keep the Apps Script code dormant as rollback until all feeds
   have run clean for a week.
6. Discord rate-limit hygiene in the Worker: respect `Retry-After` /
   `X-RateLimit-*` headers, queue + retry on 429 — now that the IP is ours,
   good behavior actually protects us.

## Repo

New code lives in its own place, not inside PriceOS (`app/`/`components/`
are the app). Recommendation: a new top-level dir in a fresh repo or —
simplest — `feeds/` workspace inside PriceOS is NOT allowed per the
failure-domain rule; ask Brendon to create a `pd-feeds` repo and attach it
to the session. Wrangler config per worker, deploy via Workers Builds or
`wrangler deploy`.

## Done means

Every feed posting from the Worker on schedule, KV state advancing, zero
429/1015 for a week, Apps Script triggers disabled. Then comment + close the
loop on ClickUp `86b9g4e55` and file the rollback-removal reminder.
