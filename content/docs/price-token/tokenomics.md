---
title: "$PRICE Tokenomics"
description: "The full $PRICE distribution: 100,000,000 fixed supply allocated 75% fxhash community, 10% founder, 10% WTBS, 5% newpdogs — pushed in full at TGE, nothing to claim."
category: "price-token"
keywords: ["tokenomics", "supply", "distribution", "TGE", "airdrop"]
last_updated: "2026-07-10"
---

# $PRICE Tokenomics

The mechanical details of $PRICE distribution. For the framing of what $PRICE is and is not, see [Overview](/docs/price-token/overview); for the explicit statement of why it has no platform utility, see [No Platform Utility](/docs/price-token/no-platform-utility).

> $PRICE is not, and is not intended to be, an investment, a security, a share of Price Discussion, or a claim on any revenue, asset, or service PD operates. This page describes the distribution of a memetic and cultural artifact, not the structuring of a financial instrument.

## Total supply

100,000,000 tokens (× 10^18 base units), minted once at deployment. After that mint:

- No `mint` function exists for further minting.
- No admin role holds mint authority — no admin role exists at all.
- No `burn` function exists either. Supply is permanently 100,000,000; tokens leave circulation only the old-fashioned way, by transfer to an unrecoverable address.

## Distribution

Allocated as follows and distributed **in full at TGE**:

| Allocation | Share | Tokens | Recipient |
| --- | --- | --- | --- |
| fxhash community | 75% | 75,000,000 | The validated fxhash community wallet list, flat amount per wallet |
| Founder | 10% | 10,000,000 | Brendon, one labeled wallet |
| WTBS | 10% | 10,000,000 | The WTBS podcast — a media allocation, publicly labeled |
| newpdogs | 5% | 5,000,000 | The early members of the PD Discord, split evenly |

Any rounding remainder left in the deployer wallet after distribution goes to an unrecoverable address at TGE; the deployer ends at exactly zero. There is no treasury, no reserve, no future allocation — distribution completes at TGE, and the roadmap with it.

## Distribution mechanics

All allocations are **pushed directly** to recipient wallets. Nothing to claim, no deadline, no Merkle proof, no action required from any recipient — tokens simply arrive. The community batch send executes through the public disperse contract (`0xD152f549545093347A162Dce210e7293f1452150`, deployed 2018, widely used) as batch transactions from the deployer wallet. The full recipient list is published in the contract repository with its SHA-256 hash, so anyone can verify exactly who received the distribution; every transfer is a standard ERC-20 `Transfer` event, visible on-chain.

### The founder allocation

Transferred to a single labeled wallet at TGE, no vesting — PD has no team or investor base receiving allocations; there was no funding round.

### The WTBS allocation

A media allocation, deliberately founder-sized: WTBS is the community's most trusted voice, and the allocation reflects that the media is part of the project, not a vendor to it.

## What does not exist

No claim mechanism · no treasury or reserve · no vesting schedules · no staking · no buybacks · no utility burn · no emission schedule · **no PD-operated market or liquidity pool** — anyone may create one permissionlessly; that is their act, not PD's.

## Further reading

- [Overview](/docs/price-token/overview)
- [No Platform Utility](/docs/price-token/no-platform-utility)
- [Contract](/docs/price-token/contract)
