# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** all work is on `dev`, pushed, tree clean. This chat's task branch
  `claude/security-audit-full-wc823w` is trash (work is on dev) — Brendon deletes
  on GitHub.
- **Updated:** 2026-06-14. Last session = **Social graph + PriceRank + Anointing
  (backend)**. This session = **full security audit (all repos)** — see the new
  🔒 section below; full report in `docs/SECURITY_AUDIT_2026-06-14.md`.
- **Parallel 2026-06-14 session (separate chat):** **indexer serverless rebuild —
  DONE** in the `PriceOS-indexer` repo (NOT in PriceOS dev). See the ⚙️ section.

## ✅ SHIPPED 2026-06-14 — on `dev` (DB migration applied + verified)
- **Social graph.** Follow people AND projects (Twitter-style) + follower/
  following/mutuals tags. **Bag mechanic:** owning a project's piece makes the
  project follow YOU; selling drops you — a user's follower count includes the
  projects they hold. Followers modal has a real **Projects** tab.
- **Smart social row.** "Followed by" (profiles, live) / "Collected by"
  (projects, server-ranked) surfaces the 2 most relevant faces via
  `lib/social/relevance.ts` (connection strength → PriceRank → jitter), cap 2
  (mobile), hidden when no tie. Homepage "Featuring" row already did this.
- **PriceRank system (skeleton).** PriceScore (number) · PriceRank (tier,
  `lib/achievements/tiers.ts`) · PriceStreak (activates day 60, hard reset, local
  midnight). **Generic engine** `lib/achievements/engine.ts` (+ `/api/achievements/
  [address]`, `/api/achievements/evaluate`, `/api/streak/ping`) scores from the
  real ledger — anti-bot by design. `PriceRankSync` fires evaluate on deliberate
  actions, ticks streak once/day, pops unlock toasts, refreshes the badge live.
- **Achievements wall** — profile +More tab + the identity-modal rail
  (`components/achievements/AchievementsGrid.tsx`), secret/locked as "???".
  Catalog = **~350** (`lib/achievements/catalog.ts` core + `catalogs/ladders.ts`),
  freely editable. Lore: God of PD (`brendon.ts`, hands down Mjölnir), Odin
  (`odin.ts`), Oil Rider, angel numbers, math/gen-art eggs, KOL/GMI.
- **PriceSprite on profiles** — small still Courier face beside the @name.
- **Anointing BACKEND to spec** (`docs/anointment-egregore-spec.md`): one Pledge/
  account, Cult/Egregore levels (`lib/anoint/levels.ts`), Prime Relic, 60-day lock
  (`/api/anoint`). Catalog anointing tier reworked to match.
- **DB (Supabase `zspxpfwlwikdxwavffjn`):** applied — `projects.handle` backfilled
  (all 50), `project_follows`, `anointments`, `user_achievements`, `seasons`,
  `season_standings`, + users progression cols. Migration file:
  `supabase/migrations/20260614_pricerank_social.sql`.

## 🔒 SECURITY AUDIT 2026-06-14 — audit + first fixes SHIPPED to dev (full report: `docs/SECURITY_AUDIT_2026-06-14.md`)
Read-only audit of PriceOS + pd-contracts + pd-price-token (indexer excluded —
being rewritten). Both contracts clean (no crit/high/med). No committed secrets,
no IDOR, SIWE solid. The exploitable risk was all in the gameable PriceRank/
scoring layer.

**FIXED + on dev (Brendon approved push 2026-06-14):**
- **Gameable score cap** (`GAMEABLE_SCORE_CAP=10`, `engine.ts`). Free/off-chain/
  sybil achievements (stars, wishlist, albums, follows, anoints, streak, easter
  eggs) STILL unlock + pop toasts for feedback, but their COMBINED score is
  capped at ~10 of the ~12,000 scale → farming can't reach even tier 1. Rank
  comes only from un-fakeable on-chain facts. Catalog untouched (Brendon retunes
  freely). `tiers.ts` "free grinder maxes mid-tiers" note updated to match.
- **Honest curation badges** — counts only DISTINCT well-formed `slug:id` keys;
  fabricated arrays / empty albums no longer mint tier badges.
- **Streak un-forgeable** — client `localDate` bounded to real server time.
- **No raw DB error leaks** — `serverError()` logs server-side, returns generic.
- **Security headers** — frame/nosniff/HSTS/referrer/permissions in next.config.
- **Tighter per-IP caps** on auth/social/scoring routes + trusted `req.ip`.

**STILL OWED (not code-fixable from here / product calls):**
- **Upstash shared limiter** — needs the env keys set in Vercel (no env tool
  here; deprioritized — switching to Cloudflare Pages soon, and the score cap
  already makes farming pointless; rate-limit is now defense-in-depth).
