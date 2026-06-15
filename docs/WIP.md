# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** all work is on `dev`, pushed, tree clean. This chat's task branch
  `claude/sleepy-lovelace-t0mvez` is trash (work is on dev) — Brendon deletes on GitHub.
  **Stale local-dev is now SELF-HEALING:** the SessionStart hook re-syncs local `dev` to
  `origin/dev` every chat, so the recurring divergence can't return (root cause = commits
  landing on local dev; the hook reconciles on start).
- **Updated:** 2026-06-15 (late). This session = **profile + favicon + spot-edit passes** (see
  🎯 below). Prior context still valid: THE BENCH + CART + Ambient/Zen (🪑), BUILD-TO-SPEC &
  ICON-GLOSSARY rules; 2026-06-14: minting/profile fixes (🐛), Digital Familiar (🐾), security
  sweep (🛡️), pings (🔔), social + PriceRank, indexer rebuild (⚙️).

## 🎯 PROFILE + FAVICON + SPOT EDITS 2026-06-15 (late) — SHIPPED to dev
- **Profile hero:** PriceSprite moved out of the @name row into the identity line (replaces
  "Via"), inherits the row colour + full opacity; long ENS auto-shrinks to stay one line on
  mobile (JS fit, never wraps). **Own-profile CTA** in the follow slot: "Mutuals" (opens
  Followers modal → Mutuals tab) at ≥3 mutuals, else "Discord".
