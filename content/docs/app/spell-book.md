---
title: "The App — The Spell Book"
description: "Every spell documented: how to open the Spell Book (triple-tap MY PD), how spells stack, and what each of the 23 pills actually does — from Celestial Tracker to Tribunal to the ???? button."
category: "app"
keywords: ["spell book", "spells", "view modifiers", "panopticon", "tarot", "tribunal", "gossip", "sybil net"]
last_updated: "2026-08-05"
---

# The App — The Spell Book

The Spell Book is where PriceOS keeps its lenses: pill-toggleable modifiers that change how you *see* the platform rather than what's on it. Spells stack, persist across sessions, and follow your account. Half the fun is discovering what a combination does to a page you thought you knew — this page removes the guesswork about what each pill does, while leaving the platform's genuine mysteries mysterious (they're mysteries on purpose).

**How:** Triple-tap the MY PD header in settings; triple-tap the SPELL BOOK header to flip back.

<svg viewBox="0 0 720 150" role="img" aria-labelledby="spellbook-door-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="spellbook-door-title">The Spell Book door: triple-tap the MY PD header in settings and the panel flips to the Spell Book; triple-tap the SPELL BOOK header to flip back. No menu item, no button.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="30" y="40" width="250" height="70" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="155" y="68" fill="currentColor" text-anchor="middle" font-size="13">MY PD</text>
<text x="155" y="92" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">the settings panel</text>
<path d="M280 75 H 400" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M400 70 L 412 75 L 400 80 Z" fill="currentColor"/>
<text x="346" y="60" fill="currentColor" text-anchor="middle" font-size="12">tap ×3</text>
<text x="346" y="128" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">(and ×3 flips back)</text>
<rect x="412" y="40" width="250" height="70" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="537" y="68" fill="currentColor" text-anchor="middle" font-size="13">SPELL BOOK</text>
<text x="537" y="92" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">23 pills of lenses</text>
</g>
</svg>

## Opening it

**Triple-tap the MY PD header in settings.** The settings panel flips to the Spell Book; triple-tap the SPELL BOOK header to flip back. That's the whole trick — no menu item, no button. Casting or dispelling any spell announces itself in a toast, and a few carry incantations: *☽ Reading the Birth Skies ☽*, *⑃ Rumor Has It… ⑃*, *∾ The Net Is Cast ∾*.

Spells are per-user and presentational — nothing here changes your data or anyone else's view of the platform, with the two deliberate exceptions noted below (Deactivate and Echo Chamber, which change what *reaches* you and how *you* appear).

## Reading lenses — the art and the market, re-seen

- **Celestial Tracker ♃** — every Output's astrological **big three** appears as a silent glyph run on card edges and Output titles: sun sign · the TRUE mint-moon disc (its shade is the moon's real illumination the night the piece was minted) · rising sign. Computed by the platform's real natal engine from each piece's mint moment; hold on the glyphs for the reading. No words render — the order is the label.
- **Stargazing ⍟** — the celestial backdrop: the platform's astrological substrate comes forward and the room turns night-sky.
- **Aura ⦿** — every piece wears a breathing halo sampled from its **own** colors, with rarity scaling the glow's reach. The grid becomes a field of presences.
- **Fog** — artworks arrive fogged and reveal as you reach them; drifting wisps replace certainty. The pill's own label wears the fog.
- **Degen ⚔** — the anti-lens: **the art is deliberately absent.** Every tile becomes a data slab — #id, ❖ rarity score and edition rank, primary trait, Fate, ask — and the sort snaps to price. Shop like a terminal; the art waits at the end.
- **Price Ghost ᗝ** — the price layer goes spectral: numbers haunt the interface instead of leading it.
- **Gossip Protocol ⑃** — the feed's one shared sentence is retold as plain-English rumor — every event gets one of dozens of tellings, seeded per event so a story keeps its wording everywhere it appears. Actors, links, and the exact price survive the retelling. The [Tribunal](#instruments--the-deep-reads) is deliberately immune: the court record stays sworn.
- **Redacted @** — strips identity from the interface. Browse the market without the who.

