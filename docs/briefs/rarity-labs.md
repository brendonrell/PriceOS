# BRIEF — Rarity Labs (finish the greenlit feature)

> **Status: SPEC'D 2026-07-26, MATH ALREADY LIVE — this is a small surfacing
> lift, not a build.** Origin: King Mode Keeper #2 (ClickUp Atlas → "Keepers —
> Greenlit (full specs)"), re-verified 2026-07-26: the engine the King Mode
> spec asked for already shipped inside `lib/output/rarity.ts`. What's missing
> is only the **Pop badge** and the **project-wide Pop Table**.

**One line:** provable rarity from the seed — surface **"POP n"** and
**"NONE HIGHER"** on pieces, and give every project a pop table. No rarity
API, no trust, $0.

Marketing line: *"Pop 1. None Higher. Provable from the seed — no rarity API,
no trust."*

---

## What ALREADY exists — do not rebuild any of it (Rule #0)

`lib/output/rarity.ts`, computed + memoised, no canvas, deterministic:

- **Per-axis census** (`Freq`): count / pct / rank / distinct for every
  artist-trait value, Fate, and palette colour bucket across the whole
  edition set (`traitRarity`, `fateRarity`, `colorRarity`).
- **`pdRarity`** — the blended 0–100 headline (traits + Fate + colour
  information content + genome Isolation).
- **`pdRarityRank`** — "#3 rarest of 105" across the edition set, ties share
  a rank.
- Already surfaced in the character sheet (`DegenSlab`), the Vault, the
  Stone deck, Lists. The Receipt card reads the same math so cards can't
  disagree.

King Mode's proposed cache tables (`project_traits`, `trait_census`) are
**NOT needed** — supplies cap in the hundreds and the in-process memoised
tally is already instant. No schema, no routes required for v1; it all
computes from the registry on either side.

## What's missing (the actual ask)

1. **The Pop badge** on a piece:
   - `POP n` — n = the census count of the piece's rarest axis value
     (min `Freq.count` across its resolved axes; the badge names nothing
     else — just the number).
   - `NONE HIGHER` — shown when the piece is rank #1 by `pdRarityRank`
     (ties: every #1 wears it; that's honest — they share the top).
   - `POP 1` and `NONE HIGHER` can co-occur; `POP 1` alone is already loud.
   - Exact definitions above are the recommendation — Brendon rules if he
     wants combo-based Pop instead of rarest-single-axis.
2. **The Pop Table** on the project page: one mono table per trait axis
   (+ Fate + colour) — value · count · pct, sorted rarest-first, the
   viewer's own held values marked with PD's dotted-ring vocabulary if that
   read is wanted (Brendon's call; default = plain table, nothing extra).

## UI (placements are DOORS — ⛔ Rule #-0.4: Brendon confirms BEFORE code)

- **Badge:** proposed on the Output modal near the existing rarity headline
  (the character sheet already leads with the 0–100). Exact spot = Brendon.
- **Pop Table:** proposed opening from the project page. Where and what the
  opener looks like = Brendon. Default OFF (a door the user taps), never
  auto-open chrome.
- Reuse the site's own table/pill vocabulary (Rule #0): mono table, 4px
  controls, full-strength tokens, inverted pill for `NONE HIGHER`, toast
  casing law if any toast fires. Glyphs only from `docs/GLYPHS.md`.
- Screenshot on a mid-tone colorway before presenting.

## Phasing

1. **v1:** badge + table from the live math. Client-side, $0, no schema.
2. **Phase 2 [indexer]:** "still held by minter", live pop shifts on
   transfer, cross-collection reads.

## Acceptance

Every Output shows a correct, deterministic badge (same answer for every
viewer, every load); a rank-#1 piece reads NONE HIGHER; the project Pop
Table's counts sum to the edition size per axis; zero external calls; the
art and the existing rarity surfaces are untouched.
