# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`. Start fresh from `dev`. This chat's task branch
  `claude/collected-artworks-port-toqbah` is trash once work is on dev —
  Brendon to delete it on GitHub.
- **Updated:** 2026-06-09

## ✅ JUST SHIPPED TO `dev` — Collected → Artworks port

The user profile **Collected** tab is now the **full project Artworks surface**,
driven by what the wallet OWNS across many projects/artists (ArtBlocks/fxhash
model) instead of one project's schema. Verify on the dev preview.

What landed:
1. **Full surface, facet pills kept.** Collected keeps its platform facet pills
   (`Artist · Project · PriceDay · Sun · Moon · Rising · Fate · Status`) but now
   wrapped in the real Artworks machinery: pop-up search, **Grid Presets**,
   **multi-select**, the colorway switcher, and #ID / $PRICE sort. Sibling layout
   matches the project (`.traits-ui` / `.sort-bar` / preset row / `.search-row`).
2. **Multi-select made Project-exact site-wide.** Selection is now keyed by
   `slug:id` (was a bare token number), so the same number in two projects
   (Prisms #5 vs Oracle #5) no longer selects as one. Touched the shared
   `TraitsContext` + `ArtworkCard` + project `MsFloatBar`; project Artworks tab
   behaviour preserved (single slug → identical).
3. **Grid Presets = account-backed (LIVE prod-DB write, Brendon-approved).**
   Persists to `users.grid_presets` via `/api/me` (write-through in
   `presetStore`, hydrated on login in `userState.hydrateFromRow`, cache key
   `pd_grid_presets`). **3 shared across ALL projects** (scope `project`,
   restores trait filters only when back on the same project via `savedSlug`;
   universal parts everywhere) **+ 3 dedicated to Collected** (scope `collected`,
   facets are universal so they always restore).
4. **Isolation.** The Collected float bar (`CollectedMsFloatBar`) + preset row
   (`CollectedPresetRow`) are replicated inside `ProfileFacetBar` reading the
   cross-project holdings, so the project page's `TraitsUI` is never re-pointed
   and can't regress.

Caveats to verify on preview (couldn't render from the build container):
- Float-bar actions are stubs-to-toast for v0 (parity with the project bar);
  own-profile shows List/Transfer/Showcase, other-profile shows Make Offer / Cart.
- Old per-project localStorage presets (`pd_presets_<slug>`) are orphaned by the
  scope change — a one-time reset, not data loss.

Files: `components/profile/ProfileFacetBar.tsx` (full rewrite),
`lib/pins/presetStore.ts` (account-backed + scopes + savedSlug),
`lib/state/userState.ts` (grid_presets hydrate), `lib/state/TraitsContext.tsx`
(`selectedKeys`/`selectedItems`/`isSelected`), `components/ArtworkCard.tsx`,
`components/project/TraitsUI.tsx` (preset scope `project` + savedSlug restore),
`components/profile/ProfilePageBody.tsx` (`isOwnProfile` passthrough).

## 🚧 NEXT BUILD — Showcase tab (separate, NOT started)
Rename the first profile tab `Created` → `Showcase`, render the 6-slot
`users.showcase` with static/generative `showcase_style` (both already exist in
DB + `/api/me`). "Showcase = user-curated top 6 of Collected" is locked in
Platform Nomenclature. Privacy lock: Stars private, Wishlist private, Albums
public by default.

## 🗒️ Prior context (still true)
- Collect loop wired: simulated mint → Supabase; profile Collected reads real
  holdings. Home page is still a hardcoded placeholder (`HomePageBody`). Direct
  profile sub-links (`/{handle}/starred` etc.) are bare "proof" stubs.
- Indexer = our own event DB fed by Alchemy free tier (no Ponder/Railway);
  secondary market = white-label OpenSea/Seaport; pass user costs through, keep
  platform cost ~$0; stay on Vercel for now.
- Magic Hour project page/showcase was lost with the deleted Petey branch — needs
  rebuild. Naming settled: project = **Magic Hour**, artist = **@petey**.
- Profile **+More** has an **Info** sub-tab (followers/anchor/Discord under it;
  sub-pills Starred/Wishlists/Albums/Info, flush under the main tabs).

## Process / gates
- **PUSH = merge to `dev` + push `dev`, instantly** (CLAUDE.md §0). App pushes need
  Brendon's numbered approval; docs/process pre-approved.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).
- Prod Supabase writes = gate #3, surface first. (Presets account-backed write is
  now LIVE — approved this session.)

## main / production — untouched
