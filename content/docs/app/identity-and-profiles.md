---
title: "The App — Identity & Profiles"
description: "The identity layer: @names, PriceSprites, profile pages and their owner's colour, Showcase modes, and the Collected / Starred / Wishlist / Albums system."
category: "app"
keywords: ["identity", "@name", "pricesprite", "profile", "showcase", "albums", "completionism", "friend inspector"]
last_updated: "2026-07-20"
---

# The App — Identity & Profiles

PD's identity layer sits on top of your wallet: the address signs, the identity is yours to shape. Everything here is claimed at first sign-in and editable after.

## The @name

Your handle across the platform — on the Tape, in Pings, on everything you touch. The @ is part of the noun. Underneath it your address (and ENS, where set) remains readable; the @name is how the community knows you.

Long-press your @name on your own profile and the customization rows open: your **profile colour**, your **tags**, and your **name font** — twenty-two Unicode styles (bold, script, fraktur, small caps, upside-down…) that restyle your displayed name for every viewer. The @ stays plain and the real handle underneath never changes.

## Profile tags

Identity chips on your hero, above the stickers. Some you **pick** (Collector, Trader, Analyst, Degen ⚔, Podcaster ⚲, and more — toggle them in the tags row of the customization menu), some are **earned** from the record (Artist ✺, Minter ✶, Veteran), some are **granted** (OG ⌖), and one is **yours by number**: every account carries its platform number — *User #1* through *#22* stand alone, then First 100 / 500 / 1000. Tag labels wear your chosen name font, and the paint chips at the end of the tags row can dress every tag in one colour — all black, all white, or a brand primary — with the lettering flipped to match.

## Your platform number

Accounts are numbered in join order, forever. Long-press the join date on any profile to flip it to the platform number; tap to open the joining PriceDay.

## The PriceSprite

Your character face, chosen at signup from archetypes and customizable after — a typographic sprite, not an avatar image, in keeping with the platform's glyph-first design. It appears in the navbar, on your profile, and beside your @name in identity surfaces.

## The profile page

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

Three ways of holding work you don't (yet) own, with deliberate privacy defaults:

| Surface | Glyph | Privacy | What it means |
| --- | --- | --- | --- |
| Starred | ★ | Private | A frequent, silent bookmark |
| Wishlist | ✛ | Private | Buy intent — drives financial Pings |
| Albums | ◰ | Displayed on your profile; public shelves rolling out | Curated named sets within a Project, with living mosaic covers |

**Grail Pins** (⟟) elevate the few pieces that matter most, pinned to the top of your rows.

## The Vault

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

The Followers modal carries the **Friend Inspector** — your circle, instrumented. Two views behind a toggle: **the Wire**, your circle's live story as counter-scrolling ticker rows (their mints, sales, and listings, riding the news rail's exact mechanics), and **the Constellation**, the circle as a navigable starfield — you at the center, friends pulled closer by shared holdings, cartel threads drawn between you, pinch-zoomable like a real map. Three **lenses** re-read the same people: LEDGER (the plain record), DRAMA (a live three-stat duel of every friend against you, tightest races first), and SLEUTH (each friend's last on-ledger move, freshest first). Lenses annotate and re-order; they never hide anyone.

### Counterparties & The Nemesis

The profile's **Counterparties** tab reads the wallet's trading history as a who-with list: everyone this collector has actually dealt with, ranked by deals then volume, medals ❶❷❸ on the top three. From there, **DECLARE NEMESIS** — one declared rival per account. A declared nemesis shows as a public head-to-head plate: both sides' held counts and floor-priced positions with a live AHEAD / BEHIND read.

### Targets ⬚

The profile's **Targets** tab is the wallet's public record of price calls. A call inside its open window shows **SEALED** (with its reveal date) to everyone but its author; once the window closes it becomes permanent public record, scored against today's floor — per-call gap and the running average miss.

### The Identity Plate

The PriceSprite modal's share button composes your **Identity Plate** — a share card with your live sprite as the hero, your @handle, and your PriceRank, score, streak, and achievements on your own colorway accent — handed straight to the native share sheet. It's one of the house share documents, alongside the Rarity Receipt and the trade receipts.

## Further reading

- [Wallet Setup](/docs/for-collectors/wallet-setup)
- [Achievements](/docs/app/achievements)
- [Settings & Display](/docs/app/settings-and-display)
