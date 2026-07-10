# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

1. **⛔ ALBUMS UI on the PROFILE — STRIP AND REBUILD FROM SCRATCH (Brendon,
   2026-07-10, verbatim order — top priority).** The Albums section on his
   profile is "intensely glitched out". A previous chat was asked to fix it
   and **wrongly decided it was fine — do NOT repeat that dismissal.** The
   order: rip the current profile-Albums UI out and rebuild it **MOBILE /
   IPHONE FIRST** — nothing fancy, the existing look is fine, it just must
   not be broken. Verify with headless-Chromium screenshots at an iPhone
   viewport against the real profile (the sticker pass proved that rig
   works — dev-login + live reads) BEFORE presenting; a desktop-width
   glance is exactly how the last session got it wrong.
2. **iOS PUSH — diagnosis DONE, two of three fixes SHIPPED (see SHIPPED
   below). What remains:**
   - **BRENDON ACTION (the unblock): set `CRON_SECRET` on the
     `pricediscussion` Worker** (any long random string; same missing var
     family as the indexer-sweep go-live in docs/briefs/mainnet-tester.md).
     The every-minute reminder sweep fails closed without it — it has NEVER
     run, which is why no reminder push ever fired. Keys context: public
     VAPID key VERIFIED live on the deploy (/api/push/pubkey); private key
     set per Brendon, unverifiable from outside.
   - **Then verify end-to-end:** `wrangler tail` the Worker, set a to-do due
     2-3 min out (times are local now — fixed), watch the sweep fire and the
     push land as a lock-screen banner. If sends error, the tail names the
     cause; prime suspect is a malformed `WEBPUSH_PRIVATE_KEY` (the sender
     silently no-ops if the pair won't load: lib/push/webpush.ts
     ensureConfigured). Runtime is NOT a suspect: Workers has full
     node:crypto (verified in CF docs) and the send path is awaited +
     mode-gated correctly the whole way.
   - Facts for the next session: his iPhone has 2 valid Apple subscriptions
     (`push_subscriptions`, addr `0x65c3…9395`), mode `3d`, Silent off; the
     home-icon badge "9" was the app mirroring unread pings on-device
     (PingsContext setAppBadge), NOT evidence of push delivery; his 80
     ACHIEVEMENT pings rode the native sender yet zero banners displayed —
     that's what the tail run must explain if reminders work but pings
     still don't. Indexer-created pings skip native push BY DESIGN.
3. **BUILD PD MCP server v1 — greenlit; Brendon additions 2026-07-10.**
   Spec is the plan: `docs/pd-mcp-spec.md` (see item further down for the
   summary). NEW from Brendon today: expose the ASCII preview so any AI
   chat can render pieces inline; sales-crossed-with-traits questions
   ("does landscape or portrait sell better?") answerable by ANY connected
   client — ChatGPT users included, that's distribution; make the PD-Docs
   MCP section insanely detailed (the docs are literally what agents read);
   path to the Claude connectors directory = remote server on our
   Cloudflare + OAuth + privacy policy + support contact → submit (usable
   day-one as a custom connector while review runs). The upcoming Discord
   feeds on Cloudflare are separate Workers — zero impact on PDMCP.
4. **Stickers on-chain cutover — the last gate to real sticker revenue.**
   ClickUp `86baw12ek` (02 Backlog, high) has the full work order. The sticker
   EXPERIENCE is launch-ready on dev (see SHIPPED below); the revenue rail is
   still the sim rail. Sepolia PDStickers
   (`0xb06df183fe5b61787f257f8c039ca11902847d9e`) is deployed + verified but
   the chain shows ZERO sheets created (checked via RPC 2026-07-10): no buy,
   no peel, nothing on OpenSea. ✅ WRAPPER ART DONE (Brendon-approved
   2026-07-10): all 17 sealed-pack SVGs in `assets/sticker-wrappers/`,
   generated from the LIVE catalog by `scripts/generate-sticker-wrappers.js`
   — a new sheet gets its wrapper by re-running that script. Remaining
   order: createSheet on Sepolia with these SVGs (Brendon signs) →
   buy/peel/royalty exercise → OpenSea render check → cut the app
   store/market from sim to ERC-1155.
7. **PD Studio — Brendon's edit round.** PD Studio v1 + private layers are
   LIVE on dev (see SHIPPED below); Brendon wrapped 2026-07-10 saying he'll
   bring edits in a fresh session. Read **`docs/pd-studio-spec.md`** first —
   it is the plan of record (locked decisions, architecture, build sequence).
   Next build phases queued there: dashboard analytics from indexer data ·
   artist pings · library-bound test envelope · Supabase stores for drafts/
   access-list/packages (cross-device — v1 is device-local by design) ·
   sticker catalog wiring. ClickUp: epic `86bavub9k`, private-layers spec
   `86bavucbz` (⛔ sticker/godmode docs live in ClickUp ONLY — never PD-Docs).
