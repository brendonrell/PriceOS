# Spec · LANGUAGE — the coding-language platform trait (+ group/sort by it)

**Status: BUILT 2026-08-02 ("Let's do it!!!") — this file is now the record.**
Launch library roster settled the same day: **p5.js · three.js · regl · d3**
(vanilla JavaScript always; audio/WebGPU deliberately held back). Blessing
each is Brendon's one-time on-chain write at launch.
From Brendon: *"Group sorts rework · Languages as a gen-art trait"* →
*"coding languages only"* → **"mirror Fate"** (settled: it is a platform
trait AND a group shelf, Fate's exact pattern) → *"I want the right list —
we want to look savvy to these artists."*

---

## The north star

Generative art has always been sorted by its tools — p5.js people, three.js
people, vanilla-JS people. PD makes that lineage a first-class trait: every
project wears the language of its practice, every Output inherits it, and
the group cycle can shelve a collection by language the way it already
shelves by Fate.

## ⛔ The settled law: THE VALUE IS DERIVED FROM THE BINDING — REAL DATA,
## ZERO CURATION, ZERO ARTIST HOMEWORK

PD's art format is one thing: a JavaScript program rendering
deterministically from the token hash, optionally binding **exactly one
blessed library** from the on-chain PDLibraryRegistry (append-only, frozen
forever — p5.js and three.js are the shelf as designed). So the trait is
not a hand-picked vocabulary at all — **it is read off the project's
library binding:**

| Binding | Trait value |
|---|---|
| none (vanilla) | `JavaScript` |
| p5.js entry | `p5.js <version>` |
| three.js entry | `three.js <version>` |
| any future blessed entry | its registry name + version |

- **The version rides the pill** (`p5.js 1.9`) — registry entries are
  versioned, new versions are new entries, so the trait is exact.
- **The savvy flex:** the pill proves the artist's exact tool is stored on
  Ethereum, versioned, forever — the script-type line the Art Blocks crowd
  knows, but on-chain-backed. The vocabulary extends itself the day Brendon
  blesses a new library; no list to maintain, no drift.
- House engines (pre-Studio, no registry binding) carry the same field in
  the registry entry (`language`), set once — `JavaScript` unless Brendon
  assigns otherwise. Never detected, never guessed.

## Surfaces — Fate's exact pattern (Rule #0, no new UI)

1. **Trait pill** — Language renders as a standard platform-trait tile on
   the project page Attributes and each Output's trait list, exactly where
   Fate sits. `PLATFORM_TRAIT.language = 'Language'` joins the registry and
   rides `projectTraits()` — project-level, inherited, zero per-output
   storage.
2. **Facet filter** — joins the birth-order facet row on home Now Minting +
   the artist Showcase, same L3 pill machinery.
3. **The group cycle** — `'language'` joins `GroupKey` +
   `lib/state/groupDimensions.ts`, everyday altitude (identity-adjacent,
   not esoterica). Section label = the trait value.
4. **Search grammar** — `language:p5` in the power grammar, same shape as
   `sun:leo`.
5. **The stone** — free: project cards/etch answers already speak traits.

## Explicitly OUT of scope

- Human/spoken languages. · Auto-detection of source text. · Per-Output
  values. · Any editable/mutable vocabulary — the registry IS the list.

## Remaining open calls (small)

1. Facet position in the birth-order row (proposed: after Rising, before
   Fate).
2. Group-cycle slot (proposed: right after the artist/project classics).
3. The tile's glyph, if any — glossary only.

**Build size: one session** — one registry field + trait line, the binding
read, one facet entry, one group dimension, one parse token.
