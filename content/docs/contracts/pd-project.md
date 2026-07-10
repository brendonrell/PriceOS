---
title: "Contracts — PDProject"
description: "The per-Project ERC-721: fully on-chain generative art via SSTORE2 and data-URI tokenURI, push-pattern payouts in every mint, per-token hashes, and EIP-2981."
category: "contracts"
keywords: ["PDProject", "ERC-721", "tokenURI", "on-chain art", "mint"]
last_updated: "2026-07-10"
---

# Contracts — PDProject

One PDProject exists per Project on PD — an ERC-721 deployed by the factory and immutable from that moment: **no admin, no pause, no upgrade, no withdraw function, no balance.** It does three jobs: hold the art on-chain, run the mint, and answer the royalty standard.

## The art, on-chain

The artist's generative script is stored across up to 32 SSTORE2 data contracts owned by the Project. `tokenURI(tokenId)` returns a fully self-contained data URI:

- Metadata JSON with the Output's name, description, and attributes.
- An `animation_url` that is a complete `data:text/html` document inlining the script, the token's hash, and — when the Project binds one — a blessed library from the [registry](/docs/contracts/library-registry), stored as base64 of its gzipped source and decoded in the page by the registry's own on-chain inflater before the artist's first line runs.
- An `image` field that starts as an on-chain placeholder SVG and is upgraded **exactly once per token** to an Arweave-pinned preview by the platform's writer key (`setArweaveTxid`). The preview is a convenience for wallets and marketplaces; the art renders from Ethereum regardless.

`getScript()`, `scriptChunk(i)`, and `scriptPointers(i)` expose the raw script for anyone who wants to read or re-render the work without touching `tokenURI` at all.

## The mint

```solidity
function mint(uint256 quantity) external payable;   // 1 – 22 per transaction
```

Each mint transaction, atomically:

1. Requires **exact payment**: `mintPrice × quantity` plus the live per-token storage fee (`currentStorageFeeWei()`, read from the factory). No overpayment path exists.
2. Assigns each new token (IDs 1-indexed, sequential) its `tokenHash` — derived from the previous block's hash, the inclusion block's `prevrandao`, the token ID, and the minter. Outcomes cannot be precomputed before the transaction lands.
3. Pushes **95% of the mint price to the artist, 5% to the platform wallet, and the storage fee to the storage wallet** — inside the same transaction. If any recipient reverts, the whole mint reverts. The contract's ETH balance is zero before and after every transaction, permanently.
4. Emits `Minted(minter, tokenId, tokenHash)` per token.

The artist share is computed as basis points (9,500 / 10,000) with the platform taking the exact complement, so no rounding dust is ever stranded.

## Royalties

```solidity
function royaltyInfo(uint256, uint256 salePrice)
    external view returns (address receiver, uint256 royaltyAmount);
// → (paymentSplitter, salePrice * 5%)
```

The receiver is the Project's own [PaymentSplitter](/docs/contracts/payment-splitter), deployed beside it by the factory. `supportsInterface` advertises ERC-721 and ERC-2981.

## Reads worth knowing

| Function | Returns |
| --- | --- |
| `totalSupply()` | Outputs minted so far |
| `tokenHashes(tokenId)` | The Output's immutable generative seed |
| `currentStorageFeeWei()` | The live per-token storage fee |
| `contractURI()` | Project-level metadata for marketplaces |
| `getScript()` | The full generative script, from chain |

## Further reading

- [PDFactory](/docs/contracts/pd-factory) — deployment and constraints
- [PaymentSplitter](/docs/contracts/payment-splitter) — where the 5% goes
- [Outputs in the app](/docs/app/outputs) — the same machinery, rendered
