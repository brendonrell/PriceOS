# The Architect Report — PriceOS / Price Discussion
**2026-07-13 · Fable 5 · full-stack architecture review (code + DB + ClickUp + repos)**

Scope: how the whole thing is built and connected — app, API, data, indexer,
contracts (craftsmanship only), infra, and the PM layer. NOT visuals (Brendon's
domain). Everything below was verified against the actual code and the live
database tonight, not assumed.

---

## 1. The verdict

**This is a real platform with unusually strong bones — and five specific
holes that decide whether it survives contact with the public.**

The honest calibration first, because "vibecoded" is doing this codebase a
disservice: ~177,000 lines of TypeScript across 660 files, 79 API routes, 84
generative engines, 95 tracked database migrations — with **zero stray
console.logs, only 15 `any` types outside the art fleet, one shared error
envelope on every route, a textbook auth layer, and money that only moves
inside atomic database transactions.** Most funded startups with five
engineers ship worse hygiene than this. Under a microscope, the *code* will
impress. What will NOT impress under a microscope is the **absence of the
scaffolding around the code**: no tests, no CI, no error visibility, and a
handful of data-layer timebombs. That's the homework. All of it is buildable,
none of it requires touching product, and most of it is Opus-able.

---

## 2. What's already excellent (know it, protect it, don't let future sessions "improve" it)

1. **Auth/session (lib/auth/siwe.ts).** SIWE + iron-session done exactly right:
   nonce replay protection, domain binding, httpOnly encrypted cookie, one
   `requireAuth()` wrapper every write route shares, address-from-session-only
   ownership. Nothing to fix here.
2. **The error discipline (lib/errors.ts).** One typed error envelope, 500s
   never leak Postgres internals (schema-recon protection), consistent across
   all 79 routes. Rare even in professional codebases.
3. **Money in atomic RPCs.** app_mint / app_buy / app_accept_offer are single
   Postgres transactions; the July 11 audit locked direct EXECUTE. The
   client can never half-complete a trade.
4. **The indexer rebuild.** Alchemy webhook verified against raw-body HMAC →
   idempotent writes → a 1-minute reconcile sweep that reads logs in ≤10-block
   sips with a gated surgical-backfill door, all fail-closed on CRON_SECRET.
   This is a genuinely well-shaped serverless pipeline.
5. **Registry-as-code for Projects.** Every project = one engine file + one
   registry entry, deterministic in tokenId, seeded rng, platform traits
   (Fate) layered on top. For a filtered platform this is the right call —
   auditable, reviewable, no CMS goo.
6. **Fail-closed crons + dead-man switch.** Five probe-and-exit sweeps on one
   1-minute trigger, heartbeat stamped to KV, ops ping if it stalls. Good ops
   instincts already in the bones.
7. **The client persistence design.** Server row = truth, localStorage =
   paint-fast cache, prehydration script kills FOUC, hydration guard prevents
   boot defaults clobbering the saved row. Thoughtful. (Its one flaw is item
   3.4 below — the write side.)
8. **The process layer itself.** WIP baton, GLYPHS vocabulary, briefs dir,
   session hooks, git-guard. No solo project has this. Keep it.

---

## 3. TIER 1 — Fundamental strength (the survive-anything list)

These five are the difference between "bugs are incidents" and "bugs are
Tuesday." Ordered by leverage.

### 3.1 Zero automated tests in the app ⚠️ the big one
The contracts repo has 284 tests including fuzz + integration. PriceOS — the
thing users actually touch, with a market, an economy, achievements, and 79
API routes — has **zero**. Every regression ships silently until Brendon's
eyeballs catch it. This is the single highest-leverage investment available.

