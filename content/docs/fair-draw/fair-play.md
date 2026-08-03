---
title: "Fair Draw — Fair Play"
description: "Who has priority when a drop is contested — the public ladder of collecting on PD — and what happens to bots, wallet armies, and their infrastructure."
category: "fair-draw"
keywords: ["priority", "collector standing", "bots", "sybil", "wallet army", "fair play", "the sweep", "voided"]
last_updated: "2026-07-25"
---

# Fair Play

Two different problems hide inside a contested drop, and PD treats them very differently.

**Real collectors competing for scarce pieces** is healthy — it's what a good drop looks like. It gets a transparent, published priority policy and an equal-odds draw.

**Bots and wallet armies impersonating collectors** is the disease that has killed platforms. It gets no policy document — it gets removed.

## The public ladder

When a contested draw runs, entries are prioritized in bands, and the policy is stated plainly:

- **Your collection on PD comes first.** Pieces you have collected *and hold* — sold pieces stop counting when they leave your wallet.
- **What you've spent on PD over its lifetime.** Real support of real artists, under your permanent @name.
- **Tenure and a lived-in wallet.** Time on PD, and a wallet with genuine on-chain history, add weight. A named wallet helps a little.

Within a band, the draw is a pure coin flip — equal odds, no further weighting. Newcomers aren't shut out: every drop that doesn't go contested (most of them) is identical for everyone, and every piece you collect raises your standing for the next contested one, permanently.

This ladder can afford to be public because gaming it is indistinguishable from being a real collector. The only way to climb is to buy and hold art — which pays artists, which is the platform working exactly as intended. The band boundaries themselves aren't published; the policy is.

<svg viewBox="0 0 720 322" role="img" aria-labelledby="fd-bands-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="fd-bands-title">The public ladder: held collection, lifetime spend and tenure set your standing before the drop; standing sorts entrants into bands; the whole of Band 0 draws before Band 1; inside a band every entrant has exactly equal odds.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="14" width="300" height="188" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="42" fill="currentColor" text-anchor="middle">YOUR STANDING</text>
<text x="160" y="62" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">set before the drop — never in it</text>
<text x="38" y="100" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<text x="56" y="100" fill="currentColor" text-anchor="start">held PD collection</text>
<text x="38" y="136" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<text x="56" y="136" fill="currentColor" text-anchor="start">lifetime spent ◊</text>
<text x="38" y="172" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<text x="56" y="172" fill="currentColor" text-anchor="start">tenure · wallet age</text>
<text x="355" y="112" fill="currentColor" text-anchor="middle" font-size="20">→</text>
<rect x="400" y="14" width="310" height="230" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="555" y="40" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">the draw fills seats top-down</text>
<rect x="416" y="52" width="278" height="42" fill="var(--stat-bg)" stroke="currentColor" stroke-width="2.5"/>
<text x="555" y="78" fill="currentColor" text-anchor="middle">BAND 0 — draws first</text>
<rect x="416" y="104" width="278" height="42" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="555" y="130" fill="currentColor" text-anchor="middle">BAND 1 — then, whole</text>
<rect x="416" y="156" width="278" height="42" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="555" y="182" fill="currentColor" text-anchor="middle">BAND 2 — then…</text>
<text x="555" y="226" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">the cuts between bands: not published</text>
<text x="416" y="40" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<rect x="10" y="262" width="700" height="46" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="360" y="290" fill="currentColor" text-anchor="middle">inside a band: a pure coin flip — exactly equal odds</text>
<text x="30" y="290" fill="currentColor" text-anchor="middle" font-size="15">⑤&#xFE0E;</text>
</g>
</svg>

- **①&#xFE0E; Held collection** — pieces you collected *and still hold*; the first rung, and sold pieces stop counting.
- **②&#xFE0E; Lifetime spent** — real support of real artists, under your permanent @name.
- **③&#xFE0E; Tenure** — time on PD and a lived-in wallet add weight.
- **④&#xFE0E; Bands, in order** — every entrant in Band 0 is drawn before anyone in Band 1, whole band before the next.
- **⑤&#xFE0E; Equal odds inside a band** — no further weighting of any kind: no streaks, no activity scores, nothing hidden. The transcript proves it.

## What happens to bots

The detection side is deliberately undocumented — describing the tripwires is a gift to the people they catch. What is policy, and permanent:

- **Void, silently.** Entries identified as scripted, or as one operator wearing many wallets, are simply dead. They can press the button; the button doesn't care.
- **Seats go back to humans.** Voided seats are re-drawn to real collectors during the sealed window, before the reveal — a bot network that "wins" seats holds them for minutes at most, and never gets to sell them.
- **Infrastructure burns.** PD's memory is permanent, and so are @names. Wallets, funding trails, and hardware tied to a voided network stay tainted forever. Every attempt costs the operator the expensive part of their setup — the aged wallets and clean identities that took months or money to build — and buys them nothing.

## Why the race stays fun

Every anti-bot system before this one worked by slowing the drop down — raffles held open for hours, auctions that stretch the moment into a day. That killed the thing collectors actually love, and it didn't even work: given hours, one person can calmly enter fifty wallets one after another.

PD's defense runs the other way. The drop stays a *moment* — everyone present, everyone tapping at once — because the compressed moment is itself the defense: one human has one body and one opening window. The sprint to the button isn't something PD protects *despite* the bots. It's how PD beats them.
