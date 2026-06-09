# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`. Start fresh from `dev`. This chat's task branch
  `claude/collected-artworks-port-toqbah` is trash once work is on dev —
  Brendon to delete it on GitHub.
- **Updated:** 2026-06-09

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
