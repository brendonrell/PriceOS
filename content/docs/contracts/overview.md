---
title: "Smart Contracts — Overview"
description: "The PD protocol layer: one factory, one immutable ERC-721 per Project, per-Project royalty splitters, the on-chain library registry, the ERC-1155 sticker shop, and the keychain capsule machine. Architecture and guarantees."
category: "contracts"
keywords: ["contracts", "architecture", "PDFactory", "PDProject", "PDStickers", "PDKeychains", "immutable"]
last_updated: "2026-08-02"
---

# Smart Contracts — Overview

The PD protocol is a small family of contracts with one temperament: immutable logic, money that never rests, and art that renders from the chain alone. One factory is deployed once; every Project deploys its own ERC-721 and royalty splitter beside it; a shared append-only registry holds the art's libraries; the sticker economy runs on its own ERC-1155 with matching splitter vaults; and the keychain capsule machine mints one-of-one charms drawn entirely by an on-chain renderer. Everything below is taken from the contract source.

## The architecture

<svg viewBox="0 0 720 470" role="img" aria-labelledby="pd-arch-title" style="width:100%;height:auto;display:block;margin:0 0 14px">
<title id="pd-arch-title">PD contract architecture. PDFactory deploys each PDProject with its PaymentSplitter; PDProject reads blessed libraries from PDLibraryRegistry at render time. PDStickers reads the factory's platform wallet live and pays royalties to StickerSplitter vaults. PDKeychains mints living charms drawn by the PDKeychainRenderer and its three part stores.</title>
<g font-family="'Courier New', Courier, monospace" font-size="13" font-weight="bold">
<rect x="270" y="12" width="200" height="50" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="370" y="33" fill="currentColor" text-anchor="middle">PDLibraryRegistry</text>
<text x="370" y="51" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">append-only · frozen</text>
<path d="M370 62 V 96" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" fill="none"/>
<path d="M365 96 L 370 108 L 375 96 Z" fill="currentColor"/>
<text x="382" y="88" fill="currentColor" font-weight="normal" font-size="12">read at render</text>
<rect x="14" y="110" width="180" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="104" y="136" fill="currentColor" text-anchor="middle">PDFactory</text>
<text x="104" y="155" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">whitelist · wallets</text>
<text x="104" y="170" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">fee corridor</text>
<path d="M194 143 H 264" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M264 138 L 276 143 L 264 148 Z" fill="currentColor"/>
<text x="232" y="132" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">deploys</text>
<rect x="278" y="110" width="184" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="370" y="136" fill="currentColor" text-anchor="middle">PDProject</text>
<text x="370" y="155" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">ERC-721, one per Project</text>
<text x="370" y="170" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">art on-chain · 95/5 mint</text>
<path d="M462 143 H 532" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M532 138 L 544 143 L 532 148 Z" fill="currentColor"/>
<text x="497" y="132" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">5% royalty</text>
<rect x="546" y="110" width="164" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="628" y="136" fill="currentColor" text-anchor="middle">PaymentSplitter</text>
<text x="628" y="155" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">one per Project</text>
<text x="628" y="170" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">3% artist · 2% platform</text>
<path d="M104 176 V 236" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" fill="none"/>
<path d="M99 236 L 104 248 L 109 236 Z" fill="currentColor"/>
<text x="116" y="216" fill="currentColor" font-weight="normal" font-size="12">platformWallet(), read live</text>
<rect x="14" y="250" width="180" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="104" y="276" fill="currentColor" text-anchor="middle">PDStickers</text>
<text x="104" y="295" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">ERC-1155 sticker shop</text>
<text x="104" y="310" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">sealed sheets · peel</text>
<path d="M194 283 H 264" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M264 278 L 276 283 L 264 288 Z" fill="currentColor"/>
<text x="232" y="272" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">5% royalty</text>
<rect x="278" y="250" width="184" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="370" y="276" fill="currentColor" text-anchor="middle">StickerSplitter</text>
<text x="370" y="295" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">solo vault + collab vaults</text>
<text x="370" y="310" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">3% creator · 2% platform</text>
<rect x="14" y="390" width="180" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="104" y="416" fill="currentColor" text-anchor="middle">PDKeychains</text>
<text x="104" y="435" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">ERC-721 capsule machine</text>
<text x="104" y="450" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">living charms · luck</text>
<path d="M194 423 H 264" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M264 418 L 276 423 L 264 428 Z" fill="currentColor"/>
<text x="232" y="412" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">draws via</text>
<rect x="278" y="390" width="184" height="66" fill="var(--stat-bg)" stroke="currentColor" stroke-width="1.5"/>
<text x="370" y="416" fill="currentColor" text-anchor="middle">KeychainRenderer</text>
<text x="370" y="435" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">+ 3 part stores, immutable</text>
<text x="370" y="450" fill="currentColor" text-anchor="middle" font-weight="normal" font-size="12">fully on-chain SVG</text>
</g>
</svg>

