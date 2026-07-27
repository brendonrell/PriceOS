---
title: "Keychains — The Depanneur"
description: "The keychain shop: crank the capsule machine, get a random one-of-one charm. The odds, the provably fair roll, and where the money goes."
category: "keychains"
keywords: ["depanneur", "capsule machine", "crank", "mint", "fair draw", "odds", "royalty"]
last_updated: "2026-07-27"
---

# The Depanneur

Every Montreal block has one: the corner store with the lotto terminal, the cooler hum, and the capsule machine by the door. PD's is called the **Depanneur ⚷**, and its capsule machine sells exactly one thing: Keychains.

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

## One coin, one turn

There is no picking, no previewing, no minting page with a quantity stepper. You pay the machine's price (a sticker-sheet-class price, tunable the way sheet prices are) and crank. One crank, one charm, straight to your wallet, revealed on the spot. That restraint is deliberate: a capsule machine you can empty with one transaction isn't a capsule machine.

## The fair roll

Keychains use the same fairness engineering as Project mints and sticker-pack peels — the [fair-draw](/docs/fair-draw/overview) rules, applied to charms:

- **The roll happens at crank, in your transaction**, seeded by fresh block data that does not exist yet when you sign and send. Nobody — not you, not PD, not a bot watching the mempool — can know the charm before the crank lands.
- **Only people can crank.** The machine refuses contracts, which closes the classic casino exploit: a bot bundling crank-and-refund until it hits an ALIEN. One address, one honest turn at a time.
- **The odds are public and locked.** The pull table on the [overview](/docs/keychains/overview#the-cast) isn't marketing copy — it's the literal weight table inside the contract, readable by anyone, the same for everyone, forever.
- **The roll is frozen forever.** Your charm's genes are stamped at crank and never re-rolled. What the machine gives you is what exists.

## Where the money goes

The Depanneur runs on the sticker-shop's rails, exactly:

- **95% to the shop, 5% to the platform**, paid out inside the purchase transaction itself. The machine never holds a balance — there is nothing in it to hack, drain, or freeze.
- **Secondary sales pay a 5% royalty**, split on the same standing terms as everything else on PD.

## The one thing to know before you buy secondhand

A Keychain's chain and finish belong to the life of its keeper, not to the token. **When a charm changes hands its shine resets** — chrome chain and all — and the new keeper starts from a bare cord. The character, its palette, its accessory, and its christened name survive forever. So a lived-in charm on the secondary market isn't selling you its shine; it's selling you the character — the shine you have to earn back yourself. That's the whole point.
