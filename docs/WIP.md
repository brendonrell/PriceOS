# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** all work is on `dev`, pushed, tree clean (all 3 repos). This chat's task
  branch `claude/security-sweep-comprehensive-xfnqc6` is trash (work is on dev; the
  pd-contracts findings live on that repo's same-named branch) — Brendon deletes on GitHub.
- **Updated:** 2026-06-14 (PM). This session = **COMPREHENSIVE SITE-WIDE SECURITY SWEEP**
  (10 auditors) + forever/longevity benchmark + 1 approved hardening fix — see the 🛡️
  section directly below. Earlier 2026-06-14 sessions (still valid context): pings/
  notifications (🔔), social graph + PriceRank + anointing, the first security audit (🔒),
  and the indexer serverless rebuild (⚙️).

## 🛡️ COMPREHENSIVE SECURITY SWEEP 2026-06-14 (master: `docs/security/SECURITY_SWEEP_2026-06-14.md`)
Site-wide adversarial read-only audit (10 parallel auditors → `docs/security/findings/01-10`).
Covers EVERYTHING incl. the indexer (excluded last time) + a LIVE Supabase probe. NO code changed.

**Strong:** contracts clean (no crit/high/med, all 5 incl. PDStickers/PDLibraryRegistry); the
spoof-artist→mint→sellout money path is CLOSED end-to-end (3 locks); prior C1/H1/H2 scoring
exploits VERIFIED fixed (sybil reputation is dead via GAMEABLE_SCORE_CAP); art is genuinely
fully on-chain, "forever" grade A−; no takeover write path, no committed secrets, no admin tier.

**Live issues to fix (off-chain, no money at stake yet):**
- **HIGH S-D1** — pings/ping_cursors readable by ANYONE with the public anon key incl. **p2p DM
  bodies + amounts** (policy `USING(true)` despite "PRIVATE"). NEW, from today's pings ship. Fix first.
- **HIGH S-A1** — `dev-login` = become Brendon on the public preview (prod safe).
- **HIGH S-P1/P2** — Alchemy-budget burn via `price/[address]` cache-key + whole-table reads (`home` etc.); limiter doesn't stop them.
- **HIGH S-I1** — free-text `ens_name` (no ownership/charset check) = artist copycat (visual/phishing only).
- **MED** — limiter fails open/per-instance unless Upstash env set (CONFIRM in Vercel); SIWE chainId/consent unbound; PII anon-readable; handle confusables + missing reserved words.

**Indexer (built, NOT live yet) — pre-launch must-fix:** transfer handler doesn't gate to tracked
PD projects (S-X1), reconcile cron public if CRON_SECRET unset (S-X2), assert signing key at boot
(S-X3); verify `events (tx_hash,log_index)` unique constraint exists in live Supabase.

**Cloudflare move:** good for perimeter (DDoS/WAF/bot) NOT app/data/contract liability; headers won't
carry (need `public/_headers`), req.ip limiter trust won't carry (re-do as edge rules). Keep
service-role key a server-only CF secret; stay on supabase-js.

**Before mainnet (contracts):** run Foundry suite for real, external audit + assembly byte-equivalence
proof, Etherscan bytecode verify. Also: 35 of 41 migrations not in repo; confirm Supabase PITR.

**STATUS — fix batch run on Brendon's "take it as far as you can" (2026-06-14). All build-verified
(`npm run build` clean) + on `dev`:**
- ✅ Reserved-handle list blocks authority/verification impersonation words (`official`,`verified`,
  `mod`,`root`,`system`,`notification(s)`,`announcement(s)`) — S-I3.
- ✅ `ens_name` now rejects invisible/bidi/control characters used for artist copycats (S-I1, the
  charset half; full ENS-ownership verification still TODO).
- ✅ `price/[address]` memoises constant token decimals → 1 Alchemy call/request not 2 (S-P1, partial).
- ✅ `supabase/migrations/20260614_pings_privacy.sql` WRITTEN + on dev, **APPLIED to live DB
  2026-06-14** (S-D1, the HIGH — on Brendon's go). Dropped the permissive anon SELECT on
  `pings`/`ping_cursors`; post-apply verified RLS on + 0 policies → anon reads nothing,
  service-role app path unaffected. The DM-bodies leak is CLOSED.
- ✅ **dev-login become-Brendon hole CLOSED (S-A1).** On the public preview it now requires a
  `DEV_LOGIN_SECRET` env + matching `x-dev-login-secret` header; disabled when unset. Local dev
  unchanged. The on-screen button now renders only on localhost (hidden on preview to avoid a dead
  button). To use dev-login on preview again: set `DEV_LOGIN_SECRET` in Vercel + call with the header.

**STILL OPEN — genuine walls (need env/infra/on-chain/money, not code I can ship here):**
- **Rate-limit / DDoS (the big one)** — needs Upstash env keys set in the deployed env, OR (better)
  Cloudflare edge rules at the migration. No env tool in this container. The Alchemy-burn + whole-
  table-read HIGHs are only FULLY closed by this. Until then the per-instance fallback is the only brake.
- **`public/_headers`** for the Cloudflare move (do at migration; would serve a stray file on Vercel now).
- **Indexer pre-launch (S-X1/2/3)** — fixable in code but belongs with indexer go-live, which is gated
  on Brendon's Alchemy webhook setup (not live yet); do them in that workstream.
- **Contracts** — external-firm audit + assembly byte-equivalence proof + Etherscan verify (money/Brendon).
- **Defense-in-depth (not live-exploitable):** SIWE chainId/consent binding (risky to bind before the
  target chain is settled), body-size limits, owner-scoped RLS, anon PII grant tightening — left
  rather than risk breaking working reads/login without Brendon's input on targets.

## 🔔 SHIPPED 2026-06-14 (PM) — PINGS / NOTIFICATIONS SYSTEM (on `dev`, all DB applied, build clean)
The platform-wide notification spine — "Pings" (PD's word for notifications).
Started from a half-built stub (read API + a mock panel); now a full system.

- **Two streams, merged at read time** (`app/api/pings/route.ts`):
  - **Directed inbox** — stored, one row per recipient (`lib/pings/createPing.ts`):
    follow, project-follow→artist, **mint MILESTONE**→artist (1/10/25/50/100/250/
    500/1000…, not every collect — Brendon's call), offer, sale (buy), offer-
    accepted, achievement (self), p2p. Self-suppress + muted-suppress + "+N
    others" rollup, race-guarded by a partial unique index.
  - **Broadcast firehose** — ZERO stored rows (`lib/pings/broadcast.ts`):
    "people/projects you follow did X", computed off shared `events` ⋈ follow
    graph + per-user watermark cursor. Reads BOTH transfer sides so "someone you
    follow BOUGHT this" surfaces.
- **Wishlist Pings** (= the "watchlist") `lib/pings/wishlist.ts`: a listed/sold on
  a wishlisted token pings the wishlisters (jsonb reverse-lookup over
  `users.settings.wishlist`, GIN-indexed; resolve-once + bulk insert).
  **STARS stay silent** (Brendon: stars = low-stress bookmark, never a ping;
  wishlist is the opposite — buy-intent → financial pings).
- **Delivery = $0 polling, NOT realtime.** SIWE has no Supabase-Auth identity →
  can't row-scope a private realtime channel; 200-conn free cap. Cheap **directed**
  count poll (15s) drives the live badge; full feed on open/own-action; a PUBLIC
  `events` realtime nudge makes directed (money) pings near-instant.
  `lib/state/PingsContext.tsx`.
- **UI:** unread **circle badge** on connect button + PINGS panel header (iOS
  style); panel renders REAL pings (mock removed); **ALL/MONEY filter**; **PING**
  button on profiles (p2p compose via value-prompt, mutuals-only). Glyphs = PD's
  canonical set, matched 1:1 to the settings pills + achievement map
  (`lib/pings/render.ts`), verified via a headless screenshot pass.
- **Pingtoasts** = 4-stop cycle **OFF→MONEY→SOCIAL→ALL** (Brendon's "Reese's cup"):
  pill cycles (`MyPingsRow.tsx`), `pdNotifs.pingToasts` boolean→mode with
  back-compat coercion; live toast shows the actual ping, scoped to mode.
- **Archival:** inbox is a LEDGER — reads never delete; financial-signal pings
  kept 365d, social 30d; kind-aware prune (opportunistic + pg_cron). `lib/pings/tiers.ts`.
- **Scale-hardened** (reviewed by subagents): firehose off the count poll, events
  indexes, bulk wishlist fan-out, rollup unique guard, broadcast unread derived
  from the listed items (badge always matches the panel).
- **DB applied (Supabase `zspxpfwlwikdxwavffjn`):** `20260614_pings.sql` (unified
  `pings` + `ping_cursors`; dropped stale `notifications`/`pings`), `_pings_wishlist.sql`
  (settings GIN), `_pings_retention.sql` (tiered prune cron), `_pings_events_idx.sql`
  (events from/to/project × ts), `_pings_group_unique.sql` (open-rollup unique).
- **Glyph glossary:** `docs/GLYPHS.md` — canonical PD Unicode icon vocabulary so
  future sessions never guess icons. (ClickUp MCP **down again** this session →
  put it in the repo, which is the better home anyway.)

**Deferred (Pings):** exhaustive site-wide glyph sweep to APPEND to `GLYPHS.md`
(a research agent was still running at wrap — sprite/calendar/nav glyphs); the
broadcast-unread badge counts regardless of client category-prefs (intentional;
clears on open); H3 could go fully-atomic via a Postgres RPC (the unique-index
guard is sufficient for now); device-pixel sign-off of glyphs on a real iPhone.

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
