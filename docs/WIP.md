# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

1. **BUILD the PD MCP server v1 — GREENLIT (Brendon, 2026-07-10).**
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
2. **Warm the artwork pins.** The stored-preview un-deadlock is LIVE on dev
   (see FINDINGS below). Once deployed, simply browsing the site re-pins the
   catalog (healer pins on view). If tiles still look blank after real
   browsing, investigate the healer POSTs (`/api/preview`, `/api/ascii`) —
   don't re-diagnose the guard, that part is fixed and verified by probe.

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
