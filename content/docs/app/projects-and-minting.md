---
title: "The App — Projects & Minting"
description: "The Project page: minting from the UI, live presence, traits and the Genome, grid sorts and grouping, project milestones, True Names, and per-Project colour."
category: "app"
keywords: ["project page", "minting", "genome", "milestones", "true name"]
last_updated: "2026-07-10"
---

# The App — Projects & Minting

Every Project on PD gets a page that is part gallery, part market floor, part observatory. It lives at `/art/{slug}`, wears the artist's own colour, and carries every tool the platform has for reading one body of work.

## Minting from the UI

While a Project is minting, its page carries the mint button. The button itself shows live progress — from tap, through wallet confirmation, to the chain's answer — as a filling bar inside the control, so a mint never feels frozen. The wallet sheet shows the exact total (mint price plus the flat storage fee per Output); the contract accepts exact payment only. What happens on-chain is documented in [The Mint Flow](/docs/for-artists/the-mint-flow).

## The grid

The Project's Outputs, in a grid built for long sessions:

- **Sorts** with a cycling **grouping modifier** — group the grid by artist (✺), project (⬚), owner (⌂), dominant colour (◉), rarity (❖), or combinations, with collapsible group headers.
- **Fog** — a reveal mode that fades Outputs into view as you scroll.
- **Multi-select** (❐ → ▣) for acting on many Outputs at once.
- **Stored previews everywhere, live render on the artwork page** — grids draw each Output's rendered PNG preview for speed; opening an Output renders the real script. See [Outputs](/docs/app/outputs).

## Reading the work

- **Traits** — every Output's attributes, with per-trait rarity and trait-level starring.
- **The Genome** — the Project's parameter space as a navigable map: where any Output sits among its siblings.
- **The Audience** — live presence: a breathing dot and a count of the people on this Project's page right now.
- **Price Story & price intelligence** — the narrative and analytical reading of the Project's market history.
- **Soundtracks** — Projects can carry audio; storytelling on PD is traits plus soundtrack rather than long descriptions.

## Project identity

- **The artist's colour** — each Project paints the app in its own colorway while you're on it.
- **The True Name** — every Project receives a permanent, unique 4-letter name in uppercase Glagolitic (`ⰅⰒⰗⰚ`), the platform's golem-mythos signature, shown in the Project's social panel.
- **Milestones** — lifecycle events the whole platform celebrates in the home feed: Uploaded ✧, Graduated ⟢⟢, First Blood †, Lucky 22 ♧, Century Club Ⅽ, Halo ⬭ (777), Per Mille ‰ (1,000), Archetype ✻, Hi-Def ⬢, and Ascension ▲ at sell-out.

## Social

Follow a Project (⚭) to route its activity into your [Pings](/docs/app/pings); the Anoint panel is the platform's recognition mechanism for elevating specific works.

## Further reading

- [Outputs](/docs/app/outputs)
- [The Mint Flow](/docs/for-artists/the-mint-flow)
- [Discovery](/docs/app/discovery)
