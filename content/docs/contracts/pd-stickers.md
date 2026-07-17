---
title: "Contracts — PDStickers"
description: "The sticker shop on-chain: ERC-1155 with fully on-chain SVG art, the sealed-sheet token model, FIXED and PACK peel modes, in-transaction payout splits, and StickerSplitter royalty vaults."
category: "contracts"
keywords: ["PDStickers", "ERC-1155", "sealed sheet", "peel", "StickerSplitter", "royalties"]
last_updated: "2026-07-17"
---

# Contracts — PDStickers

PDStickers is the [sticker economy's](/docs/stickers/overview) on-chain rail: one ERC-1155 contract holding every sticker and every sealed sheet, with the artwork stored on-chain as SVG. It follows the protocol's house rules — money never rests in it, metadata is self-contained, logic is immutable — and it reads the same factory the art contracts read, so the platform wallet rotates in exactly one place. Its companion, **StickerSplitter**, is the royalty vault (a three-way sibling of the Project [PaymentSplitter](/docs/contracts/payment-splitter)).

## The token model

Two kinds of token share the contract, in namespaces that cannot collide:

| Token | ID space | What it is |
| --- | --- | --- |
| Sticker | `1 …` (≤ 99 per sheet) | One sticker design; balance = how many you hold |
| Sealed sheet | `2^128 + sheetId` | An unopened sheet of its type — identical copies stack |

Buying mints sealed sheets; **`peel`** burns them and mints the stickers inside. Because identical sealed sheets share one token ID, a hundred unopened packs are a single wallet line (×100), marketplaces list them as one item, and a collection stays clean until its owner chooses the reveal. `uri(id)` answers for both kinds with base64 JSON whose image is the on-chain SVG as a data URI — sealed sheets return their wrapper art — with zero external dependencies, and names JSON-escaped.

## Purchase — exact payment, everything pushed

```solidity
function purchaseSheet(uint256 sheetId, uint256 quantity) external payable;
```

Requires the sheet active, within its print run (`maxSheets` — `0` means open), and **exact payment** (`priceWei × quantity`). Every share is pushed out inside the purchase transaction, before the mint — the contract's balance is zero even mid-transaction:

<svg viewBox="0 0 720 240" role="img" aria-labelledby="sticker-split-title" style="width:100%;height:auto;display:block;margin:0 0 14px">
<title id="sticker-split-title">A sheet purchase splits in-transaction: 5% to the platform wallet read live from the factory; the 95% creator side pays the collaborator's locked share first and the admin takes the remainder.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="10" y="88" width="180" height="58" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="112" fill="currentColor" text-anchor="middle">purchaseSheet()</text>
<text x="100" y="131" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">exact ETH in</text>
<path d="M190 100 L 320 44" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M318 39 L 331 40 L 322 50 Z" fill="currentColor"/>
<path d="M190 117 H 320" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M320 112 L 332 117 L 320 122 Z" fill="currentColor"/>
<path d="M190 134 L 320 190" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M322 184 L 331 194 L 318 195 Z" fill="currentColor"/>
<rect x="335" y="14" width="375" height="52" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="345" y="36" fill="currentColor">PLATFORM · 5%</text>
<text x="345" y="55" fill="currentColor" font-weight="normal" font-size="12">factory.platformWallet(), read live — same rate as mints</text>
<rect x="335" y="91" width="375" height="52" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="345" y="113" fill="currentColor">COLLABORATOR · their locked share</text>
<text x="345" y="132" fill="currentColor" font-weight="normal" font-size="12">collabBps of the 95% creator side, when the sheet has one</text>
<rect x="335" y="168" width="375" height="52" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="345" y="190" fill="currentColor">ADMIN · the remainder</text>
<text x="345" y="209" fill="currentColor" font-weight="normal" font-size="12">the creator side after the collaborator's slice</text>
</g>
</svg>

The split is the Project split, verbatim: 5% platform off the top (the wallet read live from `factory.platformWallet()`, the same rotation point mints pay), the remaining 95% is the creator side, and a sheet's collaborator — locked at `createSheet`, immutable forever — takes their `collabBps` slice of that side first.

## Peel — FIXED and PACK

```solidity
function peel(uint256 sheetId, uint256 count) external;   // ≤ 10 per transaction
```

Burns `count` sealed sheets, then mints the stickers inside, one batch. What arrives depends on the sheet's mode, fixed before it ever went on sale:

- **FIXED** (`pullSize == 0`) — one of every sticker in the sheet, per sealed copy. Supply was **reserved at purchase**, so a sealed FIXED sheet is unconditionally peelable, forever.
- **PACK** (`pullSize > 0`) — each sealed copy draws `pullSize` **distinct** stickers from the sheet's pool, rolled *at the peel* with the Project-mint entropy recipe (previous blockhash + `prevrandao` + peeler + the sheet's peel counter — unknowable when the peeler signs). Capped stickers leave the pool as they exhaust: supply is the rarity. Packs are **EOA-only** (`ContractPeeler` otherwise) — a contract could wrap the peel and revert until it drew a rare. Activation enforces at least `pullSize` open-edition stickers in the pool, so no sealed pack can ever become unpeelable by exhaustion.