## Instruments — the deep reads

- **Tribunal ⚖** — every Output's +More gains a case file: the chain of custody with per-hand tenure and flip reads, the money, what's on the block, standing offers, the parties' per-wallet in/out/net, numbered findings of fact, and a double-struck ruling stamp (ON THE BLOCK · UNDER CLAIM · TIGHTLY HELD · AT REST). Built entirely from the record already on the page; anything the record doesn't hold is named OFF THE RECORD, never invented.
- **Sybil Net ∾** — [Cartography](/docs/cartography) grows a forensic layer: animated dotted lines chain wallet clusters linked by real unpriced wallet-to-wallet transfers. Focus a wallet and the map narrows to its net.
- **Arbitrage Map ⇄** — listed pieces asking **below their trait cohort's average ask** wear a live discount badge (*⇄ −38%*) and a heat ring that scales with the gap. Cohorts come from real listings only; a piece with no comparables never flags.
- **Tarot Spread ▯▯▯** — a themed reading: three real Major Arcana drawn into Past / Present / Future, each card wearing one of your own Collected pieces as its face, with genuine upright and reversed meanings woven into a read. Deterministic per day, with a re-roll. **Unlocks at 22 pieces collected** — below that, the cards lie face down with your count.
- **Spite Book ⌧** — your private grudge ledger of *names*. Write a real @user or project onto a page of the book and that name renders struck through — dimmed, italic, crossed out — everywhere it appears across the site: their listings, bids, feed activity, and holder chips. Scratch a name out to lift it.
- **The Watch ⬬** — a floating live-stat chip that follows you; its watch hits route into your [Pings](/docs/pings/overview).
- **Audience ●** — the live-presence layer: the breathing dot and headcount on Project pages, including yours. See [Projects & Minting](/docs/app/projects-and-minting).
- **Panopticon ⎌** — the all-seeing view of who is where, platform-wide, live. Turning it on requires explicit consent — watching the room means being visible in it — which is exactly the trade the next spell exists to break.

## Wards — controlling what reaches you

- **Offer Shield ⍲** — incoming offers under **half the collection floor** are silently kept out of your Pings. Casting it raises a visible ward. It fails open: if the floor can't be read, nothing is ever swallowed.
- **Echo Chamber ≫** — mutuals only: pings and the artist roster filter to the people you follow who follow you back. The toast says what it means: `MUTUALS ONLY`.
- **Deactivate ⊖** — the public ragequit, both halves. Visitors to your profile see an understated *account deactivated* shell — while you keep using PD normally, with a quiet cue that the veil is up. You also stop broadcasting to the Panopticon and Audience counts: one-way glass, you still see the room.
- **The Hammer ⟙** — the mute. Its badge counts what you've silenced. Always the last pill, by convention.

## The cast

- **Digital Familiar ⚝** — a small creature accompanies you around the platform; tap it to meet it, customize it in settings.
- **NPC** — the off-screen cast wanders in: the platform's regulars, aware of its surfaces, occasionally offering commentary of debatable value.

## The mystery

One pill reads **????**. It toggles nothing, reveals nothing, and answers every tap with `????`. The documentation team has nothing further at this time.

## Spells vs. display modes

Display modes ([Settings & Display](/docs/app/settings-and-display)) change how the interface *renders* — light, dark, zen. Spells change what the interface *foregrounds*. Modes are ergonomics; spells are worldviews. They compose freely: a Celestial + Gossip + Aura session is a genuinely different platform from a Degen + Price Lens one, and both are the same ledger underneath.

## Further reading

- [Settings & Display](/docs/app/settings-and-display)
- [The Cartography](/docs/cartography) — where Sybil Net draws
- [Achievements](/docs/app/achievements) — the lore category rewards finding things like these
