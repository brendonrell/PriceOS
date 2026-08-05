---
title: "The App — Projects & Minting"
description: "The Project page: minting from the UI, live presence, traits and the Genome, grid sorts and grouping, project milestones, True Names, and per-Project colour."
category: "app"
keywords: ["project page", "minting", "genome", "milestones", "true name", "gnome"]
last_updated: "2026-08-05"
---

# The App — Projects & Minting

Every Project on PD gets a page that is part gallery, part market floor, part observatory. It lives at `/art/{slug}`, wears the artist's own colour, and carries every tool the platform has for reading one body of work.

**How:** Tap any project tile anywhere — Project pages live at /art/{slug}.

<svg viewBox="0 0 720 330" role="img" aria-labelledby="project-anatomy-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="project-anatomy-title">A Project page, annotated: the hero with the artist and the stats row (tap the owners count for the OWNERS list), the mint button with its live progress bar (long-press for the Mint Room), the sort row with the grouping toggle, the gallery grid, and the + More tab rail with Social, Stats, Replay, Albums, Genome, Gnome and the rest.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="10" width="700" height="310" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="42" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<text x="52" y="42" fill="currentColor" text-anchor="start" font-size="13">KIKI · ✺&#xFE0E; brendonrell</text>
<text x="52" y="64" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">⬚&#xFE0E; 105/2222 minted · ◊ 22.2 vol · ⌂&#xFE0E; 48 owners</text>
<text x="30" y="106" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<rect x="52" y="86" width="220" height="32" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="162" y="107" fill="currentColor" text-anchor="middle" font-size="13">MINT · ◊ 0.05</text>
<text x="290" y="106" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">long-press → the Mint Room</text>
<text x="30" y="152" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<rect x="52" y="132" width="42" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="73" y="150" fill="currentColor" text-anchor="middle" font-size="13">⁘&#xFE0E;</text>
<rect x="104" y="132" width="56" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="132" y="150" fill="currentColor" text-anchor="middle" font-size="13">#ID</text>
<rect x="170" y="132" width="72" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="206" y="150" fill="currentColor" text-anchor="middle" font-size="13">$PRICE</text>
<rect x="252" y="132" width="62" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="283" y="150" fill="currentColor" text-anchor="middle" font-size="13">FEED</text>
<text x="30" y="204" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<rect x="52" y="178" width="64" height="64" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="128" y="178" width="64" height="64" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="204" y="178" width="64" height="64" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="280" y="178" width="64" height="64" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="356" y="178" width="64" height="64" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="432" y="178" width="64" height="64" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="282" fill="currentColor" text-anchor="middle" font-size="15">⑤&#xFE0E;</text>
<rect x="52" y="262" width="74" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="89" y="280" fill="currentColor" text-anchor="middle" font-size="12">Social</text>
<rect x="136" y="262" width="64" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="168" y="280" fill="currentColor" text-anchor="middle" font-size="12">Stats</text>
<rect x="210" y="262" width="74" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="247" y="280" fill="currentColor" text-anchor="middle" font-size="12">Replay</text>
<rect x="294" y="262" width="74" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="331" y="280" fill="currentColor" text-anchor="middle" font-size="12">Albums</text>
<rect x="378" y="262" width="74" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="415" y="280" fill="currentColor" text-anchor="middle" font-size="12">Genome</text>
<rect x="462" y="262" width="64" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="494" y="280" fill="currentColor" text-anchor="middle" font-size="12">Gnome</text>
<rect x="536" y="262" width="24" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="548" y="280" fill="currentColor" text-anchor="middle" font-size="12">+</text>
</g>
</svg>

- **①&#xFE0E; The hero** — the Project in its artist's own colour; tap the ⌂ owners count and the ranked OWNERS list opens.
- **②&#xFE0E; The mint button** — live progress fills inside the control; **long-press it** and the Mint Room blooms: crowd count, shared supply bar, reaction sparks, the soundtrack.
- **③&#xFE0E; The sort row** — each pill cycles its directions; the ⁘ toggle folds the grid into groups (long-press it for the full dimension menu).
- **④&#xFE0E; The grid** — every Output; hover rows carry the action glyphs.
- **⑤&#xFE0E; + More** — Social · Stats · [Replay ⏴](/docs/app/projects-and-minting#the-replay--the-projects-time-machine) · Albums · Genome · [Gnome](/docs/gnomes/overview) · Sentiment · Attributes · Price Story · Offers · Anoint.

The stats row reads minted / volume / owners at a glance — tap the owners count and the **OWNERS** list opens: every holder ranked by pieces held, sortable (pieces · listed · A–Z), medals on the top three, your own row highlighted. The **Artist Showcase** tab is arranged by the artist themself — their chosen pieces, in their chosen layout (classic, masonry, or mixed with a lead piece), optionally titled, with a placard when the set is Gen Curated.

## Minting from the UI

**How:** Tap the mint button on a minting Project's page; long-press it for the Mint Room.

While a Project is minting, its page carries the mint button. The button itself shows live progress — from tap, through wallet confirmation, to the chain's answer — as a filling bar inside the control, so a mint never feels frozen. The wallet sheet shows the exact total (mint price plus the flat storage fee per Output); the contract accepts exact payment only. What happens on-chain is documented in [The Mint Flow](/docs/for-artists/the-mint-flow).

