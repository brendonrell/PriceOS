---
title: "Stickers — Overview"
description: "PD's second economy: collectible on-chain SVG stickers sold in sealed sheets. The Sticker Exchange, the sealed-and-peel model, what stickers are for, and what they cost."
category: "stickers"
keywords: ["stickers", "sticker exchange", "sheets", "sealed", "peel", "ERC-1155", "collectibles"]
last_updated: "2026-07-17"
---

# Stickers — Overview

Price Discussion runs two economies. The first is the art — Projects, Outputs, the secondary market. The second is **stickers**: small collectible artworks, published by PD itself, sold in **sealed sheets** you peel open, worn on your profile, traded on their own marketplace, and completed page by page in a binder. Stickers are deliberately the platform's playground — low prices, fast trades, pure collecting joy — with the same engineering seriousness underneath as everything else on PD: the art is on-chain SVG, the sheets are real tokens, and the money mechanics mirror the art market's exactly.

This section is the complete manual, in four pages: this overview, [The Store](/docs/stickers/the-store) (buying sheets), [The Marketplace](/docs/stickers/the-marketplace) (trading them), and [The Binder & Your Profile](/docs/stickers/the-binder-and-your-profile) (completing the collection and wearing it). The protocol layer has its own reference: [PDStickers](/docs/contracts/pd-stickers).

## Where stickers live

The **STICKERS** button (⊞) on the home action row opens the **Sticker Exchange** — a slide-up sheet with three faces:

- **The Store** — the primary market: every sheet PD has published, priced in ETH, bought with one tap.
- **The Marketplace** — the secondary market: a per-sheet order book of asks, bids, swaps, and gifts.
- **The Binder** — the completionist view: every sticker you have, every sticker you're missing, page by page.

A thin crawl line under the Exchange header carries you between the Store and the Marketplace; the **MY BINDER** cap at its end opens the Binder. The ⊞ glyph is the canonical stickers mark everywhere it appears.

## The sealed model

Stickers use a model borrowed from the corner store and enforced by the contract:

<svg viewBox="0 0 720 250" role="img" aria-labelledby="sticker-lifecycle-title" style="width:100%;height:auto;display:block;margin:0 0 14px">
<title id="sticker-lifecycle-title">Sticker lifecycle: buy a sealed sheet from the Store, peel it to reveal the stickers, then wear them on your profile, fill the Binder, or trade on the Marketplace. Sealed sheets are themselves tradable.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="40" width="150" height="54" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="63" fill="currentColor" text-anchor="middle">THE STORE</text>
<text x="85" y="81" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">buy a sheet</text>
<path d="M160 67 H 216" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M216 62 L 228 67 L 216 72 Z" fill="currentColor"/>
<rect x="230" y="40" width="170" height="54" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="315" y="63" fill="currentColor" text-anchor="middle">SEALED SHEET</text>
<text x="315" y="81" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">one stackable token</text>
<path d="M400 67 H 456" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M456 62 L 468 67 L 456 72 Z" fill="currentColor"/>
<text x="434" y="56" fill="currentColor" text-anchor="middle" font-size="12">PEEL</text>
<rect x="470" y="40" width="150" height="54" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="63" fill="currentColor" text-anchor="middle">STICKERS</text>
<text x="545" y="81" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">yours, individually</text>
<path d="M315 94 V 130" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M310 130 L 315 142 L 320 130 Z" fill="currentColor"/>
<rect x="205" y="145" width="220" height="42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="315" y="163" fill="currentColor" text-anchor="middle" font-size="12">still sealed? trade it as-is —</text>
<text x="315" y="179" fill="currentColor" text-anchor="middle" font-size="12">unopened packs are collectibles</text>
<path d="M545 94 V 130" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M540 130 L 545 142 L 550 130 Z" fill="currentColor"/>
<rect x="445" y="145" width="200" height="90" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="169" fill="currentColor" text-anchor="middle" font-size="12">wear them on your profile</text>
<text x="545" y="192" fill="currentColor" text-anchor="middle" font-size="12">fill your Binder pages</text>
<text x="545" y="215" fill="currentColor" text-anchor="middle" font-size="12">swap · gift · sell doubles</text>
</g>
</svg>

**Buying a sheet mints one sealed sheet.** Identical sealed sheets stack — a hundred sealed GENESIS packs are one line in a wallet, ×100 — and your profile stays clean until *you* choose to open one. **Peeling** is the reveal: it consumes the sealed sheet and delivers the stickers inside, individually. In the app, the peel is a physical act — a sealed sheet you own wears its wrapper until you **drag it off**. The rip is the product; there is no "open" button.

Sealed sheets are collectibles in their own right. The Marketplace tracks each sheet's **% still sealed** — as more collectors peel, the unopened supply only shrinks.

## What's in a sheet

Every sticker is on-brand PD material: the logo in dozens of colours, Petey the mascot, the platform's glyph vocabulary, the familiar bestiary, real Project and artist sprites, Glagolitic True Names, rarity words, quips, holographic finishes, war banners, and real generative Outputs painted small. Each sheet is a themed set with a rarity tag from COMMON to MYTHIC, and every sticker belongs to exactly one sheet, forever. The full catalog — all eighteen launch sheets and what's inside each — is on [The Store](/docs/stickers/the-store) page.

## The money, in one paragraph

Sheets are priced in ETH at pocket-money levels (the platform targets roughly $22 per sheet and can retune a sheet's price as ETH drifts — the change applies to the next purchase, never retroactively). Every primary sheet sale pays the **platform's standard 5%** — the same rate Project mints pay — with the remainder going to the sheet's creator side, shared with a **collaborator** when the sheet has one. Secondary trades carry the same **5% royalty split 3% creator / 2% platform** as the art market. Swaps and gifts move no money and pay no fee. During the test phase the sticker economy settles in sim ETH; at chain cutover the same surfaces carry the real thing — sealed sheets and stickers become on-chain ERC-1155 tokens ([PDStickers](/docs/contracts/pd-stickers)), tradable on PD and on any 1155 marketplace.

## What stickers are not

Stickers confer no power. They don't move [PriceRank](/docs/app/achievements), they don't weigh into [the war](/docs/app/the-factions) (the WAR BANNERS sheet sells every faction's flag cheap, and the faction constitution is explicit: cosmetics never touch power), and they gate nothing. They are jerseys, trophies, and trading-floor small talk — the collecting hobby, miniaturized and pointed back at the platform itself.

## Further reading

- [The Store](/docs/stickers/the-store) — sheets, prices, print runs, and the peel
- [The Marketplace](/docs/stickers/the-marketplace) — asks, bids, swaps, gifts, and the want-list
- [The Binder & Your Profile](/docs/stickers/the-binder-and-your-profile) — completion and display
- [PDStickers contract reference](/docs/contracts/pd-stickers)
