---
title: "Fair Draw — Overview"
description: "When more collectors want a drop than there are pieces, PD settles it with a human-speed race and a provably fair draw — no gas wars, no auctions, no allowlists, one tap."
category: "fair-draw"
keywords: ["fair draw", "contested mint", "drop", "mint window", "sniping", "bots", "the draw", "fair mint", "gas war"]
last_updated: "2026-07-25"
---

# Fair Draw — Overview

Some drops will have more real collectors than pieces. On most platforms that moment is where everything breaks: bots win the block race, gas fees explode, and the humans who showed up for the art walk away with nothing. Whole platforms have died on it.

Price Discussion settles contested drops differently, on one idea:

> **Time is the only thing nobody can fake, buy, or multiply.** A simultaneous drop at *machine* speed is a bot's game. The same drop at *human* speed — where everyone who shows up in the opening seconds counts the same — is a game only humans can enter.

## What you actually do

Nothing new. You fly to the mint button like always:

1. **Tap MINT and confirm once in your wallet.** That is your entire job — one tap, ever. There is no queue page, no raffle form, no come-back-later, no second step.
2. **Everyone who taps in the opening seconds counts as simultaneous.** Nobody is "first." Being 40 milliseconds faster — the only thing a sniping script is good at — buys nothing.
3. **If the drop isn't oversubscribed, you just mint.** Instantly, exactly like any other mint. Most drops never look any different.
4. **If more collectors tapped than pieces exist, the drop flips CONTESTED — live, in front of the room** — and a fair draw settles it within moments. Win, and your piece is already yours: paid and delivered from that one tap, no action needed. Miss, and your money never moved — there is nothing to refund, nothing to unwind.

<svg viewBox="0 0 720 300" role="img" aria-labelledby="fd-two-endings-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="fd-two-endings-title">One tap, two endings: every mint press lands in the opening window together; a quiet close mints instantly, a contested close is settled by the draw in seconds.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="280" y="14" width="160" height="40" rx="4" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="360" y="39" fill="currentColor" text-anchor="middle">MINT</text>
<text x="255" y="39" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<line x1="360" y1="54" x2="360" y2="86" stroke="currentColor" stroke-width="1.5"/>
<rect x="60" y="88" width="600" height="44" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="360" y="115" fill="currentColor" text-anchor="middle">THE WINDOW — the opening minute · every tap simultaneous</text>
<text x="38" y="115" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<line x1="190" y1="132" x2="190" y2="184" stroke="currentColor" stroke-width="1.5"/>
<line x1="530" y1="132" x2="530" y2="184" stroke="currentColor" stroke-width="1.5"/>
<rect x="40" y="186" width="300" height="90" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="213" fill="currentColor" text-anchor="middle">QUIET</text>
<text x="190" y="236" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">supply covers everyone</text>
<text x="190" y="256" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">orders execute instantly</text>
<text x="18" y="213" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<rect x="380" y="186" width="300" height="90" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="213" fill="currentColor" text-anchor="middle">CONTESTED</text>
<text x="530" y="236" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">more taps than pieces</text>
<text x="530" y="256" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">draw in seconds → brief seal → reveal</text>
<text x="702" y="213" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
</g>
</svg>

- **①&#xFE0E; One tap, confirmed once** — your entire job, contested or not.
- **②&#xFE0E; The window** — everyone in the opening moment counts the same; being milliseconds faster buys nothing.
- **③&#xFE0E; Quiet** — most drops: instant, indistinguishable from any mint you've ever done.
- **④&#xFE0E; Contested** — the draw settles it in seconds; lose and your money never moved.

## What PD never does

- **No auctions.** No bidding mechanics, nothing that turns a surprise drop into a spreadsheet exercise.
- **No allowlists.** Every drop opens to everyone, the same way, at the same moment.
- **No gas wars.** There is no on-chain race to win, so there is nothing to outbid. Losing a contested draw costs you nothing at all.
- **No escrow.** PD never holds your money. Payment happens only in the same instant a piece becomes yours — the contract cannot hold a balance, by design.

## The two promises

**The draw cannot be rigged — including by us.** Every contested draw runs against a commitment fingerprinted on Ethereum before settlement, and the full draw record is published. Anyone can verify that the result matches the commitment. See [How a Drop Settles](/docs/fair-draw/how-a-drop-settles).

**A drop cannot be stranded — including by us.** If PD's own settlement service died mid-drop, minting opens by itself at a hard deadline written immutably into the project's contract at deploy. Nothing off-platform — and nothing at PD — can ever permanently stop a mint.

## Who wins when real collectors outnumber pieces

When a drop is contested among genuine collectors, priority is a stated, public policy — read [Fair Play](/docs/fair-draw/fair-play) for exactly how it works and why it can afford to be transparent.
