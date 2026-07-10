# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NOW — awaiting Brendon's push word (2026-07-10 queue session)

Two app commits sit on the session branch, presented and waiting for PUSH:

1. **Stored-artwork un-deadlock** (`app/api/preview` + `app/api/ascii` writers)
   — THE Albums-glitch root cause. The deploy's R2 previews are EMPTY (every
   preview 404s at every rev; verified by probe — the v2 re-key orphaned all
   keys) and the healer could never refill them because the writers required
   minted-in-`holders` (which holds exactly 2 Sepolia test rows). Writers now
   accept any registry-catalog piece (id ≤ project supply); the catalog
   self-heals on view. **After this lands, browse the site to warm the pins.**
2. **Hash Synesthesia rework** — engine samples run a narrow writer
   (`applyHashSynSample` in ColorwayContext): bg family only; text
   black/white + buttons locked from the seed, per spec.

Also on the branch (docs, pre-approved): `docs/pd-mcp-spec.md` — the PD MCP
v1 spec + $0 cost table, **awaiting Brendon's go/no-go** (queue #6 delivered).

## ✅ SHIPPED TO DEV 2026-07-10 (queue session — pushed, live on preview)

- **Notes = full DB feature (Brendon's call, this session).** Every note
  (output / artist / day) is an account-backed, LINK-AWARE record in the
  settings envelope (`settings.notes`, lib/notes/notesSync); hydrates on
  sign-in like To-Dos/stars. A 4th kind `free` (linked to nothing) is fully
  supported at the storage layer for the future **"Thoughts & Memories"**
  front end (Brendon's name) — free records round-trip untouched.
- **Notes per-project keying split (queue #3).** `pd_token_notes` keys by
  `slug:id` via lib/notes/tokenNotes (one shared reader, all 7 surfaces);
  legacy bare-id notes read as fallback and upgrade on save. Notes list shows
  the Project name per row. Verified end-to-end in a real browser (Playwright
  against dev): 10/10 behaviours.
- **Forever-free RPC pass (queue #2).** Audit: gas/fx/rpc-ping already
  cached-window routes; wagmi + test pages keyless public; indexer
  event-driven. The one per-user Alchemy surface — $PRICE balance — now reads
  through the user's own wallet provider (walletBus `registerWalletEthCall`,
  chain-guarded), cached route as fallback. Key usage ≈ small constant.
- **ClickUp sync (queue #1).** Mega-session closed out (5 PD-Docs tasks
  closed with whys, shipped-record card in 02·Done), queue tasks created,
  4 Brendon-action items assigned + due + inbox comments (Atlas re-order,
  ⍞ glyph check, docs subdomain, Lane Runner top-10 spot).

## ⚠️ FINDINGS this session (know these)

- **The live deploy currently shows NO stored artwork** — R2 empty since the
  v2 re-key; every art tile is spinner→placeholder. The un-pushed writer fix
  above is the unlock. This likely also explains any "site looks broken"
  reports beyond Albums.
- Sub-note: only pd-test-alpha #1/#3 exist in `holders` (token-2 backfill
  still pending — see the mainnet-tester work order).

## 🧭 WAITING ON BRENDON (unchanged + new)

- **PUSH word** for the two app commits above; **go/no-go** on the PD MCP build.
- Feature Atlas re-order (numbers LOCK after) — ClickUp'd + assigned.
- ⍞ glyph iPhone check — ClickUp'd + assigned.
- Lane Runner top-10 trigger spot — ClickUp'd + assigned.
- docs.pricediscussion.com Cloudflare wiring — ClickUp'd + assigned.
- $PRICE docs TGE fact-check at PUBLIC launch (13·Launch Ops task).

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
