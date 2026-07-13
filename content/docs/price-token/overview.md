---
title: "$PRICE Token — Overview"
description: "Price Discussion's ERC-20: 100,000,000 fixed supply, live on Ethereum mainnet, zero platform utility by design. A cultural artifact, not a financial instrument."
category: "price-token"
keywords: ["$PRICE", "token", "ERC-20", "no utility", "overview"]
last_updated: "2026-07-10"
---

# $PRICE Token — Overview

$PRICE is Price Discussion's ERC-20 token, live on Ethereum mainnet: 100,000,000 total supply, minted once at deployment, fixed forever. It is distributed to the communities PD comes from — and it has **zero platform utility on Price Discussion**. That is not a gap in the design; it is the design.

## In one sentence

$PRICE is a transferable ERC-20 distributed to a community as a cultural artifact; it confers no privileges, no governance rights, no discounts, no revenue claim, and no special access on Price Discussion.

## What $PRICE is

A vanilla fixed-supply ERC-20 — the entire contract is a constructor and an import. 18 decimals, 100,000,000 supply minted in a single deployment-time mint, no further mint authority, no admin role, no upgrade path. Transferable like any token, listed wherever third parties choose to list it, priced by whatever market forms around it.

It is connected to Price Discussion by name and origin: it carries PD's branding and was distributed to the community PD's thesis aligns with. It has **no contract-level connection to any other PD system**. PD's contracts do not read $PRICE balances; no feature behaves differently for holders.

## What $PRICE is not

- **Not an investment in Price Discussion.** No share, equity, ownership, or economic interest in PD as a platform or business.
- **Not a claim on revenue.** Platform proceeds flow through PD's on-chain fee mechanics to PD's wallets; $PRICE holders have no claim on them.
- **Not a governance token.** PD is not a DAO. There is no vote, no proposal system, no governance role.
- **Not a utility token.** No mint privileges, no fee discounts, no early access, no gated anything. The extended discussion is [No Platform Utility](/docs/price-token/no-platform-utility).
- **Not a security, by structural intent.** The design forecloses the expectation-of-profit-from-others'-efforts shape; final classification belongs to counsel and regulators, and the design intent is documented plainly in these pages.

## The distribution shape

| Allocation | Share | Recipient |
| --- | --- | --- |
| fxhash community | 75% | The validated fxhash community wallet list, flat per wallet |
| Founder | 10% | Brendon, one labeled wallet |
| WTBS | 10% | The WTBS podcast — a media allocation, publicly labeled |
| newpdogs | 5% | The early members of the PD Discord |

Distribution is a direct batch push at TGE — nothing to claim, no deadline, no proof to submit. Mechanics on the [Tokenomics](/docs/price-token/tokenomics) page.

## The contract

Live on Ethereum mainnet at [`0x173a012c7c8ca3cfb531dcad84a40c53dbe74638`](https://etherscan.io/token/0x173a012c7c8ca3cfb531dcad84a40c53dbe74638). Full technical reference — functions, deliberate absences, verification — on the [Contract](/docs/price-token/contract) page.

## Further reading

- [Tokenomics](/docs/price-token/tokenomics)
- [No Platform Utility](/docs/price-token/no-platform-utility)
- [Contract](/docs/price-token/contract)