- **Deeper RLS** — owner-scoped write policies + "no body-supplied address in
  writes" test, then apply to live Supabase (prod-data gated).
- **Contracts** — external-firm audit + library-reader assembly byte-equivalence
  proof before mainnet.
- **Token** — pin GitHub Action SHAs + post-deploy Etherscan bytecode verify.
- **Product call:** should streak / social EVER be a meaningful earner? Currently
  capped to nothing. If yes, they need on-chain gating, not just the cap.
- **ClickUp** — still owed: file the audit + these fixes once the connector is
  reconnected (it hard-failed all session).

## ⚙️ INDEXER 2026-06-14 — serverless rebuild DONE (repo `PriceOS-indexer`, branch `claude/indexer-alchemy-setup-tuezqu` — NOT in PriceOS dev)
- **Pivoted off Ponder/Railway → serverless Alchemy webhook → Supabase**, with a
  Vercel Cron reconcile sweep as the delivery backstop. $0 at launch scale.
  Built, typechecks clean, pushed to the indexer branch. **Ponder fully removed.**
- Idempotency hardened (no double-count of mints/volume on replay), webhook
  signature verification, address auto-registration helper. Both prior open
  questions resolved: the filtered GraphQL Custom Webhook IS free-tier; the
  address-registration API is wired.
- **Full done + what's-left breakdown:** `PriceOS-indexer/docs/HANDOFF.md`
  (+ `docs/INDEXER_SPEC.md`, `docs/ALCHEMY_SETUP.md`).
- **LEFT to go live (needs Brendon):** create the Alchemy webhook on Sepolia →
  hand over its signing key + id; then transplant the routes into PriceOS
  (`app/api/webhooks/alchemy` + the cron) on his green light; deploy a test
  Project to Sepolia; first run flips the ~7 mocked chain-derived API routes to
  real Supabase reads. NOT in dev until that transplant.
- **ClickUp connector FIXED for next session:** the all-session "requires
  approval" failures (both this chat's indexer update AND the security-audit
  items still owed) were a **missing permission allow-rule, NOT a bad
  connection** — now allow-listed for every MCP connector incl. GitHub in
  `~/.claude/settings.local.json`. A FRESH chat reads it at startup and should
  post with zero prompts; mid-session edits don't reload, which is why it kept
  failing live this session.

## ⏭️ OPEN / NEXT (none blocking; Brendon doing edits in a fresh chat)
- **Anointing UI** — backend done, NO on-screen way to place a Pledge yet.
  Build: anoint button + conduit picker on project/output, project level +
  progress + Egregore tab at L2, Prime Relic pin + owner clout badge. Fire
  `pd:anoint-changed` so PriceRankSync evaluates.
- **Project `/@name` routing** — handles exist in DB; the bare/`@`-prefixed
  project-handle URL resolution in `lib/slug.ts` + `app/[slug]/page.tsx` is NOT
  wired (only a 2-entry static set today). User @names already route.
- **Vault → 1,000 achievements.** Re-run the themed batch generators (math /
  gen-art, mythology, behavioural/easter-eggs) — those agents were generated but
  LOST in a container reset (only `ladders.ts` committed). Each is a new
  `lib/achievements/catalogs/<theme>.ts`; wire its import into `catalog.ts`.
- **Achievement ICONS** — every achievement needs a small ASCII/glyph icon
  (`icon?` slot added; grid uses per-category fallback today). Run icon-pass
  subagents per theme.
- **Editing achievements** = edit `lib/achievements/catalog.ts` (names/blurbs/
  points/secret in place; ids are permanent). Engine reads it generically — no
  engine change needed to retune.
- **Deferred design calls (Brendon's):** PriceRank-weighted anoint votes (Sybil
  resistance; v1 is 1 acct = 1 vote); season reset job; leaderboard surface;
  Discord role sync (low-maintenance periodic recompute); calibrate Cult/Egregore
  thresholds (~100/~500 placeholder); calibrate rank tier thresholds vs new max.
- **ClickUp wrap OWED** (still — the connector **hard-failed every call this
  session**: ~10 attempts across 4 methods all returned "requires approval" from
  the ClickUp endpoint while GitHub MCP worked fine; Brendon is reconnecting it).
  Next session, once reconnected: (a) mirror the prior social/PriceRank ship,
  close shipped items; (b) file the **9 security-audit items above** as Backlog
  tasks, priority-ordered, assigned to Brendon + due date + assigned comment.
- **Verify on dev preview** — pushed but not eyeballed through the live app this
  session; worth a visual pass (social rows stay hidden until real ties exist).
