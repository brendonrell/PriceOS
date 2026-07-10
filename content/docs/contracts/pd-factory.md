---
title: "Contracts — PDFactory"
description: "The single deployed factory behind every PD Project: createProject, the artist whitelist, the 60-day cooldown, supply bounds, platform wallets, and the storage-fee corridor."
category: "contracts"
keywords: ["PDFactory", "createProject", "whitelist", "cooldown", "isProject"]
last_updated: "2026-07-10"
---

# Contracts — PDFactory

PDFactory is deployed once and creates every Project on the platform. It is the protocol's only governance surface: the artist whitelist, the platform wallets, and the storage-fee corridor live here — and none of its powers reach into a Project once deployed.

## createProject

```solidity
function createProject(
    string calldata name,           // ≤ 50 bytes
    string calldata symbol,         // ≤ 50 bytes
    uint256 maxSupply,              // 22 – 9,999
    uint256 mintPrice,              // wei, immutable
    uint256 libraryId,              // finalized registry entry, or none
    bytes[] calldata scriptChunks,  // ≤ 32 chunks, stored via SSTORE2
    string calldata description     // ≤ 1,024 bytes
) external returns (address project);
```

Callable by whitelisted artists only. Atomically deploys the artist's **PDProject** and its **PaymentSplitter**, records the new address in `isProject`, and emits `ProjectCreated`. The artist address is `msg.sender`, immutably.

### Constraints enforced at creation

| Constraint | Value |
| --- | --- |
| Artist whitelisted | `whitelistedArtists[msg.sender]` |
| Supply bounds | 22 ≤ `maxSupply` ≤ 9,999 (token IDs stay four digits) |
| Per-artist cooldown | 60 days between creations, clocked from creation |
| Script | 1–32 chunks, each within the SSTORE2 size limit |
| Library | Must be a finalized registry entry when bound |

## The public registry

```solidity
mapping(address => bool)      public isProject;         // the authenticity check
mapping(address => address[]) public artistProjects;    // per-artist deployments
mapping(address => bool)      public whitelistedArtists;
mapping(address => uint256)   public lastProjectTimestamp;
```

`isProject(address)` is the one-call authenticity verification for any contract claiming to be a PD Project — see [the collector verification pattern](/docs/for-collectors/the-secondary-market).

## Governance surface

The admin can whitelist artists (`whitelistArtist` / `ArtistRemoved`), and rotate the three operational addresses — `platformWallet`, `storageFeeWallet`, `storageFeeWriter` — each through a propose/accept two-step, so a wallet rotation cannot brick payouts with a typo. Deployed Projects read these live at mint time, which is why a rotation applies platform-wide with no per-Project action.

The **storage fee** (`storageFeeWei`) — the flat per-token fee each mint routes to the storage wallet — can be adjusted by the `storageFeeWriter`, but only within `[storageFeeFloor, storageFeeCeiling]`, an immutable corridor fixed in the constructor. The admin cannot exceed it; the corridor is the ceiling on that power, forever.

## Events

`ProjectCreated`, `ArtistWhitelisted`, `ArtistRemoved`, `AdminTransferStarted/Transferred`, `PlatformWalletProposed/Updated`, `StorageFeeWalletProposed/Updated`, `StorageFeeWriterProposed/Updated`.

## Further reading

- [PDProject](/docs/contracts/pd-project) — what the factory deploys
- [Library Registry](/docs/contracts/library-registry) — what `libraryId` points at
- [The Mint Flow](/docs/for-artists/the-mint-flow)
