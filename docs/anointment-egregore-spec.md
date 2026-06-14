# Anointment & Egregore System — build spec

Captured verbatim-in-spirit from the ClickUp source (PD Master Brief →
100 Features Blueprint → "Anointment & Egregore System", doc `2kyd6gx6-994`
page `2kyd6gx6-1434`; Gemini × Brendon brainstorm, Apr 2026). Transcribed
2026-06-14 from Brendon's screenshots because the ClickUp doc-read connector
can't serve doc pages. **This file is the build contract for anointing.**

Elaborates features #96 (Account Level), #97 (Anointment), #98 (Shrine/Tithe) —
the reputation & gamified-curation layer. Auth: off-chain, **wallet-signed
messages only (SIWE / EIP-712)** — no gas, instant, stored in Supabase.

## Core concept
- Every account gets **exactly ONE Anointment** to give. Not a like, not a
  vote — a **Pledge of Fealty**.
- Moving your Anointment to a different Project makes the **previous Project
  lose its point** (zero-sum). You must truly believe where you place it.
- Scarce, high-stakes curation. PD never declares what's valuable — users
  **prove it mathematically** with their one vote.

## Hybrid model: Project + Output
- An Anointment **targets a PROJECT** (macro-tribalism) but **requires choosing
  a specific OUTPUT as the conduit** (micro-obsession).
- Project-level > pure Output-level: output-only dilutes votes (a 1,000-output
  project becomes a popularity contest for the current owner); project-level
  rallies whole Discord servers and drives organic traffic ("wake up our
  Egregore").
- The Output conduit keeps individual artworks relevant and powers the **Prime
  Relic** (below).

## Project leveling (prestige + visual only — NEVER gates features)
| Level | Name | Threshold (placeholder) | Unlocks |
|---|---|---|---|
| 0 | **Dormant** | default | Standard brutalist UI |
| 1 | **The Cult** | ~100 anointments | Custom UI theme derived from the Project's colour palette |
| 2 | **The Egregore** | ~500 anointments | God-tier: animated **ASCII deity** (the Egregore) on a 4th tab. Major flex for the community |
- Thresholds are PLACEHOLDER — calibrate vs launch user base; could be
  %-based (e.g. 5% of active users = Cult, 25% = Egregore) rather than absolute.
- A Project can **lose** Cult/Egregore status if enough anointments leave —
  stakes are real, nothing is permanent.
- NOTE: Egregore does **not** gate platform features. The Spell Book is a
  standalone easter egg for all users. Egregore = community prestige + visual.

## Prime Relic
- Within an anointed Project, the **Output with the most conduit votes** becomes
  the **Prime Relic**.
- Permanently pinned to the **top of the Project page**; distinct visual (gold
  border, special badge); its **owner gets a visible clout badge on their
  profile**. Shifts dynamically as votes change — a living leaderboard.
- Whale dynamics: holders campaign (Twitter etc.) to make THEIR Output the
  Prime Relic.

## Lock mechanics
- An Anointment **locks for 60 days** once placed (mirrors the artist cooldown —
  60 is PD's sacred number).
- After 60 days the user may **move** it to a different Project.
- Moving **removes the point** from the previous Project (zero-sum).
- Signed via SIWE / EIP-712; verified; stored in Supabase. No gas.

## Interaction with Account Level (#96) — RECONCILED
- Spec: Account Level is a 90-day rolling rank (volume, hold time, achievements)
  and a veteran's Anointment **could be weighted** more than a fresh wallet's —
  Sybil resistance + rewards genuine engagement. Listed as an **OPEN ITEM**.
- **Reconciliation (2026-06-14):** `users.account_level` is the dead column,
  superseded this session by **PriceRank / PriceScore**. So:
  - **v1 ships UNWEIGHTED — one account = one vote** (keeps the ~100/~500
    thresholds meaningful; weighting is explicitly an open question).
  - Future upgrade: weight a vote by the anointer's **PriceRank** (not the dead
    account_level) for Sybil resistance. Brendon's call when surfaced.

## Interaction with Shrine / Tithe (#98) — OUT OF SCOPE THIS PASS
- The Shrine is a **separate** mechanic: send fractional ETH directly to the
  creator's wallet, ranked on a devotional leaderboard. Anointment = free
  (social proof); Tithe = paid (financial proof). Both feed Project prestige via
  different channels. **Not built in this pass — flagged so it isn't forgotten.**

## Technical requirements (from spec)
- Supabase tables: `anointments`, `project_levels`, `prime_relics`.
- Wallet-signed message verification (EIP-712 / SIWE).
- 60-day lock timer logic.
- Account-Level (→ PriceRank) weighting formula (future).
- Project-level progress bar UI.
- Prime Relic pinning + highlight.
- Egregore ASCII deity animation (4th tab).

## Open items (from spec — Brendon decides later)
- Calibrate level thresholds: absolute vs % of active users.
- Weighting multiplier: how much a veteran's vote counts vs a new user's.
- Can a user see which Output they anointed as conduit, or is it anonymous?
- Does Prime Relic show on the Output page too, or only the Project page?
- A visual "campaign" element — a public count of how many anointments a
  Project needs to reach the next level?

---

## Build plan (this repo)
1. **Schema** (`supabase/migrations/20260614_pricerank_social.sql`): replace the
   placeholder `anointments` table with the spec model:
   - `anointments`: **PK(user_address)** — ONE row per account. Columns:
     `user_address`, `project_id`, `output_token_id` (the conduit), `placed_at`
     (lock anchor), `updated_at`. Index on `project_id` and on
     `(project_id, output_token_id)` for level + Prime-Relic counting.
   - Levels + Prime Relic **computed on read** for launch scale (COUNT / GROUP BY);
     `project_levels` / `prime_relics` cache tables are a later optimization.
2. **Levels module** (`lib/anoint/levels.ts`): thresholds (Dormant/Cult/Egregore,
   tunable, like tiers.ts) + `projectLevel(count)` + progress helpers.
3. **API** (`app/api/anoint/route.ts`, rebuilt):
   - `POST` (SIWE) `{ project_id, output_token_id }` — place or move the
     caller's single Anointment. Enforce the **60-day lock** before a move.
     Upsert on PK(user_address).
   - `DELETE` (SIWE) — withdraw (also lock-gated). Optional.
   - `GET ?me` (SIWE) — the caller's current Anointment.
   - `GET ?project=ID` (anon) — `{ count, level, levelName, nextThreshold,
     primeRelic: { output_token_id, owner, votes }, anointers }`.
4. **Catalog**: rework anointing achievements to the real model (place your
   Anointment; your Project reaches Cult / Egregore; your conduit becomes the
   Prime Relic; hold your pledge 60+ / loyalty; be early to an Egregore). The
   old `anoint.given>=10/50` tiers are INVALID (only one anointment exists).
5. **UI** (later): Project "+ More" → Social shows level + progress + Prime Relic;
   anoint button + conduit picker; Egregore tab at Level 2; owner clout badge.
