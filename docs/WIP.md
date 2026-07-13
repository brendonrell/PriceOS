# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

1. **REDEPLOY the app Worker (needs a fresh CF token from Brendon) — dev is
   now MANY builds ahead of the live preview.** Awaiting deploy: the pings
   WOW PASS (a019bd3) + the ENTIRE 2026-07-12/13 mega-batch (Cartography,
   engine perf pass, Rewind, Dispatch, Hostile Takeover, docs — see SHIPPED).
   Follow the DEPLOY RECIPE below. Post-deploy verify: home title long-press
   opens the Cartography · triple-tap docks the Rewind · /dispatch prints its
   first edition on the first cron tick after 9AM Montreal (or immediately if
   past 9AM) · POST /api/social/mute returns 401 (not 404) · a ⚑ TAKEOVER
   button shows on other collectors' profiles.
   ⚠️ iOS push pipeline is PROVEN WORKING (Brendon's banner test succeeded) —
   the old "malformed key" suspicion is closed.
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
   in prod (fx-sales, pd-sales, and now fx-listings all live). Port order +
   every hard-won fact:
   **`price-discussion` repo → `workers/README.md`** (+ the brief
   `docs/briefs/discord-feeds-worker-migration.md`). Still pending: ab-sales,
   verse, ab-listings, feature, artcoin, emerge-fund. Brendon supplies each
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

## ✅ SHIPPED 2026-07-12/13 (Fable) — THE MEGA-BATCH (all on dev, ALL AWAITING DEPLOY)

Six pushes, in dev order. ClickUp updated per feature (86b9eth7w, 86barg53e,
86b9fcn0d, 86b9g6c7c, 86bafgw65 all complete; 86b9fbrx9 commented).
- **The Cartography ◫ (86b9eth7w):** living ecosystem map — territories from
  minted supply w/ seeded coastlines, holders as inhabitants, artist ✺ capital,
  shared-collector continents (periodic force layout), realtime event layer
  (mint ripple+growth, sale comets, listing beacons), 3 LOD depths, wallet
  focus mode. Canvas 2D, zero deps, /api/cartography seed + Realtime channel.
  ENTRY: long-press the home "Price Discussion" name (project-title gesture
  verbatim). WebGL deferred until scale demands (noted in task).
- **Engine perf pass (86bafgw65 + fleetwide):** all 84 engines benchmarked
  headless (playwright + esbuild harness in scratchpad); ~45 were 1-4s/piece.
  Shared grain/mottle/hazeSheet storms → bucket-batched path fills / pixel
  buffers (same rng order); bespoke fixes: vanguard (PIP dot culling, 4.2s →
  0.9s), goldenangle (layer-blur glow, 4.1s → 50ms), corallogic (int grid
  keys), diffusion (inlined laplacian), chladni (near-band mask + LUT
  deposits, 3.3s → 1.65s = current fleet worst). ⚠️ 9 projects' texture layer
  changed → ZEROED to 0 mints on Brendon's order (chladni pressroom ictus
  caustics cyanotype vanguard frost-fern conservatory topiary; holders/events/
  listings/offers rows deleted, aggregates reset). pd-test-alpha untouched.
