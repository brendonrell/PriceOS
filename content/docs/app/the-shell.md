---
title: "The App — The Shell"
description: "PriceOS's persistent layer: the Tape ticker, the navbar, the footer's live readouts and easter eggs, the installable PWA, and the colorway system."
category: "app"
keywords: ["shell", "tape", "pwa", "footer", "colorways"]
last_updated: "2026-07-20"
---

# The App — The Shell

The shell is everything that persists while pages change underneath it. PriceOS navigates like a native app — the chrome, the painted background, and the live layers stay put; only the page content swaps.

## The Tape

The persistent live ticker running through the app chrome: mints, sales, listings, offers, and transfers as they happen, each wearing its canonical glyph (✦ collected, ✹ listed, ✶ offer, ✸ transfer) and its actor's @name. The Tape is the platform's pulse — the discussion, scrolling by.

## The navbar

Navigation, global search, your PriceSprite, and the connect surface. It fades with scroll and returns on demand, and a Back Button Mode replaces it with a single persistent back arrow for collectors who navigate that way.

## The footer

Deliberately under-used real estate, currently three rows:

- **System row** — the PriceOS version (tap for the changelog), connection status, live gas in gwei, and the current Ethereum block number.
- **Easter-egg row** — [the Dispatch](/docs/dispatch) (❡), the **Mood Ring** (⌬), today's platform-wide generative colour, and **Today's Stars** (☉ ☽ ↑), the natal sky over Montreal at today's UTC midnight; every Output minted today is born under it.
- **Links row** — About, Discord, these Docs, Support, Studio.

## The installable app

PriceOS is a PWA: installable to the home screen on iOS and Android, with an offline fallback served by a hand-written network-first service worker, pull-to-refresh in standalone mode, a dynamic favicon that repaints with the live colorway, and native push notifications for [Pings](/docs/pings/overview) on devices that allow it.

## Colorways

The whole app is painted through one variable system. Defaults are per-page — home wears the daily Mood Ring, Projects wear their artist's colour, profiles wear their owner's — and an explicit pick in [settings](/docs/app/settings-and-display) (Light, Dark, Orange, Blueberry, Cherry, Hash Synesthesia, Haze, or a fully custom colour) wins everywhere, painted before first frame so there is never a flash. These docs default to Dark and carry the same picker.

## The Command Stone ⌘

**How:** Triple-tap the background of any page.

Triple-tap the background of any page and PD's command line rises — find
anything, ask the ledger a question, etch a to-do, cast a spell by name, or
summon a widget. It has [its own page](/docs/command-stone).

## Ambient Strip

An optional dimming layer for late-night browsing that pulls the whole interface down to ember levels without changing its layout.

## Further reading

- [Settings & Display](/docs/app/settings-and-display)
- [Pings](/docs/pings/overview)
- [Discovery](/docs/app/discovery)
