---
title: "The App — Outputs"
description: "The individual artwork surface: live on-chain rendering, fullscreen, attributes and rarity receipts, the action row, the ASCII backup, and Output-level follows."
category: "app"
keywords: ["output", "artwork", "live render", "rarity", "ascii backup"]
last_updated: "2026-07-12"
---

# The App — Outputs

An Output is one minted piece — the unit of collecting on PD. Its page is where the work is experienced at full strength: the actual generative script executing live from on-chain data, surrounded by everything the platform knows about the piece.

## The live render

Grids and cards across the app draw each Output's stored PNG preview for speed; the Output page renders the real thing — the artist's script, running with this token's on-chain hash, exactly as `tokenURI` defines it. Fullscreen mode hands the whole viewport to the work.

## Attributes & rarity

The attributes panel lists the Output's traits with per-trait rarity across the Project, and the **Rarity Receipt** is the one-tap summary of how this piece sits in its edition. Trait stars let you mark the traits you hunt for; they animate when the piece in front of you carries one.

## The action row

The Output's verbs, in canonical glyphs, one tap each:

| Action | Glyph |
| --- | --- |
| Star (bookmark, silent) | ★ / ☆ |
| Wishlist (buy intent — drives Pings) | ✛ |
| Album | ◰ |
| Note (private) | ⊟ |
| To-Do | ❍ |
| Grail Pin | ⟟ |
| Cart | ▢ |

Starring a PIECE is deliberately silent — a frequent, low-stress bookmark that never generates a notification. Starring an artist, a project, or a trait is the opposite of silent: those stars are your declared taste, and movement on them drives your interest [Pings](/docs/pings/overview). Wishlist is the strongest signal of all — buy intent that drives financial Pings like wishlist hits.

## Sorting & grouping the gallery

Every gallery sort is one tap — each pill cycles its directions — and a standalone **grouping toggle** (⁘ at rest) leads the sort row: tap it to fold the grid into collapsible groups by **artist ✺, project ⬚, owner ⌂, dominant colour ◉, rarity ❖**, or two-level combos. The active sort becomes a shareable link, grids remember their grouping per page, and up to three saved **grid presets** restore a whole view — layout, sort, and grouping — in one tap.

## The ASCII backup

Every Output can emit an **ASCII backup** — a text rendering of the artwork, generated from the same on-chain data. It is the piece's survivalist form: art that can be printed, pasted, or stored anywhere text lives.

## Following an Output

Individual Outputs can be followed, routing their market events (listings, sales, transfers) into your Pings — the way collectors watch a specific grail without watching its whole Project.

## Further reading

- [Projects & Minting](/docs/app/projects-and-minting)
- [Pings](/docs/pings/overview)
- [PDProject contract reference](/docs/contracts/pd-project) — how `tokenURI` builds the render on-chain
