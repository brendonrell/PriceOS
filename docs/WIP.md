# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`. Start fresh from `dev`. This chat's task branch
  `claude/backlog-features-more-pages-neo4g2` is trash once work is on dev —
  Brendon to delete it on GitHub.
- **Updated:** 2026-06-09

## 🚧 IN FLIGHT — build next in a FRESH chat: port project Artworks → user Collected

**This is the next build. It's a bread-and-burner surface — use care, build in
verifiable slices, push only when solid. Don't skim; the full study is below so
you don't have to redo it.**

### Goal (locked with Brendon)
The user profile **Collected** tab should be the **exact same UI as the project
Artworks tab** — just driven by what you OWN (spans many artists/projects)
instead of one project. "Port the Artworks surface wholesale, then bring back the
Collected trait pills."

### Decisions (locked — do not re-litigate)
1. **Same UI, full surface.** Collected gets the real Artworks machinery: the
   **pop-up sort row** (NOT an always-visible row — it appears on demand, same as
   the project), the **search pop-up**, **Grid Presets**, **multi-select**.
2. **Keep the Collected facet pills** — `Artist · Project · PriceDay · Sun · Moon
   · Rising · Fate · Status` (platform facets derived from holdings, in
   `ProfileFacetBar` / `PROFILE_FACETS`). These were chosen deliberately. They
   REPLACE the project's own trait pills; everything *around* them is the project
   surface. Do NOT change which pills exist.
3. **Grid Presets = 6 total per user: 3 shared across ALL projects + 3 dedicated
   to Collected.** NOT per-project-per-user.
   - Project preset (the shared 3) saves the **universal** view (sort / fog-feed /
     price band / density); on apply it restores trait filters only when you're
     back on the *same* project (best-effort), and always restores the universal
     parts on any project. No data loss, just graceful.
   - Collected's 3 save the **facet** filters too — its vocabulary (Artist/Project/
     Day/Fate) is universal across the whole collection, so they restore cleanly.
   - **Account-backed** (follow you across devices), not device-only. Column
     `users.grid_presets` (jsonb) already exists; `/api/me` already writes it.
     ⚠️ Writing presets to the live DB is a **prod-data touch (gate #3) — surface
     to Brendon before applying** the storage move.
4. **Isolate from the project page.** Its Artworks tab must stay byte-for-byte
   unchanged. Verify that before pushing.

### Architecture map (already studied — trust this)
- **The bar = `components/project/TraitsUI.tsx`** (~1740 lines). Reads:
  `ProjectContext` (`useProject` → `projectSlug`; `outputs` used in MsFloatBar),
  `TraitsContext` (the SHARED filter/search/sort/preset/multiselect state — already
  shared with the profile), `SortContext`, `ColorwayContext`, `PersonaContext`,
  `CartContext`, `AuthContext`. Trait pills come from `fullTraitSchema(projectSlug)`.
  `collectionSlug` derived from the pathname.
  - Inline sub-components: `BarPill`, `SortBtn`, `IconBtn`, **`MsFloatBar`**
    (multi-select action bar — uses `useProject().outputs`, SINGLE-project coupled;
    needs a cross-project output source for Collected), **`PresetRow`** (Grid
    Presets row; takes a `slug` scope string).
  - Sort/search are **gated pop-ups**: `.sort-bar` renders with `style={hiddenStyle}`;
    `.search-row` toggles on `searchActive`. Visibility is tied to `visible` +
    persona/feed in project mode. Collected must reproduce the POP-UP behavior, not
    an always-on row.
- **Presets store = `lib/pins/presetStore.ts`** — localStorage `pd_presets_${slug}`,
  max 3, already generic by an arbitrary scope STRING. Generalize scope to a shared
  `project` key + a `collected` key, and move persistence to the account
  (`users.grid_presets` via `/api/me`). Keep the 3-slot + auto-name behavior.
- **Profile Collected today = `components/profile/ProfileFacetBar.tsx`** — a
  SIMPLIFIED bar (facet pills + a basic sort/search row). This is what gets brought
  up to full Artworks parity (or replaced). Holdings come from
  `/api/user/[address]/outputs` → `enriched` (`EnrichedHolding`). Gallery groups by
  project (`collectedByProject`) inside a `ProjectProvider` per group — KEEP that;
  cards still land in one `#gallery` grid.
- **TraitsContext already holds** `multiSelectActive / selectedIds / clearSelected`,
  `presetRowActive / togglePresetRow / applyPreset`, `searchActive / toggleSearch /
  closeSearch`, plus all filter/price state. The state layer is already shared — the
  work is markup + data-source, not new state.

### Recommended approach (CTO call — confirm if you'd build it differently)
Bring the Collected bar to FULL parity by **reusing the same CSS classes + shared
`TraitsContext` primitives + reusing `PresetRow` and `MsFloatBar`** (adapt
MsFloatBar's output lookup to the cross-project holdings), driven by the facet
data — **isolated to the profile surface** so `TraitsUI` (project page) is never
touched and can't break. Parameterizing the shared `TraitsUI` directly is the
"one component" purist route but is riskier to the project page; the isolated
parity route is safer for a bread-and-butter screen.

### Build order
1. **Presets by scope + account-backed** (`presetStore` → scope `project` (shared 3)
   + `collected` (3); persist to `users.grid_presets`). Surface the prod-DB write
   first.
2. **Collected bar → full Artworks surface** (pop-up sort, search, Grid Presets,
   multi-select) fed by holdings + facet pills.
3. **Verify project Artworks tab unchanged + `npm run build`**, then push to `dev`.

### Current `dev` state to be aware of
- ✅ Profile **+More**: added an **Info** sub-tab (followers/anchor/Discord moved
  under it; sub-pills now Starred/Wishlists/Albums/Info, flush under the main tabs).
- ⚠️ Interim Collected change ALREADY on dev: sort split to its own (always-visible)
  row + a toggleable search row. This was an interim de-cram — **the real port
  supersedes it.** The sort row should POP UP, not sit permanently.
- The **Showcase** tab (rename first tab `Created` → `Showcase`, render the 6-slot
  `users.showcase` with static/generative `showcase_style` — both already exist in
  DB + `/api/me`) is a SEPARATE next build, not this one. "Showcase = user-curated
  top 6 of Collected" is locked in Platform Nomenclature. Privacy lock: Stars
  private, Wishlist private, Albums public by default.

## 🗒️ Prior context (still true)
- Collect loop wired: simulated mint → Supabase; profile Collected reads real
  holdings. Home page is still a hardcoded placeholder (`HomePageBody`). Direct
  profile sub-links (`/{handle}/starred` etc.) are bare "proof" stubs.
- Indexer = our own event DB fed by Alchemy free tier (no Ponder/Railway);
  secondary market = white-label OpenSea/Seaport; pass user costs through, keep
  platform cost ~$0; stay on Vercel for now.
- Magic Hour project page/showcase was lost with the deleted Petey branch — needs
  rebuild. Naming settled: project = **Magic Hour**, artist = **@petey**.

## Process / gates
- **PUSH = merge to `dev` + push `dev`, instantly** (CLAUDE.md §0). App pushes need
  Brendon's numbered approval; docs/process pre-approved.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).
- Prod Supabase writes (e.g. presets → `users.grid_presets`) = gate #3, surface first.

## main / production — untouched
