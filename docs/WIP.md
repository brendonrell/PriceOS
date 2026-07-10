# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — the active build queue (Brendon's order, 2026-07-10)

Work these in order; each is scoped and greenlit unless marked:

1. **⚠️ ClickUp sync FIRST** — the 2026-07-10 mega-session (below) shipped a
   lot and ClickUp was NOT updated (session ended at context limit). Close /
   add tasks to match the shipped list + this queue, then build.
2. **Forever-free RPC pass** — audit every client-side chain read; route all
   read surfaces through cached Worker routes on the `/api/gas` pattern (one
   upstream call per TTL window regardless of user count), wallet-connected
   reads through the user's own wallet provider, keyless public RPCs as
   fallback. Goal: our Alchemy key usage becomes a small constant. Free tier
   throttles rather than bills (verified 2026-07-10) — but the pass makes the
   ceiling structural.
3. **Notes per-project keying split** — `pd_token_notes` keys by bare numeric
   id, so #5 in two projects share one note. Split to `slug:id` keys with a
   one-time localStorage migration; consumers: NotePromptContext, NotesBox,
   rowFlags, card captions. (The LABEL side was fixed 2026-07-10 — this is
   the storage side.)
4. **Albums UI glitching** — Brendon: "broken and glitching like CRAZY and
   jumping all over the place." Needs real investigation (components/album,
   styles/albums.css). Not yet diagnosed.
5. **Hash Synesthesia rework** — now that cards are stored images (not live
   scripts) it misbehaves: it may ONLY change the colorway. Buttons must be
   untouched, and the black/white parts of the colorway are NOT to be
   touched. Engine: lib/engines (hashsyn), applyBgHex paths in
   ColorwayContext.
6. **PD MCP server spec** — Brendon wants thoughts/spec for a $0 PD MCP
   (Cloudflare Workers free tier / existing account) exposing read tools to
   Claudes: verify-project (`isProject`), output provenance, project/output
   reads off the public API, docs search over llms.txt. Cloudflare's MCP
   framework (agents SDK / workers-mcp) fits the free tier at launch scale;
   deliver a spec + cost table first, build on his go.

**Waiting on Brendon (don't build until he answers):**
- **Feature Atlas re-order** — the founding numbering (#0001–#0212, ClickUp
  Master-Feature-List order) is provisional; he wants a nostalgia re-order
  pass, then numbers LOCK and the registry (lib/docs/features.ts) goes
  append-only forever.
- **⍞ glyph device check** — ASCII Backup's glyph (U+235E) needs the usual
  iPhone monochrome-text verify before it's locked (same gate as every glyph).
- **Lane Runner top-10 sheet** — WR + @name shipped in the game header; the
  full top-10 list needs a trigger spot from Brendon (golf-leaderboard look
  is the reuse target).
- **docs.pricediscussion.com wiring** — docs live in-app at `/docs`; the
  subdomain is a Cloudflare domain step. Footer link points at `/docs` until
  then, flip when wired.
- **$PRICE docs counsel pass** — the four `/docs/price-token/*` pages carry
  the Howey-protective framing (reviewed in-session 2026-07-10); Brendon has
  Howey-proofed tokenomics himself and feels good. One open fact-check at
  PUBLIC launch: confirm the TGE batch push has executed on-chain before the
  tokenomics page's "deployer ends at zero" reads as fact.

## ✅ SHIPPED 2026-07-10 — THE DOCS + PRODUCT MEGA-SESSION (dev, tree clean, all pushed)

- **PD-Docs v1 — the docs site at `/docs`** (Brendon's call: roll our own over
  SaaS). Markdown source in `content/docs/` is the single truth for HTML
  pages, raw `.md` URLs (append `.md` to any docs URL), `/llms.txt`, and
  `/llms-full.txt` — the AFDocs agent-score strategy built in. 31 pages:
  Start Here, For Artists, For Collectors, The App (11 surfaces), Build on
  PD, Smart Contracts (written from deployed source — factory/project/
  splitter/registry), $PRICE ×4 (ratified content + live mainnet address),
  Glossary. Docs render bare (own chrome via PriceOSShell bypass), boot the
  DARK colorway by default (prehydration + ColorwayContext know `/docs`),
  and mount the real settings ColorwayPicker in the nav. Engine:
  `lib/docs/content.ts` (manifest), `lib/docs/markdown.ts` (marked),
  middleware `.md` rewrite, `styles/docs.css`. Footer Docs link live.
- **Feature Atlas in the docs** (`/docs/features`) — all **211** ClickUp
  Master-Feature-List features stamped with permanent 4-digit catalog IDs
  (#0001…#0211 + #0212 below), searchable/sortable/filterable catalog,
  markdown twin at `/docs/features.md`. Registry: `lib/docs/features.ts`.
  Numbering provisional until Brendon's re-order (see queue).
- **ASCII Art Mode — Atlas #0212.** Sitewide display mode: every artwork
  surface renders its mint-pinned ASCII backup instantly (no typing anim).
  Seams: ArtworkCard, OutputPreview, OutputThumb; artifact loader
  `lib/art/asciiStandin.ts`; miss → normal preview, never a blank tile.
  Toggle = THIRD button on the ASCII Backup panel (⍞ SITE, full inversion
  when on). Flag `asciiArt` in PdNotifs; body class `ascii-art-mode`.
- **Lane Runner: depth scenery** — blocker visuals flip on the game's own
  milestones: cones → 22 barriers → 50 night barrels → 111 pink flamingos →
  777 halos. Visual-only, mechanics untouched.
- **Lane Runner: world record** — `game_scores` table live in Supabase (RLS
  SELECT to anon/authenticated; writes only via the SIWE-authed
  service-role route `/api/game-score`, GREATEST-only). Header shows
  `WR {score} @{handle}`; wipeout submits best-effort.
- **To-Do reminder times** — time chip appears beside the due-date chip;
  reminders fire at date+time (engine already supported `dueTime`; the
  picker was the missing half).
- **Notes "PRISMS" hardcode — root-fixed.** The note label resolves its
  project like the output modal (caller slug → open modal → /art route);
  all seven callers pass slug; unresolvable → plain `#id`.
- **Artist profile colours** — artists with no picked Profile Colorway wear
  their signature colour (flagship Project's colorway) at first paint and
  runtime (`artistSignatureColor` in the registry); a saved profile_hex wins.
- **Onboarding copy** — "Choose YOUR PriceSprite", "permanent" underlined.
- **Docs "Build on PD" page** — invites community tools; chain surface open
  today, API reference to be published as it stabilizes.

## 💡 ANSWERED 2026-07-10 (no build)

- **ASCII in the token: SKIPPED (Brendon's call).** ~22KB text fits one
  ~24KB slot but needs a contract change (post-mint writer, ~5M gas/Output
  ≈ 25–30× a mint) — not worth it this deep into the build. The site-wide
  ASCII mode shipped instead.
- **RPC / Alchemy cost:** free tier throttles (429s) instead of billing; no
  card on file = can't be surprise-charged. The gas widget's cached-route
  pattern is the model for the RPC pass (queue #2).

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
