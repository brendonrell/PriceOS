---
title: "Fair Draw — How a Drop Settles"
description: "The entry window, the CONTESTED flip, the draw, the sealed reveal, and the fail-open guarantee — the full life of an oversubscribed drop."
category: "fair-draw"
keywords: ["entry window", "contested", "the draw", "sealed", "reveal", "settlement", "mint order", "fail-open"]
last_updated: "2026-07-25"
---

# How a Drop Settles

Every drop launches identically: one mint button, no labels, no special modes. Whether a drop turns contested is not decided in advance by anyone — it is discovered, live, by how many people tap.

<svg viewBox="0 0 720 380" role="img" aria-labelledby="fd-lifecycle-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="fd-lifecycle-title">The full life of a drop: window, close, then either the quiet instant mint or the contested path — snapshot, draw, settlement, brief seal, reveal — with the fail-open deadline guarding the whole thing.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="16" width="215" height="56" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="117" y="40" fill="currentColor" text-anchor="middle">WINDOW</text>
<text x="117" y="60" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">the opening minute</text>
<text x="24" y="34" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<line x1="225" y1="44" x2="252" y2="44" stroke="currentColor" stroke-width="1.5"/>
<rect x="252" y="16" width="215" height="56" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="359" y="40" fill="currentColor" text-anchor="middle">CLOSE</text>
<text x="359" y="60" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">count taps vs supply</text>
<text x="266" y="34" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<line x1="467" y1="44" x2="494" y2="44" stroke="currentColor" stroke-width="1.5"/>
<rect x="494" y="16" width="216" height="56" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="602" y="40" fill="currentColor" text-anchor="middle">QUIET → mint now</text>
<text x="602" y="60" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">most drops end here</text>
<text x="508" y="34" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
<line x1="359" y1="72" x2="359" y2="112" stroke="currentColor" stroke-width="1.5"/>
<rect x="10" y="112" width="458" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="239" y="133" fill="currentColor" text-anchor="middle">CONTESTED</text>
<text x="239" y="152" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">standing snapshotted from before the drop</text>
<text x="24" y="133" fill="currentColor" text-anchor="middle" font-size="15">④&#xFE0E;</text>
<line x1="239" y1="162" x2="239" y2="182" stroke="currentColor" stroke-width="1.5"/>
<rect x="10" y="182" width="458" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="239" y="203" fill="currentColor" text-anchor="middle">THE DRAW — seconds</text>
<text x="239" y="222" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">committed on Ethereum · transcript public</text>
<text x="24" y="203" fill="currentColor" text-anchor="middle" font-size="15">⑤&#xFE0E;</text>
<line x1="239" y1="232" x2="239" y2="252" stroke="currentColor" stroke-width="1.5"/>
<rect x="10" y="252" width="458" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="239" y="273" fill="currentColor" text-anchor="middle">winners execute · losers torn up</text>
<text x="239" y="292" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">paid + delivered from the one tap · unexecuted money never moved</text>
<text x="24" y="273" fill="currentColor" text-anchor="middle" font-size="15">⑥&#xFE0E;</text>
<line x1="239" y1="302" x2="239" y2="322" stroke="currentColor" stroke-width="1.5"/>
<rect x="10" y="322" width="458" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="239" y="343" fill="currentColor" text-anchor="middle">SEALED — minutes → REVEAL</text>
<text x="239" y="362" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">bots voided · seats pass down the drawn order</text>
<text x="24" y="343" fill="currentColor" text-anchor="middle" font-size="15">⑦&#xFE0E;</text>
<rect x="494" y="112" width="216" height="260" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="602" y="140" fill="currentColor" text-anchor="middle">FAIL-OPEN</text>
<text x="602" y="168" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">a hard deadline in the</text>
<text x="602" y="186" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">contract itself (≤4h):</text>
<text x="602" y="212" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">if settlement hasn't</text>
<text x="602" y="230" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">finished — for any</text>
<text x="602" y="248" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">reason, including PD</text>
<text x="602" y="266" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">vanishing — minting</text>
<text x="602" y="284" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">opens by itself</text>
<text x="508" y="140" fill="currentColor" text-anchor="middle" font-size="15">⑧&#xFE0E;</text>
</g>
</svg>

- **①&#xFE0E; The window** — every press in the opening minute counts as simultaneous; the contract accepts no mints during it, so a script has nothing to race.
- **②&#xFE0E; The close** — one question: did more people tap than pieces exist?
- **③&#xFE0E; Quiet** — enough for everyone: every order executes immediately. Most drops end here.
- **④&#xFE0E; The snapshot** — you enter as whoever you already were; nothing in the moment can be gamed.
- **⑤&#xFE0E; The draw** — one provably fair shuffle, over in seconds; its commitment is fingerprinted on Ethereum and the full transcript is published.
- **⑥&#xFE0E; Settlement** — winners are paid-and-delivered from the tap they already made; losing orders die unexecuted.
- **⑦&#xFE0E; The seal** — minutes, never more than fifteen even for the most contested drop; bots are voided and their seats pass down the drawn order before everyone reveals together.
- **⑧&#xFE0E; Fail-open** — the guarantee that doesn't depend on PD being alive.

## The entry window