## Royalties — StickerSplitter

`royaltyInfo` signals **5%** on every secondary sale — stickers *and* sealed sheets — paid to a **StickerSplitter** vault carrying the Project split: 60/40 creator-side/platform, i.e. **3% / 2% of the sale**, identical to the art market. Solo sheets share one vault (deployed in the constructor, creator side to the admin); each collab sheet gets its own vault at `createSheet`, splitting the creator side on the sheet's locked terms. StickerSplitter inherits the PaymentSplitter design wholesale: empty `receive()`, cumulative accounting with monotonic entitlements (no stranded wei, no underflow), permissionless withdrawals to fixed recipients, independent ETH and per-token ERC-20 legs, and the platform side reading the factory live.

## Governance and lifecycle

Sheets are admin-published: `createSheet` (an inactive shell with its sealed-wrapper SVG and locked collab terms) → `addSticker` × N (a sticker's home sheet is permanent) → optional `setSheetPull` → `setSheetActive(true)`. A live sheet's pool never changes — restocking means deactivating, appending, reactivating. `setSheetPrice` retunes a sheet at any time (the ~$22 target outlives ETH drift) and applies only to the next purchase. The admin is transferable by the same two-step propose/accept the factory uses; collab vaults re-route their admin side instantly, since they read `admin()` live. There is no `receive()` — `withdraw()` exists only to sweep force-sent dust.

## Reads worth knowing

| Function | Returns |
| --- | --- |
| `sheets(sheetId)` | The whole sheet record: pool, price, print run, sold/peeled, mode, collab terms, vault |
| `sealedTokenId(sheetId)` | The sealed token ID — what `balanceOf` takes |
| `sealedOutstanding(sheetId)` | Sealed copies in the wild, not yet peeled |
| `poolAvailable(sheetId)` | Stickers currently drawable (active, supply left) |
| `canPurchaseSheet(sheetId)` | One-call pre-flight: can this sheet be bought right now |
| `getStickerSVG(id)` / `getSheetCoverSVG(id)` | The raw on-chain art |

## Status

PDStickers and StickerSplitter are part of the audited contract suite — deployed to Sepolia, exercised end-to-end (purchase splits verified to the wei, peel, royalty vault withdrawals, collab sheets, and a real marketplace ERC-1155 sale against the sealed sheet), and covered by the repository's Foundry tests. Mainnet deployment rides the platform's launch.

## Further reading

- [Stickers — Overview](/docs/stickers/overview) — the same machinery, collector's-eye view
- [PaymentSplitter](/docs/contracts/payment-splitter) — the design StickerSplitter inherits
- [PDFactory](/docs/contracts/pd-factory) — the platform wallet both economies read
