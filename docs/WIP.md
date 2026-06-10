# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`. Start fresh from `dev`. This chat's task branch
  `claude/collected-artworks-port-toqbah` is trash once work is on dev —
  Brendon to delete it on GitHub.
- **Updated:** 2026-06-10

## ✅ SHIPPED THIS SESSION (all on `dev`)
The user profile experience, built out tab by tab:
1. **Collected → Artworks port.** Collected tab is the full project Artworks
   surface (pop-up search, Grid Presets, multi-select, colorways, sort) driven by
   the platform facet pills (Artist · Project · PriceDay · Sun · Moon · Rising ·
   Fate · Status). Project Artworks tab untouched.
2. **Grid Presets account-backed.** 3 shared across all projects + 3 for Collected;
   `users.grid_presets` via `/api/me`, shared set restores trait filters only on
   the same project.
3. **Showcase tab.** First profile tab `Created → Showcase`, renders the 6-slot
   `users.showcase` (static = saved order, generative = reshuffle per visit).
   Empty state = **6 static ghost frames** (no animation; the breathe pulse was
   removed). Artist created-projects view DEFERRED to the whitelisted build.
4. **Starred sub-tab.** Private personal bookmark, rendered as a sortable/
   filterable **row list** (not a grid) with small lazy preview that opens the
   modal + one-tap unstar. Account-backed (settings envelope, private).
5. **Wishlist sub-tab.** Private "want to buy" **row list** — live price + quick
   Add-to-Cart + remove; the card heart (✛) now adds/removes. Account-backed.
6. **Selection identity made Project-exact site-wide.** Multi-select, Stars,
   Wishlist, and the **Cart** are all keyed `slug:id` now — the same token number
   across projects never collides. Cart panel shows each item's correct project
   title + live price (was reading everything against the global Prisms provider).

Shared bits: `OutputThumb` (lazy preview), `.starred-*` row CSS (reused by
Wishlist). Account-backed stores follow the presetStore pattern (write-through +
login hydration; stars/wishlist live in the `settings` jsonb, private).

## ✅ CONTRACTS WORKSTREAM — steps 1–3 BUILT (2026-06-10, on pd-contracts main)
The Combined Pre-Mainnet Spec's on-chain change set is **implemented, tested
(220 passing), and pushed to `pd-contracts@main`**: append-only
PDLibraryRegistry (one-shot factory wiring, live admin read, designated
inflater entry copied per-Project), PDProject library assembly + per-token
on-chain WebP thumbnail replacing Arweave entirely (writer-only, write-once,
16,384-byte cap), PDFactory registry wiring + URL-guard on every script chunk.
Seed/mint flow UNCHANGED. EIP-170 confirmed (factory 23,312/24,576 — tight,
~1.26KB headroom; watch it in the audit pass).

**Two build-time deviations from the spec, both forced by measured gas (the
spec's 5–10M tokenURI estimate was ~10× off; geth's default eth_call cap is
50M):** ① libraries are stored in the registry as the base64 text of their
gzipped source (upload-tooling convention; artwork page embeds it verbatim,
no per-read re-encode); ② the tokenURI json envelope is plain
`data:application/json;utf8,` — only the animation_url html inside stays
base64. Worst case (245KB library) measured 23.8M gas, 2× inside the cap;
permanent regression test in `test/integration/LibraryAssembly.t.sol`.
**OpenSea must be confirmed to swallow the utf8 json envelope at the Sepolia
F-1 gate — if it chokes, the one-line revert to base64 costs ~+31M gas/read
(would bust vanilla-geth reads for p5-sized libraries; fine on Alchemy-class
RPCs).** Also flagged for audit: `</script` is NOT in the locked URL-guard
ban list (an artist script containing it could break out of its tag; linter
should catch it pre-gas — consider adding on-chain at audit).

Next per build order: ④ linter + writer-bot updates (off-chain, this repo /
bot land) → ⑤ fresh audit pass over the changed surface → ⑥ Sepolia gates
(F-1…F-7 in the spec) → ⑦ mainnet, one window.

## 🚧 NEXT — user profile, remaining
- **Showcase curation wiring.** The "Add to Showcase" buttons (card hover, modal,
  multi-select) are still **"coming soon" toasts** — nothing writes a `showcase`
  slot yet. This is the small build that makes Showcase fillable. (DB column +
  `/api/me` accept already exist.)
- **Albums sub-tab (dedicated build).** "Basically iOS Albums, simplified."
  Public by default (privacy lock). Needs an album model — its own build.
- **Collected activity feed (deferred by Brendon).** A cross-project "what's
  happening with what I own" stream. Needs a holdings-spanning activity source
  (today's feed is mock + single-project).

## 🗒️ Smaller follow-ups
- Cart/stars/wishlist live in `settings` jsonb (no migration). If any grows huge,
  a dedicated column is the clean upgrade (Brendon's call — a prod migration).
- Account-backed stores: server snapshot OVERWRITES device on login (by design);
  logged-out adds are device-only until you log in.

## 🗒️ Prior context (still true)
- Collect loop wired: simulated mint → Supabase; profile Collected reads real
  holdings. Home page is still a hardcoded placeholder (`HomePageBody`). Direct
  profile sub-links (`/{handle}/starred` etc.) are bare "proof" stubs.
- Indexer = our own event DB fed by Alchemy free tier (no Ponder/Railway);
  secondary market = white-label OpenSea/Seaport; pass user costs through, keep
  platform cost ~$0; stay on Vercel for now.
- Magic Hour project page/showcase was lost with the deleted Petey branch — needs
  rebuild. Naming settled: project = **Magic Hour**, artist = **@petey**.
- A **dev-only Login button** (no-wallet desktop login) landed on `dev` in
  parallel this session (separate workstream).

## Process / gates
- **PUSH = merge to `dev` + push `dev`, instantly** (CLAUDE.md §0). App pushes need
  Brendon's numbered approval; docs/process pre-approved.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).
- Prod Supabase writes = gate #3, surface first. (Account-backed presets/stars/
  wishlist writes are LIVE — approved this session.)

## main / production — untouched