**Homework (Opus-able, staged):**
- **Stage 1 — route smoke suite (~a session):** vitest + a test Supabase
  branch (Supabase branching exists on this project's MCP). ~30 tests hitting
  the REAL route handlers: SIWE flow, /api/me PATCH validation, mint/buy/
  offer happy + rejection paths, webhook signature rejection, cron fail-closed
  behavior. Money paths first.
- **Stage 2 — engine determinism harness (~a session):** the perf pass
  already built a headless render harness in scratchpad; commit a version to
  tools/. For each of the 84 engines: render seed N twice → identical pixel
  hash; render the canonical seed → matches a stored golden hash. This makes
  "did my perf fix change the art?" a 2-minute machine answer instead of a
  Brendon-eyeball pass. **The zero-out of 9 projects on 2026-07-12 is exactly
  the incident this prevents from ever being needed again.**
- **Stage 3 — economy invariants:** a script that asserts conservation (sum
  of sim-ETH deltas per trade = 0, fee included) over the live event log. The
  security audit already flagged conjured-ETH edge cases (86bawbb7j); this is
  the standing detector.

### 3.2 No CI, no lint, and a manual deploy with no safety rail
> **SUPERSEDED IN PART (2026-07-13, same day):** the deploy is no longer
> manual — pushing `dev` now auto-builds and deploys (CLAUDE.md §1). That
> RAISES this item's urgency: with every dev push going straight live, the
> pre-merge machine check is the only rail. See the hardening brief, item 2.
There is no .github/, no eslint config, nothing that runs `tsc` or `next
build` on push. A broken commit on dev is discovered only when someone
builds or deploys by hand. The deploy itself is a hand-run recipe with a
pasted token (which is fine security-wise, but means "deploy" = 15 minutes
of Brendon+Claude coordination).

**Homework:**
- **(Opus-able, small)** GitHub Action on every push to dev: install →
  `tsc --noEmit` → `next build`. No deploy, just a red X before a bad merge
  ever reaches a session. This alone catches the classic cross-session break.
- **(Brendon decision)** Auto-deploy on green: needs a stored Cloudflare
  token as a repo secret. Current per-session-token posture is deliberate;
  keeping manual deploys is defensible — but then the Action above is
  non-negotiable, because it's the only machine check left.
- **(Opus-able, small)** Add eslint (next/core-web-vitals) and fix the
  first pass. next.config already anticipates it (`ignoreDuringBuilds`).

### 3.3 Production is blind — no error visibility at all
Route 500s log to a console nobody tails; client-side exceptions vanish
entirely; the ErrorBoundary renders a fallback and tells no one. Right now,
users will find bugs, hit them, leave, and PD will never know. For a
platform whose whole pitch is aliveness, this is the biggest asymmetry: the
app can feel alive while being silently broken for a segment of devices.

**Homework (Opus-able, ~a session):**
- One tiny `/api/telemetry` route + an `app_errors` table (or KV): client
  ErrorBoundary + window.onerror + unhandledrejection POST a fingerprint
  (message, stack head, route, build id), server serverError() writes the
  same. Cap rows, retain 30 days.
- A `/api/health` endpoint: DB reachable, last heartbeat age, last webhook
  age, last dispatch date. Point a free uptime pinger at it → phone alert.
  (Extends the heartbeat→ops-ping pattern that already exists.)
- ClickUp 86b9g04ew (monitoring/dashboards) is this item — it's already in
  the backlog, correctly, and should be pulled forward.

### 3.4 The settings envelope is a last-write-wins data-loss timebomb
`users.settings` is one jsonb blob holding todos, notes, albums, stars,
wishlist, breadcrumbs, workflows, spite book, tab memory… The client PATCHes
the **whole envelope**; the server **replaces the column**. Two devices — or
two tabs — signed into the same account will silently clobber each other's
writes: phone adds a todo, laptop (open since yesterday) saves a colorway
change, todo gone. No error, no trace. Today with a handful of users it's
invisible; with real users it manifests as "PD lost my notes," the most
trust-burning bug class that exists.

**Homework (needs care — Fable-designed, Opus-built):**
- Server-side per-key merge: PATCH sends only the envelope keys that
  changed; the route merges them into the stored jsonb (`jsonb_set`-style or
  a small RPC) instead of replacing the column. The client already updates
  per-key stores, so the plumbing is closer than it looks.
- Notes already carry `t` timestamps intended for merge — finish that
  intention for the array-valued keys that matter (notes, todos, albums).
- Bonus: cap breadcrumbs server-side; the trail is the envelope's unbounded
  growth vector.

### 3.5 One environment, one database — and mainnet ahead
The dev preview IS the app: same Worker, same live Supabase. Every dev-merge
deploy lands in front of real users the moment it's redeployed. Pre-mainnet
this is a pragmatic simplification; post-mainnet it means "testing a change"
and "touching real money-adjacent user data" are the same action.

**Homework (Brendon decision + one Opus session at cutover):** a second
Worker (`pricediscussion-dev`) + a Supabase branch as staging; dev deploys
there, main deploys to the real one. This is the moment the branch→deploy
wiring note in CLAUDE.md §1 has been waiting for. Not urgent today —
**mandatory before mainnet.**

---

## 4. TIER 2 — Craftsmanship under a microscope

The things a sharp dev poking the codebase would find. None is a fire; all
are the difference between "impressive for a solo project" and "impressive."

### 4.1 Every page ships the entire 84-engine art fleet in its JavaScript
The registry statically imports every engine; the shell imports the registry;
so the full ~53,000 lines of engine code ride the first-load bundle on every
page — the login screen included. Per-engine dynamic import (registry maps
slug → lazy loader; engines load when a piece actually renders) would cut
initial JS dramatically on mobile. Pure delivery change: seeds, rng, art
untouched. **(Opus-able, one careful session + the determinism harness from
3.1 as proof nothing changed.)**

### 4.2 All 127 art-fleet files are type-check exempt
The entire lib/art tree is `@ts-nocheck` (deliberate, from the R&D ports).
The one part of the codebase where a silent typo produces wrong pixels is
the one part the compiler can't see. Realistic bar (checking 53k lines of
canvas math is not worth it): the golden-hash harness in 3.1 Stage 2 IS the
type-checker for art. Ship that instead of un-nochecking.

