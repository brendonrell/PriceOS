---
title: "Contracts — PDProject"
description: "The per-Project ERC-721: fully on-chain generative art via SSTORE2 and data-URI tokenURI, push-pattern payouts in every mint, per-token hashes, marketplace attributes, the entry window, and EIP-2981."
category: "contracts"
keywords: ["PDProject", "ERC-721", "tokenURI", "on-chain art", "mint", "entry window", "attributes"]
last_updated: "2026-08-02"
---

# Contracts — PDProject

One PDProject exists per Project on PD — an ERC-721 deployed by the factory and immutable from that moment: **no admin, no pause, no upgrade, no withdraw function, no balance.** It does three jobs: hold the art on-chain, run the mint, and answer the royalty standard.

## The art, on-chain

The artist's generative script is stored across up to 32 SSTORE2 data contracts owned by the Project. `tokenURI(tokenId)` returns a fully self-contained data URI:

- Metadata JSON with the Output's name, description, and attributes.
- An `animation_url` that is a complete `data:text/html` document inlining the script, the token's hash, and — when the Project binds one — a blessed library from the [registry](/docs/contracts/library-registry), stored as base64 of its gzipped source and decoded in the page by the registry's own on-chain inflater before the artist's first line runs.
- An `image` field that starts as an on-chain placeholder SVG and is upgraded **exactly once per token** to an Arweave-pinned preview by the platform's writer key (`setArweaveTxid`). The preview is a convenience for wallets and marketplaces; the art renders from Ethereum regardless.

`getScript()`, `scriptChunk(i)`, and `scriptPointers(i)` expose the raw script for anyone who wants to read or re-render the work without touching `tokenURI` at all.

### Marketplace attributes

Every Output's metadata carries six attributes, all sourced from chain state: **Token Hash** (the generative seed), **Token Number**, **Artist** (the immutable artist address), **Language** — the exact tool the piece is made with, copied from the [registry](/docs/contracts/library-registry) as "name version" (`p5.js 1.11.3`) at deployment and frozen; `JavaScript` for vanilla Projects — **Colorway** (the Project's signature colour, six hex characters, present only when the Project declared one), and **Edition Size**.

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

## The entry window

A Project may deploy with an optional **contested-drop entry window** (up to 4 hours, fixed at creation). While the window runs, on-chain minting is closed and entries are collected as pre-signed transactions treated as **simultaneous** — arrival order inside the window buys nothing, which is the anti-snipe point. If demand fits supply, the platform's settlement key closes the window and every entry lands as a normal mint. If oversubscribed, a published draw's winners mint first (their seats credited on-chain, the draw's commitment anchored in the close event); leftovers then open first-come. Tokens minted during settlement are transfer-sealed for a bounded window (72 hours at most) while the off-chain sweep adjudicates — the seal is write-once and can never be extended.

The load-bearing guarantee is **fail-open**: if the settlement key never shows up — server dead, key lost — minting opens by itself at the immutable deadline. No key, outage, or platform failure can ever permanently halt a mint; a window can only delay one, by at most its own length. The settlement key's whole power is drop choreography — it can never touch funds, supply, pricing, or anything past the deadline, and winners pay the exact same price through the exact same push-splits as any minter. Projects deployed without a window skip every line of this machinery.

`dropPhase()` answers where a drop stands: `0` window open · `1` settling · `2` normal minting.

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