A drop opens with a short **entry window** — the opening seconds during which every mint press counts as simultaneous. Your tap signs a complete **mint order**: your piece, your payment, authorized once in your wallet. The order does not execute yet, and your money stays exactly where it is — PD holds a signed instruction, never funds.

During the window the contract itself accepts no mints at all. That closes the back door: a script going around the app to mint straight on-chain finds nothing to race.

## The quiet ending

If the window closes with enough supply for everyone who tapped, every order executes immediately and the drop continues as a normal open mint. Nothing about it ever looks contested — no draw, no wait, no difference from any mint you've ever done. This is most drops.

## The CONTESTED flip

If more orders arrived than pieces exist, the room flips **CONTESTED** in front of everyone watching, and settlement runs:

1. **Standing is snapshotted from before the drop.** Drops are surprises, so you enter as whoever you already were — there is nothing to game in the moment. See [Fair Play](/docs/fair-draw/fair-play).
2. **The draw runs.** Provably fair: the draw's commitment is fingerprinted on Ethereum at settlement, and the full transcript is published for anyone to check. Within a priority band, every entrant has exactly equal odds.
3. **Winners' orders execute — automatically.** The piece and the payment move in the same breath, straight from the tap you already made. Winners do nothing. If an order can't execute (the wallet spent its balance in the meantime), the seat passes to the next drawn name until every piece is placed — a seat can never be wasted.
4. **Losing orders are torn up unexecuted.** Your money never moved, so there is nothing to claim back and nothing to wait for.
5. **Leftover supply, if any, opens to everyone** once settlement finishes, first-come like any open mint.

The drawn order is the whole settlement — there is never a second draw:

<svg viewBox="0 0 720 168" role="img" aria-labelledby="fd-cascade-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="fd-cascade-title">One drawn order settles everything: the head wins up to supply, everyone after waits in drawn order, and a failed seat passes to the next name automatically.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<text x="178" y="32" fill="currentColor" text-anchor="middle" font-size="12">WINNERS — the head</text>
<text x="26" y="32" fill="currentColor" text-anchor="middle" font-size="15">①&#xFE0E;</text>
<text x="534" y="32" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">THE LINE — already in drawn order</text>
<rect x="10" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="2"/>
<text x="48" y="69" fill="currentColor" text-anchor="middle">#1</text>
<rect x="94" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="2"/>
<text x="132" y="69" fill="currentColor" text-anchor="middle">#2</text>
<rect x="178" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="2"/>
<text x="216" y="69" fill="currentColor" text-anchor="middle">#3 ✕&#xFE0E;</text>
<rect x="262" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="2"/>
<text x="300" y="69" fill="currentColor" text-anchor="middle">#4</text>
<line x1="350" y1="36" x2="350" y2="94" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"/>
<text x="350" y="110" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">supply ends</text>
<text x="350" y="20" fill="currentColor" text-anchor="middle" font-size="15">②&#xFE0E;</text>
<rect x="362" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="69" fill="currentColor" text-anchor="middle" font-weight="normal">#5</text>
<rect x="446" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="484" y="69" fill="currentColor" text-anchor="middle" font-weight="normal">#6</text>
<rect x="530" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="568" y="69" fill="currentColor" text-anchor="middle" font-weight="normal">#7</text>
<rect x="614" y="44" width="76" height="40" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="652" y="69" fill="currentColor" text-anchor="middle" font-weight="normal">#8</text>
<polyline points="216,84 216,126 400,126 400,84" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="308" y="146" fill="currentColor" text-anchor="middle" font-size="12" font-weight="normal">#3's order fails → its seat passes to #5 · same order, no re-draw</text>
<text x="216" y="146" fill="currentColor" text-anchor="middle" font-size="15">③&#xFE0E;</text>
</g>
</svg>

- **①&#xFE0E; The head wins** — the first drawn names, up to supply, take the seats.
- **②&#xFE0E; The line is already drawn** — everyone past supply sits in the same drawn order; there is no second draw and no discretion, ever.
- **③&#xFE0E; A seat can't be wasted** — a failed or voided order's seat passes to the next drawn name automatically.

## Sealed until the reveal

Pieces minted in a contested settlement arrive **sealed**: held in your wallet but untradeable for minutes — seconds for most contested drops, never more than fifteen minutes even for the most fiercely contested — and the exact seal is set per drop at close and can never be extended by anyone once set.

The seal is the drop's adjudication window. During it, entries that turn out to belong to bot networks are voided and their seats re-drawn to real collectors — **before** the reveal, so the edition that unveils is already clean. Then every piece unseals together, and the reveal is the party it deserves to be.

## The fail-open guarantee

The entry window is choreographed by PD's settlement service — but the guarantee does not depend on it. Every windowed drop carries a hard deadline, written immutably into its contract at deploy (at most four hours out): if settlement has not concluded by then, for any reason including PD itself vanishing, **minting opens automatically** as a normal first-come mint.

The settlement service's authority is deliberately tiny. It can choreograph a drop's opening minutes — nothing else. It cannot touch money (winners pay the same price through the same instant artist split as any minter), cannot change supply or price, cannot reach existing pieces, cannot act past the deadline, and cannot extend a seal. There is no power in the system worth stealing.
