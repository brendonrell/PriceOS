---
title: "For Artists — Royalties"
description: "The artist economics on Price Discussion: 95% of primary paid at mint time, 5% EIP-2981 secondary royalty split 3% artist / 2% platform, and permissionless withdrawals."
category: "for-artists"
keywords: ["royalties", "EIP-2981", "payment splitter", "artist economics"]
last_updated: "2026-07-10"
---

# For Artists — Royalties

Two revenue streams, two mechanisms — both on-chain, both immutable at deployment. Primary proceeds are pushed to you inside every mint transaction; secondary royalties accumulate in your Project's own splitter and are withdrawable by anyone, to you, at any time.

## Primary — 95% at mint time

Every `mint` on your Project pays out inside the mint transaction itself:

| Share | Recipient | Mechanism |
| --- | --- | --- |
| 95% of mint price | Your wallet (the immutable artist address) | Pushed in the mint transaction |
| 5% of mint price | The platform wallet | Pushed in the mint transaction |
| Storage fee (flat, per token) | The platform storage wallet | Pushed in the mint transaction |

There is no escrow, no pending balance, and no claim step for primary. If any recipient cannot receive, the whole mint reverts — the Project contract's ETH balance is zero before and after every transaction, permanently.

The storage fee is a small flat per-token amount, separate from the mint price, that funds preview storage. It is read live from the factory and can only move within an immutable corridor fixed when the factory was deployed.

## Secondary — 5% via EIP-2981, split 3/2

Every Project answers the royalty standard the same way:

```solidity
royaltyInfo(tokenId, salePrice) → (paymentSplitter, salePrice * 5%)
```

Marketplaces that honor EIP-2981 send 5% of each sale to your Project's own **PaymentSplitter**, which divides it **60/40 — 3% of the sale to you, 2% to the platform**. The split is a constant in the contract; nobody can change it.

Withdrawing is permissionless and gasless for you if anyone else triggers it — funds can only ever flow to your immutable artist address or the platform wallet, so there is nothing a third-party caller could redirect:

```solidity
splitter.pendingArtist()      // your accumulated, unwithdrawn share
splitter.withdrawArtist()     // pays your full pending share to your wallet
```

Some marketplaces pay royalties in WETH or other ERC-20 tokens rather than ETH. The splitter handles that too — `pendingArtistERC20(token)` / `withdrawERC20Artist(token)` mirror the ETH path with independent accounting per token, so one asset can never strand another.

## What EIP-2981 does not guarantee

EIP-2981 is a query standard, not an enforcement standard. A marketplace that ignores it can trade your Outputs without paying the royalty; that is a venue-side choice PD's contracts cannot prevent. PD does not maintain a list of compliant venues.

## Further reading

- [The Mint Flow](/docs/for-artists/the-mint-flow)
- [PaymentSplitter contract reference](/docs/contracts/payment-splitter)
- [PDProject contract reference](/docs/contracts/pd-project)
