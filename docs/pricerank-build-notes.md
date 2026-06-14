# PriceRank / Achievements — build integration notes

Living checklist for the PriceScore / PriceRank / PriceStreak / Achievements +
social-graph build (2026-06-14). Tracks the cross-cutting wiring that the
parallel builders don't own, so nothing is lost across context windows.

## Naming model (LOCKED with Brendon, 2026-06-14)
- **PriceScore** = the number (sum of unlocked achievement points). `users.price_score`.
- **PriceRank** = the tier (0–10) derived from PriceScore via `lib/achievements/tiers.ts`. `users.price_rank`.
- **PriceStreak** = current consecutive-active-day count. `users.price_streak`. Activates at 60. Hard break (no grace, no banked credit). Local-midnight day boundary.
- **Achievements** = one-shot unlocks (`lib/achievements/catalog.ts` + `lib/achievements/catalogs/*.ts`). Goal: ~1000, multi-year journey, quality over padding.
- **Mjölnir** = supreme capstone (10,000 PriceScore). Nothing ranks above it.
- **Odin** = rare wandering wizard in the Achievements hall (`lib/achievements/odin.ts`). ~2%, gated to score ≥ 300. Odin-given achievements are among the rarest.

## Special engine evaluators to implement/verify (NOT generic counters)
- [ ] **`oil.rider`** — sale (XFER from me, price set) of a piece I acquired (MINT to me, or XFER buy to me with price) **≥ 365 days earlier** and sold for **≥ 3× the acquisition price**. Needs per-token cost-basis + hold-duration from the `events` ledger. Truly earned; visible (not secret); 300 pts. PD-native lore — keep it clean, no mythology framing.
- [ ] Token-number property keys: prime/perfect/triangular/square/cube/fibonacci/powerOfTwo/palindrome over held token numbers.
- [ ] `holdings.editionOfOne`, `holdings.firstProject`.
- [ ] Meta keys: `meta.unlockedCount>=N`, `meta.categoryComplete.<cat>`, `meta.allNonSecretUnlocked` (two-phase eval).
- [ ] Client-granted families: `ui.* / odin.* / brendon.* / time.* / date.* / combo.* / spell.* / action.*`
  - **Brendon** = God of PD (`lib/achievements/brendon.ts`), a rare recurring figure a tier above Odin (~4% vs 2%, min score 500). Grants `brendon.appeared` / `brendon.blessing` / `brendon.chosen`. He is the one who bestows **Mjölnir** at 10,000 score (blurb already reflects this). Achievements wall must render his appearance (grander than Odin's) + a worthiness/bless flow only he triggers. — only unlock via the evaluate route's `clientGrants` whitelist (CLIENT_GRANTABLE). Wire client detectors later (konami, read-docs, find-Petey, 4:20, etc.).
- [ ] Aspirational-locked triggers (no data source yet) must NOT throw — stay locked gracefully.

## Catalog merge / integration
- [ ] Wire `lib/achievements/catalogs/{ladders,math,myth,hidden}.ts` into `catalog.ts` (`ACHIEVEMENTS = [...CORE, ...LADDER, ...MATH, ...MYTH, ...HIDDEN]`).
- [ ] Runtime DEDUPE guard: assert all ids unique (throw in dev if not). Drop weak/duplicate entries during curation.
- [ ] Recompute `MAX_PRICE_SCORE`, `VISIBLE_COUNT`. Re-check tier thresholds vs the new max (tiers.ts) so a free-only player still caps mid-tier and Mjölnir (10k) stays reachable only with heavy spend.
- [ ] No `666` anywhere (number or points). Angel numbers ok.

## Client / UI wiring (parent-owned)
- [ ] AuthContext: add `priceScore`, `priceStreak` (priceRank already present, now = tier). WalletProviders passthrough.
- [ ] PriceSprite modal: real `score / rank / streak` + progress bar (replace `-- / -- XP`).
- [ ] Navbar PriceRank badge: glyph from tier.
- [ ] Achievements wall (profile +More tab): grid by category, locked/secret as "???", unlock pops, Odin appearances.
- [ ] Streak ping: client fires `/api/streak/ping` with local date on a qualifying action/session.
- [ ] Evaluate hook: fire `/api/achievements/evaluate` after mint/market/follow/anoint (+ on profile load) to surface unlock pops.

## ⛔ ANOINTING — BLOCKED, DO NOT SHIP
The PriceSpriteModal placeholder cites a ClickUp **"Anointment & Egregore" spec**
(doc page `2kyd6gx6-1434`): one ✢ Anointment **per account**, a **60-day lock**,
placed on a **PROJECT**, which "awakens its Egregore" when enough accrue. The
builder roughed in a GENERIC "anoint any piece, unlimited" model + a
`/@name/anointed` page — likely WRONG vs the spec. Catalog anointing tiers
(anoint.given>=10/50…) assume multi-anoint and need rework if it's one-per-account.
ACTION: read `2kyd6gx6-1434` (ClickUp read needs Brendon's approval — denied while
away) OR get the model from Brendon, THEN rebuild anoint API + catalog tier + UI.
KEEP the built code (no amputation); just don't wire/ship it. Hold the
`anointments` table out of the social-graph push.

## ⬜ ICON PASS — every achievement needs a small ASCII/pixel icon (Brendon, 2026-06-14)
"Small but legible and recognizable" art for EVERY achievement. Added optional
`icon?: string` to the Achievement type. Plan: after the catalog merge, run
themed icon-pass subagents that fill a short recognizable ASCII/glyph motif per
achievement (bespoke multi-glyph ASCII for flagships/lore). On-brand with the
ASCII PriceSprite aesthetic. Honest scope: 1,000 unique hand-pixel images isn't
realistic; legible ASCII/unicode glyph icons for all + rich ASCII for specials IS.

## Social graph (pre-approved to push to dev once verified)
- [ ] Project @name: wire `lib/slug.ts` to resolve project handles live (replace static PROJECT_SLUGS) + upload flow uses projectHandle validation.
- [ ] Project Follow button + "Social" first section in project "+ More".
- [ ] FollowersModal: real Projects tab (project-follow graph).
- [ ] Anointing UI: anoint button on outputs + the `/@name/anointed` page (page done by builder).

## Ship gates
- Social graph parts → push to dev once verified amazing (Brendon pre-approved 2026-06-14).
- PriceRank/PriceScore/Achievements → Brendon approves via a numbered list before it ships.
- DB migration (`supabase/migrations/20260614_pricerank_social.sql`) → applying to live Supabase is the prod-data gate; additive + idempotent. Apply as part of shipping the social graph (required for it to function).
- Prod (main) push → never without Brendon's numbered-list review.
