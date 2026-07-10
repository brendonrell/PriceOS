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
