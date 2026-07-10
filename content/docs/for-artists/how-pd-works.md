---
title: "For Artists — How PD Works"
description: "The platform from the artist's side: the curation thesis, what deploying on PD actually means, the economics in plain terms, and what makes PD different."
category: "for-artists"
keywords: ["artists", "curation", "onboarding", "generative art"]
last_updated: "2026-07-10"
---

# For Artists — How PD Works

Price Discussion is a curated platform for generative art where the market conversation around a work is treated as part of the work's life. This page is the plain-terms framing; the deeper pages cover [submission](/docs/for-artists/submit-a-project), [the mint flow](/docs/for-artists/the-mint-flow), and [royalties](/docs/for-artists/royalties).

## The curation thesis

**Secondary market prices as aesthetic discourse.** PD curates generative work where price discovery becomes part of the conceptual frame — not a vehicle for the work, but a contributor to it. The platform's entire surface (Price Story, the Genome, the Tape, Pings) is built to read market movement as a community talking about art.

Every Project on PD is curated. There is no permissionless deployment; the curation gate is enforced off-chain through the [submission process](/docs/for-artists/submit-a-project), and on-chain through an artist whitelist on the factory contract.

## What deploying on PD means

Your Project is a **separately deployed, immutable ERC-721 contract** that you create by calling the factory yourself, from your own wallet. The consequences are worth spelling out:

- **The art lives on Ethereum.** Your generative script is stored on-chain, and every Output's `tokenURI` renders from chain data alone. No server, no IPFS pin, no platform dependency for the art itself. If PD disappeared tomorrow, your work would keep rendering.
- **You are the artist on-chain.** The deploying wallet is recorded as the Project's immutable artist address — it receives primary proceeds and secondary royalties forever, and no one can change it.
- **The terms are permanent.** Supply, mint price, and script are fixed at deployment. There is no admin function, no pause, no upgrade path — on your contract or anyone else's.

## The economics in one paragraph

Primary: **95% of every mint goes to you, paid in the mint transaction itself** — no escrow, no claim step, no platform custody, plus a small flat per-token storage fee that goes to the platform's storage wallet to fund preview infrastructure. Secondary: every Project signals a **5% royalty via EIP-2981**, split **3% to you / 2% to the platform** through a per-Project splitter you can withdraw from at any time, permissionlessly. Full detail with contract signatures on the [Royalties](/docs/for-artists/royalties) page.

## What PD asks of the work

- **Generative, seriously.** The script is the artwork. PD stores it on-chain and renders every Output live from its token hash.
- **Price Discussion–shaped.** Work whose meaning can hold up — or sharpen — when the market's reaction becomes part of its context.
- **Edition sizes between 22 and 9,999.** Enforced by the factory at deployment.
- **One Project at a time.** The factory enforces a 60-day cooldown between an artist's deployments, so each Project gets its own air.

## Further reading

- [Submit a Project](/docs/for-artists/submit-a-project)
- [The Mint Flow](/docs/for-artists/the-mint-flow)
- [Royalties](/docs/for-artists/royalties)
- [PDProject contract reference](/docs/contracts/pd-project)
