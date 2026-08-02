---
title: "The Rewind ◄"
description: "The whole-OS time scrubber: triple-tap the Price Discussion name and browse PD exactly as it stood on any past PriceDay — read-only, day by day, with the way back always one tap away."
category: "app"
keywords: ["rewind", "time", "history", "priceday", "scrubber", "triple tap"]
last_updated: "2026-07-25"
---

# The Rewind ◄

Every platform shows you now. PD can also show you *then* — the entire app, docked at any day of its own history, reconstructed from the permanent ledger.

**How:** Triple-tap the "Price Discussion" name on the home page.

<svg viewBox="0 0 720 160" role="img" aria-labelledby="rewind-anatomy-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="rewind-anatomy-title">The Rewind banner, annotated: the PriceDay number and date (tap the date for the picker), the scrubber running Day 1 to today with step controls, and the X that returns you to now.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="10" width="700" height="140" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="34" y="48" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<text x="56" y="48" fill="currentColor" text-anchor="start" font-size="13">PRICEDAY 148 · JUL 12 2026</text>
<text x="34" y="100" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<text x="56" y="100" fill="currentColor" text-anchor="start" font-size="15">‹</text>
<path d="M90 95 H 620" stroke="currentColor" stroke-width="2" fill="none"/>
<circle cx="480" cy="95" r="7" fill="currentColor"/>
<text x="648" y="100" fill="currentColor" text-anchor="start" font-size="15">›</text>
<text x="34" y="138" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<text x="56" y="138" fill="currentColor" text-anchor="start" font-size="12" font-weight="normal">drag the dot, or step day by day</text>
<text x="660" y="48" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<text x="684" y="48" fill="currentColor" text-anchor="start" font-size="14">✕&#xFE0E;</text>
</g>
</svg>

- **①&#xFE0E; The day** — tap the date and the PriceDay picker opens; days outside Day 1 → today are greyed.
- **②&#xFE0E;③&#xFE0E; The scrubber** — the whole platform docks at whatever day the dot lands on.
- **④&#xFE0E; ✕** — back to now.

## Opening it

**Triple-tap the "Price Discussion" name on the home page.** PD docks at yesterday and a full-strength banner frames the app: the PriceDay number, the date, a scrubber, and the **✕** that returns you to now. (The name's sibling gesture, the long-press, opens [Cartography](/docs/cartography) — hold for space, tap thrice for time.)

## The scrubber

The banner's slider runs the whole PriceDay spine — from Day 1 to today. Drag it, or step day by day with the ‹ › controls.

**Tap the date** and the platform's own date picker opens on the PriceDay spine — travel straight to a day instead of dragging to it. Every date outside Day 1 → today is greyed out in the wheel, because there is no record there to show. Days are counted on the platform's own calendar (PriceDays flip at midnight Montreal, the same clock as the Mood Ring).

## What rewinds

- **The home surface** — platform stats, Now Minting, and New Gen Art exactly as they stood at the end of that day, plus the day's own log: mints, sales, uploads, volume, and the day's top sale.
- **Project pages** — mint count, holders, volume, and ATH as of that day, with the gallery capped to the pieces that existed by then. A project that hadn't been uploaded yet says so: *not yet born*.

Landing on Day 1 and seeing the platform as a newborn is the point.

## The rules of time travel

- **Read-only, always.** Nothing commercial exists in the past — no minting, buying, listing, or offering from a rewound page. The past is for looking.
- **As-of or nothing.** A rewound surface never mixes past and live numbers.
- **The art is timeless.** Pieces render normally; it's the *provenance* that rewinds.

Exit any time with the **✕** in the banner — a reload also always comes back to the present.
