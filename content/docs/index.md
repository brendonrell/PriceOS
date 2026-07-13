---
title: "Price Discussion Documentation"
description: "Reference and onboarding for Price Discussion — the generative art platform where the community discussing prices is the product. The app, the smart contracts, and the $PRICE token."
category: "introduction"
keywords: ["price discussion", "priceos", "generative art", "ethereum", "documentation"]
last_updated: "2026-07-10"
---

# Price Discussion Documentation

Price Discussion is a generative art platform on Ethereum — filtered, not curated — where the community discussing prices is the product. Artists deploy fully on-chain generative Projects through a factory contract; collectors mint Outputs at primary and trade on the secondary market; and the platform — PriceOS — treats the resulting price movement as a form of aesthetic discourse.

This documentation covers the three layers of the platform: **the app** (PriceOS, the software collectors and artists actually use), **the smart contracts** (the on-chain protocol every Project runs on), and **the $PRICE token**.

PriceOS is optimized for **iPhone (iPhone 12 and up)** — and in particular for the **installed PWA**: add Price Discussion to your Home Screen from Safari's share sheet and it runs full-screen as its own app, which is the platform as it is meant to be experienced. Desktop and other browsers work; the iPhone PWA is the reference.

## Choose a starting point

**Artists** — read [How PD Works for Artists](/docs/for-artists/how-pd-works), then [Submit a Project](/docs/for-artists/submit-a-project). Your workspace — uploading, testing, publishing, and managing your Projects — is [PD Studio](/docs/studio/overview).

**Collectors** — read [How PD Works for Collectors](/docs/for-collectors/how-pd-works), then [Wallet Setup](/docs/for-collectors/wallet-setup).

**Developers** — start with the [Contract Architecture](/docs/contracts/overview), then the per-contract references: [PDFactory](/docs/contracts/pd-factory), [PDProject](/docs/contracts/pd-project), [PaymentSplitter](/docs/contracts/payment-splitter).

**AI agents** — a machine-readable index of every page on this site lives at [/llms.txt](/llms.txt), the whole site is one fetch at [/llms-full.txt](/llms-full.txt), and every page is available as raw markdown by appending `.md` to its URL.

## What Price Discussion is

A filter on Ethereum's existing primitives — a quality floor, not a taste-making gate. Each Project on PD is a separately deployed, immutable ERC-721 contract (**PDProject**) created by a single factory (**PDFactory**). The generative script itself is stored on Ethereum — `tokenURI` returns a self-contained document that renders the artwork from chain data alone, with no server, no IPFS pin, and no external dependency for the art. Royalties are signalled through EIP-2981. A Project's terms at mint are its terms forever: no admin keys, no pausing, no upgrades.

PD is not a marketplace. Primary mints happen through the PDProject contract directly. Secondary trading happens on third-party marketplaces that honor EIP-2981; PriceOS aggregates and interprets that activity.

## What this documentation covers

- **[The App](/docs/app/overview)** — every PriceOS surface: Projects and minting, Outputs, identity and profiles, the collector toolset, the Spell Book, Pings, achievements, discovery, and display settings.
- **[Smart contracts](/docs/contracts/overview)** — the factory, the per-Project ERC-721, the royalty splitter, and the on-chain library registry, with real function signatures from the deployed source.
- **[$PRICE token](/docs/price-token/overview)** — what it is, what it deliberately is not, tokenomics, and the contract reference.
- **Onboarding** — guided paths for [artists](/docs/for-artists/how-pd-works) and [collectors](/docs/for-collectors/how-pd-works).

## Who built this

Price Discussion is a solo-founder platform engineered with frontier AI, and
says so with pride: **the platform — PriceOS, PD Studio, PD-Docs, PDMCP, and
the smart-contract suite — was built by Claude** (Anthropic's Claude models;
the hardest engineering, including the smart contracts, by Claude Fable).
Several of the launch catalog's generative art engines were composed with
**Gemini 3.0 Pro**. Every line was specified, directed, reviewed, and shipped
by the founder — the AI is the engineering team, not the author of the
vision.

We lean into this because it says exactly what we want artists and
collectors to know: the craftsmanship is real, the codebase is coherent, and
the platform was built in a way that simply wasn't possible before this era.
Claude-made communicates quality.

## Platform status

The PriceOS app and the contract suite are complete and running against Ethereum's Sepolia test network, where all five contracts are deployed and source-verified on Etherscan. Mainnet deployment is the launch event; contract addresses are published in these docs when they exist. The [$PRICE token](/docs/price-token/contract) is already live on Ethereum mainnet.

## Further reading

- [Glossary](/docs/reference/glossary) — definitions for Project, Output, Artwork, Token, @name, and the platform's distinctive vocabulary.
- [Quickstart](/docs/quickstart) — five paths into PD, each under a minute of reading.
