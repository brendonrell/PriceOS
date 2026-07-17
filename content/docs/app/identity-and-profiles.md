---
title: "The App — Identity & Profiles"
description: "The identity layer: @names, PriceSprites, profile pages and their owner's colour, Showcase modes, and the Collected / Starred / Wishlist / Albums system."
category: "app"
keywords: ["identity", "@name", "pricesprite", "profile", "showcase", "albums", "completionism", "friend inspector"]
last_updated: "2026-07-17"
---

# The App — Identity & Profiles

PD's identity layer sits on top of your wallet: the address signs, the identity is yours to shape. Everything here is claimed at first sign-in and editable after.

## The @name

Your handle across the platform — on the Tape, in Pings, on everything you touch. The @ is part of the noun. Underneath it your address (and ENS, where set) remains readable; the @name is how the community knows you.

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
- **Share ▶ / Takeover ⚑** — the share button hands the profile to the native share sheet; when the profile holds 3+ pieces of one Project, the [Takeover](/docs/for-collectors/hostile-takeover) action appears beside it.

## Stars, Wishlist, Albums

Three ways of holding work you don't (yet) own, with deliberate privacy defaults:

| Surface | Glyph | Privacy | What it means |
| --- | --- | --- | --- |
| Starred | ★ | Private | A frequent, silent bookmark |
| Wishlist | ✛ | Private | Buy intent — drives financial Pings |
| Albums | ◰ | Displayed on your profile; public shelves rolling out | Curated named sets within a Project, with living mosaic covers |

**Grail Pins** (⟟) elevate the few pieces that matter most, pinned to the top of your rows.

## The Vault

Every profile carries **the Vault** (+ More › Vault) — one canonical home per
wallet, public by design: drop a link to anyone's vault. A near-black door
slides open like a MiniDisc shutter; the **seal** on it is the wallet's forged
[Sigil](/docs/app/the-factions) in faction ink. Before it even opens, the
**verdict line** — faction · pieces held · days under oath — makes the closed
door a flex or an indictment. Inside, every held piece hangs with its
**appraisal plate** (PD Rarity and edition rank); tap a plate to enter the
piece. The Vault ships no new verbs — it is the wallet's existing record,
consolidated and staged.

## Social

Follows are asymmetric and read at a glance beside any @name: mutual ⚭, following ⚯, follower ⚬. Following a person, a Project, or an Output routes its activity into your [Pings](/docs/pings/overview). **PriceRank** (❂) is the platform's standing system, fed by achievements and activity.

### The Friend Inspector

The Followers modal carries the **Friend Inspector** — your circle, instrumented. Two views behind a toggle: **the Wire**, your circle's live story as counter-scrolling ticker rows (their mints, sales, and listings, riding the news rail's exact mechanics), and **the Constellation**, the circle as a navigable starfield — you at the center, friends pulled closer by shared holdings, cartel threads drawn between you, pinch-zoomable like a real map. Three **lenses** re-read the same people: LEDGER (the plain record), DRAMA (a live three-stat duel of every friend against you, tightest races first), and SLEUTH (each friend's last on-ledger move, freshest first). Lenses annotate and re-order; they never hide anyone.

### The Identity Plate

The PriceSprite modal's share button composes your **Identity Plate** — a share card with your live sprite as the hero, your @handle, and your PriceRank, score, streak, and achievements on your own colorway accent — handed straight to the native share sheet. It's one of the house share documents, alongside the Rarity Receipt and the trade receipts.

## Further reading

- [Wallet Setup](/docs/for-collectors/wallet-setup)
- [Achievements](/docs/app/achievements)
- [Settings & Display](/docs/app/settings-and-display)