- **The Rewind ◄ v1 (86barg53e):** triple-tap the home name → whole-OS docked
  at any PriceDay: banner + spine scrubber + RETURN TO NOW; as-of home (stats,
  lists, day log) + as-of project pages (stats-then, gallery capped to
  minted-by-then); read-only by construction (/api/rewind GET only).
  **Daily social tape STARTED** (social_snapshots table + cron — the
  can't-wait piece; R4 profile/leaderboard rewind now possible later).
- **The Dispatch ▤ (86b9fcn0d):** morning paper, 9AM Montreal, covers prior
  day; deterministic seeded prose off the almanac engine ($0/day); immutable
  editions in `dispatches` table; /dispatch + /dispatch/YYYY-MM-DD forever-
  URLs; entries = news-rail ▤ pill + footer 2nd row before Mood Ring.
- **HOSTILE TAKEOVER ⚑ (86b9g6c7c) + own-book offers decision (86b9fbrx9 =
  Option A, Brendon's call):** blanket premium bid on a 3+-piece position;
  1.2× premium enforced (lowest listing → floor → mint); 72h non-cancellable
  (cancel path refuses takeover offers); real per-piece offers w/
  offers.takeover_id; accept flow records yields live; sweep stamps
  COMPLETED/PARTIAL/WITHSTOOD (180d mark); profile ⚑ TAKEOVER action + cast
  sheet + inscription banners; Offers HQ badges blanket rows. NEW glyphs
  logged in GLYPHS.md: ◫ ◄ ▤ ⚑ (all need the iOS device gate).
- **PD-Docs:** new pages for all four tools + corrected the stale "PD does
  not operate a marketplace" claim (own book documented), grouping toggle
  documented, overview/discovery cross-links.
- New crons on the 1-min trigger (all probe-and-exit): social-snapshot,
  dispatch, takeover-sweep.
- DB migrations applied (live Supabase): social_snapshots, dispatches,
  takeovers + takeover_acceptances, offers.takeover_id.

## ✅ SHIPPED 2026-07-12 (Fable, night) — PINGS SYSTEM REDESIGN + ACHIEVEMENT DE-SPAM (dev; batch 1 LIVE)

Full spec + status in ClickUp `86bawky5p`. Two commits on dev:
- **be249c7 (LIVE on the preview):** read = SCROLLING the pings list (open
  marks nothing); unread on top, honest unread-only count; all five MY PINGS
  interest toggles wired to real fan-outs (mutuals / starred artists /
  starred projects / starred traits / rarity top-10 moves in held projects);
  push respect policy (money always, ambience budgeted 4/hr, achievements +
  follow-feed never, pills enforced server-side); to-do + calendar reminders
  → inbox + push; **Artist Push** (Studio, 1 preset ping/month/project to
  holders); achievements: 116 front-loaded trophies → far-climb rungs (still
  exactly 1,000; day-one unlockables 57→20; Mjölnir re-walled 231,000,
  verifier green); docs got a Pings SECTION (overview/controls/artist-push);
  GLYPHS.md updated (interest glyphs; "stars are silent" note revised).
- **a019bd3 (on dev, AWAITING REDEPLOY):** wow pass — push deep-links to the
  piece, sprite moods (awake/blink/yawn) on the lock screen, SEEN divider +
  open-anchor, long-press-to-quiet (unstar artist/project or mute actor —
  NEW POST /api/social/mute, first writer of the `muted` table), 30d+ streak
  guard at 19:00 Montreal, "while you were away" rollup (inbox-only), sweep
  heartbeat → ops ping to @brendon if the cron stalls 10min+ (1/hr max).
- Queued at chain cutover (in the ClickUp task): indexer on-chain sale/mint
  path gets the same interest fan-out.
- Facts future sessions need: interest fan-out rides `app_ping_wishlist_fanout`
  (kind-agnostic RPC) + the users.settings GIN index (artistStars/projectStars/
  traitStars containment probes); kind `PING` was already in the live CHECK
  constraint (no migration needed anywhere in this whole build — zero prod
  writes); pings read route only bumps the broadcast watermark on `all` or
  `broadcast_seen`, never on ids.

## ✅ SHIPPED 2026-07-12 (Fable, evening) — fx-listings-feed LIVE

- **fx-listings-feed LIVE** — fxhash *listings* Worker, objkt-sourced
  (`list_create` on the three fxhash FA2s; lister = event `creator`), old
  bot's compact embed (em-dash title, "Listed by … for …", thumbnail).
  Sheet config carried over: **min $20, single webhook** (`WEBHOOK_MAIN`).
  1-min cron, KV `fx-listings-feed-state`. Verified end-to-end: real card
  rendered in `#fx-listings-feed` + deployed worker manual-run clean. Code
  on `price-discussion` `main` (`workers/fx-listings-feed/`); README's
  pending-port list updated; ClickUp `86b9g4e55` commented.
- Brendon's fresh CF API token was chat-only again — NOT stored; he can
  revoke it anytime (told him).
- Old Apps Script listings trigger: Brendon to disable (it dead-polls the
  dead fxhash API; harmless but pointless).

## ✅ SHIPPED 2026-07-12 (Opus) — Sticker store + PriceSprite modal UI polish (all on dev)

All merged to `dev` + pushed. UI/content only — no data/logic.
- **Sticker store:** outputs sheet **3 cols** (was 4) with even, roomy gaps
  (mobile only); store grid row-cap attempted via plain CSS `max-height` +
  `align-content:start` — **⚠️ this did NOT actually clip (see batch 2 below for
  why + the real fix)**; "album" tab → **"MY
  ALBUM"**; news-ticker row **~⅓ shorter** (10px); header expand arrow **1.5×**
  (33px); card count forced-wraps "N" over "stickers".
- **Both store crawls rewritten (content only, formatting untouched):** store =
  onboard + buy; marketplace = its OWN crawl nudging **listing**, framed as
  recouping toward the next roll of stickers/art (deliberately NO profit/flip
  language). Cast: **all 100 familiars = endorsers**, **@brendon +
  @pricediscussion sprites = platform reps**; ALL placeholder @handles purged
  from the crawl. `lib/stickers/ticker.ts` (buildStoreTicker/buildMarketTicker),
  wired per-view in `components/StickersModal.tsx`.
- **PriceSprite modal achievements line:** the points line was spilling past the
  right margin — count now stays inline with the label, the score drops to its
  own full-width line pinned right; faint tally 0.5→**0.9** opacity.
- **DEFERRED (Brendon's call):** the PriceSprites **sheet you can buy** still
  lists placeholder @handles as its stickers — leave until more real users lock in.

## ✅ SHIPPED 2026-07-12 (Opus, batch 2) — ASCII tab + achievements line + store grid scroll (real fix) (on dev)

All merged to `dev` + pushed. UI/content only — no data/logic.
- **ASCII Backup tab:** button labels → ALLCAPS (`ACTIVATE ASCII MODE`); dropped
  the leading dots (`COPY TXT` / `COPY JSON`); long button `collection`→`COLLECTED`.
- **PriceSprite achievements:** the points line (was `[[ … PTS … ]]`) now **centered**
  and flanked by the canonical achievements icon **◍** each side (`lib/achievements/icon`).
- **⭐ Store stacked grid — the REAL scroll fix (3 failed rounds first).** Batch-1's
  `.ss-grid-view { max-height }` NEVER clipped: the grid is a **flex child of the
  modal column** (`.sticker-sheet`), so its flex auto-minimum = full content height,
  which overrides `max-height` → the modal just grew to show every row (Brendon:
  "forcing itself to show the full grid"). Deploy was NOT stale and the value WAS
  live — the mechanism was wrong. **Fix:** wrap the grid in a dedicated bounded
  scroll viewport **`.ss-grid-scroll`** (`min-height:0` + `max-height` + `overflow-y`);
  the grid keeps its exact layout, the wrapper caps to ~6 rows and scrolls the rest.
  Verified with a headless repro of the real modal structure (offline, file://):
  6 of 9 rows shown, scrolls, modal bounded 632/844px (was ballooning). `gridRef`
  (drag-scroll) + scroll-memory moved to the wrapper.
- **Marketplace button** added left of `MY ALBUM` (same style) → opens the
  marketplace; flips to **`BACK TO STORE`** while in the market and returns you there.
- **Lesson for next time:** when a CSS `max-height` "isn't working," suspect a
  **flex-child that won't shrink** before blaming cache/deploy — verify the served
  asset first (it was correct here), then reproduce the structure headless.

## ✅ SHIPPED 2026-07-11 (evening, Opus) — App security audit (2 fixes; prod DB locked)

Full app security pass (API routes · SIWE/session · Alchemy webhook · crons ·
money/economy; contracts excluded). Core verified solid — mostly prior hardening
held up. Full findings + queued cleanup live in ClickUp **86bawbb7j** (11 · Security).

- **🔴 Critical — LOCKED (prod + dev).** Four trade RPCs (`app_sticker_buy` /
  `app_sticker_accept` / `app_sticker_swap_accept` / `app_accept_criteria_offer`)
  were EXECUTE-able directly by the public anon key via PostgREST, bypassing
  route-level SIWE auth (SECURITY DEFINER, actor-identity-as-arg). The 3 main
  money RPCs were already `service_role`-only; these 4 were missed. Revoked
  anon/authenticated/public EXECUTE (service_role retains → app unaffected).
  Applied to prod + migration `20260711_revoke_public_execute_sticker_offer_rpcs.sql`
  (commit 3cb4eea). Verified live: anon blocked, service_role intact.
- **🟠 outputs/color → first-viewer-wins (dev, c57b13d).** Was an overwrite; any
  signed-in user could re-tag any token's colour/fingerprint with a valid-but-wrong
  bucket (cosmetic — attribute sheet + colour rarity). Now returns early if colour
  is already set, mirroring the write-once preview/ascii pins.
- **Queued (pre-mainnet, none blocking today — all in 86bawbb7j):** money-math
  conservation in the trade fns + `app_buy`/`app_accept_offer` (buyer debit skipped
  when payer has no users row → conjure play-ETH); revoke 11 dead anon SELECT grants;
  pin `search_path` on 3 fns; move `citext` out of `public`; add a script-src CSP;
  flip `SIGNUP_SIM_ETH_GRANT=0` at mainnet cutover.
- Branch: `claude/app-security-audit-s6d24p` (work went straight to `dev`).

## ✅ SHIPPED 2026-07-11 (evening, Opus) — Albums revert + Friend Inspector / Projects Pro UI batch (on dev; Worker NOT yet redeployed)

Merged to dev + pushed. **Preview still stale until the app Worker is manually
redeployed** (needs Brendon's Cloudflare token — see the DEPLOY RECIPE below).

- **Albums reverted** to last night's rebuild (34e03e7): removed this morning's
  90° corners + `width:100%` wrap (`styles/albums.css`) and the 3-across desktop
  block (`app/globals.css`). Kept the fable rebuild. Verified album surface ==
  34e03e7 exactly.
- **Friend Inspector view-as-another-user** — `FollowersModal` now takes a target
  address via the modal `slug` arg (ModalContext); the graph/projects/stats loads
  key on `targetAddrLc` (falls back to `siweAddress`). Profile followers stat opens
  `open('followers','followers', user.address)` → that user's circle, compact.
- **Projects Pro modal** (`components/ProjectsProModal.tsx`, ModalName
  `'projectsPro'`, mounted in PriceOSShell) — FI chrome (compact + PLUS), alphabetical
  `allProjects()` list, rows → `/art/{slug}`. Wired to the home hero PRO stat.
- **PriceSprite card** (`components/FriendSpritePopover.tsx`) — Fiat-bubble-style
  portal+tail popover off the sprite tap; PriceRank (tierFor) + score + circle stats;
  `@name` links to profile. Sprite tap added via `CollectedPair` optional `onSpriteTap`.
- **Full-opacity pill outlines** — `.pill-l2` (globals + modal.css) and `.ambient-chip`
  (ambient.css) borders → `var(--text-color)`; `.smgr-sheet-pill` opacity 0.5→1.
- **Wire/Map** → floating text: `.fi-preview-chip` drops the box, weight 400+op .6
  (de-selected) / 800 (selected); toggle nudged down 3px.
- **Profile stats toasts** — first two stats' values now fire `iconToastProps`;
  followers unchanged (opens inspector).
- **FI title glyph** `.smgr-title-ic` scoped to `.followers-pop/.followers-plus`:
  23px + top -2px; `.fm-icon` centred.

## ✅ SHIPPED 2026-07-11 (late afternoon, Opus) — indexer sweep live + APP WORKER REDEPLOYED

- **App Worker `pricediscussion` REDEPLOYED** (OpenNext build → `wrangler
  deploy`; version 31290bc0). This is a MANUAL deploy — there is NO
  auto-deploy from dev / no CI, and the preview had been stale since ~12:45,
  so this redeploy is what finally put ALL of today's dev-merged work LIVE on
  the preview (attributes stats, NPC pass, Lane Runner, albums-3col, indexer
  fix).
  > **⛔ DEPLOY RECIPE — read before EVER redeploying the app Worker (a bad
  > redeploy cost real time this session).** The app has NO auto-deploy / no
  > CI — the `pricediscussion` Worker is updated ONLY by a manual build+deploy.
  > Steps: (1) `export CLOUDFLARE_API_TOKEN=<Brendon's token>` (he creates a
  > fresh "Edit Cloudflare Workers" token per session; NOT stored). (2)
  > `rm -rf .open-next && npx opennextjs-cloudflare build` — this now reads the
  > COMMITTED **`.env.production`** (added this session: all 8 PUBLIC
  > NEXT_PUBLIC_* values, so the client bundle is correct automatically. BEFORE
  > that commit, a fresh-container build baked EMPTY config → wallet defaulted
  > to mainnet + browser Supabase/push broke; the file is the permanent fix,
  > do NOT delete it). (3) `./node_modules/.bin/wrangler deploy` — use the
  > PINNED local wrangler (4.105); `npx wrangler` may pull 4.110 which fails
  > "Could not detect static files". (4) VERIFY: fetch a client chunk from the
  > live site and grep for `zspxpfwlwikdxwavffjn` (Supabase URL present =
  > config baked). Worker SECRETS (service-role, webhook signing, webpush
  > private, CRON_SECRET, ALCHEMY_RPC_URL, SIGNUP_SIM_ETH_GRANT) live on the
  > Worker, survive redeploys, are NOT in `.env.production`. Mainnet cutover =
  > edit `.env.production` (`NEXT_PUBLIC_CHAIN_ID`→1, mainnet Alchemy URL).
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

- **Fresh Cloudflare token** → redeploy so the pings wow pass goes live
  (NEXT UP #1).
- **Delete the chat branch** `claude/pings-system-redesign-r5kbew` (work is
  on dev): https://github.com/brendonrell/PriceOS/branches
- **Ticker copy review (2026-07-12)** — Brendon to eyeball the new store +
  marketplace crawl lines and send any wording edits (he said he'd review shortly).
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
