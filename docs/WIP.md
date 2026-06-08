# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** everything is on `dev` and live (origin/dev tip `68b0e33`). Remote
  is now clean — **only `dev` + `main` exist** (all stale per-chat task branches
  deleted). Start fresh work from `dev`.
- **Updated:** 2026-06-08

## ✅ LANDED THIS SESSION — on `dev`

1. **Magic Hour art engine renamed off the "Petey" codename** (now
   `lib/art/engines/magicHour.ts`). **@petey stays as the ARTIST**; the Petey
   mascot/logo is untouched. Only the *project* naming was the bug.
2. **CLAUDE.md hardened (process locks):**
   - **Real world, not training** (top of file) — mistakes cost real money/time.
   - **§7 No overselling / truth-first** — caveats up front, never assert an
     unverified assumption (Railway/Alchemy misses birthed it).
   - **§7 Just do the helpful thing / never fish for a "yes"** — lookups are
     pre-approved; act then report. Does NOT loosen the ship gate (code/pushes
     still need approval).
   - **§0 Branch hygiene** — only `main` + `dev` + current-chat branch; rest is
     trash. Env BLOCKS branch deletion (403) — Brendon deletes on GitHub.
   - **§0 "WRAP UP" ritual defined** — push outstanding → prompt Brendon to
     delete the chat branch → update this baton last.

## 🧭 DIRECTION SET THIS SESSION (decisions — no code yet)

- **Indexer = our OWN event DB, fed by Alchemy free tier** (~rounding-error
  usage vs 300M CU/mo). Live via Alchemy webhooks → our site → Supabase; periodic
  reconcile sweep catches misses; mark-final after a few blocks for reorgs. **No
  Ponder / no Railway / no paid always-on host.** Our indexer captures only
  *settled* on-chain events (mint/transfer/sale); live listings/offers come from
  OpenSea, not us. Indexer only matters once on-chain (Sepolia/mainnet) — the
  no-chain test needs none.
- **Secondary market = white-label on OpenSea/Seaport shared order book** (Art
  Blocks model). OpenSea API is free (instant key; free posts 5/min, upgrade form
  lifts it). Their fee (~1–2.5%, **read live per-collection, never hardcode**)
  must be baked into any order we post to their book. Keep our OWN copy of every
  order as a private fallback. Reservoir (aggregator) shut down Oct 2025 — go
  direct.
- **Cost philosophy:** pass user-facing costs through transparently (storage,
  OpenSea fee — itemized), keep platform fixed costs ~$0. Sustainability = a
  feature.
- **Hosting:** stay on Vercel now (bandwidth exposure is low — art is generative,
  rendered client-side; heavy media is off-platform). $20/mo Pro when revenue
  starts + a hard spend cap. Eventual move to Cloudflare Workers (OpenNext),
  bundled with a Next 15/16 upgrade, **before public launch / after Sepolia
  mechanics proven.** Not urgent.

## 🎯 OPEN / NEXT
- Clean slate on `dev`. Likely next ships per the direction above: (a) stand up
  the no-chain test surfaces (point the mocked read routes at the real chainless
  activity the mint/market routes already write); (b) begin the own-indexer build
  (Alchemy webhooks → Supabase) for the Sepolia phase.

### ⚠️ Magic Hour project page — LOST, needs rebuild
- The Magic Hour project page / showcase (welcome cards) lived ONLY on the
  deleted Petey branch — it's gone. Rebuild on `dev` when picked up. Naming is
  settled: project = **Magic Hour**, artist = **@petey**.

## Backlog (later)
- Surface platform traits as pills on the project page / discovery (needs
  per-Output mint timestamps in ProjectContext, like the profile has).
- `tokenURI`/metadata generator for real OpenSea attributes (lands with on-chain).
- Logo `/$price` → 404; reserved token/social routes not built (see prior notes).
- Running "Easter-egg gen-art" list in the Atlas (Tabstract / ghosts / 404 /
  favicon / pull-to-refresh).

## Process / gates
- **PUSH = `dev`, instantly** (CLAUDE.md §0). App pushes need Brendon's numbered
  approval; docs/process pre-approved.
- git-guard blocks main writes (escape: `PD_ALLOW_MAIN=1`).

## main / production — untouched
