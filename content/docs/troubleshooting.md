---
title: "When Something Looks Wrong"
description: "The predictable panics and their calm answers: wallet refusals, sealed pieces, missing pushes, vanished listings, quiet achievements, empty rails, and the other moments PD is working exactly as designed."
category: "reference"
keywords: ["troubleshooting", "help", "faq", "wallet refused", "sealed", "push notifications", "listing expired", "not working", "problem", "stuck"]
last_updated: "2026-08-05"
---

# When Something Looks Wrong

Most "is this broken?" moments on PD are the platform working exactly as designed — usually protecting you. This page is the list of them, each with what's actually happening and where to read more. If your situation genuinely isn't here, **support@pricediscussion.com** reaches a person.

## My wallet says the mint will fail

The mint takes **exact payment only** — mint price × quantity plus the flat storage fee per Output, no overpayment accepted. A wallet predicting failure almost always means the state moved under you: the Project **sold out** while you were confirming, or the drop is inside its **[entry window](/docs/fair-draw/how-a-drop-settles)** (the opening minute, when the contract itself accepts no mints and the mint button is collecting orders instead). Reopen the Project page and read the button — it always tells the truth about the current state.

## I won a drop but my piece won't trade

Pieces minted in a **contested** drop arrive **sealed** for the adjudication window — seconds for most drops, never more than fifteen minutes — while bot entries are voided and their seats passed to real collectors. Then the whole edition unseals together. Nothing is wrong; you already own it. See [How a Drop Settles](/docs/fair-draw/how-a-drop-settles).

## The drop ended and my money never moved

That's a losing entry working correctly: your tap signed an order, the order didn't win, and it was **torn up unexecuted** — no payment, no refund needed, nothing to claim. Only winners' orders ever move money. See [Fair Draw](/docs/fair-draw/overview).

## Push notifications aren't reaching my phone

On iPhone, lock-screen pings need three things, once: PD **installed to your Home Screen** (Safari → share sheet → Add to Home Screen), the ⇡ pill in MY PINGS cycled to **3D** or **COMBO**, and the iOS permission allowed when asked. If pushes used to arrive and stopped, check **Silent Mode ⏾** (its third state, Quiet Hours, sleeps native push overnight on your own schedule). And ambient pings are **budgeted by design** — a few an hour at most; money aimed at you always gets through. Walk-through: [Pings — Controls](/docs/pings/controls).

## My listing (or offer) disappeared

Listings and offers carry a **duration** and leave the book on their own when it passes — nothing is cancelled by anyone. Re-list any time. The one order that never expires early is a [Takeover](/docs/takeover): non-cancellable for its full 72 hours, by design.

## Someone says they made me an offer — no ping came

Check the **Offer Shield ⍲** in your [Spell Book](/docs/app/spell-book): with it cast, offers under **half the collection floor** are silently kept out of your Pings. The offer still exists in the book; the shield just didn't ring the bell for it. Also check the OFFERS category pill in [MY PINGS](/docs/pings/controls) — a pill turned off silences its family everywhere.

## I unlocked achievements and nothing popped

By design. Achievements never toast and never push — they gather quietly into one rolled row in your Pings inbox ("n new achievements") and take their cells on your profile grid. The quiet is the feature. See [Achievements](/docs/app/achievements).

## An artist page shows an empty project

A Project with zero mints is still a live mint door — it shows on its artist's page as an empty rail **until someone mints the first piece**. That first mint is also when the Project rises onto [the map](/docs/cartography) and its [Gnome](/docs/gnomes/overview)'s hill can wake.

## I bought a sticker sheet and my profile didn't change

Your **first** sheet turns itself on; **every later sheet arrives off**, so a new buy never barges into an arrangement you've composed. Flip the new sheet on in the [Sticker Manager](/docs/stickers/the-binder-and-your-profile) (tap your own stickers). And if your whole sticker layer is hidden, the **Sticker Mode ⊞** pill in MY PD is the switch.

## I bought a Keychain secondhand and it arrived on a bare cord

Working as designed: a charm's chain and finish belong to its keeper's life, not to the token — **shine resets on every transfer** and the new keeper earns it back. The character, palette, material, and christened name survive forever. See [The Living Charm](/docs/keychains/the-living-charm).

## My price target says SEALED

All calls stay sealed while the monthly window runs — even to you, everyone else sees only the count. When the month turns, the crowd reveals as an anonymous histogram against where the floor really landed. See [Projects & Minting](/docs/app/projects-and-minting).

## I sold a piece but my name is still on it

Permanently, yes — the [Marginalia](/docs/factions) records every hand that ever held a piece. They can sell, but they can't unsign you. That's the platform's memory working, not a stale cache.

## A number here disagrees with the chain

The chain wins, always. Everything tokenized is reproducible from Ethereum directly — [Building on PD](/docs/building-on-pd) shows the raw reads, and `PDFactory.isProject(address)` settles any authenticity question in one call.
