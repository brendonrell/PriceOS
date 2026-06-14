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

## 🔒 SECURITY AUDIT 2026-06-14 — findings to fix (full report: `docs/SECURITY_AUDIT_2026-06-14.md`)
Read-only audit of PriceOS + pd-contracts + pd-price-token (indexer excluded —
being rewritten). Both contracts clean (no crit/high/med). No committed secrets,
no IDOR, SIWE solid. **All exploitable risk is in the now-LIVE PriceRank/scoring
layer** (migration applied + verified on dev; dev preview is public). Root cause:
free unlimited wallets + no rate limiting → any count-of-actions is farmable.
Priority order (the 9 ClickUp items owed):
1. **CRIT — curation self-grant (LIVE).** `PATCH /api/me` settings blob is
   unvalidated; engine counts `starred/wishlist/albums` array lengths straight →
   evaluate grants ~1,000+ PriceScore from fake arrays. Fix: count from
   constrained server state, not the user blob.
2. **HIGH — streak forgery (LIVE).** `streak/ping` trusts client `localDate`;
   walk it forward 365 days in 365 calls = every streak badge. Fix: bound to
   server `now()` ± tz window.
3. **HIGH — social sybil (LIVE).** Free wallets + no throttle inflate
   followers/anoints/mutuals for self or any victim. Fix: weight/gate social
   credit on on-chain presence or source rank + rate-limit follows/anoint/
   users-create/evaluate/streak. (= the deferred Sybil-resistance item, now
   load-bearing.)
4. **HIGH — raw DB errors returned to clients** (`serverError(error.message)`,
   ~30 routes) leak schema. Fix: log server-side, return generic.
5. **MED — rate limiter fails open + per-instance.** Confirm Upstash is actually
   set in Vercel, else there's no real limit.
6. **MED — no security headers** (CSP / X-Frame-Options / HSTS). Add a
   `headers()` block.
7. **MED — RLS is read-only-by-convention** (all writes ride service-role; reads
   are blanket `USING(true)`). Add owner-scoped policies + a "no body-supplied
   address in writes" test as defense-in-depth.
8. **Contracts — external-firm audit + assembly byte-equivalence proof** before
   mainnet (immutable deploy + hand-rolled library-reader assembly).
9. **Token — pin GitHub Action SHAs + post-deploy Etherscan bytecode verify.**

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
