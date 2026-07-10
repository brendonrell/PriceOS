---
title: "PD Studio — Publishing"
description: "The road from a tested draft to a live Project: the curation gate, the Studio's preflight checks, and the deploy you sign from your own wallet — on your phone."
category: "studio"
keywords: ["publishing", "deploy", "preflight", "whitelist", "createProject"]
last_updated: "2026-07-10"
---

# PD Studio — Publishing

Publishing is the moment the Studio exists for: a draft you have tested into
the ground becomes a Project on Ethereum, deployed by you, from your wallet,
immutable from its first block. The Studio's job here is to make that moment
boring — every surprise should have been used up in
[testing](/docs/studio/upload-and-testing).

## The gate hasn't moved

PD is curated, and the Studio doesn't change that.
[Submission and curation](/docs/for-artists/submit-a-project) work as they
always have, and deployment still requires your wallet on the factory's
on-chain whitelist. What changes is everything around the gate: the brief you
submit can be born from a Studio draft — real rendered ranges instead of
cherry-picked highlights — and once you're whitelisted, the path from
acceptance to a live contract is a signature instead of a project.

## Preflight

Before the Studio lets a draft anywhere near the chain, it checks the things
the factory will enforce and the things you'd hate to discover afterwards:

- **The script is the tested script** — what deploys is byte-for-byte the
  draft your runs proved, packaged for on-chain storage.
- **The parameters are within protocol bounds** — supply between 22 and
  9,999, a fixed mint price, a bound library from the on-chain registry (or
  none), your whitelist status, and your 60-day cooldown.
- **A final rehearsal render** — a last test run on the exact deploy package,
  so the thing you confirm is the thing that freezes.

## The deploy

Deployment is [one transaction](/docs/for-artists/the-mint-flow): you sign
`createProject` on the factory **from your own wallet**. The Studio prepares
the transaction; it never holds keys, never signs for you, and never sits
between you and your contract. On PD, artists have always deployed from a
phone — the Studio simply puts the preparation and the confirmation on the
same screen as the signature.

The transaction deploys your Project contract and its royalty splitter
atomically, and from that block nothing about the Project can be changed — by
you, by PD, by anyone. That permanence is the point, and it is why the Studio
front-loads so much rehearsal.

## After the signature

The platform picks your Project up from the factory's `ProjectCreated` event
— the Project page goes live on its own, with no upload step and no waiting
on PD. From that moment your Project appears in
[the Artist Dashboard](/docs/studio/the-artist-dashboard), where the
watching, measuring, and managing begins.

## Further reading

- [The Artist Dashboard](/docs/studio/the-artist-dashboard)
- [Submit a Project](/docs/for-artists/submit-a-project)
- [The Mint Flow](/docs/for-artists/the-mint-flow)