**The Mint Room** — long-press the mint button and it blooms into the project's own listening room: the live crowd count, the shared supply bar, reaction sparks from everyone in the room, and the project soundtrack — with the real mint button at the center. Minting as an event, not a form.

## The grid

The Project's Outputs, in a grid built for long sessions:

- **Sorts** with a cycling **grouping modifier** (⁘) — fold the grid into collapsible groups by artist ✺, project ⬚, owner ⌂, dominant colour ◉, rarity ❖, and a deep cycle of stranger dimensions (Fate, temperature, moon phase, faction, numerology, and more — the full list is in [Outputs](/docs/app/outputs)).
- **Fog** — a reveal mode that fades Outputs into view as you scroll.
- **Multi-select** (❐ → ▣) for acting on many Outputs at once.
- **Stored previews everywhere, live render on the artwork page** — grids draw each Output's rendered PNG preview for speed; opening an Output renders the real script. See [Outputs](/docs/app/outputs).

## Reading the work

- **Traits** — every Output's attributes, with per-trait rarity and trait-level starring.
- **The Genome** — the Project's parameter space as a navigable map: where any Output sits among its siblings.
- **The Audience** — live presence: a breathing dot and a count of the people on this Project's page right now.
- **Price Story & price intelligence** — the narrative and analytical reading of the Project's market history.
- **Sentiment** — two live reads of the crowd. **Price Targets** is a monthly game: cast one call on where the Project's floor lands in 30 days by tapping a rung on a ladder anchored to the real floor. Calls stay **sealed** while the window runs (only the count shows); when the month turns, last window's crowd reveals as a histogram beside where the floor actually landed. Retarget any time before the seal breaks. **Disagreement Score** measures what holders are *doing*, not saying: of every held piece, the share sitting on the market (LIST) versus held tight (HODL).
- **Soundtracks** — Projects can carry audio; storytelling on PD is traits plus soundtrack rather than long descriptions.

## Project identity

- **The artist's colour** — each Project paints the app in its own colorway while you're on it. The ◉ Colorway tile on Attributes opens [Colorpedia](/docs/colorpedia): that colour's name, every format, its history, and its harmonies.
- **The True Name** — every Project receives a permanent, unique 4-letter name in uppercase Glagolitic (Kiki's is `ⰅⰕⰭⰧ`), the platform's golem-mythos signature, shown in the Project's social panel.
- **Milestones** — lifecycle events the whole platform celebrates in the home feed: Uploaded ✧, Graduated ⟢⟢, First Blood †, Lucky 22 ♧, Century Club Ⅽ, Halo ⬭ (777), Per Mille ‰ (1,000), Archetype ✻, Hi-Def ⬢, and Ascension ▲ at sell-out.

## The Gnome — the Project's keeper

**How:** Open a Project ▸ + More — the Gnome lives there; tap it and it greets you.

Every Project has exactly one **Gnome**, living in the +More panel: a small generative creature, deterministic from the Project itself — its name, temperament, hat, beard, keepsake, and hoard are the Project's alone, forever, though its outfit re-dresses in your live colorway. Tap it and it greets you (it knows whether you're a stranger, a holder, or a favoured friend); its mood tracks the Project's market. Hold a piece for a week unbroken and unlisted and the keeper turns **appraiser**, arguing your piece's case from true facts only — rarity isolation, strike date, door price, tenure. The Gnome never lies and never re-rolls.

## The Replay ⏴ — the Project's time machine

**How:** Open a Project ▸ + More ▸ Replay.

The +More panel's **Replay** tab plays a Project's whole market history back as one synchronized animation: floor price, holders, listings and sales moving together from the first mint to today. Scrub anywhere on the timeline, run it at **1x / 5x / 22x**, or pause to lock a static reading — how the Project looked, priced and was held at that exact moment. At 1x the full biography runs in about thirty seconds, and it always lands precisely on today's real numbers.

## Golf Score ◴ and the Clubhouse ⛳

**How:** Tap the Golf Score tile on a Project's Attributes to open the Clubhouse.

Generative art is written as code, and on PD that code's **size** is a stat like any other. A Project's **Golf Score** is the byte size of its generation engine — and, as in golf, **the low score wins**. It sits on the Project's Attributes with the Project's rank among every ranked engine on the platform.

Tap the tile and the **Clubhouse** opens: every Project's engine ranked smallest-first. The leader on that board is the **artist**, not the Project — the ⛳ flag marks whoever wrote the tightest engine on PD, with medals for second and third. The measurement is taken from the engine's own shipped source, so it is the same number for everyone and can't be claimed, only earned.

## Social

Follow a Project (⚭) to route its activity into your [Pings](/docs/pings/overview); the Anoint panel is the platform's recognition mechanism for elevating specific works. With the Cartel pill on, the header also counts how many of **your mutuals** hold this work (⟁).

## Further reading

- [Outputs](/docs/app/outputs)
- [The Mint Flow](/docs/for-artists/the-mint-flow)
- [Discovery](/docs/app/discovery)
