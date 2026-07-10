# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

1. **PD Studio — Brendon's edit round.** PD Studio v1 + private layers are
   LIVE on dev (see SHIPPED below); Brendon wrapped 2026-07-10 saying he'll
   bring edits in a fresh session. Read **`docs/pd-studio-spec.md`** first —
   it is the plan of record (locked decisions, architecture, build sequence).
   Next build phases queued there: dashboard analytics from indexer data ·
   artist pings · library-bound test envelope · Supabase stores for drafts/
   access-list/packages (cross-device — v1 is device-local by design) ·
   sticker catalog wiring. ClickUp: epic `86bavub9k`, private-layers spec
   `86bavucbz` (⛔ sticker/godmode docs live in ClickUp ONLY — never PD-Docs).
2. **BUILD the PD MCP server v1 — GREENLIT (Brendon, 2026-07-10).**
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
3. **Warm the artwork pins.** The stored-preview un-deadlock is LIVE on dev
   (see FINDINGS below). Once deployed, simply browsing the site re-pins the
   catalog (healer pins on view). If tiles still look blank after real
   browsing, investigate the healer POSTs (`/api/preview`, `/api/ascii`) —
   don't re-diagnose the guard, that part is fixed and verified by probe.

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
