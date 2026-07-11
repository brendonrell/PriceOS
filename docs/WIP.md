# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

1. **iOS PUSH — the ONLY open Brendon-action. Await his banner test.**
   `CRON_SECRET` is SET on the `pricediscussion` Worker; the reminder sweep
   runs every minute and returns healthy (`ok:true`). Brendon: set a to-do due
   2–3 min out, lock the phone, watch for the lock-screen banner. If NO banner:
   `wrangler tail pricediscussion` during a sweep — prime suspect is a
   malformed `WEBPUSH_PRIVATE_KEY` (sender silently no-ops if the pair won't
   load: lib/push/webpush.ts ensureConfigured). Diagnosis facts in this file's
   git history (2026-07-11 morning baton).
2. ✅ **Indexer sweep — LIVE (2026-07-11 afternoon).** `ALCHEMY_RPC_URL` set,
   the reconcile now walks the window in ≤10-block sips (Alchemy free-tier cap)
   with a targeted `?fromBlock=&toBlock=` backfill door; the app Worker was
   redeployed with this code. Token-2 backfilled via the door (block
   11218947) — all three pd-test-alpha tokens now indexed, exactly one XFER
   row each (idempotent). Rolling sweep verified clean at head, lookback back
   to default 50. See SHIPPED below. Road-to-mainnet step 1 DONE.
3. ✅ **PD sales feed — LIVE (2026-07-11).** `WEBHOOK_MAIN` points at the
   `#pd-sales-feed` Discord channel; the real Sepolia T9 sale was posted end-
   to-end as the go-live test. Posts every PD sale within ~1 min. $20 floor.
4. **Remaining Discord feeds → Workers (Opus-able).** The template is proven
   in prod. Port order + every hard-won fact:
   **`price-discussion` repo → `workers/README.md`** (+ the brief
   `docs/briefs/discord-feeds-worker-migration.md`). Brendon supplies each
   Apps Script source; port faithfully; parallel-run; cutover. ClickUp
   `86b9g4e55` commented with full status.
5. **PDMCP — connectors-directory path** (custom domain + OAuth stub +
   privacy page, spec §) + a real Claude-session connect test. v1 is LIVE:
   `https://pd-mcp.pricediscussion.workers.dev/mcp`, all seven tools
   exercised against the deploy. ClickUp `86bavnrt7` commented.
6. **Stickers on-chain cutover** — unchanged, ClickUp `86baw12ek` (see its
   task; wrapper art done, chain shows zero sheets).
7. **PD Studio next phases** — unchanged (`docs/briefs/studio-phase2.md`,
   epic `86bavub9k`).

## ✅ SHIPPED 2026-07-11 (late afternoon, Opus) — indexer sweep live + APP WORKER REDEPLOYED

