# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** `claude/peaceful-noether-Lu4Cw` (off `origin/dev`, clean base)
- **Updated:** 2026-06-07

## Current task — Clean platform + 2 real Projects (BIG, in progress)

Turn the app from a one-project hodgepodge (legacy Kiki art/palettes hiding
inside "Prisms", used as visuals-only) into a **project-agnostic platform** that
hosts genuinely mintable Projects. Two tasks, both in scope:

**A. Missing pages:** `/artists` directory · social redirects
`/discord /twitter /farcaster /x` (302) · `/price` reserved · project-at-root
`/{slug}` → 301 `/art/{slug}` (one-line flip in `lib/slug.ts`, now safe with
≥1 live project). **`/settings` stays a modal — NOT a page** (prior Claude
wrongly assumed otherwise; Brendon corrected).

**B. Clean platform + Projects:**
1. **Project registry** — one standard shape per Project (`lib/project/types.ts`
   `ProjectDef`): slug · displayName · outputs · colorway · soundtrack ·
   traitSchema · render engine. Oracle is the template; adding project #3 = one
   engine file + one DB row.
2. **Rip Kiki** — kill `lib/art/prismsEngine.ts` Kiki palettes + `kiki/bouba`
   naming + the `Layer/Mineral/Fate` hardcoded trait names baked across
   `TraitsContext` / `ProjectContext` / `TraitsUI`. Engine *infrastructure*
   (canvas pipeline, virtualization, ArtworkCard/OutputPreview) stays.
3. **Genericize traits/subtraits** — schema comes from the active Project, not
   hardcoded. `ProjectProvider` is mounted GLOBALLY in `app/layout.tsx` and is
   prisms-only today; `/art/[slug]` ignores its slug. Must become slug-keyed.
4. **Prisms reborn** — fresh standalone gradient engine, my own tasteful
   palettes (not rainbow) + aspect-ratio variance, own traits. 256 Outputs.
   (Brendon delegated Prisms art to me: "your own palettes/traits, have fun.")
5. **Oracle** — faithful port of the self-contained engine from the uploaded
   `oraclev3.html` (333 Outputs, colorway `#C4902A`, soundtrack Wardruna).
6. **Chainless marketplace sim** — primary **Mint** is ours; ALL secondary
   (list/buy/offers) models **Seaport/OpenSea** order semantics so the real
   build is just the OpenSea SDK swapped in. Sim mirrors "everything on PD,
   nothing OpenSea-only." New DB tables (listings/offers) + sim ETH balance.
7. **Public Docs page** (the IGNORE-for-internal-truth public docs) — artist-
   facing "how to structure traits so PD recognizes them."

## LOCKED SPEC (from ClickUp SoT — get terms right, Brendon is strict)
- **Terms:** Project · **Output** (the unit AND the supply count — "333
  Outputs", never "edition") · Artwork (rendered canvas) · **Colorway** (not
  "theme") · Mint (user acquires) · Upload (artist adds a Project). Banned:
  Collection, Edition, Collector-as-generic-noun.
- **No descriptions.** Artists cannot write prose. Storytelling = traits +
  soundtrack only. Do not surface `projects.description`.
- **Soundtrack = public YouTube playlist** (URL or bare playlist id). Normalize
  fail-soft, never break the page. (`lib/project/soundtrack.ts` ✅ done.)
- **Trait model (Subtraits SoT 2kyd6gx6-5414): Trait → Subtrait → Value.** A
  subtrait is a *derived grouping of one trait's values* into named buckets
  (e.g. `Layer → Surface → {Crust,Sediment,Drift}`), NOT per-token data, NOT a
  separate axis. Lives in a UI dict (`L2_DICT` in `TraitsUI.tsx`), changeable
  without re-minting. Traits flat-allowed. Subtraits are a NEW gen-art feature
  (AB/fxhash use flat features) — Brendon wants them tested on Oracle.
- **Platform auto-trait — ONLY "Fate" (LOCKED).** Every Output, every Project,
  gets ONE platform trait regardless of artist traits. The ~50 other atlas
  items (astrology/lunar/etc.) are Spell Book / overlays, NOT trait-UI traits.
  - Feature name (internal): **Hash Hexagram**. User-facing trait name:
    **Fate** (Brendon: "Token"-prefix is banned; "Omen" too serious; Fate is
    romantic). Values = the 64 distilled single-word Fates (King Wen).
  - Concept: consult the I Ching at "birth" (mint) → cast ONE primary hexagram
    → distill to a single dramatic word = the Fate trait value. Changing lines
    + transformed hexagram kept on the reading for the future Output-page "full
    reading" (Discord fodder), not shown in the trait. Built ✅ `lib/project/
    fate.ts` (real King Wen 64, 3-coin method, verified 64 unique codes/words).
  - Replaces the legacy Kiki "Fate = 8 omens" pill (`pill-fate-icon`, already
    titled "Token Fate" in TraitsUI → retitle to "Fate").
- **Visual/design + scope = Brendon's domain.** Code to spec, don't redesign the
  existing app. Only authored art = the Prisms engine (delegated); Oracle is a
  faithful port.

## Process / gates
- App pushes need Brendon's numbered-list approval; docs/process pre-approved.
- Merge to dev/main only on explicit chat confirmation. Local commits free.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).

## Done this session (committed locally on the branch; NOT pushed)
- `lib/art/rng.ts` (mulberry32 + seedFromToken + pick + hashString).
- `lib/project/types.ts` (ProjectDef + Trait→Subtrait→Value schema).
- `lib/project/soundtrack.ts` (YouTube playlist normalize, fail-soft).
- `lib/project/fate.ts` (I Ching Fate engine — King Wen 64, verified).

## Next step
- Build `lib/art/engines/{oracle,prisms}.ts` (Oracle = faithful port of
  oraclev3.html; Prisms = fresh gradient, my palettes, aspect variance).
- `lib/project/registry.ts` (both ProjectDefs; merges artist traitSchema +
  Fate platform trait). Rewire ArtworkCard/OutputPreview to render via slug.
  Delete `lib/art/prismsEngine.ts` (Kiki rip).
- Then genericize ProjectContext/TraitsContext (slug-keyed, schema-driven;
  retitle "Token Fate"→"Fate"). Then DB + Seaport-style marketplace sim. Then
  /artists + redirects. Then public Docs trait page.

## main / production — untouched (clean baseline 5236c2e)