### 4.3 The data-fetching layer is 172 hand-rolled fetches
react-query is installed (wagmi needs it) but the app uses it in ~4 files;
every list, modal, and stat hand-rolls fetch + loading + error + refetch.
It works, but it's why surfaces occasionally disagree about the same number
and why every new surface re-pays the same tax. **Homework (cheap, incre-
mental):** one small shared fetch hook (dedupe + stale-while-revalidate +
error path) adopted by new surfaces and hot existing ones opportunistically.
Not a rewrite — a convention.

### 4.4 The giants
globals.css at 11,591 lines (the album-grid class collision already burned a
session — that bug class scales with the file); ProfilePageBody at 1,891
lines; StarredList 1,633; ArtworkPageBody 1,331; HomePageBody 1,150; a
19-deep provider pyramid in layout.tsx. All still workable — but each is a
context-window tax on every future session and a collision surface.
**Homework (Opus-able, mechanical, zero behavior change):** split globals.css
by surface (the styles/*.css convention already exists — newer features
already do this right); carve the four page-bodies into per-tab children.

### 4.5 The repo's schema mirror is three days stale
The live DB has 95 migrations in Supabase's own history (good — applied via
MCP, so history exists), but supabase/migrations in git stops at 07-11:
rewind_social_snapshots, dispatches, hostile_takeovers, game_scores, muted,
calendar_items and others aren't mirrored. Same story as the hand-written
Database type in lib/supabase.ts, which covers ~10 tables while the live DB
has 25+ — everything else queries untyped. **Homework (Opus-able, small):**
(a) declare the Supabase-side history canonical and add a sync step that
dumps each applied migration into the repo mirror in the same session;
(b) generate types from the live schema (the MCP has a generator) and diff
against lib/supabase.ts — keep the hand-written docs-rich types as the
curated layer, but let the generated file catch drift.

### 4.6 Database lint (from the live advisors, tonight)
- ~17 RLS policies re-evaluate the auth function per-row (initplan warnings)
  — mechanical `(select …)` wrap, real at scale, ClickUp 86b9g048d covers it.
- Unindexed FKs: muted.muted_address, pings.project_id,
  season_standings.user_address.
- `follows` has no primary key.
- ~12 never-used indexes to drop at leisure.
**(All Opus-able in one short migration session.)**

### 4.7 Docs drift (internal)
CLAUDE.md §1 says Next 14 + React 18; the app is Next 15.5 + React 19.
docs/api-spec.md still says Vercel + api.pricediscussion.com. Neither
misleads Brendon, both mislead fresh sessions — which is the exact failure
class the operating contract exists to prevent. **(Fable, 10 minutes, this
file's sibling fix — flagging here per the contract's "amend the note" rule.)**

---

## 5. TIER 3 — Launch hardening (mostly already in ClickUp — endorsed + sharpened)

1. **Rate limiting is likely OFF in production.** The middleware's real
   limiter needs Upstash env vars; without them it's per-isolate memory,
   which on Workers ≈ no limit. **Verify the Worker actually has the Upstash
   secrets set; if not, set them or use Cloudflare's own rate-limiting rules
   in front.** (5-minute check, do first.)
2. **Idempotency keys on state-changing endpoints** — ClickUp 86b9g046n +
   BET-09 race hardening. Right priorities, pull forward pre-mainnet.
3. **Money-math conservation sweep** — the queued items in 86bawbb7j
   (conjured-ETH edge, dead anon grants, search_path pins, citext move,
   script-src CSP, sim-grant off-switch). Already well-triaged; just don't
   let it rot in Backlog.
4. **Backup/restore reality check.** Confirm the Supabase plan's backup
   cadence and do ONE actual restore drill into a branch before mainnet.
   A backup nobody has restored is a rumor. Also: the R2 preview bucket is
   user-facing art — confirm it's not single-copy-only.
5. **Secrets inventory** — 86b9g04cr. Write the names-only list of every
   Worker secret + where it's set, in docs/. The deploy recipe in WIP is
   already 80% of this.
6. **Test-price cleanup before mainnet** — bulletin 0.2222 / reliquary
   22.222 (already flagged in WIP; belongs on the cutover checklist).
7. **The mainnet cutover contract (product decision, write it NOW).** The
   single hairiest transition ahead: what happens to sim-ETH balances,
   sim-era achievements/PriceScore, market history, and the zeroed projects
   when real chain state becomes truth? Every answer is defensible; having
   no written answer is not. One page, Brendon's calls, before Sepolia
   Phase C — because the indexer fold-in and the audit pass (86b9v5wj4)
   both depend on it.

---

## 6. ClickUp — the PM layer audit

Structure is right (13 folders, clean Backlog/In-Progress/Done rails, the
Inbox convention works). Two drifts crept back since the 06-11 realignment:

1. **Zombie tasks contradicting reality.** "PriceOS — React build (from
   pdsim2 prototype)" sits *urgent/in-progress* — it's been done for a
   month+. "Digital Familiar" epic sits in Backlog *to do* — it shipped.
   Likely same story: "User Features: Stars/Wishlist/Albums UI",
   "Global Search — wire real results", "Wire front end to live contract
   + API data", "Stickers: Gemini to build profile sticker display area",
   the Familiar Bestiary task. A fresh session (or a future collaborator)
   reading the board gets lied to. **Homework (Fable or Opus, 30 min):
   one triage sweep — close the shipped, one-line why on each, per the
   contract. I didn't close them tonight because several need Brendon's
   confirm that "shipped" = "done as specced."**
2. **In-Progress lists are empty while WIP.md carries the real queue.**
   The baton doing queue duty is exactly the drift the 06-11 cleanup fixed.
   Cheap fix: when WIP's NEXT UP gains an item, it gets a ClickUp twin the
   same breath (the contract already says this — it's slipping).

Also noted: the old Launch-list BET-xx tasks partially overlap the newer
security-audit queue (86bawbb7j) — worth merging in the same sweep so
pre-mainnet work has ONE list.

---

## 7. The product take (asked for: shooting the shit)

**The moat is personality density, and no one else has it.** Cartography,
Rewind, the Dispatch, Hostile Takeovers, PriceRank with 1,000 achievement
rungs, the NPC cast, Familiars, natal charts, the Spite Book, a sticker
economy, an in-app newspaper that printed its own first edition a minute
after deploy. Marketplaces are commodities; PD is a *place*. The closest
comparables aren't NFT platforms — they're living-world games (Animal
Crossing's daily rhythm, RuneScape's economy-as-culture). That's a stronger
position than any fee-structure innovation, and it compounds: every new
mechanic multiplies against the others (a Takeover prints in the Dispatch,
moves Cartography, feeds Pings, mints achievements). Genuinely rare design.

**Four honest product risks, none fatal:**

1. **Feature weight vs. one-man maintenance.** 79 routes, 84 engines, ~30
   surfaces — each new mechanic is permanent weight carried by Brendon +
   whatever model minutes exist. The Tier-1 homework is what converts this
   from "impressive but fragile" to "impressive and durable." Rule of thumb
   worth adopting: **every new mechanic ships with its health check** (a
   line in /api/health, a row in the smoke suite) — aliveness you can prove.
2. **The iceberg problem.** The best 80% of the app is behind long-presses,
   triple-taps, and easter eggs. Insiders will evangelize it; a first-time
   visitor sees a gallery. The Feature Atlas + Docs + the Dispatch are the
   right countermeasures — treat "new user discovers feature N" as a
   designed funnel, not an accident. (This is a strength wearing a risk's
   coat: discovery-as-gameplay IS the brand; it just needs a floor.)
3. **Mechanics that need a crowd.** Takeovers, shared-collector continents,
   the social tape — thin-room versions of these read as empty stadiums.
   The NPC cast and sim economy are the smart pre-seed; keep the NPCs
   plausibly active in every crowd-shaped mechanic until real density
   arrives, and design each new social mechanic with an explicit
   "what does this look like with 12 users" answer.
4. **The sim→real transition** (item 5.7) is a product moment, not an infra
   one: the day balances become real ETH, the playful economy's forgiveness
   disappears. The cutover contract is the product spec for that day.

**And the flip side, said plainly:** the *craft inside the product* — the
determinism discipline, the write-once pins, viewer-local time rules, the
glyph vocabulary, toast grammar, the no-cache always-live PWA — is coherent
in a way that reads as ONE person's taste enforced across 177k lines. That's
exactly what "devs will marvel at" looks like from inside the code. The gap
is entirely in the scaffolding around it, and scaffolding is cheap.

---

## 8. The consolidated homework list (ordered)

**This week (pre-anything):**
1. Verify Upstash rate-limit secrets on the Worker (5 min) — §5.1
2. CI action: tsc + build on every dev push (small) — §3.2
3. Error beacon + /api/health + uptime ping (1 session) — §3.3
4. Route smoke suite, money paths first (1 session) — §3.1
5. ClickUp zombie sweep + WIP↔ClickUp re-sync (30 min, needs Brendon's
   confirms) — §6
6. Docs truth pass: CLAUDE.md stack line, api-spec.md (10 min) — §4.7

**Next (fundamental strength):**
7. Settings-envelope per-key merge (design carefully) — §3.4
8. Engine determinism harness w/ golden hashes (1 session) — §3.1
9. Migration mirror sync + generated-type drift check (small) — §4.5
10. DB lint fixes: RLS initplan wraps, FK indexes, follows PK (1 short
    session) — §4.6
11. Per-engine code-splitting, proven by #8 (1 careful session) — §4.1

**Pre-mainnet gate (folds into 86b9v5wj4 Mythic Audit):**
12. Idempotency keys + race hardening (86b9g046n / BET-09) — §5.2
13. Security-audit queued items (86bawbb7j) — §5.3
14. Backup restore drill + R2 posture check — §5.4
15. Secrets inventory doc (86b9g04cr) — §5.5
16. Staging Worker + DB branch split — §3.5
17. THE CUTOVER CONTRACT: sim-ETH / achievements / history / test prices,
    one page, Brendon's calls — §5.7
18. Economy conservation checker over the live ledger — §3.1 Stage 3

**Ongoing conventions (free):**
19. New surfaces use the shared fetch hook — §4.3
20. New features ship with a health-check line + a smoke test — §7.1
21. New CSS goes in styles/{surface}.css, never globals — §4.4
22. Every applied migration lands in the repo mirror same-session — §4.5

Items 2–4, 8–11, 12–13, 18 are **Opus-able** with briefs; 1, 5, 6, 17 are
Fable/Brendon-sized. Happy to turn any of these into docs/briefs/ files on
your word.

---

*Everything in this report is a finding, not a change — nothing was altered
beyond this document. Sources for the numbers: the repo at ab1ee0b, the live
Supabase advisors/migration history, and the ClickUp workspace, all read
2026-07-13.*
