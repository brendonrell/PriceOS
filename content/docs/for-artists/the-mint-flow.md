---
title: "For Artists — The Mint Flow"
description: "What happens on-chain when a Project deploys and mints: the createProject call, on-chain script storage, per-token hashes, and the push-pattern payout in every mint."
category: "for-artists"
keywords: ["mint", "deploy", "createProject", "on-chain", "token hash"]
last_updated: "2026-07-10"
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
    string calldata description
) external returns (address project);
```

The factory checks that your wallet is whitelisted, the supply is within bounds, and your 60-day cooldown has elapsed, then atomically deploys:

1. **Your PDProject contract** — the ERC-721. Your script chunks are written into on-chain data contracts (SSTORE2) it owns forever.
2. **Your PaymentSplitter** — the immutable 60/40 splitter that receives the Project's secondary royalties.

The transaction emits `ProjectCreated` with the new addresses and parameters. From that moment nothing about the Project can be changed — by you, by PD, by anyone.

## What a mint does

Collectors call `mint(uint256 quantity)` on your Project (up to 22 per transaction). Each mint transaction, atomically:

1. **Checks payment exactly.** `msg.value` must equal `mintPrice × quantity` plus the per-token storage fee — no overpayment accepted, nothing to refund.
2. **Assigns each token its hash.** Token IDs are 1-indexed and sequential. Each Output's `tokenHash` is derived from the previous block's hash, the inclusion block's `prevrandao`, the token ID, and the minter — unknowable before the transaction lands, so outcomes cannot be precomputed.
3. **Pays everyone immediately.** 95% of the mint price goes to your wallet and 5% to the platform wallet **in the same transaction**. The storage fee goes to the platform's storage wallet. The contract's balance is zero before and after every transaction — there is no escrow and no withdrawal step for primary proceeds.

## Where the art lives

`tokenURI` returns a fully self-contained data URI: metadata JSON whose `animation_url` is an HTML document inlining your script, the bound library (decompressed from its on-chain copy), and the token's hash. The artwork renders from Ethereum alone.

Each Output's `image` field starts as an on-chain placeholder and is upgraded exactly once by the platform's writer key to a rendered preview pinned on Arweave — that preview is a convenience for wallets and marketplaces; the art itself never leaves the chain.

## What the contract does not do

- **No allowlists, auctions, or mint windows on-chain.** The contract is an open, fixed-price mint. PD's curation deliberately favors the clean default: open mint, fixed price, fixed supply.
- **No admin mint, no artist mint privilege.** You mint your own Output the same way collectors do.
- **No pausing and no upgrades.** Once live, the mint runs to sell-out on its own terms.

## Further reading

- [Royalties](/docs/for-artists/royalties)
- [PDProject contract reference](/docs/contracts/pd-project)
- [Library Registry](/docs/contracts/library-registry)
