---
title: "The App — The Shell"
description: "PriceOS's persistent layer: the Tape ticker, the navbar, the footer's live readouts and easter eggs, the installable PWA, and the colorway system."
category: "app"
keywords: ["shell", "tape", "pwa", "footer", "colorways"]
last_updated: "2026-07-20"
---

# The App — The Shell

The shell is everything that persists while pages change underneath it. PriceOS navigates like a native app — the chrome, the painted background, and the live layers stay put; only the page content swaps.

<svg viewBox="0 0 720 330" role="img" aria-labelledby="shell-anatomy-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="shell-anatomy-title">The shell, annotated: the navbar with search, your sprite and the connect surface; the Tape ticker; the page content that swaps beneath the persistent chrome; and the three-row footer with the system readouts, the easter-egg row, and the links row.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="10" width="700" height="310" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<rect x="24" y="24" width="672" height="42" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="44" y="50" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<text x="66" y="50" fill="currentColor" text-anchor="start" font-size="13">PD ‰</text>
<rect x="300" y="32" width="180" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="50" fill="currentColor" text-anchor="middle">⌕&#xFE0E; search</text>
<rect x="560" y="32" width="60" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="590" y="50" fill="currentColor" text-anchor="middle">[·_·]</text>
<rect x="628" y="32" width="68" height="26" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="662" y="50" fill="currentColor" text-anchor="middle" font-size="11">MENU</text>
<rect x="24" y="74" width="672" height="30" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="44" y="94" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<text x="66" y="94" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">✦&#xFE0E; @a collected kiki #22 ◆ ✹&#xFE0E; @b listed … ◆ ✶&#xFE0E; @c offered …</text>
<rect x="24" y="112" width="672" height="120" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="44" y="136" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<text x="360" y="176" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">the page — the only part that swaps</text>
<rect x="24" y="240" width="672" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="44" y="262" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<text x="66" y="262" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">v22 · connected · 4 gwei · block 23…</text>
<text x="66" y="282" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">❡&#xFE0E; dispatch · ⌬&#xFE0E; mood ring · ☉&#xFE0E;☽&#xFE0E;↑ today's stars</text>
<text x="66" y="300" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">About · Discord · Docs · Support · Studio</text>
</g>
</svg>

- **①&#xFE0E; The navbar** — search, your PriceSprite, and the connect surface. It fades with scroll and returns on demand.
- **②&#xFE0E; The Tape** — the live ticker: ✦ collected · ✹ listed · ✶ offer · ✸ transfer, each with its actor's @name.
- **③&#xFE0E; The page** — the only thing that swaps as you navigate; the chrome and painted background stay put.
- **④&#xFE0E; The footer** — the system row (tap the version for the changelog), the easter-egg row (❡ [Dispatch](/docs/dispatch) · ⌬ Mood Ring · Today's Stars), and the links row.

## The Tape

The persistent live ticker running through the app chrome: mints, sales, listings, offers, and transfers as they happen, each wearing its canonical glyph (✦ collected, ✹ listed, ✶ offer, ✸ transfer) and its actor's @name. The Tape is the platform's pulse — the discussion, scrolling by.

## The navbar

Navigation, global search, your PriceSprite, and the connect surface. It fades with scroll and returns on demand, and a Back Button Mode replaces it with a single persistent back arrow for collectors who navigate that way.

## The footer

Deliberately under-used real estate, currently three rows:

- **System row** — the PriceOS version (tap for the changelog), connection status, live gas in gwei, and the current Ethereum block number.
- **Easter-egg row** — [the Dispatch](/docs/dispatch) (❡), the **Mood Ring** (⌬), today's platform-wide generative color, and **Today's Stars** (☉ ☽ ↑), the natal sky over Montreal at today's UTC midnight; every Output minted today is born under it.
- **Links row** — About, Discord, these Docs, Support, Studio.

## The installable app

PriceOS is a PWA: installable to the home screen on iOS and Android, with an offline fallback served by a hand-written network-first service worker, pull-to-refresh in standalone mode, a dynamic favicon that repaints with the live colorway, and native push notifications for [Pings](/docs/pings/overview) on devices that allow it.

## Colorways

The whole app is painted through one variable system. Defaults are per-page — home wears the daily Mood Ring, Projects wear their artist's color, profiles wear their owner's — and an explicit pick in [settings](/docs/app/settings-and-display) (Light, Dark, Orange, Blueberry, Cherry, Hash Synesthesia, Haze, or a fully custom color) wins everywhere, painted before first frame so there is never a flash. These docs default to Dark and carry the same picker.

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