- **App Worker `pricediscussion` REDEPLOYED** (OpenNext build → `wrangler
  deploy`; version 31290bc0). This is a MANUAL deploy — there is NO
  auto-deploy from dev / no CI, and the preview had been stale since ~12:45,
  so this redeploy is what finally put ALL of today's dev-merged work LIVE on
  the preview (attributes stats, NPC pass, Lane Runner, albums-3col, indexer
  fix).
  > **⛔ DEPLOY RECIPE — the NEXT_PUBLIC config is NOT in the repo. Read this
  > before EVER redeploying the app Worker (cost me a broken deploy this
  > session).** There is NO `.env` committed. A bare `opennextjs-cloudflare
  > build` bakes EMPTY NEXT_PUBLIC_* into the client bundle → the preview's
  > wallet defaults to mainnet, browser Supabase + push break. You MUST create
  > `.env.local` (gitignored) with all 8 PUBLIC values before building. They
  > are all public (they ship in the client bundle) — reconstructed set:
  > `NEXT_PUBLIC_SUPABASE_URL=https://zspxpfwlwikdxwavffjn.supabase.co` ·
  > `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_UcKB7iZkyM_gv8F0LTdD0w_IpYriFsh`
  > · `NEXT_PUBLIC_CHAIN_ID=11155111` (Sepolia test phase — NOT 1) ·
  > `NEXT_PUBLIC_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>` ·
  > `NEXT_PUBLIC_ALCHEMY_API_KEY=<key>` ·
  > `NEXT_PUBLIC_ART_IMAGE_BASE=https://pricediscussion.pricediscussion.workers.dev/preview`
  > · `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `NEXT_PUBLIC_WEBPUSH_KEY` = the value from
  > `GET /api/push/pubkey`. Alchemy key `<key>` = the indexer's (from
  > `ALCHEMY_RPC_URL` Worker secret). Then: `./node_modules/.bin/wrangler deploy`
  > (use the PINNED local 4.105 — `npx wrangler` may grab 4.110 which fails
  > "Could not detect static files"). VERIFY after: fetch a client chunk and
  > grep for the Supabase URL. **OPEN OFFER TO BRENDON: commit these public
  > values as a repo `.env` so this can never recur — his call (changes the
  > gitignore convention).** Server SECRETS (service-role, webhook signing,
  > webpush private, CRON_SECRET) stay Worker secrets, survive redeploys.
- **Indexer reconcile chunking fix** — the sweep's single wide `eth_getLogs`
  failed on Alchemy's free tier (10-block range cap). Now reads the lookback
  window in ≤10-block windows, capped at 40 windows/run. Added a
  `?fromBlock=&toBlock=` targeted replay door (CRON_SECRET-gated) for surgical
  backfills. On dev + deployed. Verified: rolling sweep clean at head, token-2
  backfilled, idempotent re-runs write nothing.
- **New-account 1M sim-ETH grant (pre-mainnet)** — `POST /api/users/create`
  now seeds every BRAND-NEW account with `SIGNUP_SIM_ETH_GRANT` (default
  1,000,000) `sim_eth_balance` so signups can buy/mint in the test phase.
  Existing balances never overwritten. MANUAL mainnet off-switch (Brendon's
  call): `wrangler secret put SIGNUP_SIM_ETH_GRANT` = `0`. Live.
- **Reconcile sweep 2min → 1min** — one every-minute cron now fires BOTH the
  reminder + reconcile sweeps (custom-worker.ts calls both; wrangler crons =
  `["* * * * *"]`). Cloudflare cron floors at 1 min (30s not possible). Live
  (single schedule confirmed on deploy). Deployed version b0daef1f.

## ✅ SHIPPED 2026-07-11 (afternoon) — THE CLOUDFLARE SESSION (all live, trees clean)

**Deployed to the Cloudflare account (via Brendon's API token, in prod now):**
- **fx-sales-feed LIVE** — the fxhash Discord feed, ported off the dead
  fxhash API onto **objkt GraphQL v3**, running every minute with zero
  errors (verified via Workers analytics, not just manual runs). $20 floor
  kept (Brendon: intentional). All 5 webhooks verified + installed as
  secrets. Facts that must not be re-derived: objkt event roles are
  INVERTED vs fxhash issuer/target (proven on-chain via tzkt); collabs come
  decomposed in token.creators; project size = the token's fxhash gallery
  max_items; images = assets.objkt.media/…/artifact; **Tezos only** —
  fxhash ETH/Base sales have no data source anywhere anymore (flagged to
  Brendon). Code: `price-discussion` repo `workers/` (on `main`).
- **pd-sales-feed deployed dormant** — see NEXT UP #3.
- **PDMCP v1 LIVE** — see NEXT UP #5. Gotcha baked into code + README:
  same-account workers.dev→workers.dev fetches are BLOCKED by Cloudflare
  (error 1042); pd-mcp reaches the app through a **service binding**.
- **CRON_SECRET set** on the app Worker → reminder sweep + indexer
  reconcile crons are no longer failing closed (sweep verified healthy).
- Solved a standing unknown: **the app serves its stored previews
  publicly** at `/preview/{slug}/{id}.v2.png` (R2 binding route) — that IS
  the ART_IMAGE_BASE for pd-mcp and the PD feed.

**Shipped to dev (approved + pushed):**
- **Albums covers: 3 across on desktop** (2 rendered gigantic on
  widescreen; phones unchanged). Root cause of the earlier failed attempt:
  the project-page +More albums mock shares the `.albums-grid` class name
  in globals.css and its 2-col rule was winning — the fix is scoped via
  `.albums-wrap`.
- **Attributes tab: 5 new stats** (Brendon's picks, numerology excluded):
  PD Rarity RANK ("#3 rarest of 105", `pdRarityRank` in lib/output/rarity),
  percentile tags on every Fingerprint band (edition context from
  anon-readable outputs rows — `lib/output/editionStats.ts`, gated on ≥30%
  coverage), Mint Order + speed in Almanac ("3rd mint · 2 min after
  launch"), Closest Sibling via existing `nearestKin` (glyph ≍ — NEW, in
  GLYPHS.md), tappable hex Swatches sampled from the piece's own offscreen
  render (`lib/output/paletteChips.ts`, glyph ▧ — NEW; tap copies, toast
  `#HEX: COPIED`).
