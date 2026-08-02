---
title: "Contracts — PDLibraryRegistry"
description: "The append-only on-chain store for blessed JavaScript libraries (p5.js, three.js, regl, d3, the gzip inflater) that PD Projects bind and render from — frozen forever once finalized."
category: "contracts"
keywords: ["PDLibraryRegistry", "libraries", "p5.js", "three.js", "regl", "d3", "SSTORE2", "append-only", "Language"]
last_updated: "2026-08-02"
---

# Contracts — PDLibraryRegistry

The registry is the platform's on-chain shelf of blessed JavaScript libraries — the p5.js or three.js a Project's script depends on, stored on Ethereum so the art's dependencies are as permanent as the art. Entries are written in chunks, finalized, and then **frozen forever: no edit, no delete, no overwrite, by any key, ever.** A mutable registry would be a back door into already-sold art; append-only is the hard rule. New versions are new entries.

## How an entry is stored

Each library is a named, versioned byte blob written across SSTORE2 chunks (each within the EVM's 24,575-byte data-contract ceiling) over multiple transactions, then finalized:

```solidity
function createLibrary(...) external onlyAdmin;                     // open an entry
function appendChunk(uint256 libraryId, bytes calldata data) external onlyAdmin;
function finalize(uint256 libraryId) external onlyAdmin;            // freeze forever
```

Library text is stored as the **base64 of its gzipped source** — artwork pages embed it verbatim and decode it client-side, which keeps write costs sane and reads free of on-chain re-encoding. The registry also stores the raw **inflater** tool (`setInflater`) that artwork documents inline to do that decoding — so even the decompressor the art depends on lives on-chain.

## How Projects use it

A Project binds at most one library, fixed at `createProject` time; the factory enforces that only **finalized** entries can be bound. At render time, `tokenURI` inlines the registry's inflater, the library blob, and a bootstrap that decodes and injects the library as synchronous script text before the artist's first line runs. See [PDProject](/docs/contracts/pd-project).

The binding is also where every Output's **Language** attribute comes from: the entry's exact "name version" (`p5.js 1.11.3`) is copied into the Project at deployment and rides its metadata forever — the artist's tool, versioned and stored on Ethereum, not a label anyone typed. Vanilla Projects read `JavaScript`.

## The supported languages

PD launches with a settled shelf of blessed libraries — each written to the registry as its own frozen entry:

| Library | For |
| --- | --- |
| **p5.js** | The lingua franca of creative coding |
| **three.js** | 3D and WebGL scenes |
| **regl** | Functional, shader-first WebGL |
| **d3** | Data-driven and generative structure |

Vanilla **JavaScript** is always available and needs no registry entry at all. The vocabulary extends itself the day a new library is blessed — a new entry, finalized and frozen, with no list anywhere to maintain.

```solidity
function isFinalized(uint256 libraryId) external view returns (bool);
function readLibrary(uint256 libraryId) external view returns (bytes memory);
function libraryInfo(uint256 libraryId) external view returns (...);  // name, version, size
function chunkCount(uint256 libraryId) external view returns (uint256);
```

## Governance

Deliberately none of its own. Writes are gated by a live read of the factory's `admin()` — the registry adds no second governance surface. One wrinkle from deploy order: the factory takes the registry's address as a constructor immutable, so the registry deploys first and its deployer wires the factory address exactly once (`wireFactory`); after wiring, the deployer key holds no power at all. No pause, no upgrades.

## Further reading

- [PDProject](/docs/contracts/pd-project) — the render pipeline that reads this
- [PDFactory](/docs/contracts/pd-factory) — the admin whose key gates writes
- [Contracts Overview](/docs/contracts/overview)
