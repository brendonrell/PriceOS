# Spec · LANGUAGE — the coding-language platform trait (+ group/sort by it)

**Status: SPEC ONLY — awaiting Brendon's approval. Nothing here is built.**
From Brendon, 2026-08-02: *"Group sorts rework · Languages as a gen-art
trait"*, clarified same day: *"about coding languages only."* One feature,
two faces: every project wears the coding language it's made in as a
platform trait, and the galleries can group by it.

---

## The north star

Generative art has always been sorted by its tools — p5.js people, GLSL
people, Processing people. PD makes that lineage a first-class trait: a
project declares the language of its practice, every Output inherits it,
and the group cycle can shelve a collection by language the way it already
shelves by Fate or mint sky.

## ⛔ The one settled law: REAL DATA ONLY

Same law as the Colorpedia and every trait before it — the value is
**declared data, never detected, never guessed.** House engines get their
value set in the registry, one line per project. Studio-era artist uploads
declare it at upload from the fixed vocabulary. No inference, no model, no
"looks like p5".

## Data model (smallest true shape)

- `PLATFORM_TRAIT.language = 'Language'` joins the platform-trait registry
  (`lib/project/registry.ts`) — rides `projectTraits()` like Artist/Fate,
  so every Output of a project inherits it with ZERO per-output storage.
- Each registry project entry carries `language: LanguageKey` (a required
  field, so no project can ship unlabeled). Studio uploads later store the
  same key in the project's DB row; the registry field is the source until
  then (deployed code wins).
- **The vocabulary is a FIXED set** (the Profile-Tags discipline — a closed
  catalog, additions are Brendon's call, one entry each):
  `JavaScript · TypeScript · p5.js · Processing · GLSL / shaders · SVG ·
  Python / plotter · HTML / CSS · Other` — **the exact list is Brendon's
  open call #1** (see below).

## Surfaces (all reuse, Rule #0 — no new UI invented)

1. **Attributes** — Language renders as a standard platform-trait tile on
   the project page (and the Output modal's trait list), exactly where
   Fate sits. Same tile, same treatment.
2. **Facet filter** — Language joins the facet row on home Now Minting and
   the artist Showcase (birth-order position: after Rising, before Fate —
   open call #2). Same L3 pill machinery, values from the fixed set.
3. **The group cycle** — `'language'` joins `GroupKey` and the EXPANSION
   dims in `lib/state/groupDimensions.ts`: everyday altitude (it's an
   identity-adjacent cut, NOT esoterica — proposed slot right after the
   artist/project classics, open call #3). Section label = the vocabulary
   word; the honest tail bucket is unnecessary since the field is required.
4. **Search grammar** — `language:p5` in the power grammar
   (`lib/search/parse`), same shape as `sun:leo`.
5. **The stone** — no new hand needed: the existing project card / etch
   answers carry traits already; Language shows up with them for free.

## What today's catalog reads as

All ~131 house engines are in-app TypeScript/Canvas. **Uniform values make
a boring shelf until Studio uploads diversify the catalog** — that is
honest and fine (the trait's value compounds as artists arrive), but it
makes open call #1 matter: Brendon may prefer house engines to declare the
language of the LINEAGE each engine practices (e.g. Chladni/Caustics as
shader-craft) — that is still declared data, set per engine by his hand,
never detected. His call which reading PD canonizes.

## Explicitly OUT of scope

- Human/spoken languages — never part of this trait.
- Auto-detection of any kind.
- Per-OUTPUT language values — the trait is project-level, inherited.

## Brendon's open calls (the spec is built the day these land)

1. **The vocabulary** — the exact fixed list of languages (and whether
   house engines wear uniform `TypeScript`, or per-engine lineage values he
   assigns).
2. **Facet position** in the birth-order row.
3. **Group-cycle slot** (everyday vs deep cut).
4. The trait's **glyph**, if the tile wants one — from the glossary only.

**Build size once called:** small — one registry field + trait line, one
facet entry, one group dimension, one parse token. One session.
