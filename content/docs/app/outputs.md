---
title: "The App — Outputs"
description: "The individual artwork surface: live on-chain rendering, fullscreen, attributes and rarity receipts, the action row, the ASCII backup, and Output-level follows."
category: "app"
keywords: ["output", "artwork", "live render", "rarity", "ascii backup", "grouping", "tribunal"]
last_updated: "2026-08-01"
---

# The App — Outputs

An Output is one minted piece — the unit of collecting on PD. Its page is where the work is experienced at full strength: the actual generative script executing live from on-chain data, surrounded by everything the platform knows about the piece.

## The live render

Grids and cards across the app draw each Output's stored PNG preview for speed; the Output page renders the real thing — the artist's script, running with this token's on-chain hash, exactly as `tokenURI` defines it. Fullscreen mode hands the whole viewport to the work.

## The Darkroom ◉

**How:** Long-press the artwork on its page.

**Long-press the artwork** on its page and the Darkroom opens: an inspection workspace where the art is the interface and the chrome all but disappears. It renders the piece live at full resolution — never a stored image — with pixel-level zoom, so you can go right into the grain of the work.

Alongside it, the piece's **real palette** as tappable swatches, sampled from the render itself rather than declared by anyone, and an optional **INVERT** mode that flips the whole piece to its negative — the printer's trick for seeing composition and value without the color arguing. INVERT is off until you tap it. The × returns you to where you came from.

## Attributes & rarity

The attributes panel lists the Output's traits with per-trait rarity across the Project, and the **Rarity Receipt** is the one-tap summary of how this piece sits in its edition. Trait stars let you mark the traits you hunt for; they animate when the piece in front of you carries one.

Every Output also carries its **Fingerprint** — the platform's objective read of the artwork itself, measured from its actually rendered pixels. It has [its own page](/docs/fingerprint).

## The action row

The Output's verbs, in canonical glyphs, one tap each:

<svg viewBox="0 0 720 120" role="img" aria-labelledby="output-action-row-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="output-action-row-title">The Output action row, annotated: star, wishlist, album, note, to-do, grail pin, and cart — one tap each, in canonical glyphs.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="30" y="30" width="66" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="63" y="55" fill="currentColor" text-anchor="middle">★&#xFE0E;</text>
<rect x="116" y="30" width="66" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="149" y="55" fill="currentColor" text-anchor="middle">✛&#xFE0E;</text>
<rect x="202" y="30" width="66" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="235" y="55" fill="currentColor" text-anchor="middle">◰&#xFE0E;</text>
<rect x="288" y="30" width="66" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="321" y="55" fill="currentColor" text-anchor="middle">⊟&#xFE0E;</text>
<rect x="374" y="30" width="66" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="407" y="55" fill="currentColor" text-anchor="middle">❍&#xFE0E;</text>
<rect x="460" y="30" width="66" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="493" y="55" fill="currentColor" text-anchor="middle">⟟&#xFE0E;</text>
<rect x="546" y="30" width="66" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="579" y="55" fill="currentColor" text-anchor="middle">▢&#xFE0E;</text>
<text x="63" y="100" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<text x="149" y="100" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<text x="235" y="100" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<text x="321" y="100" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<text x="407" y="100" fill="currentColor" text-anchor="middle" font-size="15">⑤&#xFE0E;</text>
<text x="493" y="100" fill="currentColor" text-anchor="middle" font-size="15">⑥&#xFE0E;</text>
<text x="579" y="100" fill="currentColor" text-anchor="middle" font-size="15">⑦&#xFE0E;</text>
</g>
</svg>

- **①&#xFE0E; ★ Star** — the silent bookmark; never generates a notification.
- **②&#xFE0E; ✛ Wishlist** — declared buy intent; drives financial [Pings](/docs/pings/overview).
- **③&#xFE0E; ◰ Album** — opens the Add-to-Album sheet ([Albums](/docs/albums)).
- **④&#xFE0E; ⊟ Note** — a private annotation, owner-only forever.
- **⑤&#xFE0E; ❍ To-Do** — writes a BUY to-do pointed at this exact piece.
- **⑥&#xFE0E; ⟟ Grail Pin** — pins the piece to the top of your rows.
- **⑦&#xFE0E; ▢ Cart** — stages the piece with the session's other candidates.

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

## The piece's timeline

An Output's event history reads **time as distance**: in feed order, a gap of
a year or more between events stretches the connector between them — longer
still at five and ten years — so a piece's quiet decades are visible at a
glance, not compressed into a uniform list.

## The Neighbourhood

A piece's +More carries its **Neighbourhood**: the wallets in its story —
the keeper, the original minter, past hands — and what else each of them
holds, drawn as tappable art tiles. Provenance as a place you can walk
around in.

## Spell-aware surfaces

Several [Spell Book](/docs/app/spell-book) lenses live their fullest life on the Output page. With **Celestial Tracker ♃** on, the piece's title wears its birth sky — sun sign, true mint-moon disc, rising sign, in that order. **Tribunal ⚖** adds the full case file to +More: custody with tenures, the money, the parties, findings of fact, and a ruling stamp. **Degen ⚔** replaces the art with the piece's data slab entirely. And **Aura ⦿** halos the work in its own sampled colors.

## Sorting & grouping the gallery

Every gallery sort is one tap — each pill cycles its directions — and a standalone **grouping toggle** (⁘ at rest) leads the sort row: tap it to fold the grid into collapsible groups. The identity dimensions come first — **artist ✺, project ⬚, owner ⌂, dominant color ◉** and their two-level combos, plus **rarity ❖** — and the cycle runs deep from there: **listed ✹, Fate ䷲, temperature °, light ◑, mood ~, orientation ▭** (read from each artwork's stored visual fingerprint), **moon phase ○, zodiac ⍟, born-on ▦** (from each piece's real mint sky), **faction ⚐** (whose flag holds the pieces), and **numerology #** (The First, Palindromes, Primes, Round Numbers, Sevens). No dimension fakes a value — a piece the data can't place lands in an honest tail bucket that always sorts last. The active sort becomes a shareable link, grids remember their grouping per page, and up to three saved **grid presets** restore a whole view — layout, sort, and grouping — in one tap.

## The ASCII backup

Every Output can emit an **ASCII backup** — a text rendering of the artwork, generated from the same on-chain data. It is the piece's survivalist form: art that can be printed, pasted, or stored anywhere text lives.

## Following an Output

Individual Outputs can be followed, routing their market events (listings, sales, transfers) into your Pings — the way collectors watch a specific grail without watching its whole Project.

## Further reading

- [Projects & Minting](/docs/app/projects-and-minting)
- [Pings](/docs/pings/overview)
- [PDProject contract reference](/docs/contracts/pd-project) — how `tokenURI` builds the render on-chain
