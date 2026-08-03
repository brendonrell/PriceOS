---
title: "For Artists — What are Subtraits?"
description: "Subtraits explained: PD's middle layer between a trait and its values — named buckets that group a trait's value pool, live in the schema, and can be reshaped without touching the chain."
category: "for-artists"
keywords: ["subtraits", "traits", "buckets", "taxonomy", "rarity", "artists"]
last_updated: "2026-08-03"
---

# For Artists — What are Subtraits?

A Subtrait is a PD-unique middle layer in your trait taxonomy: a named bucket
that groups one trait's values. Where most platforms give you two levels —
trait and value — PD gives you three:

**Trait → Subtrait → Value**

A trait called *Layer* might bucket its values into *Surface* (Crust,
Sediment, Drift) and *Deep* (Mantle, Bedrock, Vein). A trait called *Palette*
with 100 values might split into six headline *Main* palettes and 94
*Special* ones. The bucket is the Subtrait.

## What a Subtrait is — and isn't

A Subtrait is a **derived grouping of one trait's values**, not a separate
trait axis and not per-token data. A value's bucket membership *is* its
subtrait: nothing extra is rolled at mint, and nothing extra is frozen into
the token. Two properties follow, and both are worth designing around:

- **Subtraits are schema, not token data.** The grouping lives in your trait
  schema, so you can regroup, rename, or refine buckets at any time — before
  or after mint-out — without touching the chain. Your outputs' frozen trait
  values never change; how they're organised can.
- **Subtraits are complete by construction.** Every value of a subtrait-ed
  trait belongs to exactly one bucket, so the buckets always reassemble into
  the full value pool — no orphans, no overlaps, no value stranded outside
  the drill-down.

## What collectors see

Subtraits are how a large trait space stays legible on a phone. On a Project
gallery, the trait pill row drills down through your taxonomy: tapping a
trait's pill opens its Subtrait buckets, and tapping a bucket narrows to its
values. Collectors browse and filter by the bucket as naturally as by the
value — *Palette → Main / Special → the palette* — and rarity surfaces read
the bucket too, so a piece can present as a *Special* before it presents as
one value among a hundred.

A flat trait (no Subtraits) is perfectly fine: its pill drills straight to
values. But when a trait's values have natural families — headline versus
deep-cut, common versus ceremonial, warm versus cool — Subtraits let the
work's own structure do the organising.

## Making them

Subtraits are built in the Studio's upload flow, in the **Traits &
Subtraits** panel: scan your script's real outputs to collect each trait's
value pool, add named buckets, and place every value in one. A trait only
ships as a Subtrait once every value is placed, so a half-finished grouping
never ships a broken drill-down. The workflow — scanning, the **+rest**
sweep, re-bucketing — is covered in
[Upload & Testing](/docs/studio/upload-and-testing).

Traits — and therefore Subtraits — are always optional. Every Output carries
PD's platform traits regardless of what your script declares.

## Further reading

- [Upload & Testing](/docs/studio/upload-and-testing) — the Traits & Subtraits panel
- [The Mint Flow](/docs/for-artists/the-mint-flow)
- [Rarity Labs](/docs/rarity-labs)
