---
title: "The App — Identity & Profiles"
description: "The identity layer: @names, PriceSprites, profile pages and their owner's colour, Showcase modes, and the Collected / Starred / Wishlist / Albums system."
category: "app"
keywords: ["identity", "@name", "pricesprite", "profile", "showcase", "albums", "completionism", "friend inspector"]
last_updated: "2026-07-20"
---

# The App — Identity & Profiles

PD's identity layer sits on top of your wallet: the address signs, the identity is yours to shape. Everything here is claimed at first sign-in and editable after.

<svg viewBox="0 0 720 320" role="img" aria-labelledby="profile-anatomy-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="profile-anatomy-title">A profile page, annotated: the hero with stickers and profile tags, the @name (long-press yours for colour, tags and name font), the ID row with the PriceSprite and stats, the tab rail from Showcase through Achievements, and the sort row on the Collected grid.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="10" width="700" height="300" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="44" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<text x="52" y="44" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">[stickers live up here]</text>
<rect x="300" y="26" width="100" height="24" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="43" fill="currentColor" text-anchor="middle" font-size="11">Collector</text>
<rect x="410" y="26" width="80" height="24" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="43" fill="currentColor" text-anchor="middle" font-size="11">OG ⌖&#xFE0E;</text>
<rect x="500" y="26" width="90" height="24" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="43" fill="currentColor" text-anchor="middle" font-size="11">User #22</text>
<text x="30" y="92" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<text x="52" y="92" fill="currentColor" text-anchor="start" font-size="16">@keeper</text>
<text x="160" y="92" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">← long-press yours: colour · tags · font</text>
<text x="30" y="128" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<text x="52" y="128" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">[·_·] 0x1460…B9B8 · ☻&#xFE0E; 48 · ⬚&#xFE0E; 12 · ◊ 4.2</text>
<text x="30" y="176" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<rect x="52" y="156" width="88" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="96" y="174" fill="currentColor" text-anchor="middle" font-size="12">Showcase</text>
<rect x="150" y="156" width="88" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="194" y="174" fill="currentColor" text-anchor="middle" font-size="12">Stickers</text>
<rect x="248" y="156" width="97" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="296.5" y="174" fill="currentColor" text-anchor="middle" font-size="12">Collected</text>
<rect x="355" y="156" width="97" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="403.5" y="174" fill="currentColor" text-anchor="middle" font-size="12">Portfolio</text>
<rect x="462" y="156" width="70" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="497" y="174" fill="currentColor" text-anchor="middle" font-size="12">+ More</text>
<text x="30" y="232" fill="currentColor" text-anchor="middle" font-size="15">⑤&#xFE0E;</text>
<rect x="52" y="212" width="42" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="73" y="230" fill="currentColor" text-anchor="middle" font-size="13">⁘&#xFE0E;</text>
<rect x="104" y="212" width="56" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="132" y="230" fill="currentColor" text-anchor="middle" font-size="13">#ID</text>
<rect x="170" y="212" width="72" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="206" y="230" fill="currentColor" text-anchor="middle" font-size="13">$PRICE</text>
<rect x="252" y="212" width="62" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="283" y="230" fill="currentColor" text-anchor="middle" font-size="13">FEED</text>
<rect x="52" y="250" width="64" height="44" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="128" y="250" width="64" height="44" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="204" y="250" width="64" height="44" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="280" y="250" width="64" height="44" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="356" y="250" width="64" height="44" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="432" y="250" width="64" height="44" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
</g>
</svg>

- **①&#xFE0E; The hero** — wears the owner's sticker arrangement and their profile tags.
- **②&#xFE0E; The @name** — long-press your own to open the customization rows: profile colour, [Profile Tags](/docs/app/identity-and-profiles#profile-tags), and the name font.
- **③&#xFE0E; The ID row** — the PriceSprite (tap yours to open it, long-press to recolour), the address, and the stats; tap ☻ for followers.
- **④&#xFE0E; The tabs** — Showcase · Stickers · Collected · Completionism · Portfolio · Trade record · Achievements · + More (Vault, Counterparties, Targets…).
- **⑤&#xFE0E; The sort row** — same grammar as every gallery: pills cycle, ⁘ groups.

## The @name

**How:** Long-press your @name on your own profile to open the customization rows — profile colour, tags, and name font.

Your handle across the platform — on the Tape, in Pings, on everything you touch. The @ is part of the noun. Underneath it your address (and ENS, where set) remains readable; the @name is how the community knows you.

Long-press your @name on your own profile and the customization rows open: your **profile colour**, your **tags**, and your **name font** — twenty-two Unicode styles (bold, script, fraktur, small caps, upside-down…) that restyle your displayed name for every viewer. The @ stays plain and the real handle underneath never changes.

## Profile tags

**How:** Long-press your @name on your profile to open Profile Tags.

Identity chips on your hero, above the stickers. Some you **pick** (Collector, Trader, Analyst, Degen ⚔, Podcaster ⚲, and more — toggle them in the tags row of the customization menu), some are **earned** from the record (Artist ✺, Minter ✦, Veteran), some are **granted** (OG ⌖), and one is **yours by number**: every account carries its platform number — *User #1* through *#22* stand alone, then First 100 / 500 / 1000. Tag labels wear your chosen name font, and the paint chips at the end of the tags row can dress every tag in one colour — all black, all white, or a brand primary — with the lettering flipped to match.

## Your platform number

**How:** Long-press the join date on any profile to flip it to the platform number.

