---
title: "Building on PD"
description: "PD wants community-built tools: what you can build on today (the fully open chain surface), what's coming to the API reference, and the conventions that make agents and tools first-class citizens."
category: "building"
keywords: ["build", "developers", "community tools", "api", "integrations"]
last_updated: "2026-07-17"
---

# Building on PD

Price Discussion wants a tool ecosystem it didn't build. The platform's own surfaces are opinionated readings of the market — but the underlying data belongs to the chain and the community, and the best trackers, dashboards, bots, and analysis tools will come from collectors who wanted something PD doesn't do. Build them. This page is the map of what's open.

## The chain surface — open today, permissionless forever

Everything tokenized lives on Ethereum, readable by anyone, with no key, no rate limit PD controls, and no permission to ask:

- **Authenticity** — one call answers whether any contract is a real PD Project: `PDFactory.isProject(address)`. See [the verification pattern](/docs/for-collectors/the-secondary-market).
- **Ownership & provenance** — standard ERC-721 `Transfer` events give every Output's full custody chain; `PDProject.totalSupply()` and `tokenHashes(id)` give mint state and each piece's generative seed.
- **The art itself** — `tokenURI` returns the complete, self-contained artwork; `getScript()` hands you the raw generative script. You can re-render any Output from chain data alone — that's the [whole design](/docs/contracts/pd-project).
- **Live activity** — `Minted` and `ProjectCreated` events are the platform's real-time pulse; every indexer trick that works on Ethereum works on PD.
- **Money mechanics** — royalty splits, pending balances, and every payout are readable on the [Project](/docs/contracts/pd-project) and [splitter](/docs/contracts/payment-splitter) contracts.
- **The sticker economy** — sheets, print runs, sealed supply, and pool state are all public reads on [PDStickers](/docs/contracts/pd-stickers); `sealedOutstanding` alone is a market-data feed waiting for a chart.

A weekend's work gets you a mint bot, a floor tracker, a provenance checker, a portfolio dashboard, or a renderer — with no dependency on PD's servers at all.

## The API surface — real, growing into its public reference

PriceOS runs on its own HTTP API: public reads for projects, outputs, users, and social state, with writes authenticated by [Sign-In With Ethereum](/docs/for-collectors/wallet-setup). It is the source of truth for everything the chain doesn't hold — @names, follows, stars, albums, and the social layer around the art.

The API reference is being published into these docs section by section as endpoints stabilize toward launch. Until an endpoint appears here, treat it as unstable — the chain surface above is the durable foundation to build on first.

## Agents are first-class

Every page of this documentation is machine-readable by design: [/llms.txt](/llms.txt) is the index, [/llms-full.txt](/llms-full.txt) is the whole site in one fetch, and any page's URL + `.md` returns raw markdown. If you're building with an AI agent — or building an agent — start it there; the docs were engineered to be its context.

## House rules

Three, all obvious:

1. **Don't impersonate PD.** Name your tool as yours; verification patterns exist so nobody has to trust a lookalike.
2. **Respect the chain's economics.** Tools that honor EIP-2981 keep artists paid; tools that route around it are venue-side choices PD's contracts can't stop, but the community notices.
3. **Ship it.** The platform's thesis is that the community's reading of the market *is* the product — community tools are that thesis, running.

## Further reading

- [Contracts Overview](/docs/contracts/overview) — the full protocol reference
- [Quickstart](/docs/quickstart) — the developer path
- [The Secondary Market](/docs/for-collectors/the-secondary-market) — verification patterns