- **NPC Cast: bubble wrap FIXED** — `overflow-wrap: anywhere` let the
  width-hug binary search shatter words mid-word ("impatienc / e");
  bubbles + measurer now `break-word`. **Writers-room wow pass:** ~130 new
  lines/scenes in `lib/npc/scenarios.ts` — the "they see the SPECIFICS"
  layer (talk around the watching, show don't tell), new duet topics
  (wide/warm/cold/tilt/grain/centered), more sight lines per character on
  previously-unused axes, more exchanges/streaks/actions/night/morning.
  Selection machinery untouched (the used-ledger already prevents repeats;
  the bank is just much deeper now).
- **Lane Runner fixed**: status + hint lines wrap (nowrap was clipping
  above/below the board), tapping the score line opens the live top-10
  (refetches on open), standings refetch after a submit so REAL @handles
  show — the "@you" placeholder is gone.

## ⚠️ FINDINGS this session (know these)

- **Cloudflare error 1042** = a Worker fetching another workers.dev host on
  the same account. Use service bindings. This will bite ANY new worker
  that calls the app.
- Brendon's Cloudflare API token was pasted in-chat for this session only —
  NOT stored anywhere. Future sessions needing deploys: ask him for a fresh
  token (Create Token → "Edit Cloudflare Workers" template; he knows the
  drill now).
- The `users` table is anon-readable (address → handle) — feeds/tools can
  resolve PD names without auth.
- fx feed ops: manual run = GET the worker URL with `Bearer RUN_SECRET`
  (secret on the Worker). KV state keys: `cursor`, `posted`, `prices`.

## 🧭 WAITING ON BRENDON

- **iOS push banner test result** (NEXT UP #1) — the ONLY open item now.
  (Alchemy URL + PD feed channel BOTH received + wired this session.)
- Feature Atlas re-order · ASCII-Mode glyph ⠿ iPhone check · Lane Runner
  top-10 trigger spot (leaderboard now exists in-game via score-line tap —
  may satisfy this) · docs.pricediscussion.com wiring — all previously
  ClickUp'd.

## 🧭 THE ROAD TO MAINNET

1. ✅ Indexer sweep go-live + token-2 backfill — DONE 2026-07-11 (see SHIPPED).
2. Phase C — app talks to Sepolia (`docs/sepolia-test-phase.md` §3–4).
3. Mythic Audit Pass (`86b9v5wj4`) — the last gate.

## 📋 QUEUED (older, not started)

- Genesis message timeline fix (store 13:28 UTC).
- Group sorts rework · Languages as a gen-art trait — discussion only.

## ⚠️ Known / deferred (older)

- ASCII 1/3-down line — faint artifact line, cause not isolated.
- Test prices (registry) — bulletin `0.2222`, reliquary `22.222` — REMOVE
  before mainnet.
