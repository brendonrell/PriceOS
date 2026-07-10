---
title: "Smart Contracts — Overview"
description: "The PD protocol layer: one factory, one immutable ERC-721 per Project, a per-Project royalty splitter, and an on-chain library registry. Architecture and guarantees."
category: "contracts"
keywords: ["contracts", "architecture", "PDFactory", "PDProject", "immutable"]
last_updated: "2026-07-10"
---

# Smart Contracts — Overview

Four contracts make up the PD protocol. One is deployed once (the factory); one exists per Project (the ERC-721); one exists per Project beside it (the royalty splitter); and one is the shared, append-only store the art draws its libraries from. Everything below is taken from the deployed source.

## The architecture

```
PDLibraryRegistry  ←──  reads blessed libraries at render time
       ↑
   PDFactory  ── createProject() ──→  PDProject (one per Project, ERC-721)
       ↑                                   │
  whitelist, wallets,                      └──→  PaymentSplitter (one per Project,
  storage fee corridor                            secondary royalties, 60/40)
```

- **[PDFactory](/docs/contracts/pd-factory)** — deploys every Project. Holds the artist whitelist, the platform wallets, the storage-fee corridor, and the registry of everything it has deployed (`isProject`).
- **[PDProject](/docs/contracts/pd-project)** — the per-Project ERC-721. Stores the generative script on-chain, assigns each Output its hash at mint, renders `tokenURI` entirely from chain data, pays out 95/5 inside every mint transaction, and signals EIP-2981.
- **[PaymentSplitter](/docs/contracts/payment-splitter)** — receives the Project's 5% secondary royalty and splits it 60/40 (3% of sale to artist, 2% to platform), with permissionless withdrawals in ETH and ERC-20.
- **[PDLibraryRegistry](/docs/contracts/library-registry)** — append-only, on-chain storage for the blessed JavaScript libraries (p5.js, three.js, the gzip inflater) that Projects may bind.

## The guarantees

- **Projects are immutable.** No admin, no pause, no upgrade path, no withdraw function, no balance. A Project's terms at deployment are its terms forever.
- **The art is on Ethereum.** Scripts live in SSTORE2 data contracts; `tokenURI` returns a self-contained data URI whose HTML document renders the artwork from the token's on-chain hash. No server, no IPFS, no platform dependency.
- **Money never rests in contracts.** Primary proceeds push to artist and platform inside the mint transaction; secondary royalties rest only in the Project's own splitter until anyone triggers a withdrawal to the fixed recipients.
- **Governance is minimal and visible.** The factory's admin whitelists artists and rotates platform wallets through two-step transfers; the storage fee moves only within an immutable corridor. Nothing an admin holds can touch a deployed Project.

## Verification status

All contracts are complete, under test (284 tests in the repository), deployed to the Sepolia test network, and source-verified on Etherscan there. Mainnet deployment is the platform's launch event; mainnet addresses are published in these docs when they exist. The [$PRICE token](/docs/price-token/contract) — a separate, standalone contract — is already live on mainnet.

## Further reading

- [PDFactory](/docs/contracts/pd-factory) · [PDProject](/docs/contracts/pd-project) · [PaymentSplitter](/docs/contracts/payment-splitter) · [PDLibraryRegistry](/docs/contracts/library-registry)
- [The Mint Flow](/docs/for-artists/the-mint-flow) — the same machinery, artist's-eye view
