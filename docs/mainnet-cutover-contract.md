# THE MAINNET CUTOVER RUNBOOK
**Status: RULED — Brendon, 2026-07-17.** The earlier version of this page
framed the sim era's fate as five open decisions with recommendations; that
framing was my invention — the plan was always the wipe and it never
changed. This page is now the runbook. Do not reopen the "decisions."

---

## The ruling (the governing spec, Brendon's words)

> It all gets wiped. It all goes, the real platform arrives. The only things
> that survive are account **@names** and **PriceSprites**.

Concretely: at cutover the sim era ends and its artifacts go — sim-ETH
balances, all sim market history (sales, listings, offers, feeds, archives),
sim-era achievements, PriceScore/PriceRank standings, streaks, and every
other sim-era stat. Accounts persist as identity only: the @name and the
PriceSprite. Mainnet starts clean; the chain is the ledger from block one of
PD's contracts.

## The flip checklist (mechanical — no decisions left in here)

1. **Staging split live BEFORE anything else** (report §3.5): dev deploys to
   a staging Worker + DB branch; `main` deploys to production. From that day
   a dev merge no longer touches the real platform.
2. **The wipe migration.** One reviewed migration that clears the sim era
   and reduces user rows to identity (@name, PriceSprite, auth linkage).
   The PR enumerates every table and column it clears, line by line, and is
   rehearsed in the CI rig (`docs/briefs/rpc-test-rig.md`) before cutover
   day; it reaches the live DB through the standing prod-data gate like any
   other migration.
3. **Environment flip:** chain id → mainnet, Alchemy URL/key → mainnet,
   webhook re-pointed at the mainnet contracts + signing key rotated,
   `SIGNUP_SIM_ETH_GRANT` → 0.
4. **Registry price pass.** Every project's mint price is real money at the
   flip; the two known test values (bulletin 0.2222 / reliquary 22.222 —
   flagged in WIP since June) corrected in the same pass.
5. **Indexer proof.** Webhook + reconcile verified against the first real
   mint before any announcement.

Feeds the Mythic Audit (`86b9v5wj4`). The wipe also retires every
"sim-era data migration" concern from earlier planning — there is nothing
to migrate.
