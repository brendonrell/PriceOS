---
title: "For Artists — Royalties"
description: "The artist economics on Price Discussion: 95% of primary paid at mint time, 5% EIP-2981 secondary royalty split 3% artist / 2% platform, and permissionless withdrawals."
category: "for-artists"
keywords: ["royalties", "EIP-2981", "payment splitter", "artist economics"]
last_updated: "2026-07-17"
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

<svg viewBox="0 0 720 196" role="img" aria-labelledby="royalty-flow-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="royalty-flow-title">A secondary sale routes 5% via EIP-2981 to the Project's PaymentSplitter, which splits it 60/40: 3% of the sale to the artist, 2% to the platform, both withdrawable permissionlessly.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="68" width="160" height="60" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="93" fill="currentColor" text-anchor="middle">SECONDARY SALE</text>
<text x="90" y="112" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">any honoring venue</text>
<path d="M170 98 H 244" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M244 93 L 256 98 L 244 103 Z" fill="currentColor"/>
<text x="208" y="87" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">5%</text>
<rect x="258" y="68" width="200" height="60" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="358" y="93" fill="currentColor" text-anchor="middle">PaymentSplitter</text>
<text x="358" y="112" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">your Project's own · 60/40</text>
<path d="M458 84 L 528 42" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M526 37 L 539 36 L 531 47 Z" fill="currentColor"/>
<path d="M458 112 L 528 154" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M531 149 L 539 160 L 526 159 Z" fill="currentColor"/>
<rect x="542" y="10" width="168" height="52" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="626" y="32" fill="currentColor" text-anchor="middle">YOU · 3% of sale</text>
<text x="626" y="50" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">withdrawArtist()</text>
<rect x="542" y="134" width="168" height="52" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="626" y="156" fill="currentColor" text-anchor="middle">PLATFORM · 2%</text>
<text x="626" y="174" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">withdrawPlatform()</text>
</g>
</svg>

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
