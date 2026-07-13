# BRIEF — Fundamentals Hardening (the Architect Report homework, all 22 items)

**Source of truth for this workstream: `docs/ARCHITECT_REPORT_2026-07-13.md`.**
Read it FIRST, in full — every item below references its section numbers.
Then read `CLAUDE.md` (the operating contract) and `docs/WIP.md` (live state).
Brendon has approved this workstream in chat (2026-07-13): **"I want to fix
all of them without disrupting the current flow."** That sentence is the
scope: all 22 homework items, zero product disruption.

This brief is written to be executed across MULTIPLE sessions (Opus
recommended — subagents are allowed in Opus sessions, never in Fable ones).
Each session: pick up at the checklist below wherever the last session
stopped, work to a clean stopping point, follow the end-of-session ritual.

---

## The prime rule of this workstream: DO NOT DISRUPT THE FLOW

"Without disrupting the current flow" (Brendon's words) means, concretely:

1. **Zero product/behavior/UI changes.** This is scaffolding work. If a task
   seems to require changing what a user sees or how a feature behaves,
   STOP and ask Brendon in one plain line. The one sanctioned exception is
   invisible mechanics (e.g. the settings-merge fix, §3.4) whose entire
   point is that users notice nothing.
2. **Art is sacred.** Any change near `lib/art/` must be proven
   pixel-identical by the golden-hash harness (item 8) BEFORE it merges.
   No harness proof, no merge. Never change engine code "while you're here."
3. **The ship gates still apply in full** (CLAUDE.md §0/§4). App-touching
   pushes: present the numbered CEO list, wait for Brendon's word, then
   merge to `dev` + push `dev`. Docs/process/CI-config pushes (docs/,
   .claude/, .github/, this file): pre-approved, just push.
4. **No live-DB writes without Brendon's explicit approval** — migrations
   included. Prepare the migration, present it, apply on his word. (Advisor
   lint fixes in item 10 are still live-DB writes. No exceptions.)
5. **Never install a caching service worker, never propose WebP, never pin
   displayed times to UTC** — standing platform rules (CLAUDE.md §9); this
   workstream touches infra where those temptations live.
6. **The normal work queue outranks this brief.** If Brendon fires a product
   task mid-session, this workstream pauses at a clean point (I-own-the-queue
   rule) and resumes after. This brief is the background spine, not a lock.

---

## Working style

- Branch per batch off `dev`, PR into `dev`, present → approval → merge.
  Batch related items (e.g. items 2+3 in one PR is fine); never mix
  app-code batches with docs-only batches in one approval ask.
- **Verify like the contract demands** (CLAUDE.md §6): run the real build,
  inspect compiled output, exercise the changed path against the preview.
- Every commit ends with the co-author trailer (CLAUDE.md §0).
- **Track progress IN THIS FILE**: flip `[ ]` to `[x]` with a one-line note
  (date + where the proof lives). This checklist is the workstream's baton.
- End-of-session ritual: clean tree → ClickUp (comment what shipped on task
  86bawbb7j or the item's own task) → `docs/WIP.md` last.

---

## THE CHECKLIST (execute top-down; report §-refs in parentheses)

### Phase A — This week / safety first

- [ ] **1. Rate-limiter reality check (§5.1) — DO FIRST, 5 min.** Determine
  whether the deployed Worker has `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` set (Cloudflare connector, or ask Brendon to
  read the Worker's secret names — names only). If unset: present Brendon
  the choice (create free Upstash db + set secrets, vs. Cloudflare
  rate-limiting rules). The middleware needs NO code change for Upstash.
- [ ] **2. CI on every push (§3.2).** `.github/workflows/ci.yml`: on push +
  PR to `dev` — install, `tsc --noEmit`, `next build`. **NOTE (2026-07-13,
  supersedes the report §3.2's "manual deploy" framing): pushing `dev` now
  AUTO-DEPLOYS via Cloudflare's build — never ask for a CF token.** That
  makes this item MORE load-bearing, and the PR run is the real gate: the
  Action must be green on the feature-branch PR BEFORE the merge to dev,
  because the dev push itself goes straight to the live preview. Config-only
  → its push is pre-approved. Prove it: one green run on GitHub.
- [ ] **3. ESLint baseline (§3.2).** `next/core-web-vitals` config + fix or
  explicitly disable (with a reason comment) every finding. Wire into CI.
  Rule choices must not force product-code rewrites — tune config to the
  codebase's real conventions (raw CSS, VS-15 glyphs, etc.).
- [ ] **4. Error telemetry + health (§3.3).** (a) `app_errors` sink: tiny
  POST route + table (or KV), fed by the existing ErrorBoundary,
  window.onerror, unhandledrejection, and `serverError()`; fingerprint +
  route + build id; row cap + 30-day retention; rate-limited; NO PII beyond
  what the app already holds. (b) `GET /api/health`: DB reachable, sweep
  heartbeat age, last webhook age, last dispatch date, per-cron last-run
  stamps. (c) Present a free uptime pinger pointed at it (Brendon tap).
  New table = migration = Brendon approval before applying (rule 4).
- [ ] **5. Route smoke suite, money paths first (§3.1 Stage 1).** vitest;
  run route handlers directly (import the route modules) against a
  **Supabase branch** — never prod. ~30 tests: SIWE nonce/verify/replay
  rejection, requireAuth 401s, /api/me PATCH validation matrix,
  mint/buy/offer happy + rejection (sold_out, insufficient balance,
  not_listed), webhook bad-signature 401, cron no-secret fail-closed.
  Wire into CI. Supabase branch creation may carry a cost — surface it to
  Brendon before creating (contract: money = his call).
- [ ] **6. ClickUp zombie sweep (§6) — needs Brendon.** Present him the
  one-message confirm list (React-build task, Familiar epic + Bestiary,
  Stars/Wishlist/Albums UI, Global Search wiring, "wire front end to live
  data", sticker-display task) — on his confirms, close each with a
  one-line why; move anything half-true to Backlog with a corrected title.
  Also merge the BET-xx launch tasks into the 86bawbb7j queue so
  pre-mainnet work has one list (comment, don't delete history).
- [ ] **7. Docs truth pass (§4.7).** CLAUDE.md §1 stack line → Next 15 /
  React 19; `docs/api-spec.md` header → Cloudflare Worker + real base URL +
  a "verified against code 2026-MM-DD" stamp. Docs-only, pre-approved.

### Phase B — Fundamental strength

- [ ] **8. Engine determinism harness (§3.1 Stage 2) — BEFORE item 11.**
  Commit a headless render harness to `tools/` (playwright + esbuild — the
  07-12 perf pass proved this pattern; rebuild it cleanly). For every
  engine in the registry: same seed twice → identical hash; canonical seed →
  matches a stored golden hash committed to the repo. Add a CI job (or a
  documented manual gate if CI runtime is prohibitive — state which).
- [ ] **9. Settings-envelope per-key merge (§3.4) — the delicate one.**
  Server-side: PATCH `/api/me` merges provided `settings` keys into the
  stored jsonb instead of replacing the column (jsonb merge in SQL or a
  small RPC); same for the other envelope columns. Client: send only
  changed keys (the per-key stores already know). Use the `t` timestamps
  on notes/todos where they exist. MUST be invisible: no UX change, no data
  migration of existing rows needed. Design doc first (one page, in
  docs/briefs/), present the design to Brendon BEFORE building — this
  touches every user's saved state and deserves his eyes. Add smoke tests
  (two-writer clobber scenario) to the suite from item 5.
- [ ] **10. DB lint batch (§4.6) — Brendon approval to apply.** One
  migration: wrap the ~17 RLS initplan policies in `(select …)`, index
  muted.muted_address / pings.project_id / season_standings.user_address,
  add follows PK, drop the never-used indexes (list them in the PR).
  Verify with a fresh advisors read after applying.
- [ ] **11. Migration mirror + type drift (§4.5).** (a) Backfill
  `supabase/migrations/` with the applied-but-unmirrored migrations
  (rewind_social_snapshots, dispatches, hostile_takeovers, game_scores,
  muted, calendar_items, …— pull bodies from the live schema / MCP
  history). (b) Generate types from the live schema into
  `lib/supabase.generated.ts`; add a CI drift check (regenerate + diff).
  Keep the hand-written annotated types as the curated layer. (c) Add the
  convention to CLAUDE.md §6: every applied migration lands in the repo
  mirror in the same session.
- [ ] **12. Per-engine code-splitting (§4.1) — gated on item 8 green.**
  Registry maps slug → lazy engine loader; engines load on first render of
  that project; server/API paths keep working. Prove: golden hashes
  unchanged, first-load JS drop measured (report numbers in the PR), every
  surface that renders live art still does (cards, modal, full page,
  Cartography, previews). This is the highest-regression-risk item in the
  brief — small PR, exhaustive verify, present with the numbers.
- [ ] **13. Shared fetch hook (§4.3).** One small hook (dedupe +
  stale-while-revalidate + error path), adopted by a handful of hot
  surfaces as the proof, documented as the convention for new surfaces.
  Do NOT mass-migrate 172 call sites — convention, not rewrite.
- [ ] **14. Split the giants (§4.4) — mechanical, zero behavior change.**
  globals.css → styles/{surface}.css (imports preserved, computed CSS
  byte-identical where possible — diff the built css); ProfilePageBody /
  StarredList / ArtworkPageBody / HomePageBody → per-tab children with
  identical rendered output. One giant per PR. Finish the
  docs/dead-css-candidates.md pass while in there (flag, present, only
  delete on approval — no-amputation rule).

### Phase C — Pre-mainnet gate (folds into Mythic Audit 86b9v5wj4)

- [ ] **15. Idempotency + race hardening (§5.2, ClickUp 86b9g046n +
  BET-09).** Idempotency keys on state-changing endpoints; double-submit
  tests added to the suite.
- [ ] **16. Security-audit queue (§5.3, ClickUp 86bawbb7j).** The queued
  items: money-math conservation in trade fns + buyer-debit conjure fix,
  revoke 11 dead anon SELECT grants, pin search_path on 3 fns, move citext
  out of public, script-src CSP (tune against the live wallet scripts —
  report-only mode first), SIGNUP_SIM_ETH_GRANT=0 goes on the cutover
  checklist (item 19), not now.
- [ ] **17. Backup drill (§5.4).** Confirm the Supabase plan's backup
  cadence (read it, don't assume), restore ONE backup into a branch and
  prove a table's contents; document the drill result in docs/security/.
  Confirm R2 preview-bucket durability posture. Anything costing money →
  Brendon first.
- [ ] **18. Secrets inventory (§5.5, ClickUp 86b9g04cr).** Names-only list
  of every Worker secret + build var + where it's set + rotation note, in
  docs/security/. No values, ever.
- [ ] **19. THE CUTOVER CONTRACT (§5.7) — Brendon's decisions, your pen.**
  One page in docs/: what happens at mainnet to sim-ETH balances, sim-era
  achievements/PriceScore, market history, zeroed projects, test prices
  (bulletin 0.2222 / reliquary 22.222), SIGNUP_SIM_ETH_GRANT, and
  .env.production chain flip. Draft the options per decision with a
  recommendation each, present as ONE numbered list, write down his calls.
  Blocks nothing else — do it early anyway; Phase C work references it.
- [ ] **20. Staging split (§3.5) — at mainnet cutover, not before.**
  Second Worker + Supabase branch as staging; dev deploys there, main to
  prod. Design now (half a page in the cutover contract), build when
  Brendon calls the cutover.
- [ ] **21. Economy conservation checker (§3.1 Stage 3).** Script over the
  live ledger asserting per-trade sim-ETH conservation (fees included);
  run it read-only on a schedule or as a manual pre-mainnet gate; findings
  → 86bawbb7j.

### Standing conventions (adopt from day one, add to CLAUDE.md when proven)

- [ ] **22.** New features ship with a /api/health line + a smoke test;
  new surfaces use the shared fetch hook; new CSS goes in
  styles/{surface}.css; every applied migration lands in the repo mirror
  same-session. Add these four lines to CLAUDE.md §6 once items 4/5/13/14
  exist (docs push, pre-approved).

---

## Brendon-gated moments (batch these — never drip-feed him asks)

Collect and present ONCE per session, as a single numbered list: Upstash
choice (1) · uptime pinger (4c) · Supabase branch cost (5) · zombie-task
confirms (6) · settings-merge design sign-off (9) · DB migrations to apply
(4a, 10, 11a, 15, 16) · backup-drill cost if any (17) · every cutover-
contract decision (19) · all app-code merges (the standing gate).

## Definition of done (the whole workstream)

CI green on every dev push · errors visible + health pinged · the smoke
suite + determinism harness + conservation checker all runnable in one
command each · settings clobber impossible (test proves it) · repo mirror
=== live schema with a drift check · advisors clean · first-load JS
measurably down with art pixel-identical · docs true · ClickUp true ·
cutover contract signed by Brendon. When all boxes are checked, comment
the summary on 86b9v5wj4 (Mythic Audit) — this workstream IS that audit's
foundation — and retire this brief with a final note here.
