---
title: "For Collectors — The Secondary Market"
description: "How PD Outputs trade after mint: third-party marketplaces, the 5% EIP-2981 royalty, how PriceOS reads the market, and how to verify authenticity before buying."
category: "for-collectors"
keywords: ["secondary market", "trading", "royalties", "verification", "isProject"]
last_updated: "2026-07-10"
---

# For Collectors — The Secondary Market

After primary mint, Outputs trade wherever their owners choose to trade them. PD deliberately does not operate a marketplace — it operates the *reading* of the market. This page covers how trading works, what the royalty does, and how to verify a piece before you buy it.

## Where trading happens

On third-party marketplaces that support standard ERC-721 trading. Every PD Project signals a **5% royalty through EIP-2981** — venues that honor the standard route 3% of each sale to the artist and 2% to the platform automatically, via the Project's own on-chain splitter. Venues that ignore the standard can trade the token without paying it; that is a marketplace-side choice no contract can prevent.

## How PriceOS reads the market

Listings, offers, sales, and transfers flow back into the app and become the discussion:

- **The Tape** — the persistent live ticker of market events running through the app chrome.
- **Price Story** — the narrative reading of a Project's or Output's price history.
- **Pings** — your notification stream for the events you care about: sales of your pieces, wishlist hits, follows, price crossings. See [Pings](/docs/app/pings).
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
