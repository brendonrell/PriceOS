---
title: "PD Studio — Upload & Testing"
description: "How work comes into PD Studio and how it gets proven: private drafts, unlimited test runs on simulated token hashes, the real rendering envelope, and what a test pass should convince you of."
category: "studio"
keywords: ["upload", "testing", "test runs", "drafts", "token hash", "previews"]
last_updated: "2026-07-10"
---

# PD Studio — Upload & Testing

The upload side of the Studio exists to close the gap between "my script runs
on my machine" and "my script is frozen on Ethereum forever." On PD that gap
is unforgiving — [deployment is immutable](/docs/for-artists/the-mint-flow),
there are no upgrades and no do-overs — so the Studio's answer is to let you
rehearse the chain as many times as you like before you touch it.

## Drafts

Work enters the Studio as a **draft Project**: your generative script, the
[blessed library](/docs/contracts/library-registry) it binds (if any), and the
working parameters — intended supply, mint price, name, description. A draft
is:

- **Off-chain.** Nothing about a draft touches Ethereum. It costs nothing to
  make, keep, or abandon.
- **Private.** A draft is visible only to the wallet that created it.
- **Unlimited.** Keep as many drafts, versions, and dead ends as your process
  needs.

## Traits and Subtraits

Traits are always optional — every Output carries PD's platform traits
(Artist, Project, PriceDay, the natal chart, Fate) from the moment it mints,
whether or not your script defines any of its own. When your work *does*
carry artist traits, PD gives you a layer no other platform has:
**Subtraits**.

A Subtrait is a named bucket that groups one trait's values into a middle
layer — **Trait → Subtrait → Value**. A trait called *Layer* might bucket its
values into *Surface* (Crust, Sediment, Drift) and *Deep* (Mantle, Bedrock,
Vein). Collectors browse and filter by the bucket as naturally as by the
value, and the artwork page's trait pills drill down through it.

Two properties make Subtraits worth designing for:

- **They are schema, not token data.** A value's bucket membership *is* its
  subtrait — nothing extra is frozen into the token. You can regroup,
  rename, or refine your buckets after mint-out without touching the chain,
  because the grouping lives in the trait schema.
- **They are complete by construction.** Every value of a subtrait-ed trait
  belongs to exactly one bucket, so the buckets always reassemble into the
  full value pool — no orphans, no overlaps.

Flat traits (no subtraits) are perfectly fine; the drill-down simply goes
straight to values. But if your trait space is large or has natural families,
Subtraits are how you make it legible.

### Publishing traits from your script

The Studio learns your traits from the script itself — the values come from
the real engine, so they can never drift from a hand-typed list. As your
script renders a token, set a plain object on `window.$traits`, keyed by
trait name:

```js
// inside your render, once you've derived this token's values
window.$traits = { Palette: "COOKIES", Mode: "STANDARD" };
```

Values are read as text. Set `$traits` for **every** token (it is per-token
data), deterministically from `tokenData.hash` like the rest of your render.
Publish nothing and your work still mints — it simply carries the platform
traits and no artist traits, which is a perfectly good choice.

### Scanning traits

In the upload flow's **Traits & Subtraits** panel, choose a sample size and
**Scan**. The Studio renders that many simulated tokens in the background,
reads each one's `$traits`, and collects the distinct values it finds into a
value pool per trait — exactly the pool your collectors will see. Scans
accumulate, so a rare value that only turns up one-in-a-thousand is caught by
running a larger scan (or scanning again); the more you scan, the more
complete the pool. This is the same "what you test is what you ship" idea as a
test run: the trait list is discovered from the work, not declared on faith.

### Grouping into Subtraits

Once a trait's values are scanned, add named buckets and place each value in
one. Two conveniences make large trait spaces quick: **+rest** sweeps every
still-unbucketed value into a bucket in one tap, and tapping a value cycles it
through the buckets. A trait shows as a Subtrait only once **every** value is
placed — until then it stays flat, so a half-finished grouping never ships a
broken drill-down. Because the grouping is schema, you can rename or re-bucket
any time, before or after mint-out, without touching the chain.

**Worked example — KIKI's Palette.** KIKI publishes one artist trait,
`Palette`, with 100 named values. Six of them are the headline **Main**
palettes; the other 94 are **Special**. In the panel you add two buckets —
*Main* and *Special* — tap the six Mains into *Main*, then **+rest** on
*Special* to sweep the remaining 94. Now a collector filtering KIKI browses
*Palette → Main / Special → the palette*, and the split is a schema edit away
from being re-drawn if you ever change your mind.

## Test runs

A test run is a simulated mint-out, sized however you like. For each
simulated Output, the Studio derives a token hash the same way the deployed
contract will — from block entropy, a token ID, and a minter — and renders
your script in the **real envelope**: the same HTML document structure that
`tokenURI` will serve, the same on-chain library build, the same hash
delivery. What you are looking at in a test run is what a collector's mint
will be, not an approximation of it.

Runs are unlimited. Run 22, run 500, run the full intended edition; re-roll
until you have seen the true distribution of the work — the outliers, the
duds, the one-in-a-thousand configurations — and not just its highlights.

Each run gives you:

- **The grid.** Every simulated Output as a rendered preview, at collector
  sizes — because a phone-screen thumbnail is how most people will meet the
  work.
- **The live piece.** Open any simulated Output full-screen and it renders
  live from its hash, exactly as the Output page will render it.
- **The hash, kept.** Every simulated Output keeps its hash, so anything
  interesting — good or broken — can be reproduced exactly and re-examined
  after a script revision.

## What a test pass should prove

Testing on the Studio is about earning three convictions before the freeze:

1. **Determinism.** The same hash must produce the same piece, every render,
   on every device. The Studio re-renders from stored hashes so drift has
   nowhere to hide — if a revision changes what an old hash produces, that is
   a fact you want to learn in the Studio, not on-chain.
2. **Distribution.** Large runs show the parameter space as the mint will
   sample it. If 3% of outcomes embarrass you, a 500-piece run will show you
   fifteen of them.
3. **Performance where collectors live.** The Studio is a phone app, so your
   work is tested where it will mostly be seen: rendering weight, load time,
   and legibility at small sizes are visible on every run, on real hardware,
   for free.

## From testing to publishing

When a draft has survived enough runs to trust, the same draft — script,
library, parameters — becomes the package you deploy. Nothing is re-prepared
by hand, so what you tested is what you ship. That handoff is
[Publishing](/docs/studio/publishing).

## Further reading

- [Publishing](/docs/studio/publishing)
- [The Mint Flow](/docs/for-artists/the-mint-flow)
- [Library Registry](/docs/contracts/library-registry)
