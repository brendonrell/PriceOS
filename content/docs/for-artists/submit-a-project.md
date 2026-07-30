---
title: "For Artists — Submit a Project"
description: "How to submit work to Price Discussion: what to include in the brief, how decisions are made, and what happens between acceptance and deployment."
category: "for-artists"
keywords: ["submit", "filter", "brief", "artists"]
last_updated: "2026-07-10"
---

# For Artists — Submit a Project

PD is filtered, not curated: every Project starts as a submission, and deployment is gated by an on-chain artist whitelist — but the gate is a quality floor, not a taste-making program. This page covers what to send, how decisions happen, and the path from acceptance to a deployed contract.

Submissions arrive through the same door every artist relation does: a direct message on X. See [Get in Touch](/docs/for-artists/get-in-touch).

## What to submit

The initial submission is a brief that lets the filter understand the work — not a finished project ready to deploy. A strong brief includes:

- **A description of the work.** What it is conceptually, what the algorithm is doing, and what ranges the parameter space produces.
- **A representative gallery.** Twenty to fifty rendered outputs covering the range of the work — the true distribution, not cherry-picked highlights.
- **An algorithm description.** A plain-language explanation of the generation logic. Source is welcome but not required at submission.
- **A sense of scale.** Intended edition count (PD Projects run from 22 to 9,999 Outputs) and target mint price.
- **A sense of who you are.** Where the work has been shown, and where you come from culturally and aesthetically.

## How decisions are made

The filter is Brendon, with input from a small invited circle. Submissions are evaluated qualitatively — there is no formula, no rubric, no scoring — and decisions arrive in conversation with the submitting artist, as one of:

- **Yes, let's proceed.** The platform and the artist work through the specifics together: edition count, mint price, timing, and the surrounding context for the release.
- **Not yet.** A specific reason, and what would unlock further conversation.
- **Not a fit.** A direct explanation of why the work sits outside PD's thesis — often with a suggestion of platforms that fit it better.

### The vouch route

There is a second door: every whitelisted PD artist holds **two vouch slots**
and can put an artist forward from [their Studio](/docs/studio/overview). A
vouch lands directly on the founder's desk and opens the conversation — it is
input to the filter, never automatic admission.

## From acceptance to deployment

1. **Whitelisting.** The factory admin whitelists your wallet on-chain (`PDFactory.whitelistArtist`). Deployment is impossible without it.
2. **Script preparation.** Your generative script is prepared for on-chain storage — it reads the token hash PD's contract assigns each Output and must render deterministically from it. If the work uses a library (p5.js, three.js, …), it binds one of the on-chain [blessed libraries](/docs/contracts/library-registry).
3. **You deploy.** You call `createProject` on the factory from your own wallet, with your name, symbol, supply, mint price, library choice, and script. The transaction deploys your Project contract and its royalty splitter atomically. See [The Mint Flow](/docs/for-artists/the-mint-flow).
4. **The Project page goes live.** PriceOS picks the new Project up from the factory's `ProjectCreated` event.

The factory enforces a **60-day cooldown** between an artist's Projects, counted from deployment.

## Further reading

- [How PD Works](/docs/for-artists/how-pd-works)
- [The Mint Flow](/docs/for-artists/the-mint-flow)
- [PDFactory contract reference](/docs/contracts/pd-factory)
