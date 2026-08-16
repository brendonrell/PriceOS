---
title: "Contracts — PDFactory"
description: "The single deployed factory behind every PD Project: createProject, the artist whitelist, the 60-day cooldown, supply bounds, platform wallets, and the storage-fee corridor."
category: "contracts"
keywords: ["PDFactory", "createProject", "whitelist", "cooldown", "isProject", "colorway", "entry window"]
last_updated: "2026-08-05"
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
    string calldata description,    // ≤ 1,024 bytes
    string calldata colorway        // "" or exactly six hex chars
) external returns (address project);
```

A second overload takes one extra trailing parameter, `uint256 windowSeconds`, and deploys the Project with a [contested-drop entry window](/docs/contracts/pd-project#the-entry-window) of that length (capped at 4 hours, fail-open). The signature above deploys with the window disabled — byte-for-byte the classic open mint.

Callable by whitelisted artists only. Atomically deploys the artist's **PDProject** and its **PaymentSplitter**, records the new address in `isProject`, and emits `ProjectCreated`. The artist address is `msg.sender`, immutably. The `colorway` is the Project's signature color — six bare hex characters, emitted as a marketplace attribute on every Output; pass empty to omit it.

Internally, the `new PDProject` runs in the factory's **deployment arm** (`projectDeployer`) — a zero-governance satellite the factory spawns in its own constructor and is alone allowed to call. It exists purely for the EVM's 24,576-byte contract size limit; behaviour is identical to an inline deploy.

### Constraints enforced at creation

| Constraint | Value |
| --- | --- |
| Artist whitelisted | `whitelistedArtists[msg.sender]` |
| Supply bounds | 22 ≤ `maxSupply` ≤ 9,999 (token IDs stay four digits) |
| Per-artist cooldown | 60 days between creations, clocked from creation |
| Script | 1–32 chunks, each within the SSTORE2 size limit |
| Script content | No phone-home or non-determinism patterns (the on-chain URL-guard) |
| Text fields | Strict JSON/UTF-8 validation — malformed metadata can never deploy |
| Colorway | Empty, or exactly six hex characters (bare, no `#`) |
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

The admin can whitelist artists (`whitelistArtist` / `removeArtist`) and rotate the five operational keys — `platformWallet`, `storageFeeWallet`, `storageFeeWriter` (the key that pins each Output's write-once Arweave preview), `settlementKey` (the key that choreographs contested-drop windows), and `attestationKey` (the key that signs [keychain](/docs/contracts/pd-keychains) luck and polish attestations — deliberately a separate key from settlement, so no single secret holds both jobs) — each through a propose/accept two-step, so a rotation cannot brick payouts with a typo.

The two destinations that actually receive pushed ether — `platformWallet` and `storageFeeWallet` — accept with a small payment the factory bounces straight back through the exact push path a mint uses. A destination that cannot take ether (a contract with no way to receive) can therefore never become the live wallet and halt sales; the acceptance itself is the proof of receipt. Deployed Projects read these keys live, which is why a rotation applies platform-wide with no per-Project action.

The **storage fee** (`storageFeeWei`) — the flat per-token fee each mint routes to the storage wallet — is tuned by the admin, but only within `[storageFeeFloor, storageFeeCeiling]`, an immutable corridor fixed in the constructor. No key, ever, can set it outside that corridor; it is the ceiling on that power, forever.

## Events

`ProjectCreated`, `ArtistWhitelisted`, `ArtistRemoved`, `AdminTransferStarted/Transferred`, `PlatformWalletProposed/Updated`, `StorageFeeWalletProposed/Updated`, `StorageFeeWriterProposed/Updated`, `SettlementKeyProposed/Updated`, `AttestationKeyProposed/Updated`, `StorageFeeUpdated`.

## Further reading

- [PDProject](/docs/contracts/pd-project) — what the factory deploys
- [Library Registry](/docs/contracts/library-registry) — what `libraryId` points at
- [The Mint Flow](/docs/for-artists/the-mint-flow)
