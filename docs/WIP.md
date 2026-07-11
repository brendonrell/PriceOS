# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

1. **PDMCP go-live (~3 min, needs Cloudflare CLI auth).** v1 is BUILT +
   VERIFIED on dev (`workers/pd-mcp/`, see SHIPPED 2026-07-11): from that
   dir `npm install` → `npx wrangler kv namespace create PD_MCP_CACHE`
   (paste id into wrangler.jsonc) → set `ART_IMAGE_BASE` (= the app build's
   NEXT_PUBLIC_ART_IMAGE_BASE) → `npx wrangler deploy` → connect a Claude
   session and exercise all seven tools. Then the connectors-directory path
   (custom domain + OAuth stub + privacy page). ClickUp `86bavnrt7`.
   ✅ ALBUMS REBUILD (old #1) SHIPPED — see SHIPPED 2026-07-11.
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
3. ✅ **PD MCP server v1 — BUILT (2026-07-11), see NEXT UP #1 for the only
   remaining step (deploy).** Every Brendon addition landed: ASCII preview
   tool, traits×sales tool, insanely detailed /docs/mcp section.
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
7. **PD Studio — next build phases** (Brendon's 2026-07-11 edit round
   SHIPPED, see below; `docs/pd-studio-spec.md` = plan of record): dashboard
   ANALYTICS from indexer data (Brendon asked "where's the analytics side?"
   — it's this queued phase, not yet built) · artist pings · library-bound
   test envelope · Supabase stores for drafts/access-list/packages
   (cross-device — v1 device-local by design) · sticker catalog wiring ·
   golf-score preview in the Studio preview (Brendon: nice-to-have, "opus
   can add later"). ClickUp: epic `86bavub9k`, private-layers `86bavucbz`
   (⛔ sticker/godmode docs live in ClickUp ONLY — never PD-Docs).
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

## ✅ SHIPPED TO DEV 2026-07-11 (late) — Albums UI cleanup + receipt/attrs/story/ASCII polish (all pushed, tree clean)

Branch `claude/albums-ui-cleanup-0m9nrt`; each item merged to dev as it landed.
- **Albums squared + full-width.** Both album screens now use 90° corners (no
  rounding). The top-level covers grid fills the full app-area width like the
  drilled-in view — it was shrink-wrapped + centred because the covers branch
  had no full-width child to stretch its wrapper (the drill-in view's header
  stretched it); forced `.albums-wrap { width: 100% }`.
- **Rarity Receipt button wider** (more side padding — label was cramped).
- **Attributes tile sub-stats now bold + full opacity** (were 0.6, near
  invisible — Rule #2): the rarity/percent/count line under each tile.
- **Price Story direction arrow** — downward arrowhead at the foot of each
  chapter connector (option A of 4 rendered for Brendon at iPhone size; pure
  CSS triangle) so the spine reads top→down.
- **ASCII Backup pills reordered** (Brendon spec): Copy .txt · Copy .json ·
  **Copy Project JSON** · **Copy My Full PD Collection ASCII Backup JSON** ·
  ASCII Mode LAST. Bulk buttons relabelled verbatim; ASCII Mode kept its
  existing style (the restyle-to-trait-pills ask was scrapped).
- **ASCII Mode glyph ⍞ → ⠿** (U+283F, Braille full cell = dot-matrix, the
  ASCII-art look; confirmed unused in the codebase). ⚠️ DEVICE-VERIFY on iPhone
  before lock — 3 unused alts if it tofus/reads wrong: ⎕ · ⌷ · ⧈.
- **To-Dos intentionally NOT touched** — Brendon weighed restyling the row
  (pull in L/R + 25% theme fill instead of the hothurt outline), then decided
  he likes the red outline; left exactly as-is.

## ✅ SHIPPED TO DEV 2026-07-11 — Brendon's big list (7 batches, all pushed, tree clean)

Late-session additions (after the first wrap of this block):
- **NPC Cast GUARANTEED SEEN**: the cast layer now stacks above every content
  surface (artwork modal, Album Show, fullscreen renders), below only the
  boot/loading covers; still fully pointer-through. It was buried under any
  open modal before.
- **Studio Analytics v1 — the indexer-fed dashboard side is LIVE**: one card
  per live Project of the signed-in artist via the public project API
  (events/holders/listings pipeline): minted/supply, collectors, followers,
  listings + floor, sales + volume, 14-day mint-pace strip, last ledger
  moments. Access-list wallets with no own Projects get the PLATFORM VIEW.
  Derivation validated against live deploy data (chladni). The Studio menu's
  Analytics link lands on it.
- **LOCKED (spec decision #7): artist edits always gate on the ON-CHAIN
  artist wallet** — soundtrack and everything after. Spec + Opus brief
  (`docs/briefs/studio-phase2.md`) updated; the brief now carries the full
  phase-2 order: royalties on the cards, artist pings, soundtrack management
  writes, cross-device drafts, library envelope, sticker wiring.

- **ALBUMS REBUILT (the top-priority order).** The profile ▸ +More ▸ Albums
  layout is now pure CSS auto-fill grids with square tiles (the sticker-grid
  system) — the JS width-measuring (ResizeObserver → inline pixel sizes →
  repaint loops while the panel animated open) that made the wall "jump
  around like crazy" is GONE. Same look, same features (Show, value line,
  SELECT tools, mosaic covers). Verified at iPhone viewport with the
  dev-login screenshot rig. NOTE: his real account has ONE album
  (noctilucent:1) — intact, confirmed in DB after verification.
- **PD Studio edit round (Brendon's full list, all verified by screenshot):**
  normal-case sub line, "From your phone or desktop" wraps as one unit ·
  runs 8/22/88/222 · MANDATORY Project PriceSprite (account-creation
  quadrant picker; new projectSpriteFaceFor(slug, vibe)) · MANDATORY custom
  colorway · YouTube playlist REQUIRED + fail-soft public check (new
  /api/studio/playlist, oEmbed; definitive not-public blocks preflight,
  check failure never does) · full-width live PREVIEW of the would-be page:
  REAL Hero component, scoped colorway vars (same YIQ/border/stat washes
  ColorwayContext writes), soundtrack button pops in when a playlist lands,
  tab pills + platform trait pills, grid beneath = the chosen run amount ·
  Studio connect menu = same chrome, fresh list (Dashboard / Analytics /
  Docs / MCP / Support; Stickers replaces Support for the access list) ·
  Subtraits explained on the upload page + a new docs section. Drafts carry
  vibe/colorway/playlist as OPTIONAL fields — old drafts load untouched.
- **PDMCP v1 BUILT + VERIFIED** (`workers/pd-mcp/` — zero-dependency Worker,
  MCP over streamable HTTP; excluded from the app tsconfig). Seven tools:
  verify_project · get_project · get_output · get_provenance · get_ascii ·
  query_traits (dimension × sales/listings over the anon-readable outputs/
  events/listings tables) · search_docs (llms.txt → raw-md verbatim +
  citations; fetches the live origin, cites canonical URLs). All exercised
  against live data via a node harness. Deploy = NEXT UP #1. /docs/mcp =
  the agent manual (nav: Build on PD).
- **Docs brand fix:** the docs top-bar + footer ‰ is now the PerMilleMark
  SVG (the My PD reference — real Inter-derived logo thickness, no webfont
  glyph). PerMilleMark gained 'use client' (docs layout is a server
  component).
- **ASCII-mode modal shadow** conforms to the artwork: the standin canvas in
  the artwork modal sizes naturally like the <img> path (its inline
  100%×100% fill was stretching the element past the art — shadow wrapped
  the box). Gallery tiles keep the fill (correct there). Heads-up learned
  on the way: CHLADNI pieces genuinely ARE wide dark canvases with a
  centered plate — the page render was never wrong, only the modal box.
- **NPC Cast:** Celestia (and Steven — both low-wall) now bottom-anchor so
  wrapped bubbles grow UP, never off-screen; safe-area aware; same corner.
  The artwork MODAL now publishes to NPC sight (fingerprint sampled from
  the loaded master, fail-soft null on cross-origin/ASCII) — answering
  Brendon's "do they work in the artwork modal?": they didn't, now they do.
  The full fingerprint v2/v3 vocabulary (scene/pattern/shapes/warmth/…) was
  ALREADY wired into sight lines; deeper expansion (stored traits — Fate,
  True Name, rarity — into their speech) is queued as an Opus-able brief.
- **Price Story wow pass:** chapters arrive on the app's staggered-rise
  entrance (Albums-wall signature, reduced-motion respected), both panels.
- **Docs: "Who built this"** — explicit, proud Claude credit (Claude Fable
  for the hardest engineering incl. contracts) + Gemini 3.0 Pro credit for
  launch-catalog engines, on the Introduction.

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
- ASCII-Mode glyph iPhone check — glyph changed ⍞ → ⠿ (Braille full cell)
  2026-07-11; device-verify it renders as monochrome TEXT. Alts if not: ⎕ · ⌷ · ⧈.
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
- **Attributes character-sheet enrichment (Brendon's ask 2026-07-11 — noted for
  a future build, liked in principle, none built).** The character sheet "feels
  like it could have way more stats/info." Candidates:
  · PD Rarity RANK — "#3 rarest of 105" (we compute rarity but never rank it)
  · percentile tags on each Fingerprint band — "brightness: top 8%"
  · mint order + speed — "3rd mint · 2 min after launch"
  · nearest genome twin — "closest sibling: #88"
  · numerology / life-path from the edition number
  · palette hex chips — the real colours, tappable
  All deterministic / $0, same ethos as the existing wall. His call which land.

## ⚠️ Known / deferred (older)

- ASCII 1/3-down line — faint artifact line, cause not isolated.
- Test prices (registry) — bulletin `0.2222`, reliquary `22.222` — REMOVE
  before mainnet.
