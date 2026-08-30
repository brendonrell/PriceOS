---
title: "Glossary"
description: "Plain-English definitions for Price Discussion's vocabulary: Project, Output, Artwork, Token, @name, the sticker economy, the war, and the platform's locked nomenclature."
category: "reference"
keywords: ["glossary", "definitions", "vocabulary", "nomenclature"]
last_updated: "2026-08-05"
---

# Glossary

Definitions for terms used throughout Price Discussion, alphabetically. The nomenclature section at the bottom records the locked platform vocabulary.

## A–C

**Album** — A user-curated, ordered shelf of Outputs, with living mosaic covers. Numbered, never named. Public: anyone can see an album and who made it. See [Albums](/docs/albums).

**Anointment** — The community's recognition mechanism for elevating specific works into higher visibility.

**Artist** — A whitelisted user who has deployed at least one Project through [PDFactory](/docs/contracts/pd-factory). The artist address is set at deployment and immutable.

**Artwork** — The visual content of an Output — what the script renders. The Token holds the ERC-721 primitive; the Artwork is what you look at.

**The Bench** — The drag-only comparison tray. See [Collector Tools](/docs/app/collector-tools).

**The Binder** — The sticker collection's got/need ledger: every sheet as a page of slots, missing stickers as dimmed outlines. See [Stickers](/docs/stickers/the-binder-and-your-profile).

**Book of Conquests** (≣) — The war's only leaderboard: a permanent, dated chronicle of sieges, conquests, strongholds, relics, and struck stones. See [Factions](/docs/factions).

**Cartel** (⟁) — Your mutuals who also hold a given Project — the Cabal. A display mode counts them on every project page; the [Composer](/docs/composer) queries by it.

**Cartography** (◫) — The living map of the whole platform: Projects as territories, collectors as inhabitants. Long-press the Price Discussion name. See [Cartography](/docs/cartography).

**Collected** — Profile tab for the Outputs a user owns. A route label, not an entity.

**Collector** — A user who owns one or more Outputs. Used where ownership is the salient fact — not a generic synonym for "user."

**Completionism** — The profile's month count: how many of the platform's release months the wallet has fully collected, with the Completionist's Ledger behind it. See [Identity & Profiles](/docs/app/identity-and-profiles).

**Composer** (⊚) — The visual query builder: compose a live question about the catalog from tappable rules, save it as a Program, act on the answer in bulk. See [Composer](/docs/composer).

**Curated** — What PD is **not**. See **Filtered**.

## D–M

**The Dispatch** (❡) — PD's morning paper: printed daily at 9AM from the real ledger, archived forever at permanent URLs. See [The Dispatch](/docs/dispatch).

**EIP-2981** — Ethereum's royalty-signalling standard. Every PD Project answers it with a 5% royalty to its own splitter. See [Royalties](/docs/for-artists/royalties).

**ENS** — The Ethereum Name Service. PD reads and displays ENS names alongside @names.

**Faction** — The side a collector fights for in PD's quiet war, chosen by raising a blank color bubble as a profile logo. The color *is* the faction. See [Factions](/docs/factions).

**Fate** — A platform trait every Output carries from mint, alongside Artist, Project, PriceDay, and the natal chart.

**Filtered** — PD is filtered, not curated. There is no permissionless deployment — the gate is the [submission process](/docs/for-artists/submit-a-project) plus the on-chain whitelist — but that gate is a quality floor, not a taste-making program. PD does not editorialize the catalog; the market's conversation does the ranking.

**Genome** — The parameter-space map of a generative Project. See [Projects & Minting](/docs/app/projects-and-minting).

**The Gnome** — A Project's one keeper: a deterministic generative creature living in the Project's +More panel, greeting visitors and appraising loyal holders' pieces from true facts.

**Grail Pin** (⟟) — The elevation mark for the few pieces that matter most to a user.

**Marginalia** — The ordered record, around every artwork, of every wallet that ever held it — revealed by the ceremonial long hold. Sales strike deep; private transfers land faint. See [Factions](/docs/factions).

**Mint** — The act of bringing a new Output into existence on a Project. Token IDs are 1-indexed; the first mint produces token #1. See [The Mint Flow](/docs/for-artists/the-mint-flow).

**Mood Ring** (⌬) — The platform's daily generative color — home wears it, and the footer will tell you today's hex.

## N–R

**@name** — A user's or Project's platform identifier; the @ is part of the noun. Stored internally as a handle, displayed everywhere the account acts.

**Oath** — Time under a faction's flag. It compounds while the flag flies, survives going neutral, and resets only on defection — which scars. See [Factions](/docs/factions).

**Output** — The individual minted unit: the vessel bundling Artwork, Token, and metadata. The unit of scarcity on PD. See [Outputs](/docs/app/outputs).

**PaymentSplitter** — The per-Project contract receiving the 5% secondary royalty and splitting it 60/40 — 3% of each sale to the artist, 2% to the platform. See [PaymentSplitter](/docs/contracts/payment-splitter).

**PDFactory** — The single deployed contract that creates every PD Project. See [PDFactory](/docs/contracts/pd-factory).

**PDProject** — The per-Project ERC-721 contract deployed by PDFactory. See [PDProject](/docs/contracts/pd-project).

**PDStickers** — The sticker economy's ERC-1155 contract: on-chain SVG stickers sold as sealed sheets. See [PDStickers](/docs/contracts/pd-stickers).

**The Peel** — Opening a sealed sticker sheet: a physical drag in the app, a burn-and-mint on-chain. The rip is the product. See [Stickers](/docs/stickers/the-store).

