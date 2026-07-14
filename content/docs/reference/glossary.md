---
title: "Glossary"
description: "Plain-English definitions for Price Discussion's vocabulary: Project, Output, Artwork, Token, @name, and the platform's contract roles and distinctive terms."
category: "reference"
keywords: ["glossary", "definitions", "vocabulary", "nomenclature"]
last_updated: "2026-07-10"
---

# Glossary

Definitions for terms used throughout Price Discussion, alphabetically. The nomenclature section at the bottom records the locked platform vocabulary.

## A–C

**Album** — A user-curated, named grouping of Outputs within a Project. Public by default; a user can keep several per Project. See [Identity & Profiles](/docs/app/identity-and-profiles).

**Anointment** — The community's recognition mechanism for elevating specific works into higher visibility.

**Artist** — A whitelisted user who has deployed at least one Project through [PDFactory](/docs/contracts/pd-factory). The artist address is set at deployment and immutable.

**Artwork** — The visual content of an Output — what the script renders. The Token holds the ERC-721 primitive; the Artwork is what you look at.

**The Bench** — The drag-only comparison tray. See [Collector Tools](/docs/app/collector-tools).

**Collected** — Profile tab for the Outputs a user owns. A route label, not an entity.

**Collector** — A user who owns one or more Outputs. Used where ownership is the salient fact — not a generic synonym for "user."

**Composer** (⊚) — The visual query builder: compose a live question about the catalog from tappable rules, save it as a Program, act on the answer in bulk. See [Composer](/docs/app/the-composer).

**Curated** — What PD is **not**. See **Filtered**.

## E–M

**EIP-2981** — Ethereum's royalty-signalling standard. Every PD Project answers it with a 5% royalty to its own splitter. See [Royalties](/docs/for-artists/royalties).

**ENS** — The Ethereum Name Service. PD reads and displays ENS names alongside @names.

**Filtered** — PD is filtered, not curated. There is no permissionless deployment — the gate is the [submission process](/docs/for-artists/submit-a-project) plus the on-chain whitelist — but that gate is a quality floor, not a taste-making program. PD does not editorialize the catalog; the market's conversation does the ranking.

**Genome** — The parameter-space map of a generative Project. See [Projects & Minting](/docs/app/projects-and-minting).

**Grail Pin** (⟟) — The elevation mark for the few pieces that matter most to a user.

**@name** — A user's or Project's platform identifier; the @ is part of the noun. Stored internally as a handle, displayed everywhere the account acts.

**Mint** — The act of bringing a new Output into existence on a Project. Token IDs are 1-indexed; the first mint produces token #1. See [The Mint Flow](/docs/for-artists/the-mint-flow).

**Mood Ring** (⌬) — The platform's daily generative colour — home wears it, and the footer will tell you today's hex.

## O–P

**Output** — The individual minted unit: the vessel bundling Artwork, Token, and metadata. The unit of scarcity on PD. See [Outputs](/docs/app/outputs).

**PaymentSplitter** — The per-Project contract receiving the 5% secondary royalty and splitting it 60/40 — 3% of each sale to the artist, 2% to the platform. See [PaymentSplitter](/docs/contracts/payment-splitter).

**PDFactory** — The single deployed contract that creates every PD Project. See [PDFactory](/docs/contracts/pd-factory).

**PDProject** — The per-Project ERC-721 contract deployed by PDFactory. See [PDProject](/docs/contracts/pd-project).

**Ping** — PD's notification primitive. See [Pings](/docs/pings/overview).

**$PRICE** — The platform's ERC-20 token; zero platform utility by design. See [$PRICE Overview](/docs/price-token/overview).

**PriceOS** — The complete software platform built on PD's thesis — the app these docs document. See [The App](/docs/app/overview).

**PriceRank** (❂) — The platform's standing system, fed by achievements and activity.

**PriceSprite** — A user's typographic character face, chosen at signup. See [Identity & Profiles](/docs/app/identity-and-profiles).

**Price Story** — The narrative interpretation of a Project's or Output's price history.

**Program** — A saved Composer query that keeps answering live; it wears the Spectrum (its current answer’s colour distribution). See [Composer](/docs/app/the-composer).

**Project** — An artist's body of work, deployed as one immutable PDProject contract. Lives at `/art/{slug}`.

**Provenance** — The full chain-of-custody record of a Token, readable from standard `Transfer` events. See [The Secondary Market](/docs/for-collectors/the-secondary-market).

## S–W

**Showcase** — A user's curated top-six selection, with four engine modes (Static, Generative, Gen Curated, Artist). Public.

**Sigil** — The deterministic identity mark generated from a wallet address.

**SIWE** — Sign-In With Ethereum, PD's authentication. See [Wallet Setup](/docs/for-collectors/wallet-setup).

**Spell Book** — The surface for pill-toggleable view modifiers and the platform's stranger lenses. See [The Spell Book](/docs/app/spell-book).

**Star / Starred** (★) — A user's private, silent bookmark on an Output. Never generates a Ping.

**Storage fee** — The small flat per-token fee in every mint, routed to the platform's storage wallet within an immutable corridor set on the factory. Funds preview infrastructure.

**The Tape** — The persistent live ticker of market events in the app chrome. See [The Shell](/docs/app/the-shell).

**Token** — The on-chain ERC-721 primitive inside an Output. An industry-spec carve-out: "Token" is used verbatim in Solidity and ERC contexts; UI copy says **Output**.

**Token hash** — The Output's immutable generative seed, assigned in the mint transaction. The script renders the Artwork from it, forever.

**True Name** — A Project's permanent, unique 4-letter name in uppercase Glagolitic (for example `ⰅⰒⰗⰚ`). See [Projects & Minting](/docs/app/projects-and-minting).

**The Watch** (⬬) — Per-page watchlists whose hits route into Pings. See [Collector Tools](/docs/app/collector-tools).

**The Vault** — Every profile’s public one-per-wallet consolidation: the near-black door, the Sigil seal, the verdict line, and appraisal plates over the held pieces. See [Identity & Profiles](/docs/app/identity-and-profiles).

**Wishlist** (✛) — A user's private buy-intent mark on an Output. Drives financial Pings — the opposite of a Star.

## Nomenclature

The canonical platform vocabulary, locked:

- **Collection** — banned. Use **Project**.
- **Edition** — banned. Use **Output** (single unit) or **Outputs** (the set / supply).
- **Collector** as a generic noun for any account — banned; use **user** unless ownership is the salient fact.

Industry-spec carve-outs that keep their original terms: **Token** in Solidity / ERC-721 / on-chain contexts; **open edition** only in contract docstrings for "0 = unlimited" semantics (PD Projects are always fixed-supply).

## Further reading

- [Introduction](/docs)
- [The App overview](/docs/app/overview)
- [Contracts overview](/docs/contracts/overview)
