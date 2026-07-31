---
title: "Stickers — The Marketplace"
description: "The sticker secondary market: per-sheet order books with partial fills, listings and offers, sticker-for-sticker swaps, gifting with a note, the want-list, and the 5% fee split."
category: "stickers"
keywords: ["sticker marketplace", "secondary", "listings", "offers", "swaps", "gifts", "want list", "fees"]
last_updated: "2026-07-17"
---

# Stickers — The Marketplace

Sheets trade. The Marketplace is the sticker economy's secondary market — a real order book per sheet, living inside the Sticker Exchange (tap the crawl line, or the MARKETPLACE cap, from [the Store](/docs/stickers/the-store)). It is deliberately a full market in miniature: asks and bids with quantities and partial fills, escrowed listings, sticker-for-sticker swaps, gifting, and a want-list that does matchmaking for you.

## The summary — every sheet at a glance

The Marketplace opens on one row per sheet: the sheet's three-sticker fan, its name, and its live market line — copies **listed**, open **bids**, lifetime **sold**, open **swaps**, and the **% still sealed** (how much of everything ever sold remains unpeeled — the scarcity readout the [peel](/docs/stickers/the-store) feeds). The price pill on the right is the sheet's **floor**; under it, the best open offer (✶).

Two personal touches ride the summary when they apply: sheets on your want-list wear **✛ WANTED**, and when you hold doubles of a sheet other collectors want, the row tells you plainly — *"✛ 3 collectors need your doubles."* The market comes to you.

## The book — one sheet, all its orders

Tap a row and the sheet's book opens: your position (*you hold 2 (doubles) · last 0.011 · 74% sealed*), then the orders in three ledgers:

- **✹ FOR SALE** — asks, cheapest first, each with quantity and expiry. **BUY** opens the confirm card; multi-copy listings carry a quantity stepper, and **partial fills are native** — buy one out of a five-copy listing and the listing stays live for the remaining four. Your own asks show **CANCEL** instead.
- **✶ WANTED** — bids, highest first. If you hold the sheet, **SELL** fills a bid on the spot (quantity stepper again, partial fills again). Your own bids can be cancelled.
- **✸ SWAPS** — sticker-for-sticker: *"gives ×1 PETEY for ×1 GENESIS."* If you hold what the proposer wants, **SWAP** completes it in one tap. No money moves.

## Composing your own orders

The **⊞ COMPOSE** section is the order desk, and it only shows you verbs you can actually perform:

- **✹ SELL** — quantity (capped at what you hold) × price each → **LIST**. Listing **escrows** the copies: they leave your balance immediately and return only if you cancel, so the book never shows phantom supply.
- **✶ OFFER** — quantity × price each → a standing bid on the sheet.
- **✸ SWAP** — propose *give × N of this sheet* for *want × N of that sheet*. Your give side is escrowed at propose, same rule as listing.
- **✸ GIFT** — send copies to any **@name** (or address), with an optional note up to 140 characters. The recipient gets a wrapped [Ping](/docs/pings/overview) with your note riding it. Free, no fee.

Every order takes a **duration** from the same pill row the art market's listing modal uses; expired orders leave the book on their own. If you hold doubles, the book also offers **LIST DOUBLES @ FLOOR** — one tap pre-fills the sell composer with everything above your first copy, priced at the live floor.

## The want-list

**✛ WANT THIS** on any sheet's book adds it to your want-list. It does two jobs:

1. **It's a wishlist with teeth.** The moment anyone lists that sheet, you're pinged — the same wishlist-hit machinery the art market uses.
2. **It's a matchmaking signal.** Your want is counted (never named) into the sheet's *wanted by N* stat, and shown to holders of doubles — which is exactly how a want becomes a listing becomes your ping.

## The money

Marketplace sales — a BUY or a bid filled — settle atomically with the platform's standard split: **the seller nets 95%**, 3% goes to the sheet's creator side (PD, or the sheet's collaborator when one exists), 2% to the platform. Swaps and gifts move no money and pay no fee. Sales, filled offers, gifts, and completed swaps all land as [Pings](/docs/pings/overview) for the counterparty.

During the test phase the whole book settles in sim ETH — the same balance the art market moves. At chain cutover the identical surfaces carry wallet-signed orders against the on-chain [PDStickers](/docs/contracts/pd-stickers) contract, where sealed sheets and stickers are ERC-1155 tokens; sealed sheets then also trade anywhere 1155s trade, OpenSea included, with the same 5% royalty signalled on-chain. Nothing about the room changes — only the rail under it.

## Further reading

- [Stickers — Overview](/docs/stickers/overview)
- [The Binder & Your Profile](/docs/stickers/the-binder-and-your-profile) — where doubles come from
- [PDStickers contract reference](/docs/contracts/pd-stickers) — the on-chain rail
