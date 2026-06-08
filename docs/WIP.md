# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** everything is on `dev` and live (origin/dev tip `88a6abf`). Start
  fresh work from `dev`. This chat's task branch `claude/festive-mccarthy-3gnl6h`
  is trash now (work is on dev) — Brendon to delete it on GitHub.
- **Updated:** 2026-06-08

## ✅ LANDED THIS SESSION — on `dev`

1. **Every-message rules hook (`.claude/rules-reminder.sh` + UserPromptSubmit
   wire-up).** Re-injects the distilled CLAUDE.md non-negotiables into context
   on EVERY prompt Brendon sends, right before the reply — the enforcement lever
   the start-of-session read couldn't give (long contract drifts as a chat
   grows). Covers: no polls / no approval-fishing, no jargon, no condescension,
   truth-first, fix-only-the-named-thing, ship gates, PUSH = dev. It's a
   distilled checklist, NOT a replacement — CLAUDE.md stays the full contract;
   when a rule diverges, fix BOTH. (Birthed this session after repeated MD
   non-adherence: a poll Brendon hates, jargon, explaining his own product back
   to him.)

## 🗒️ Prior session (still true)

- **Magic Hour art engine renamed off the "Petey" codename** (now
  `lib/art/engines/magicHour.ts`). **@petey stays as the ARTIST**; Petey
  mascot/logo untouched. Only the *project* naming was the bug.
- **CLAUDE.md hardened:** real-world-not-training header; §7 truth-first / no
  overselling; §7 just-do-the-helpful-thing (lookups pre-approved, ship gate
  intact); §0 branch hygiene (only main+dev+chat branch; env blocks deletion);
  §0 "WRAP UP" ritual.

## 🎨 FRONT END — simulated collecting (discussed this chat, NO code yet)

Honest state of the front end for the simulated collect loop:
- **Working:** the collect loop is wired — a simulated mint writes to Supabase,
  the profile **Collected** tab reads real holdings back (facet filter / search /
  sort via `ProfileFacetBar`). Profile page is the most finished surface.
- **GAP 1 — home page is a placeholder, not a design.** `HomePageBody` renders
  (hero + New Art / Sales / Shuffle tabs) but on HARDCODED fakes: `PLATFORM_STATS`
  (500 minted / 14.2 vol), a fixed `FEATURED_ARTISTS` list, `MOCK_SALES`. Needs a
  real design + wiring to live data. **Brendon's likely first pick** (the front
  door). Not started.
- **GAP 2 — direct profile links are bare "proof" stubs:** `/{handle}/collected`,
  `/starred`, `/wishlist`, `/anointed`, `/notes`, `/albums`. The real experience
  only lives INSIDE the profile tabs, so shared/deep links look broken.
- **GAP 3 — polish:** volume-spent stat is a dash; Sales feed is mock until the
  indexer's live; trait-pill filtering on browse surfaces (project/home) is
  profile-only (needs per-Output mint ts plumbed into browse — minor, low pri).
- **Next:** Brendon to call which gap leads. My rec was the home page.

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