5. **PD MCP spec summary (for NEXT UP #3).**
   The whole plan is in **`docs/pd-mcp-spec.md`** — read it first, build to it,
   nothing extra. Summary: new Cloudflare Worker `pd-mcp` on the existing
   account (workers-mcp / agents SDK pattern, remote MCP over streamable
   HTTP/SSE); five READ-ONLY tools — `verify_project`, `get_project`,
   `get_output`, `get_provenance`, `search_docs` — backed by the public app
   API + anon Supabase reads; chain reads through the `/api/gas` cached-route
   pattern (never per-caller RPC); KV response cache. $0 at launch scale.
   ClickUp task: `86bavnrt7` (12·Agents Backlog). Verify by connecting a live
   Claude session and exercising every tool. Open calls (spec §Open calls):
   subdomain now vs workers.dev; docs answers verbatim-from-llms-full only
   (recommended yes) — decide sensibly or ask in one line.
6. **Warm the artwork pins.** The stored-preview un-deadlock is LIVE on dev
   (see FINDINGS below). Once deployed, simply browsing the site re-pins the
   catalog (healer pins on view). If tiles still look blank after real
   browsing, investigate the healer POSTs (`/api/preview`, `/api/ascii`) —
   don't re-diagnose the guard, that part is fixed and verified by probe.

## ✅ SHIPPED TO DEV 2026-07-10 (late session) — Studio 500 · docs speed/MVP · reminder fixes (pushed, tree clean)

- **Studio footer link finally works — the real cause was the /studio PAGE
  crashing server-side (500), not the link.** The page + Sticker Studio read
  wallet state via wagmi hooks, but the app tree mounts NO wagmi provider
  (the stack is a deferred sibling — wagmi hooks are FORBIDDEN in the app
  tree, remember this). Identity now rides AuthContext (SIWE); Sticker
  Studio signing rides a new walletBus personal-sign seam (registered by
  WalletStack while connected). Amends the earlier "footer fixed" note
  below — that fix was real but the page behind it was dead.
- **PD-Docs speed pass:** the app loading overlay no longer shows on docs
  (pages are prerendered — it only delayed reading and a stalled boot
  stranded it forever, THE "loading screen just sits there" bug).
  "View as Markdown" now opens an in-place overlay with a visible ✕ (PWA
  has no browser back); the .md URLs stay byte-identical for agents.
- **Feature Atlas deduped 212 → 201** (numbering unlocked, so renumbered):
  the five "(spell)" doubles folded into their Global UI rows; Price Lens /
  Setup Code / Completionism / PriceStreak-row / Sticker-mode /
  Wishlist-Pings repeats folded; #170 grab-bag reduced to 'Argue'; #126 +
  display-modes + ping-concepts enumerations trimmed of entries that have
  their own row.
- **Docs Introduction now states:** PD is optimized for iPhone 12+ and, in
  particular, the installed PWA.
- **To-do reminder fixes (push diagnosis NEXT UP #2):** due times are now
  timezone-correct for the native sweep (client stamps the device UTC
  offset; sweep uses it — legacy rows keep old behaviour), and the in-app
  due toast obeys the Pingtoasts mode (ON/COMBO toast · 3D native-only ·
  OFF silent).

## ✅ SHIPPED TO DEV 2026-07-10 — STICKER LAUNCH-READINESS PASS (pushed, tree clean)

- **Modes reworked, every one distinct + readable** — overlap may kiss, never
  bury (width-aware relaxation in lib/stickers/heroPrefs). Rows is real 1/2/3
  in ALL modes (canvas modes read it as lid height). Fixed: every mode now
  CASTS by seeded shuffle (tidy modes always drew hue-neighbour stickers —
  arrangements came out one colour and Shuffle never changed the cast).
- **NEW SLAPPED mode** — the wow mode, designed from real stickered-laptop
  reference photos: statements placed first, near-tangent packing, mostly
  upright + rare rebel angles.
- **Setup Code v2 carries the SEED** (+ density + border) — a code restores
  the EXACT picture; verified pixel-identical via headless round-trip. Old
  codes still decode. This was why Brendon's loved looks were unrecoverable.
- **ANIMATED FAMILIARS sheet** — all 100 familiars alive (species idle
  loops), 0.026 MYTHIC; static FAMILIARS sheet verified complete (100).
- **Store**: phone stacked grid = PREVIEWS ONLY per Brendon's reference
  screenshot — each card is just its sticker fan (meta hidden via CSS),
  tight 62px strips; old one-line header restored (⊞ BY PD sub, ↑/↓ expand
  arrow, stacked stats); MKT/ALB buttons replaced by the marketplace CRAWL
  LINE under the header (tap crawl = market ⇄ store; ALBUM cap at its end).
  Stacked-grid column cap 8→9 rows so 17 sheets stay 2 columns. Compact
  rail + desktop unchanged.
- **Market cohesion**: covers clamped to their slot, sheet cover in book
  head, COMPOSE label. **Album**: per-page + overall progress fills.
- **Sizes**: PriceSprites = artist-badge large (hero + sheet view);
  Projects stay XL. Manager: Match preset spacing; code field fits v2.
- **Verified end-to-end with screenshots** (headless Chromium against the
  real profile; local run via dev-login + live Supabase anon reads). ~30
  screenshots reviewed incl. every mode × rows; contact sheets sent to
  Brendon in-chat; he approved and the batch is MERGED TO DEV (e36e6775).
- ⛔ Launch truth: sticker revenue is STILL SIM — see NEXT UP #1.

## ✅ SHIPPED TO DEV 2026-07-10 — PD STUDIO v1 + private layers (pushed, tree clean)

- **PD Studio v1** — the artist's side of PD, one app: `/studio` on the dev
  preview, host-routed so `studio.pricediscussion.com` works the moment DNS
  points at the Worker (middleware host rewrite). Rides the full app shell.
- **Workbench**: private drafts (localStorage v1), script paste/upload,
  unlimited test runs (6/22/66/222) — hashes derived with PDProject.mint's
  exact shape, rendered in the REAL tokenURI envelope (lib/studio/drafts.ts),
  every hash kept, grid + fullscreen live render.
- **Publish**: local preflight → `/studio/publish` (bare Sepolia signer, /deploy
  family, own wagmi stack) — factory-simulation preflight (whitelist/cooldown/
  bounds via the contract itself), artist signs createProject, ProjectCreated
  parsed, draft marked LIVE.
- **Dashboard seam**: on /studio the connect menu is the artist dashboard —
  StudioProjectsBox takes the Notes accordion slot (Brendon's spec).
- **Private layers (wallet-gated, invisible otherwise)**: Sticker Studio
  (Package JSON paste/import + Figma SVG assembly → preview grid → wallet-
  signature approval; staged on-device) + God Mode (access-list mgmt, seed
  `0x1460…B9B8` unremovable; platform package view). ⛔ Their docs live in
  ClickUp ONLY (task 86bavucbz).
- **PD-Docs**: comprehensive 4-page PD Studio section (nav manifest updated) +
  mobile header fix (notch/safe-area clearance, phone-fit top bar — the
  screenshot bug that opened the session).
- Spec of record: **`docs/pd-studio-spec.md`**. ClickUp epic `86bavub9k`
  commented with the full ship + next phases.
- **Post-wrap footer fixes (Brendon-reported, same day):** Studio footer link
  was a dead placeholder span → now links `/studio`; Docs footer link stalled
  on the in-app hop (URL flipped to /docs, reload always worked) → opted out
  of in-app routing (`data-native-nav`), enters via full load like a direct
  visit (also gives docs its prehydration dark boot).

## ✅ SHIPPED TO DEV 2026-07-10 — ASCII Art Mode round 2 (pushed, tree clean)

- **Bulk ASCII backups** in the output page's ASCII Backup section: `PROJECT
  .JSON` (every minted piece of this project) + `COLLECTION .JSON` (every
  minted piece of EVERY project — Brendon: fully logged-out, no account
  gating anywhere in ASCII backup). One downloadable bundle
  (`pd-ascii-backup-bundle` v1), pinned-artifact-first with fresh
  deterministic derive on a miss; the running button ticks n/total.
- **Stuck loading ring fixed** — the standin canvas fires no img onLoad, so
  gallery tiles + artwork modal rings spun forever; both now clear off a new
  onReady seam when the ASCII paints.
- **Mode now covers the whole site** — output page + fullscreen (ArtworkLive,
  previously missed entirely; derives on a missing pin so it never drops out
  of the mode), bench/cart/drag ghost, Album Show, search-row thumbs,
  stickers. Pixel-fingerprint sampling stays OFF the ascii path (would report
  false colors).
- **Small-tile vibrancy** — standins paint at true device res (panel's
  no-moiré rule) and the color underlay ramps up as displayed glyphs shrink
  (<5 device px/column), so tiles hold the artwork's real brightness instead
  of washing gray. Panel + modal-scale look unchanged (the reference).
- **Mode button renamed** — "⍞ Activate ASCII Mode" (was "⍞ SITE").
- ClickUp 86bahh9f5 commented. Heads-up for the future: a COLLECTION bundle
  scales with total minted supply — fine at today's counts, revisit if the
  catalog gets huge.

## ✅ SHIPPED TO DEV 2026-07-10 — To-Dos polish session (pushed, tree clean)

- **To-Dos UI cleanup (Brendon-approved batch):** header + / ☇ swapped (+ first);
  delete/clear confirm now portals to `<body>` → true full-screen overlay (was
  trapped by the menu's transform); P1 marker = thin red ring per row (old left
  rail merged across stacked rows); composer date+time live in ONE due pill
  (two tap targets, native pickers — row no longer clips); Add button → compact
  `+`; price chip ◊ rides currentColor at rest (hothurt only when set); chip
  icons share a fixed-height centering box; composer gains a top-right × exit.
  All in `components/dropdown/TodosBox.tsx` + `styles/todos.css`.

## ✅ SHIPPED TO DEV 2026-07-10 — the QUEUE session (all pushed, tree clean)

- **Notes = full DB feature (Brendon's call).** Account-backed, LINK-AWARE
  records (`settings.notes`, lib/notes/notesSync): output / artist / day, plus
  kind `free` (linked to nothing) fully supported server-side for the future
  **"Thoughts & Memories"** front end (Brendon's name — not built yet). Notes
  hydrate on sign-in like To-Dos/stars.
- **Notes per-project keying split.** `pd_token_notes` keys `slug:id`
  (lib/notes/tokenNotes shared reader, all 7 surfaces); legacy bare-id notes
  read via fallback + upgrade on save; Notes list shows Project names.
  Browser-verified 10/10.
- **Forever-free RPC pass.** $PRICE balance reads ride the user's own wallet
  provider (walletBus `registerWalletEthCall`, chain-guarded; cached route
  fallback). Everything else was already cached-window / keyless. Alchemy
  usage ≈ small constant.
- **Stored-artwork un-deadlock (THE Albums-glitch root cause).** Deploy R2 was
  EMPTY (v2 re-key orphaned every preview; probes: all 404) and the healer was
  locked out — writers required minted-in-`holders` (2 test rows exist).
  Writers now accept registry-catalog pieces (id ≤ supply); catalog self-heals
  on view. Junk-id spam still blocked.
- **Hash Synesthesia rework.** Samples run the narrow `applyHashSynSample`
  (ColorwayContext): bg family ONLY — text black/white + buttons locked from
  the seed, per Brendon's spec.
- **ClickUp fully synced** (mega-session closeout + queue + 4 Brendon-action
  items assigned with due dates + inbox comments).
- **PD MCP spec** delivered (`docs/pd-mcp-spec.md`) → build greenlit, see NEXT UP.

## ⚠️ FINDINGS this session (know these)

- Only pd-test-alpha #1/#3 exist in `holders` (token-2 backfill pending — see
  the mainnet-tester work order).
- Local `dev` in a fresh clone can be stale — always `git fetch origin dev`
  and reset to origin/dev before merging.

## 🧭 WAITING ON BRENDON

- Feature Atlas re-order (numbers LOCK after) — ClickUp'd + assigned.
- ⍞ glyph iPhone check — ClickUp'd + assigned.
- Lane Runner top-10 trigger spot — ClickUp'd + assigned.
- docs.pricediscussion.com Cloudflare wiring — ClickUp'd + assigned.
- $PRICE docs TGE fact-check at PUBLIC launch (13·Launch Ops task).
- MCP spec open calls (subdomain; verbatim docs answers) — next session may
  decide sensibly if he hasn't answered.

## 🧭 THE ROAD TO MAINNET (unchanged — 2026-07-09 baton)

Sepolia rehearsal functionally COMPLETE (tester 12/12, five contracts
Etherscan-verified, indexer live-proven). Remaining, in order:
1. **Sweep go-live + token-2 backfill** — work order at the TOP of
   `docs/briefs/mainnet-tester.md` ("OPUS: START HERE"); needs Brendon's
   three Cloudflare vars.
2. **Phase C — app talks to Sepolia** — spec §3 + §4 in
   `docs/sepolia-test-phase.md`.
3. **Mythic Audit Pass** (`86b9v5wj4`) — the LAST gate before mainnet.

## 🔧 FINISH THE JOB — desktop only (unchanged)

**iOS/native push:** server private signing key is the last piece — set
`WEBPUSH_PRIVATE_KEY` (or a fresh VAPID pair) on the Worker. Code side DONE.

## 📋 QUEUED (older, not started)

- Genesis message timeline fix (store 13:28 UTC).
- Group sorts rework — discussion only, needs Brendon's direction.
- Languages as a gen-art trait — discussion only.

## ⚠️ Known / deferred (older)

- ASCII 1/3-down line — faint artifact line, cause not isolated.
- Test prices (registry) — bulletin `0.2222`, reliquary `22.222` — REMOVE
  before mainnet.
