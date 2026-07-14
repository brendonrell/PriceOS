---
title: "For Collectors — The Secondary Market"
description: "How PD Outputs trade after mint: PD's own market and offer book, Takeovers, third-party venues, the 5% EIP-2981 royalty, and how to verify authenticity before buying."
category: "for-collectors"
keywords: ["secondary market", "trading", "offers", "listings", "takeover", "royalties", "verification", "isProject"]
last_updated: "2026-07-12"
---

# For Collectors — The Secondary Market

After primary mint, Outputs trade two ways: **inside PD**, on the platform's own market and offer book, or anywhere else their owners choose — they're standard ERC-721s. This page covers both, what the royalty does, and how to verify a piece before you buy it.

## Trading inside PD

PD runs its **own order book** — listings and offers live in the app, and the community's discussion happens where the prices are:

- **List, buy, and offer** from any Output page. Offers come in three scopes: a single piece, **any piece of a collection**, or **any piece with a trait** you name.
- **Batch actions** — multi-select pieces to list, re-list, or offer on many at once with one signature; **sweeps** fill several listings in one motion.
- **The Offers book** — every Project's **+More → Offers** tab is the offers HQ: the full live book of item, collection, and trait bids, searchable, with each row actionable on its piece.
- **[Takeover](/docs/for-collectors/hostile-takeover) ⚑** — the blanket premium bid on another collector's entire position. Takeover offers ride the same book, wear a badge in the Offers tab, and cannot be withdrawn during their 72-hour window — enforceable precisely because the book is PD's own.

During the test phase the book settles in sim ETH; at chain cutover the same book carries wallet-signed Seaport orders and settles on-chain. Nothing about the surfaces changes.

## Trading elsewhere

Also fully supported: third-party marketplaces with standard ERC-721 trading. Every PD Project signals a **5% royalty through EIP-2981** — venues that honor the standard route 3% of each sale to the artist and 2% to the platform automatically, via the Project's own on-chain splitter. Venues that ignore the standard can trade the token without paying it; that is a marketplace-side choice no contract can prevent.

## How PriceOS reads the market

Listings, offers, sales, and transfers flow back into the app and become the discussion:

- **The Tape** — the persistent live ticker of market events running through the app chrome.
- **Price Story** — the narrative reading of a Project's or Output's price history.
- **Pings** — your notification stream for the events you care about: sales of your pieces, wishlist hits, follows, price crossings. See [Pings](/docs/pings/overview).
- **The Genome, the Radar, Price Targets** — the analytical layer. See [the App overview](/docs/app/overview).

## Verify before you buy

Anyone can deploy an ERC-721 and claim it is a PD Project. Authenticity is a single on-chain read against the factory — definitive, free, and independent of PD's servers:

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({ chain: mainnet, transport: http() })

const authentic = await client.readContract({
  address: PD_FACTORY_ADDRESS,
  abi: pdFactoryAbi,
  functionName: 'isProject',
  args: [projectAddress],
})
// true ⇔ this contract was deployed by PDFactory
```

The app only ever surfaces authentic Projects, so verification matters mainly when you're buying somewhere PD isn't — an unfamiliar venue, a private deal, a link someone sent you.

Full provenance — the original minter and the complete custody chain — is readable from the Project contract's standard `Transfer` events and each Output's on-chain `tokenHash`.

## What you pay

The listing price, the venue's gas, and any venue-specific fee. The royalty comes out of the seller's proceeds, not on top of your price.

## Further reading

- [How PD Works](/docs/for-collectors/how-pd-works)
- [Royalties, from the artist's side](/docs/for-artists/royalties)
- [PDFactory contract reference](/docs/contracts/pd-factory)