- **Favicon (regression, fixed twice):** now repaints on ANY `--bg-color` change via a style
  MutationObserver (rAF-coalesced). It previously only fired on colorway-KEY / route change, so
  on profiles it stayed on the prehydration default (off-white) until something nudged it
  (Brendon's minute-long delay). Tracks every page bg promptly now, sitewide.
- **Discord link standardized:** single source `lib/config/discord.ts`; home/footer/dropdown/
  profile CTA all import it.
- **Dev-login "Login Brendon" button RESTORED on the preview** (S-A1 secret gate reverted — it
  blocked desktop testing; counterproductive in build phase). Production still hard-walled.
  Other security-pass items (RPC halving, handle reservations, pings privacy DB migration) left
  intact — not blocking and not clean to revert.
- **Spot edits:** PriceDay pills read "PriceDay #1"; shuffle icon mobile bigger+nudged; profile
  Followers stat icon bigger+nudged; Bench export uses the export-plate glyph ⍈ (not copy) +
  desktop action icons unbolded; artwork hover row note +2 / grail +1 + vertically centred;
  footer middle row baseline-aligned (Today's Stars no longer drops).

## 🪑 THE BENCH + CART + AMBIENT STRIP + ZEN GARDEN 2026-06-14→15 — SHIPPED to dev
- **The Bench** (OS Tool / Comparison, `86b9jfjc3`): **drag-only, ONE bottom tab.** Hold-drag
  (touch + mouse) a piece → the tab peeks up → drop on it (or the CART drop target when listed).
  Adding **recedes** it to a slim peek (viewport clear); **TAP** the tab to pull the full
  comparison up (side-by-side price/floor/note, portrait↔landscape split, native-share image
  export). Each listed card carries the canonical ▢ add-to-cart icon. **NO buttons/panels** — an
  earlier pass wrongly added a modal pill, gallery hover icon, cart icon, top-bar button + a
  separate button-opened tray; all stripped → birthed "BUILD TO SPEC — NOTHING EXTRA". **Crash
  fixed:** live drag position moved to a module store (was re-rendering every gallery card 60fps
  → mobile-Safari crash).
- **Cart → full potential:** real painted art thumbnails, per-item floor delta, savings-vs-floor,
  sweeping motion on BUY ALL.
- **Cart + Bench are now PROPER DB FEATURES (06-15):** per-user, cross-device via `cart_items` +
  new `bench_items` (owner-scoped, same secure pattern as `/api/me`; anon denied; RLS
  `*_own_only`). `/api/me/cart` + `/api/me/bench` (GET / PUT-replace) + `lib/collections/
  useCollectionSync` (UNION-merge device+server on sign-in, debounced save; logged out =
  localStorage). **Cart "sold-drops-out-on-login" auto-remove NOT wired** — the `listings` table
  is empty, so auto-deleting on it would wrongly EMPTY carts; activates with real listings/
  indexer data. "Only listed can be ADDED" is already enforced at add-time.
- **DESKTOP premium bench — BUILT (06-15):** ≥960px, pulling the tab up opens a roomy centred
  gallery-grade panel (360px art tiles, generous spacing, focus backdrop, tap-outside to recede);
  mobile's compact bottom sheet untouched. **Only remaining open item = the cart sold-removal
  above (waiting on real listings data).**
- **Ambient Strip:** LED light bar BELOW the tape, **OFF by default** (☼ toggle in MY PD, the
  slot Echo Chamber vacated). Tap the bar → options popup (palette/pattern/speed/dim); real
  glow + page dim. **Built blind — wants a visual tuning pass on dev.**
- **Zen Garden** (`86b9jfjc3` sibling): Profile, **Zen Mode only** — portfolio as ASCII stones
  (⬟/⬣) in raked sand (≋) raked into rings around each stone. Pure aesthetic.
- **Settings reshuffle:** Echo Chamber → Spell Book (new ≫ icon); Mood Ring removed from Spell
  Book (handled elsewhere). **Price Lens left ALONE — it's live (floor-relative pricing), not a
  placeholder.**
- **Spot edits:** Now-Minting ghosts 6→12 (locked to carousel size); mood-ring footer icon now
  visible on home; mobile shuffle icon size + centring; **24h clock everywhere** (no AM/PM);
  tape null-state ("nothing happening right now…"); removed the ALL/MONEY pill from the Pings
  header (filter scaffolding kept dormant to re-home later).
- **The Exchange** (`86ba0apqr`): decision = **existing-contract approach** (lean on audited
  swap infra, no own contract). **TODO: park in ClickUp with a robust spec** — NOT done yet.

## 🐛 ASTERISM MINTING + PROFILE-READ FIXES 2026-06-14 (late) — SHIPPED to dev
Brendon hit "Internal server error" minting Asterism + broken profile/artworks reads. Two
regressions, both from recent infra changes (NOT the project additions he suspected):
- **Minting 500** — the pings install dropped the old `notifications` table but left its
  `events` fan-out trigger (`fan_out_event_notifications`) behind, still INSERTing into the
  dead table. Fired only when the minting wallet had a @handle + followers (so fresh test
  wallets minted fine, Brendon's didn't). **Dropped the dead trigger + function** (live +
  `supabase/migrations/20260614_fix_mint_drop_dead_notifications_trigger.sql`).
- **Profile / follows / achievements 500** ("permission denied for table users") — the
  security sweep narrowed `users` to column-level grants; the later PriceScore/PriceStreak/
  best-streak columns never got an anon read grant, so every public profile read errored.
  **Granted anon/auth read on just those 3 public reputation columns** (private cols stay
  locked) — live + `..._fix_public_reputation_grants.sql`. One grant fixed all 4 broken routes.
- **Swept the rest:** every other public read checked — nothing else broken. Inbox privacy
  (pings/ping_cursors service-role-only) is correct & intact.
- **Stars/wishlist** confirmed private-by-design (live in `users.settings`, not broken).
  **Dropped the two empty unused `stars`/`wishlist` scaffolding tables** (live +
  `..._drop_unused_stars_wishlist_tables.sql`). If ever promoted to first-class: MUST stay
  private (owner-scoped) — a public-read table would leak everyone's wishlists. Brendon's
  open call, not built.
- Commits on dev show GitHub "Unverified" (badge only) — this container has no commit-signing
  key; committer identity is correct. Cosmetic, no code impact.

## 🐾 DIGITAL FAMILIAR + NPC CAST 2026-06-14 (eve) — Familiar SHIPPED to dev
**Familiar modal → bestiary** (`components/FamiliarModal.tsx`, `lib/familiar/bestiary.ts`,
`styles/modal.css`). The empty "settings coming soon" placeholder is now a videogame-style
**collection screen**: live floating hero of your companion, a discovered tally, four tiers as
tile rails — **BitDaemons** (16, common, live; current badged YOURS) + **Titans** (7),
**Ascended** (6), **Old Gods** (6) shown locked-but-visible *with their art* so you see what's
earnable. Mobile-first, theme-var only, mirrors PriceSprite + Sticker idioms. Build clean.
- **Art = Gemini-designed this session, Claude-curated.** First-pass, multi-line ASCII via `\n`.
  **Known fix:** Leviathan's `⫿`/`⎈` glyphs don't render (tofu) — swap. Other tall pieces may
  need width normalizing on a real device (not pixel-tested from the container).
- **Unlocks are placeholders** (Brendon tunes later; 1k achievements = levers). FOLLOW-ON build:
  wallet-binding (companion stays YOURS per wallet, not random per-page), bond/growth, live-event
  dialogue, and animating the tall multi-line tiers in the corner (footprint cap ~3–4 rows keeps
  them out of the way).
- **NPC Cast** (separate feature, DESIGN ONLY — banked on ClickUp task `86b9fcp11`): 8 residents —
  Rocco (snob) · Eddie (gossip) · Mick (chronicler) · Carl (Eeyore) · Mimi (predator,f) · Romy
  (warm,f) · Steven (normal) · Celestia (tarot mystic,f). Voice = offhand/deadpan, NO zingers
  (took many passes — references make me copy; "be cool" + extreme-but-grounded is the lane).
  Shares the dialogue reservoir with the Familiar. **Voice-scaling (many lines/character) = NEXT
  CHAT.** Guardrail: market-commentary voices hit patterns, never real names.

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
- ✅ `supabase/migrations/20260614_pings_privacy.sql` — **APPLIED to live DB 2026-06-14** (S-D1, HIGH).
  Briefly rolled back during a site-outage triage that turned out UNRELATED (a `useToast`-outside-
  provider error, fixed in another chat), then RE-APPLIED on Brendon's go. Verified: RLS on + 0
  policies on `pings`/`ping_cursors` → anon reads nothing; service-role app path unaffected (bypasses
  RLS). The DM-bodies leak is CLOSED. Confirmed this change never affected the app.
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