Accounts are numbered in join order, forever. Long-press the join date on any profile to flip it to the platform number; tap to open the joining PriceDay.

## The PriceSprite

**How:** Tap your sprite in your profile's ID row to open it; long-press it to recolour.

Your character face, chosen at signup from archetypes and customizable after — a typographic sprite, not an avatar image, in keeping with the platform's glyph-first design. It appears in the navbar, on your profile, and beside your @name in identity surfaces.

## The profile page

**How:** Tap any @name anywhere in the app to open that profile.

Lives at `/{handle}`, painted in the owner's chosen colour. Its tabs and surfaces:

- **Showcase** — the owner's curated face: a top-six selection with four engine modes cycled by glyph — Static ⑆, Generative ⑇, Gen Curated ⑈ (auto-curates the collection into themed sets; unlocks at 100 collected), and Artist ⑉ (for whitelisted artists with a released Project).
- **Stickers** — the hero at the top wears the owner's [sticker arrangement](/docs/stickers/the-binder-and-your-profile), exactly as they composed it.
- **Collected** — every Output the wallet owns, with the full grouping cycle.
- **Completionism** — the month count in the header (*n/N MONTHS*) tracks how many of the platform's release months the wallet has fully collected; the STATS pill beside it unfolds **the Completionist's Ledger** — per-month completion bars, the tallies, and **The Close**: the nearest-to-finish month, priced from live floors.
- **Portfolio** — the holdings view with the market layer on.
- **Trade record** — the wallet's PD market history.
- **Achievements** — the unlock grid. See [Achievements](/docs/app/achievements).
- **Share ▶ / Takeover ⚑** — the share button hands the profile to the native share sheet; when the profile holds 3+ pieces of one Project, the [Takeover](/docs/takeover) action appears beside it.

## Stars, Wishlist, Albums

**How:** Tap ★ to star or ✛ to wishlist any Output; ◰ on an artwork opens the Add-to-Album sheet.

Three ways of holding work you don't (yet) own, with deliberate privacy defaults:

| Surface | Glyph | Privacy | What it means |
| --- | --- | --- | --- |
| Starred | ★ | Private | A frequent, silent bookmark |
| Wishlist | ✛ | Private | Buy intent — drives financial Pings |
| Albums | ◰ | Public — anyone sees the album and its maker | Numbered, never-named shelves you curate, with living mosaic covers. See [Albums](/docs/albums) |

**Grail Pins** (⟟) elevate the few pieces that matter most, pinned to the top of your rows.

## The Vault

**How:** Open a profile ▸ + More › Vault ⧈.

Every profile carries **the Vault** (⧈, + More › Vault) — where a collector
designates the pieces that matter most as **vaulted**, public by design: drop
a link to anyone's vault. Vaults work exactly like Albums, but hold only
pieces you own — make VAULT 01, VAULT 02, as many as you like, each a
numbered wall of grails with a living mosaic cover. Under each vault's pieces
sits its **stats block**, every number real: estimated value at floor, ETH
spent acquiring, the net between them, the best-performing piece, average
hold time, and the top-rarity piece on the wall. Tap any piece to enter it.

## Social

Follows are asymmetric and read at a glance beside any @name: mutual ⚭, following ⚯, follower ⚬. Following a person, a Project, or an Output routes its activity into your [Pings](/docs/pings/overview). **PriceRank** (❂) is the platform's standing system, fed by achievements and activity.

### The Friend Inspector

**How:** Open your profile's Followers modal — the Friend Inspector lives inside, behind its view toggle.

The Followers modal carries the **Friend Inspector** — your circle, instrumented. Two views behind a toggle: **the Wire**, your circle's live story as counter-scrolling ticker rows (their mints, sales, and listings, riding the news rail's exact mechanics), and **the Constellation**, the circle as a navigable starfield — you at the center, friends pulled closer by shared holdings, cartel threads drawn between you, pinch-zoomable like a real map. Three **lenses** re-read the same people: LEDGER (the plain record), DRAMA (a live three-stat duel of every friend against you, tightest races first), and SLEUTH (each friend's last on-ledger move, freshest first). Lenses annotate and re-order; they never hide anyone.

### Counterparties & The Nemesis

**How:** Open a profile's Counterparties tab — DECLARE NEMESIS is inside.

The profile's **Counterparties** tab reads the wallet's trading history as a who-with list: everyone this collector has actually dealt with, ranked by deals then volume, medals ❶❷❸ on the top three. From there, **DECLARE NEMESIS** — one declared rival per account. A declared nemesis shows as a public head-to-head plate: both sides' held counts and floor-priced positions with a live AHEAD / BEHIND read.

### Targets ⬚

**How:** Open a profile's Targets tab.

The profile's **Targets** tab is the wallet's public record of price calls. A call inside its open window shows **SEALED** (with its reveal date) to everyone but its author; once the window closes it becomes permanent public record, scored against today's floor — per-call gap and the running average miss.

### The Identity Plate

**How:** Tap your sprite in your profile's ID row, then hit the share button.

The PriceSprite modal's share button composes your **Identity Plate** — a share card with your live sprite as the hero, your @handle, and your PriceRank, score, streak, and achievements on your own colorway accent — handed straight to the native share sheet. It's one of the house share documents, alongside the Rarity Receipt and the trade receipts.

## Further reading

- [Wallet Setup](/docs/for-collectors/wallet-setup)
- [Achievements](/docs/app/achievements)
- [Settings & Display](/docs/app/settings-and-display)