- **[PDFactory](/docs/contracts/pd-factory)** — deploys every Project (through its own deployment arm, a size-limit split with zero governance surface). Holds the artist whitelist, the platform wallets, the storage-fee corridor, and the registry of everything it has deployed (`isProject`).
- **[PDProject](/docs/contracts/pd-project)** — the per-Project ERC-721. Stores the generative script on-chain, assigns each Output its hash at mint, renders `tokenURI` entirely from chain data, pays out 95/5 inside every mint transaction, carries the optional fail-open entry window for contested drops, and signals EIP-2981.
- **[PaymentSplitter](/docs/contracts/payment-splitter)** — receives the Project's 5% secondary royalty and splits it 60/40 (3% of sale to artist, 2% to platform), with permissionless withdrawals in ETH and ERC-20.
- **[PDLibraryRegistry](/docs/contracts/library-registry)** — append-only, on-chain storage for the blessed JavaScript libraries — the launch shelf is p5.js, three.js, regl, and d3, plus the gzip inflater — that Projects may bind, and the source of every Output's Language attribute.
- **[PDStickers](/docs/contracts/pd-stickers)** — the sticker economy's ERC-1155: fully on-chain SVG stickers sold as sealed sheets, peeled to reveal, with royalties flowing to **StickerSplitter** vaults that mirror the Project split. It reads the factory's live platform wallet, so both economies rotate at one point.
- **[PDKeychains](/docs/contracts/pd-keychains)** — the capsule machine's ERC-721: one-of-one living charms drawn entirely by the on-chain **PDKeychainRenderer** and its three part stores, with luck-tilted rarity rolls frozen at the crank, the polish attestation, and the keeper bond.

## The guarantees

- **Projects are immutable.** No admin, no pause, no upgrade path, no withdraw function, no balance. A Project's terms at deployment are its terms forever.
- **The art is on Ethereum.** Scripts live in SSTORE2 data contracts; `tokenURI` returns a self-contained data URI whose HTML document renders the artwork from the token's on-chain hash. No server, no IPFS, no platform dependency.
- **Money never rests in contracts.** Primary proceeds push to artist and platform inside the mint transaction; secondary royalties rest only in the Project's own splitter until anyone triggers a withdrawal to the fixed recipients.
- **Governance is minimal and visible.** The factory's admin whitelists artists and rotates platform wallets through two-step transfers; the storage fee moves only within an immutable corridor. Nothing an admin holds can touch a deployed Project.
- **Nothing can permanently halt a mint.** The one time-boxed mechanism in the protocol — the contested-drop entry window — fails open at an immutable deadline: if the platform's settlement server never shows up, minting opens by itself. There is no oracle and no external price dependency anywhere.

## Verification status

The suite is complete and under test — **403 Foundry tests** in the repository, including differential fuzzing of the assembly paths against memory-safe references — with continuous integration running the full suite plus an EIP-170 deploy-size gate on every push, so an undeployable contract fails the build rather than surfacing at launch. An earlier revision of the stack is deployed to the Sepolia test network and was exercised end to end there, including a full live run of the money paths (mints, royalties, sticker purchases and peels, marketplace sales) verified to the wei, with the core art contracts source-verified on Etherscan; the next Sepolia rehearsal carries the newest rounds (marketplace attributes, the entry window, keychains). Mainnet deployment is the platform's launch event; mainnet addresses are published in these docs when they exist. The [$PRICE token](/docs/price-token/contract) — a separate, standalone contract — is already live on mainnet.

## Further reading

- [PDFactory](/docs/contracts/pd-factory) · [PDProject](/docs/contracts/pd-project) · [PaymentSplitter](/docs/contracts/payment-splitter) · [PDStickers](/docs/contracts/pd-stickers) · [PDKeychains](/docs/contracts/pd-keychains) · [PDLibraryRegistry](/docs/contracts/library-registry)
- [The Mint Flow](/docs/for-artists/the-mint-flow) — the same machinery, artist's-eye view
