---
title: "PD Studio — Overview"
description: "The artist's side of Price Discussion: one mobile-first app to upload work, test it exhaustively, publish it on-chain, and then manage and measure it — PD Studio at studio.pricediscussion.com."
category: "studio"
keywords: ["studio", "artists", "upload", "testing", "dashboard", "mobile"]
last_updated: "2026-07-17"
---

# PD Studio — Overview

PD Studio is the artist's side of Price Discussion — one app, at
**studio.pricediscussion.com**, where a Project spends its whole life before
and after the chain: uploaded as a draft, tested as many times as it takes,
published from your own wallet, then managed and measured for as long as it
trades.

If PriceOS is the platform's collecting surface, PD Studio is its making
surface. It is the same app underneath — the same shell, the same menus, the
same colorways, the same feel — pointed at your work instead of everyone
else's.

**How:** Open studio.pricediscussion.com and sign in with your artist wallet.

## Built for a phone, completely

PD Studio is mobile-first the way the rest of PD is mobile-first: not a
desktop tool with a responsive mode, but an app designed so an artist can run
an entire practice — upload, test, publish, manage — from a phone and never
touch a desktop. Deployment already works this way on PD (artists sign
`createProject` from a mobile wallet); the Studio brings everything on either
side of that signature to the same screen.

## The life of a Project

<svg viewBox="0 0 720 150" role="img" aria-labelledby="studio-life-title" style="width:100%;height:auto;display:block;margin:0 0 14px">
<title id="studio-life-title">A Project's life through the Studio: private draft, unlimited test runs, one deploy signature from the artist's own wallet, then the immutable contract managed and measured from the dashboard.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="28" width="140" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="80" y="50" fill="currentColor" text-anchor="middle">DRAFT</text>
<text x="80" y="68" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">private · off-chain</text>
<path d="M150 53 H 176" stroke="currentColor" stroke-width="1.5"/>
<path d="M176 48 L 188 53 L 176 58 Z" fill="currentColor"/>
<rect x="190" y="28" width="150" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="265" y="50" fill="currentColor" text-anchor="middle">TEST RUNS</text>
<text x="265" y="68" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">unlimited · real hashes</text>
<path d="M340 53 H 366" stroke="currentColor" stroke-width="1.5"/>
<path d="M366 48 L 378 53 L 366 58 Z" fill="currentColor"/>
<path d="M300 78 C 260 118, 180 118, 130 82" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>
<path d="M136 74 L 124 78 L 132 88 Z" fill="currentColor"/>
<text x="216" y="128" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">revise, as many times as it takes</text>
<rect x="380" y="28" width="160" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="460" y="50" fill="currentColor" text-anchor="middle">PUBLISH</text>
<text x="460" y="68" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">one signature · yours</text>
<path d="M540 53 H 566" stroke="currentColor" stroke-width="1.5"/>
<path d="M566 48 L 578 53 L 566 58 Z" fill="currentColor"/>
<rect x="580" y="28" width="130" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="645" y="50" fill="currentColor" text-anchor="middle">DASHBOARD</text>
<text x="645" y="68" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">immutable · alive</text>
</g>
</svg>

## The two sides

Everything in the Studio is one of two activities:

- **[Upload & Testing](/docs/studio/upload-and-testing)** — bring your
  generative script in, and put it through exactly the pipeline the chain
  will: simulated token hashes, the real rendering envelope, previews of what
  collectors will actually see. Run tests until you trust the whole
  parameter space, then publish.
- **[The Artist Dashboard](/docs/studio/the-artist-dashboard)** — every
  Project you have deployed, alive in one place: mint progression, holders,
  secondary activity, royalties, and the off-chain surround that stays yours
  to manage after the contract is frozen.

## The same menus, working for you

The Studio runs on PriceOS's own navigation. The connect surface — the menu
that opens from your identity in the app — becomes the artist dashboard: your
Projects live in the accordion where a collector's notes live, and pings
become **artist pings**, firing on the events that matter to you (mints,
listings, offers, and sales of your work).

## Who can use it

Anyone can walk into the Studio — wallet or not — and draft, upload a
script, and run unlimited test mints; drafts stay private on the device that
made them. Connect a wallet when it's time to publish.
**Publishing** is gated the same way deployment has always been gated on PD:
by [the submission filter and the on-chain artist whitelist](/docs/for-artists/submit-a-project).
The Studio doesn't change the thesis; it gives accepted artists a
far better road from acceptance to deployment, and gives everyone a serious
place to develop work worth submitting.

## Further reading

- [Upload & Testing](/docs/studio/upload-and-testing)
- [Publishing](/docs/studio/publishing)
- [The Artist Dashboard](/docs/studio/the-artist-dashboard)
- [For Artists — How PD Works](/docs/for-artists/how-pd-works)
