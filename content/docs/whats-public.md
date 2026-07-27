---
title: "What's Public on PD"
description: "Everything on PD anyone can see, feature by feature: the on-chain record, your profile and its surfaces, market activity, the social graph, presence, the war record, and the leaderboards."
category: "public-private"
keywords: ["public", "privacy", "transparency", "on-chain", "profile", "visibility"]
last_updated: "2026-07-17"
---

# What's Public on PD

PD is a public-by-default social layer over a public blockchain. The honest framing: **if it lives on-chain or on a profile, assume the whole world can see it.** This page is the complete map of what that means, feature by feature; its mirror is [What's Private](/docs/whats-private) — a much shorter page, on purpose.

## The on-chain record — public forever

Ethereum is a public ledger, and PD adds nothing that hides it:

- Every **mint, sale, transfer, and offer**, with prices, parties, and timestamps.
- **Who holds what, and for how long** — the full custody chain of every Output, readable from standard `Transfer` events by anyone, with or without PD.
- **All money mechanics** — royalty splits, pending balances, and every payout on the [Project](/docs/contracts/pd-project) and [splitter](/docs/contracts/payment-splitter) contracts.

## Your profile — the public you

Everything on a profile page is public to every visitor:

- Your **@name**, **PriceSprite**, and **PriceRank / PriceScore / PriceStreak**.
- Your **Collected** holdings, **Portfolio**, and **trade record** — these mirror the chain, which already tells this story.
- Your **Showcase** (all four engine modes) and your **Achievements** wall.
- Your **sticker hero** — the arrangement you compose is precisely what visitors see. (Which sheets you own beyond what you display stays your business; the [Binder](/docs/stickers/the-binder-and-your-profile) is your own view.)
- Your **[Vault](/docs/app/identity-and-profiles)** (⧈) — the numbered walls of owned pieces you designate as vaulted, stats block included.
- Your **faction allegiance and oath history** — the flag you fly, your time under it, and any defection scar. Your forged **Sigil** trails your @name everywhere. See [Factions](/docs/factions).
- **Takeover verdicts** — casting one banners both profiles for its 72 hours, and the outcome (COMPLETED / PARTIAL / WITHSTOOD) is inscribed on the record. WITHSTOOD is worn for 180 days.
- **Albums** — your named sets display on your own profile today; serving them publicly to visitors is rolling out. Treat album names and contents as public-bound.

## Social and market

- **Followers and following** — the social graph is readable in both directions, and relationship glyphs (⚭ ⚯ ⚬) annotate names across the app.
- **Listings, offers, and sales** — the discussion itself. Your market actions run through [the Tape](/docs/app/the-shell), the feeds, and other collectors' [Pings](/docs/pings/overview) with your @name attached.
- **The Marginalia** — every artwork's margin records every hand that ever held it, permanently: sales in deep ink, private transfers faint. Anyone who performs the ceremony can read a piece's hands. They can sell, but they can't unsign you.
- **Presence** — while you're on a Project page, [the Audience](/docs/app/projects-and-minting) shows a breathing dot for you (signed-out visitors read as anonymous dots). The [Deactivate spell](/docs/app/spell-book) is the one-way glass: stop broadcasting, keep seeing.

## Standings and the record

- **Leaderboards** and podium finishes (❶❷❸) across the boards.
- **The Book of Conquests** — the war's permanent chronicle: sieges, conquests, strongholds, relics, and struck stones, dated forever.
- **The Dispatch** — a public daily paper assembled from the same ledger; if your sale was yesterday's biggest, it's in print, permanently, at a citable URL.

## The design position

PD never publishes anything the chain doesn't already imply about your wallet — it *interprets* the public record and attaches the identity you chose to build on it. The things that are genuinely yours alone are listed, exhaustively, in [What's Private](/docs/whats-private).
