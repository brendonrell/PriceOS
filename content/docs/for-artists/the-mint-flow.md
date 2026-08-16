---
title: "For Artists — The Mint Flow"
description: "What happens on-chain when a Project deploys and mints: the createProject call, on-chain script storage, per-token hashes, and the push-pattern payout in every mint."
category: "for-artists"
keywords: ["mint", "deploy", "createProject", "on-chain", "token hash", "colorway", "entry window"]
last_updated: "2026-08-02"
---

# For Artists — The Mint Flow

What actually happens on-chain when a Project is deployed and minted. Signatures below are from the deployed contract source; the full references are [PDFactory](/docs/contracts/pd-factory) and [PDProject](/docs/contracts/pd-project).

## Deployment

You sign a single transaction calling the factory:

```solidity
function createProject(
    string calldata name,
    string calldata symbol,
    uint256 maxSupply,      // 22 to 9,999
    uint256 mintPrice,      // in wei, fixed forever
    uint256 libraryId,      // a blessed on-chain library, or none
    bytes[] calldata scriptChunks,  // your generative script, stored on-chain
    string calldata description,
    string calldata colorway        // your signature color (six hex chars), or empty
) external returns (address project);
```

A second overload adds a trailing `uint256 windowSeconds` for a [contested-drop entry window](/docs/contracts/pd-project#the-entry-window); the plain signature deploys the classic open mint.

The factory checks that your wallet is whitelisted, the supply is within bounds, and your 60-day cooldown has elapsed, then atomically deploys:

1. **Your PDProject contract** — the ERC-721. Your script chunks are written into on-chain data contracts (SSTORE2) it owns forever.
2. **Your PaymentSplitter** — the immutable 60/40 splitter that receives the Project's secondary royalties.

The transaction emits `ProjectCreated` with the new addresses and parameters. From that moment nothing about the Project can be changed — by you, by PD, by anyone.

## What a mint does

Collectors call `mint(uint256 quantity)` on your Project (up to 22 per transaction). Each mint transaction, atomically:

1. **Checks payment exactly.** `msg.value` must equal `mintPrice × quantity` plus the per-token storage fee — no overpayment accepted, nothing to refund.
2. **Assigns each token its hash.** Token IDs are 1-indexed and sequential. Each Output's `tokenHash` is derived from the previous block's hash, the inclusion block's `prevrandao`, the token ID, and the minter — unknowable before the transaction lands, so outcomes cannot be precomputed.
3. **Pays everyone immediately.** 95% of the mint price goes to your wallet and 5% to the platform wallet **in the same transaction**. The storage fee goes to the platform's storage wallet. The contract's balance is zero before and after every transaction — there is no escrow and no withdrawal step for primary proceeds.

<svg viewBox="0 0 720 210" role="img" aria-labelledby="mint-split-title" style="width:100%;height:auto;display:block;margin:14px 0">
<title id="mint-split-title">One mint transaction pays three parties atomically: 95% of the mint price to the artist, 5% to the platform wallet, and the flat storage fee to the storage wallet. The contract holds nothing.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="72" width="190" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="98" fill="currentColor" text-anchor="middle">mint(quantity)</text>
<text x="105" y="117" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">exact ETH in ·</text>
<text x="105" y="131" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">contract keeps nothing</text>
<path d="M200 88 L 330 34" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M328 29 L 341 30 L 332 40 Z" fill="currentColor"/>
<path d="M200 105 H 330" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M330 100 L 342 105 L 330 110 Z" fill="currentColor"/>
<path d="M200 122 L 330 176" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M332 170 L 341 180 L 328 181 Z" fill="currentColor"/>
<rect x="345" y="6" width="365" height="48" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="355" y="26" fill="currentColor">ARTIST · 95% of mint price</text>
<text x="355" y="44" fill="currentColor" font-weight="normal" font-size="12">your immutable address — paid inside the mint</text>
<rect x="345" y="81" width="365" height="48" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="355" y="101" fill="currentColor">PLATFORM · 5% of mint price</text>
<text x="355" y="119" fill="currentColor" font-weight="normal" font-size="12">platformWallet(), read live from the factory</text>
<rect x="345" y="156" width="365" height="48" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="355" y="176" fill="currentColor">STORAGE · flat fee per token</text>
<text x="355" y="194" fill="currentColor" font-weight="normal" font-size="12">funds previews — corridor-capped, forever</text>
</g>
</svg>

## Where the art lives

`tokenURI` returns a fully self-contained data URI: metadata JSON whose `animation_url` is an HTML document inlining your script, the bound library (decompressed from its on-chain copy), and the token's hash. The artwork renders from Ethereum alone.

Each Output's `image` field starts as an on-chain placeholder and is upgraded exactly once by the platform's writer key to a rendered preview pinned on Arweave — that preview is a convenience for wallets and marketplaces; the art itself never leaves the chain.

## What the contract does not do

- **No allowlists and no auctions.** The contract is an open, fixed-price mint. PD's filter deliberately favors the clean default: open mint, fixed price, fixed supply. The one optional mechanism is the [entry window](/docs/contracts/pd-project#the-entry-window) for contested drops — entries inside it count as simultaneous, oversubscription settles by a verifiable draw at the same fixed price, and the window **fails open** at an immutable deadline, so nothing can ever permanently hold a mint shut.
- **No admin mint, no artist mint privilege.** You mint your own Output the same way collectors do.
- **No pausing and no upgrades.** Once live, the mint runs to sell-out on its own terms.

## Further reading

- [Royalties](/docs/for-artists/royalties)
- [PDProject contract reference](/docs/contracts/pd-project)
- [Library Registry](/docs/contracts/library-registry)