**Ping** — PD's notification primitive. See [Pings](/docs/pings/overview).

**$PRICE** — The platform's ERC-20 token; zero platform utility by design. See [$PRICE Overview](/docs/price-token/overview).

**PriceDay** (➽) — The platform's own day count, flipping at midnight Montreal — the spine [the Rewind](/docs/rewind) scrubs along.

**PriceOS** — The complete software platform built on PD's thesis — the app these docs document. See [The App](/docs/app/overview).

**PriceRank** (❂) — The platform's standing system, fed by achievements and activity.

**PriceSprite** — A user's typographic character face, chosen at signup. See [Identity & Profiles](/docs/app/identity-and-profiles).

**Price Story** — The narrative interpretation of a Project's or Output's price history.

**Program** — A saved Composer query that keeps answering live; it wears the Spectrum (its current answer's color distribution). See [Composer](/docs/composer).

**Project** — An artist's body of work, deployed as one immutable PDProject contract. Lives at `/art/{slug}`.

**Provenance** — The full chain-of-custody record of a Token, readable from standard `Transfer` events. See [The Secondary Market](/docs/for-collectors/the-secondary-market).

**The Rewind** (◄) — The whole-OS time scrubber: PD exactly as it stood on any past PriceDay, read-only. Triple-tap the Price Discussion name. See [The Rewind](/docs/rewind).

## S–W

**Sealed sheet** — An unopened sticker sheet: one stackable token whose contents wait for the peel. Tradable as-is. See [Stickers](/docs/stickers/overview).

**The Sentinel** — The server-side watcher behind BUY targets and armed Workflows: evaluated every minute against live listings, firing a real Ping and push the moment a trigger crosses. See [Collector Tools](/docs/app/collector-tools).

**Setup Code** — A short shareable string encoding a whole PD configuration (the Sticker Manager carries its own, narrower one). See [Settings & Display](/docs/app/settings-and-display).

**Sheet** — The unit of sticker publishing and purchase: a themed set of stickers with a rarity tag, a price, and (on-chain) a print run. See [The Store](/docs/stickers/the-store).

**Showcase** — A user's curated top-six selection, with four engine modes (Static, Generative, Gen Curated, Artist). Public.

**Sigil** — The deterministic identity mark generated from a wallet address, forged once and permanent; the profile's Sigil pill uses ※. See [Factions](/docs/factions).

**SIWE** — Sign-In With Ethereum, PD's authentication. See [Wallet Setup](/docs/for-collectors/wallet-setup).

**Spell** — A pill-toggleable modifier from [the Spell Book](/docs/app/spell-book): a lens on the platform, stackable and persistent.

**Star / Starred** (★) — A user's private, silent bookmark on an Output. Never generates a Ping.

**Sticker** — A collectible on-chain SVG artwork published by PD, delivered by peeling a sheet. See [Stickers](/docs/stickers/overview).

**Storage fee** — The small flat per-token fee in every mint, routed to the platform's storage wallet within an immutable corridor set on the factory. Funds preview infrastructure.

**Subtrait** — An artist-defined bucket grouping a trait's values into a middle layer (Trait → Subtrait → Value) — schema, not token data. See [Upload & Testing](/docs/studio/upload-and-testing).

**Takeover** (⚑) — One public, premium, non-cancellable blanket offer on another collector's entire position in a Project, open for 72 hours. See [Takeover](/docs/takeover).

**The Tape** — The persistent live ticker of market events in the app chrome. See [The Shell](/docs/app/the-shell).

**Token** — The on-chain ERC-721 primitive inside an Output. An industry-spec carve-out: "Token" is used verbatim in Solidity and ERC contexts; UI copy says **Output**.

**Token hash** — The Output's immutable generative seed, assigned in the mint transaction. The script renders the Artwork from it, forever.

**True Name** — A Project's permanent, unique 4-letter name in uppercase Glagolitic (for example Kiki's, `ⰅⰕⰭⰧ`). See [Projects & Minting](/docs/app/projects-and-minting).

**The Vault** (⧈) — Numbered, public groups of owned pieces their collector has designated as vaulted — Albums, but only for what you hold — each with a stats block reading the wall's real money and rarity. See [Identity & Profiles](/docs/app/identity-and-profiles).

**The Watch** (⬬) — Per-page watchlists whose hits route into Pings. See [Collector Tools](/docs/app/collector-tools).

**Wishlist** (✛) — A user's private buy-intent mark on an Output. Drives financial Pings — the opposite of a Star.

**Workflow** (☇) — An armed automation: the price you named crosses or the artist you watch uploads, and the Sentinel fires it. See [Collector Tools](/docs/app/collector-tools).

**Workspace** — A saved whole-app configuration — modes, spells, settings — switchable in one tap and backed by a Setup Code. See [Settings & Display](/docs/app/settings-and-display).

## Nomenclature

The canonical platform vocabulary, locked:

- **Collection** — banned. Use **Project**.
- **Edition** — banned. Use **Output** (single unit) or **Outputs** (the set / supply).
- **Collector** as a generic noun for any account — banned; use **user** unless ownership is the salient fact.

Industry-spec carve-outs that keep their original terms: **Token** in Solidity / ERC-721 / on-chain contexts; **open edition** only in contract docstrings for "0 = unlimited" semantics (PD Projects are always fixed-supply; open editions exist only inside [sticker PACK pools](/docs/contracts/pd-stickers)).

## Further reading

- [Introduction](/docs)
- [The App overview](/docs/app/overview)
- [Contracts overview](/docs/contracts/overview)
