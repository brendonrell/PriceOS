---
title: "Keychains — The Depanneur"
description: "The keychain shop: crank the capsule machine, get a random one-of-one charm. The exact mechanics, the provably fair roll, the money math, and what you actually own."
category: "keychains"
keywords: ["depanneur", "capsule machine", "crank", "mint", "fair draw", "odds", "royalty", "money"]
last_updated: "2026-08-05"
---

# The Depanneur

Every Montreal block has one: the corner store with the lotto terminal, the cooler hum, and the capsule machine by the door. PD's is called the **Depanneur ☯**, and its capsule machine sells exactly one thing: Keychains.

**How:** Tap KEYCHAINS ⚷ at the bottom of your PriceSprite card, or the ⚷ key in the wallet settings row.

<svg viewBox="0 0 720 130" role="img" aria-labelledby="kc-crank-title" style="width:100%;height:auto;display:block;margin:0 0 14px">
<title id="kc-crank-title">Crank lifecycle: pay at the machine, the roll happens in the same transaction, a one-of-one charm lands in your wallet, then polish it and wear it.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="38" width="150" height="54" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="61" fill="currentColor" text-anchor="middle">THE CRANK</text>
<text x="85" y="79" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">one coin, one turn</text>
<path d="M160 65 H 206" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M206 60 L 218 65 L 206 70 Z" fill="currentColor"/>
<rect x="220" y="38" width="160" height="54" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="61" fill="currentColor" text-anchor="middle">THE ROLL</text>
<text x="300" y="79" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">same block, unknowable</text>
<path d="M380 65 H 426" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M426 60 L 438 65 L 426 70 Z" fill="currentColor"/>
<rect x="440" y="38" width="130" height="54" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="61" fill="currentColor" text-anchor="middle">THE CHARM</text>
<text x="505" y="79" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">one of one</text>
<path d="M570 65 H 616" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M616 60 L 628 65 L 616 70 Z" fill="currentColor"/>
<rect x="630" y="38" width="80" height="54" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="670" y="61" fill="currentColor" text-anchor="middle">WEAR</text>
<text x="670" y="79" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">+ polish</text>
</g>
</svg>

## One coin, one turn — the exact mechanics

There is no picking, no previewing, no quantity stepper — but there IS one choice: the machine has **two coin slots, YIN and YANG**, and the slot you drop your coin in steers the roll's palette, face, and accessory weights (the [overview](/docs/keychains/overview#every-trait-every-odds) tables show both columns). Shapes are universal — the ALIEN odds are identical on either slot. The rules of the machine, all enforced by the contract:

- **One crank mints one charm.** You cannot batch cranks in a single transaction. A capsule machine you can empty in one pull isn't a capsule machine.
- **The price is exact.** The machine takes precisely its posted price — overpay or underpay and the whole transaction refuses. The price sits in sticker-sheet territory and is tunable the same way sheet prices are, so it holds its dollar target as ETH drifts.
- **The machine has a switch.** PD can pause sales; a pause never touches charms already out in the world.
- **The charm is yours the instant the crank lands** — revealed on the spot, no waiting, no reveal phase, no separate claim.

## The fair roll

Keychains use the same fairness engineering as Project mints and sticker-pack peels — the [fair-draw](/docs/fair-draw/overview) rules, applied to charms:

- **The roll happens at crank, inside your own transaction.** The dice are fresh chain data that does not exist yet at the moment you sign and send — mixed with your address and the charm's number. Nobody — not you, not PD, not a bot watching pending transactions — can know the charm before the crank lands.
- **Only people can crank.** The machine refuses other contracts outright. This closes the classic casino exploit: a bot that wraps the crank, checks the result, and cancels the purchase unless it hit an ALIEN. One address, one honest turn at a time.
- **The odds are public and locked.** Every weight table on the [overview](/docs/keychains/overview#every-trait-every-odds) is the contract's literal source — readable by anyone, identical for everyone, unchangeable forever.
- **The roll is frozen forever.** Your charm's genes are stamped at crank and never re-rolled, re-weighted, or "rebalanced." What the machine gives you is what exists.

## The money, exactly

The Depanneur runs on the sticker-shop's rails, to the letter:

- **95% to the shop, 5% to the platform**, paid out inside the purchase transaction itself. On a $22 crank that's $20.90 and $1.10, gone the moment you pay. The machine never holds a balance — there is nothing inside it to hack, drain, or freeze.
- **Secondary sales pay a 5% royalty**, split on the same standing terms as everything else on PD — on a $100 resale, $5 flows back.
- During the test phase the in-app Depanneur runs on sim-ETH like the sticker store; the contract is the mainnet machine.

## What you actually own

A Keychain is a token in your wallet, and more than most:

- **The genes** — shape, palette, material, face, pose, accessory — are yours forever, stamped at crank.
- **The art is served by the chain itself.** There is no image host, no metadata server, nothing that can rot or be taken down. Ask the contract for your charm tomorrow or in twenty years; it draws it fresh either time — swing, blink, and all.
- **The living layer** — chain and finish — reflects whoever keeps it. That part isn't property; it's reputation. See [The Living Charm](/docs/keychains/the-living-charm).

## The one thing to know before you buy secondhand

A Keychain's chain and finish belong to the life of its keeper, not to the token. **When a charm changes hands its shine resets** — chrome chain and all — and the new keeper starts from a bare cord. The character, its palette, its accessory, and its christened name survive forever. So a lived-in charm on the secondary market isn't selling you its shine; it's selling you the character — the shine you have to earn back yourself. That's the whole point.
