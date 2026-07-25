---
title: "Fair Draw — How a Drop Settles"
description: "The entry window, the CONTESTED flip, the draw, the sealed reveal, and the fail-open guarantee — the full life of an oversubscribed drop."
category: "fair-draw"
keywords: ["entry window", "contested", "the draw", "sealed", "reveal", "settlement", "mint order", "fail-open"]
last_updated: "2026-07-25"
---

# How a Drop Settles

Every drop launches identically: one mint button, no labels, no special modes. Whether a drop turns contested is not decided in advance by anyone — it is discovered, live, by how many people tap.

## The entry window

A drop opens with a short **entry window** — the opening seconds during which every mint press counts as simultaneous. Your tap signs a complete **mint order**: your piece, your payment, authorized once in your wallet. The order does not execute yet, and your money stays exactly where it is — PD holds a signed instruction, never funds.

During the window the contract itself accepts no mints at all. That closes the back door: a script going around the app to mint straight on-chain finds nothing to race.

## The quiet ending

If the window closes with enough supply for everyone who tapped, every order executes immediately and the drop continues as a normal open mint. Nothing about it ever looks contested — no draw, no wait, no difference from any mint you've ever done. This is most drops.

## The CONTESTED flip

If more orders arrived than pieces exist, the room flips **CONTESTED** in front of everyone watching, and settlement runs:

1. **Standing is snapshotted from before the drop.** Drops are surprises, so you enter as whoever you already were — there is nothing to game in the moment. See [Fair Play](/docs/fair-draw/fair-play).
2. **The draw runs.** Provably fair: the draw's commitment is fingerprinted on Ethereum at settlement, and the full transcript is published for anyone to check. Within a priority band, every entrant has exactly equal odds.
3. **Winners' orders execute — automatically.** The piece and the payment move in the same breath, straight from the tap you already made. Winners do nothing. If an order can't execute (the wallet spent its balance in the meantime), the seat passes to the next drawn name until every piece is placed — a seat can never be wasted.
4. **Losing orders are torn up unexecuted.** Your money never moved, so there is nothing to claim back and nothing to wait for.
5. **Leftover supply, if any, opens to everyone** once settlement finishes, first-come like any open mint.

## Sealed until the reveal

Pieces minted in a contested settlement arrive **sealed**: held in your wallet but untradeable for a few hours (never more than three days, and typically far less — the exact seal is set per drop and can never be extended by anyone once set).

The seal is the drop's adjudication window. During it, entries that turn out to belong to bot networks are voided and their seats re-drawn to real collectors — **before** the reveal, so the edition that unveils is already clean. Then every piece unseals together, and the reveal is the party it deserves to be.

## The fail-open guarantee

The entry window is choreographed by PD's settlement service — but the guarantee does not depend on it. Every windowed drop carries a hard deadline, written immutably into its contract at deploy (at most four hours out): if settlement has not concluded by then, for any reason including PD itself vanishing, **minting opens automatically** as a normal first-come mint.

The settlement service's authority is deliberately tiny. It can choreograph a drop's opening minutes — nothing else. It cannot touch money (winners pay the same price through the same instant artist split as any minter), cannot change supply or price, cannot reach existing pieces, cannot act past the deadline, and cannot extend a seal. There is no power in the system worth stealing.
