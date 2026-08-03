---
title: "Contracts — PDKeychains"
description: "The capsule machine's ERC-721: one-of-one living charms drawn entirely on-chain, luck-tilted rarity rolls, the polish attestation, the keeper bond, and the christened name."
category: "contracts"
keywords: ["PDKeychains", "keychains", "charms", "capsule machine", "ERC-721", "on-chain art", "luck", "polish"]
last_updated: "2026-08-02"
---

# Contracts — PDKeychains

The [Depanneur's capsule machine](/docs/keychains/overview) on-chain: an ERC-721 where every Keychain is a one-of-one generative charm, drawn entirely at read time by a renderer contract — no stored images, no external anything. In the app's test phase the machine runs on sim-ETH; this contract is the same machine for real ETH, and deploys with the platform's launch wave.

## The crank

```solidity
function crank(uint8 coin, uint32 streak, uint8 rank, uint256 deadline, bytes calldata sig)
    external payable returns (uint256 tokenId);
```

Insert coin, crank, a random charm drops — one per crank, that's the ritual. The two **coin slots** (`0` YIN · `1` YANG) steer palette, face, and accessory weights; shapes are universal, so the rarest chase is equal on either slot. The charm's seed rolls from fresh block data plus the minter and token id, unknowable at send, and cranking is EOA-only so the roll can't be bundled and reverted away. Payment is exact and pushed out inside the transaction — platform 5% (wallet read live from [the factory](/docs/contracts/pd-factory)), remainder to the shop — so no ETH ever rests here.

**THE ART BELONGS TO THE CHARM, NOT THE KEEPER.** Colour, finish, and chain metal all roll per charm off its own seed on a common→rare ladder — gold and chrome are genuine rare pulls. What the keeper's PD life buys is **LUCK**: `sig` is the app's attestation (the factory's settlement key) of the cranker's live PriceStreak and PriceRank; the machine derives an odds tier (0–3) from it on-chain and freezes it into the charm forever. Luck only widens the rare end of the rolls — it never repaints a charm afterwards. An empty `sig` cranks unattested at luck 0, the floor odds, so the machine keeps turning even if the signer is down — and that can't be gamed, because the floor is the worst tier there is.

## The living layer

- **Polish** — `polish(...)` syncs the keeper's attested PriceStreak/PriceRank onto the charm's traits (EIP-712 signature, per-charm nonce, keeper-bound, deadline). It records their life; it cannot change the art, by design — the suite proves a maximum-life polish leaves the artwork byte-identical.
- **The bond** — every hand-to-hand transfer wipes the polish: a keeper's life is not a purchasable state. The charm's own identity — seed, coin, luck, and christened name — survives forever, so a sold charm looks exactly as it always did.
- **Christen** — name your charm once, ever, engraved on its tag. 2–12 characters, A–Z 0–9 and space, charset-guarded on-chain so a name can never break the metadata.

## The art, on-chain

`tokenURI` and `charmSVG` draw the complete charm — shape, googly face, rubber-hose arms, chain, finish, accessories, the swing and the blink — as a self-contained SVG assembled by **PDKeychainRenderer** with three part stores beside it (shapes · faces · trait names), split only for the EVM's contract-size limit and referenced immutably: the four contracts are one artist. The attributes lead with the charm's **Element** (six elements, two shapes each), then coin, shape, palette, material, eyes, and the rest, plus the keeper's attested PriceStreak and PriceRank.

The renderer address is swappable by the shop admin during an art-bugfix window, then `lockRenderer()` freezes the art forever — one way, no reopening.

## Royalties and admin

5% secondary royalty (ERC-2981) to the shared royalty vault. Admin holds price and on/off dials plus the renderer window, transfers two-step, and can never touch a minted charm's seed, luck, name, or traits.

## Further reading

- [Keychains in the app](/docs/keychains/overview) — the Depanneur, wearing, the hang
- [PDFactory](/docs/contracts/pd-factory) — the settlement key the attestations ride
- [Contracts Overview](/docs/contracts/overview)
