# BRIEF · Composer ◎ — v1 build session

> **For the session picking this up:** read `CLAUDE.md` first (the operating
> contract — reply-first, reuse-never-reinvent, present-before-push, no scope
> invention), scan `docs/GLYPHS.md` (fixed icon vocabulary), then this brief.
> The product spec is ClickUp task **86b9eu9wn** ("FEATURE · Composer ◎",
> 02 · PriceOS / Ideas) — this brief scopes v1 of that spec against what the
> codebase actually has today (2026-07-12). Where this brief and Brendon's
> chat direction disagree, his word wins.

## What the Composer is

A **visual query builder over PD's dataset**. Not SQL, not code — the user
composes filters/sorts/groupings with taps, gets a **live grid of standard PD
artwork cards** as the result, and can save any composition as a **Program**:
a named, persistent, auto-updating view. Spec's one-liner: Dune meets Notion
inside a generative art platform. Glyph: **◎** (already in the task title —
device-verify per the GLYPHS.md #1 gate before locking).

## Why now / what it stands on

The 2026-07-12 grouping redesign (on `dev`) is the deliberate foundation:

- **Standalone GROUP toggle** leads every sort row; grouping is independent
  state in `lib/state/SortContext.tsx` (incl. `defaultGroup` persisted from
  Settings · DEFAULT SORT).
- **Grouped grid rendering** is proven and cheap: flat `#gallery` grid,
  `.gallery-group-header` section titles (collapsible, counted), cards never
  unmount on regroup. See `components/project/useProjectGallery.ts` +
  `components/profile/useCollectedGallery.ts`.
- **Preset machinery** already snapshots+restores full view state:
  `lib/pins/presetStore.ts` (scoped 3-slot Grid Presets),
  `lib/pins/starredPresetStore.ts`. A **Program is this pattern, grown up**
  (named, unlimited-ish, server-stored).
- **Facet/filter UI** exists: `TraitsContext` + the L1/L3 pill rows
  (`components/project/TraitsUI.tsx`, `components/profile/ProfileFacetBar.tsx`,
  `components/home/HomeProjectFacetBar.tsx`) — platform facets (Artist ·
  Project · PriceDay · Sun · Moon · Rising · Status · Fate), search, price
  range.

**RULE #0 applies hard here: the Composer's result grid IS the existing
gallery (ArtworkCard + group headers + sort/group rows), and its filter
surface reuses the existing pill components. Do not hand-roll lookalikes.**

## v1 scope — compose over what PD indexes TODAY

Data available now (no chain-history dependency):

| Dimension | Source |
|---|---|
| Platform facets (Artist/Project/PriceDay/astrology/Fate) | `lib/project/registry` `outputTraits` — deterministic, local |
| Project traits (per-project schema) | `fullTraitSchema` / `outputTraits` |
| Listed / price | `outputs`/listings via existing API + `list_price_eth` |
| Owner / holder | outputs meta (`ownerDisplay`/`ownerFull`); `users` is anon-readable (address→handle) |
| Dominant colour / fingerprint bucket | `lib/art/colorStore` `resolveBucket` + stored colours |
| Rarity rank | `lib/output/rarity` `pdRarityRank` |
| Social graph (mutuals/following/followers) | existing net-sets loaders (see `useProjectGallery` Network filtering) |
| My holdings / starred / wishlist | existing stores |
| Pre-chain event ledger (mints/sales/lists) | Supabase `events` (feeds the activity feeds) — usable, but treat heavy history aggregation (ATH, hold-duration) as **phase 3** |

**v1 deliverable:**

1. **The builder** — a full-screen view (Atlas "Dedicated Tools" family)
   where the user stacks filter rows (facet ∈ values, price range, owner
   class, colour, rarity band, listed/held), picks sort + grouping (the same
   SortContext vocabulary), across **all projects or a chosen set**.
2. **The live result grid** — the existing grouped gallery, verbatim
   componentry, fed by the composed query. Cross-project cards render inside
   per-project providers exactly as Collected does.
3. **Save as Program** — named snapshot of the query config. **v1 storage:
   local (the preset-store pattern).** Server-side Programs table
   (`wallet, name, query_json, created_at` per spec) is a fast follow —
   surface the migration for Brendon's approval (prod-write gate, CLAUDE.md
   §4) rather than assuming it.
4. **Program recall** — open a Program → query re-runs live (auto-updating
   by construction: it's a stored config, not stored results).

**Phase 2 (own approval):** server-stored Programs, a Programs shelf/entry
surface, maybe sharing (the `?sort=` slug precedent extends to a `?q=` slug).
**Phase 3 (post-chain-cutover):** history-powered predicates — ATH drop %,
hold duration, cross-collection wallet intersections, floor moves. These need
indexer history that only gets real at the Cloudflare/mainnet cutover. Do NOT
mock them into v1.

## Design questions to settle with Brendon IN CHAT before building

- **Entry point** — where the Composer opens from (home action row? the
  Iconostasis ⌸ / Dedicated Tools family? settings?). Suggest, don't decide.
- **Builder form factor** — Linear-style filter bar vs Notion-style stacked
  rows. Mock BOTH cheaply in words, let him pick. Mobile-first: he reads and
  drives everything on iPhone.
- **Program naming/limits** — count, rename, delete affordances.

## Hard boundaries

- Build EXACTLY the agreed v1 — no bonus affordances, no invented filters.
- No new glyphs without the GLYPHS.md check; the grouping/dimension glyphs
  are fixed vocabulary.
- No prod Supabase writes without explicit approval (Programs table is the
  one candidate — present it).
- All UI must be human-legible at full strength (Rule #2 — no half-opacity
  chrome).
- Verify with real build + compiled-asset checks before claiming done; ship
  loop is PRESENT → approval → merge to `dev` + push.

## Pointers

- ClickUp spec: task `86b9eu9wn` · this brief: `docs/briefs/composer-v1.md`
- Grouping redesign commits on dev: `e4b6e2a` + `01f28b4` (2026-07-12)
- Related surfaces to study before writing code: `useCollectedGallery.ts`
  (cross-project grid + grouping), `ProfileFacetBar.tsx` (facet pills over a
  holdings set), `presetStore.ts` (snapshot/restore), `SortContext.tsx`
  (sort/group/dir state + slug encode/decode).
