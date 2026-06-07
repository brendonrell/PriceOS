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

## Done + PUSHED to origin/claude/peaceful-noether-Lu4Cw (build-green each)
- Foundation: `lib/art/rng.ts`, `lib/project/types.ts`, `soundtrack.ts`,
  `fate.ts` (King Wen 64), `lib/project/registry.ts`, engines
  `lib/art/engines/{prisms,oracle}.ts`. Kiki engine deleted.
- **Stage 1** (commit 9d05092): ripped Kiki, Prisms reborn on registry engine;
  ProjectContext slug-aware + generic traits; TraitsContext/TraitsUI fully
  schema-driven (no Kiki trait names); Fate pill retitled to "Fate".
  PRISMS 256 / colorway #5A2EA6 / artist opus4-6; ORACLE artist opus4-6.
- **Stage 2** (this push): Oracle is a real routable Project.
  - ModalContext carries `currentModalSlug`; output modal is project-aware.
  - `buildOutputMetaFor(slug,id)` exported; modal self-derives meta per project.
  - ProjectPageBody re-provides ProjectProvider with the route slug;
    ArtworkPageBody too. `/art/[slug]` 404s unknown slugs (registry-validated).
  - `lib/slug.ts`: registered `oracle`; bare `/{project}` now 301s to
    `/art/{slug}` (Brendon-approved).

## Next step (Stage 3+)
- **DB + chainless marketplace sim** (Seaport/OpenSea semantics): projects rows
  (prisms 256 + oracle 333), reseed holders/events, soundtrack column, new
  listings/offers tables + sim ETH balance; wire Mint (primary) + list/buy/offer
  (secondary). This is the "press mint, get one" milestone.
- `/artists` directory page.
- Hero cosmetics still Kiki-ish (e.g. "500/2222" supply string, hardcoded
  soundtrack URL on project hero) — wire to the active Project. (Brendon's
  visual domain — confirm before restyling; the numbers are data, safe to fix.)
- Public Docs page: artist-facing "how to structure traits for PD".

## VERIFY ON DEV (Brendon): once merged to dev, check `/art/prisms` (new art +
traits + Fate), `/art/oracle` (glyph art, 333), click a card → modal shows the
right project, `/oracle` → 301 → /art/oracle.

## main / production — untouched (clean baseline 5236c2e)
