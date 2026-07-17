# BRIEF — Per-engine code-splitting (the 1.3 MB art chunk)

**For a fresh Opus 4.8 chat. Read `CLAUDE.md` first and obey all of it.
Origin: hardening item 12 (deferred 2026-07-13) + Architect Report round 2
§3.4. The gate that blocked this — the determinism harness — exists now:
`tools/engine-hashes` with committed goldens. This is the
highest-regression-risk brief in the folder; small PRs, exhaustive proof.**

## The problem (measured 2026-07-13, still true)

Shared first-load is a healthy ~106 kB, but `lib/project/registry.ts`
statically imports all 147 art-fleet files (~50k lines), so every
art-rendering page pulls a ~1.3 MB engine chunk. One project's page needs
ONE engine.

## The design (the key split: metadata stays eager, render bodies go lazy)

Every engine exports render + traits + schema + aspects. Trait/schema/aspect
data is needed WITHOUT painting (filters, the Composer's trait vocabulary,
group dimensions, rarity) — it must stay statically importable. Only the
render functions are heavy. So:

1. **Mechanical file split, engine by engine**: render body moves to a
   sibling module (e.g. `engines/ai/strata.render.ts`); the existing file
   keeps traits/schema/aspects + re-exports. The registry keeps its static
   metadata imports and gains `slug → () => import('./…render')` loaders
   with a module-level cache.
2. **Async seam at the FEW paint entry points, not the many call sites**:
   `renderArtwork` stays synchronous once an engine is loaded; a small
   `ensureEngine(slug): Promise<void>` gate goes where painting begins
   (the card/preview/live components + `paintOutput`), riding each
   surface's EXISTING loading state (house rule: always feel moving
   forward — no new spinners invented). Server/API render paths await the
   import directly.
3. **Wait-state rule**: reuse each surface's existing placeholder exactly
   (stored-preview/thumb paths already cover most first paints). No new
   affordances (Rule #0).

## Non-negotiable proof, per PR

- `tools/engine-hashes` BEFORE and AFTER: goldens byte-identical, all
  engines. No green harness, no merge. Never touch engine math "while
  you're here."
- Drive every art surface against the preview post-deploy: home carousels,
  gallery cards, artwork modal, output full page/fullscreen, Cartography,
  thumb-preview, ASCII mode standins, Composer results, stored-preview pins.
- Measure and report in the PR: per-page first-load before/after (build
  output numbers), engine chunk count/sizes.
- Batch engines across a handful of PRs (e.g. 30–40 per PR); registry
  loader lands with batch one behind identical behaviour.

## Out of scope

Engine internals, seeds, rng, aspect data, the `@ts-nocheck` posture, any
visual change. If a surface can't take the async seam without changing what
users see, STOP and present the options.

## Done when

Full fleet lazy · goldens green · first-load delta reported · all surfaces
verified live · brief deleted in the completing PR.
