# THE MAINNET CUTOVER CONTRACT — what happens to the sim world on real-money day
**Drafted 2026-07-13 (hardening item 19 / report §5.7). STATUS: DRAFT —
every numbered decision below is BRENDON'S CALL. Each carries my
recommendation; nothing here is decided until he says so in chat, and his
answers get written back into this page as the record.**

The single hairiest transition PD has ahead: the day on-chain state becomes
the source of truth, the playful sim economy's forgiveness disappears. This
page exists so that day is a checklist, not an improvisation.

---

## Decision 1 — sim-ETH balances
Every account holds play-ETH (signups seeded 1,000,000). At cutover real
wallets hold real ETH.
- **(a) Freeze & display**: sim balances stop mattering, kept visible as a
  "Beta Era" keepsake stat.
- (b) Wipe entirely.
- **RECOMMENDATION: (a).** Zero risk of confusion with real balances if the
  UI labels it clearly, and it preserves beta users' history (identity/
  nostalgia is PD's whole texture). Wiping erases early-adopter lore for no
  gain.

## Decision 2 — sim-era market history (events, sales, listings, offers)
- **(a) Archive-and-mark**: keep every row, tag pre-cutover events as the
  Beta Era (feeds/rewind render them, clearly marked; the Dispatch archive
  stays intact).
- (b) Wipe to a clean chain-only ledger.
- **RECOMMENDATION: (a).** The Rewind, the Dispatch archive, natal charts,
  and the Book of Conquests are built on continuity — a wipe amputates the
  platform's own mythology. The indexer writes chain events from block zero
  of PD's contracts anyway, so the ledgers don't collide.

## Decision 3 — achievements / PriceScore / PriceRank earned in the sim era
- **(a) Carry over untouched** — the climb is the climb.
- (b) Reset everyone to zero for a "fair" mainnet start.
- (c) Carry over but stamp a "Founder" cohort marker.
- **RECOMMENDATION: (c).** Carrying over rewards the people who built the
  place; the cohort stamp turns a fairness complaint into a status symbol.
  A reset punishes exactly the users PD needs evangelizing at launch.

## Decision 4 — the zeroed projects (chladni, pressroom, ictus, caustics,
## cyanotype, vanguard, frost-fern, conservatory, topiary)
Zeroed 2026-07-12 after the texture-layer perf pass. At cutover all projects
start minting on-chain from zero anyway.
- **RECOMMENDATION: no action needed** — cutover naturally supersedes; just
  confirm the registry's test prices are final real prices (Decision 5).

## Decision 5 — test prices in the registry
`bulletin 0.2222` · `reliquary 22.222` (flagged in WIP since June).
- **RECOMMENDATION:** price pass over the FULL registry as a cutover-week
  task (every project's mint price is suddenly real money); the two test
  values are just the known-wrong ones.

## Decision 6 — the signup grant
`SIGNUP_SIM_ETH_GRANT` → `0` at cutover (already the plan; Worker secret
flip, no deploy needed). **RECOMMENDATION: yes, in the same hour as the
chain flip.**

## Decision 7 — the mechanical flip (no decision, the checklist)
1. `.env.production`: `NEXT_PUBLIC_CHAIN_ID` → 1, Alchemy URL/key → mainnet.
2. Worker secret `ALCHEMY_RPC_URL` → mainnet endpoint.
3. Alchemy webhook re-pointed at mainnet contracts; signing key rotated →
   Worker secret updated.
4. `SIGNUP_SIM_ETH_GRANT` → 0.
5. Registry price pass (Decision 5) merged.
6. Staging split live BEFORE any of the above (report §3.5): dev deploys to
   a staging Worker + Supabase branch; `main` deploys to the real one. From
   that day, dev-merge ≠ touch-production.
7. Indexer webhook + reconcile verified against the first real mint before
   announcing.

## Decision 8 — sim trading between cutover announcement and the flip
Announce a freeze window? A last "closing bell" event (very PD — the
Dispatch covers the sim era's final day)?
- **RECOMMENDATION:** 24h announced wind-down + a commemorative final
  Dispatch edition; cheap, on-brand, prevents "my last-minute sim trade
  vanished" complaints.

---

**When Brendon rules on 1–3, 5, 8: write the answers here, then this page
becomes the cutover runbook and feeds the Mythic Audit (86b9v5wj4).**
