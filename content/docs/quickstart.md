---
title: "Quickstart"
description: "Five paths into Price Discussion: artists submitting work, collectors connecting a wallet, developers reading the contracts, agents fetching markdown, and the curious."
category: "introduction"
keywords: ["quickstart", "getting started", "introduction"]
last_updated: "2026-07-10"
---

# Quickstart

Five paths into Price Discussion, each in under a minute of reading. Pick the one that matches your role.

## I am an artist

Read [How PD Works](/docs/for-artists/how-pd-works) for the curation thesis and the deal in plain terms. When you are ready:

1. [Submit a Project](/docs/for-artists/submit-a-project) covers what to send and what happens next.
2. [The Mint Flow](/docs/for-artists/the-mint-flow) is what actually happens on-chain when your Project deploys and mints.
3. [Royalties](/docs/for-artists/royalties) is the money page: 95% of every primary mint to you, paid at mint time in the mint transaction itself; 3% of every secondary sale via EIP-2981.

## I am a collector

Connect a wallet on the app and sign in with Ethereum — your wallet is your identity, there is no separate account and no email.

1. [Wallet Setup](/docs/for-collectors/wallet-setup) covers wallets, Sign-In With Ethereum, and the @name.
2. [The Secondary Market](/docs/for-collectors/the-secondary-market) covers trading PD Outputs and verifying authenticity before you buy.
3. [The App overview](/docs/app/overview) tours the surfaces you'll actually live in.

Browsing, starring, wishlisting, and following are free. Fees exist only where a transaction touches the chain: minting and trading.

## I am a developer

The chain is the source of truth for everything tokenized; the app is the source of truth for everything social. Start with the [contract architecture](/docs/contracts/overview), then the per-contract pages — every signature in them is taken from the deployed source:

- [PDFactory](/docs/contracts/pd-factory) — deploys every Project, holds the artist whitelist and platform wallets.
- [PDProject](/docs/contracts/pd-project) — the per-Project ERC-721: fully on-chain generative art, push-pattern payouts, EIP-2981.
- [PaymentSplitter](/docs/contracts/payment-splitter) — the per-Project secondary royalty splitter.
- [PDLibraryRegistry](/docs/contracts/library-registry) — blessed JavaScript libraries stored on-chain for the art to use.

## I am an AI agent

Everything on this site is built to be read by you:

- [/llms.txt](/llms.txt) — machine-readable index of every page, with descriptions.
- [/llms-full.txt](/llms-full.txt) — the entire documentation as a single markdown file.
- Every page is raw markdown at its own URL + `.md` (for example `/docs/quickstart.md`).

Authenticity of any claimed PD Project is verifiable on-chain with one call: `PDFactory.isProject(address)`. See [The Secondary Market](/docs/for-collectors/the-secondary-market) for the verification pattern.

## I am just curious

Read the [Introduction](/docs) for the platform in one page, then the [App overview](/docs/app/overview) for what PriceOS actually feels like. The curation thesis in one sentence: **secondary market prices as aesthetic discourse.** That sentence is the door.

## Further reading

- [Introduction](/docs)
- [Smart Contracts Overview](/docs/contracts/overview)
- [$PRICE Token](/docs/price-token/overview)
- [Glossary](/docs/reference/glossary)
