---
title: "For Collectors — Wallet Setup"
description: "Getting onto Price Discussion: wallet compatibility, Sign-In With Ethereum, claiming an @name, and what signing in does and doesn't cost."
category: "for-collectors"
keywords: ["wallet", "SIWE", "sign in", "@name", "ENS"]
last_updated: "2026-07-10"
---

# For Collectors — Wallet Setup

Your wallet is your identity on PD — there is no separate account, no email, no password. This page covers connecting, signing in, and the identity layer the app builds on top of your address.

## Which wallet

Any Ethereum wallet that supports standard browser injection (EIP-1193) or WalletConnect works: MetaMask, Rainbow, Coinbase Wallet, smart-contract wallets, hardware setups behind them — collector's choice. PD is wallet-neutral and recommends none over another.

## How to sign in

PD uses [Sign-In With Ethereum](https://eips.ethereum.org/EIPS/eip-4361) (SIWE):

1. Tap **Connect** in the app and pick your wallet.
2. Approve the connection in the wallet.
3. Sign the SIWE message it shows you. This is a signature, not a transaction — it costs nothing and commits nothing on-chain.
4. The signature creates your session; return visits recognize you automatically.

## Your @name

On first sign-in you claim an **@name** — your handle across the platform — and set up your identity: a **PriceSprite** (your character face), your colorway, and your profile. The @name appears everywhere you act on PD; your address stays underneath it. ENS names are read and displayed where you have them, and setting an ENS reverse record makes every Ethereum app, PD included, read better — but PD's own identity layer is the @name.

## What signing costs

Nothing. Signing in, browsing, starring, wishlisting, albums, follows, price targets, and the whole collector toolset are free. Costs exist only when you transact on-chain — minting an Output or trading on a secondary venue — and your wallet shows you those before you approve anything.

## Further reading

- [How PD Works](/docs/for-collectors/how-pd-works)
- [The Secondary Market](/docs/for-collectors/the-secondary-market)
- [Identity & Profiles in the app](/docs/app/identity-and-profiles)
