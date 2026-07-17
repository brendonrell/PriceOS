# The Architect Report — Round 2 — PriceOS / Price Discussion
**2026-07-17 · Fable 5 · full-stack review (code + live deploy + DB posture + ClickUp + sibling repos)**

Scope: architecture, connections, craftsmanship, the PM layer, and — per the
ask — the product itself: features, gameplay, game design. NOT visuals
(Brendon's domain). Everything verified against the repo, the live preview,
and ClickUp today; nothing assumed, nothing changed. Round 1 is
`docs/ARCHITECT_REPORT_2026-07-13.md`; this round measures what moved and digs
where round 1 couldn't.

---

## 0. Opening state check (found while reading — zero action needed)

- The docs-loader fix from the last session's baton **is live and proven**:
  the served /docs HTML carries the dismissal stamp, and a headless replay of
  the exact React 19 resurrection scenario computes the revived loader fully
  inert. The re-kicked build landed.
- `/api/health` is green right now: db ok, sweep heartbeat 4s, Dispatch
  printed today. The 1-minute cron fleet is alive.

---

## 1. The verdict

**Round 1's five survival holes are essentially closed. In the same four days
the app grew ~17,000 lines and 17 API routes without the hygiene slipping —
that is the most impressive fact in this report.** CI gates every push; 40
route/auth/money tests run on it; errors land in a sink; money routes carry
idempotency keys; the settings clobber is dead; the art fleet has a
determinism harness with committed goldens; the migration mirror and generated
types exist; the economy gets a daily conservation audit. That scaffolding
held while six feature marathons shipped through it. This is what "fundamental
strength" was supposed to buy, and it's buying it.

Today's numbers: **193,709 lines of TypeScript across 756 files · 96 API
routes · 147 art-fleet files (~50k lines of engines) · 24,000 lines of CSS ·
9 cron sweeps on one 1-minute trigger · 45 mirrored migrations · 319 contract
tests green · a Sepolia dress rehearsal at 22/22 · a one-thumb mainnet
deployer already rebuilt and waiting.**

What's left is concentrated, and it has moved: the remaining risk is no longer
"the app might break silently" — it's **(a) four unfinished taps only Brendon
can do, (b) the money-logic remainder before ETH is real, (c) delivery weight
(the one thing a dev with DevTools open will ding), (d) the PM layer drifting
again, and (e) product-design questions that are now more valuable than any
new feature.** That's the homework below.

---

## 2. What's excellent now (protect it; don't let future sessions "improve" it)

Round 1's list stands (SIWE layer, error envelope, atomic money RPCs, the
serverless indexer, registry-as-code, fail-closed crons, client persistence
design, the process layer). New entries earned since:

1. **The two-rails market seam.** One route, two rails, switched per project
   by `projects.contract_address`: NULL = sim economy, set = real Seaport
   orders. The cutover was designed into the market instead of bolted on —
   flipping a project to mainnet is a column write, not a migration. This is
   the single smartest architectural decision in the app.
2. **The hardening layer itself.** Idempotency on all five money routes,
   server-side atomic settings merge, the app_errors sink, /api/health, the
   engine golden-hash harness, CI with the real production build. All of it
   invisible to users, exactly as specced.
3. **The ops tool pages.** `/deploy` (one-thumb mainnet launcher, byte-exact
   audited artifacts, progress survives the iOS wallet round-trip) and `/test`
   (22-step Sepolia matrix incl. real Seaport 1155 fills, zero wallet taps).
   No solo founder has tooling like this; most funded teams don't.
4. **The push transport.** Web push rebuilt on WebCrypto for the Workers
   runtime (RFC 8291/8292 by hand) after npm web-push proved to hang there —
   diagnosed in an isolated harness, verified round-trip. Textbook.
5. **The house invariants as culture.** Viewer-local clocks, PNG-only
   previews, write-once pins, honest tail buckets, toast grammar, the glyph
   vocabulary, determinism discipline. 193k lines that read like one person's
   taste — that IS the "devs will marvel" property, and it's already here.

---

## 3. TIER 1 — the blind spots that matter now (ranked)

### 3.1 The four taps from round 1 are still open — one is live-relevant ⚠️
ClickUp `86bax31xd` (due 07-14, now overdue): **the rate limiter is verifiably
OFF in production** (Workers memory ≈ no limit; two Upstash secrets turn it
on, no code change) · no uptime pinger on /api/health · Supabase is on the
FREE plan with the backup/PITR decision unmade · **the five cutover-contract
decisions are unruled** (sim balances, history, achievements, price pass,
closing bell — recommendations attached in
`docs/mainnet-cutover-contract.md`). Everything else in this report is my
work; this half hour is yours, and the cutover calls gate three other
workstreams.

### 3.2 The money-logic remainder — one focused pass before ETH is real
Three strands, one session's design:
- **The conjured-ETH gap** from the 07-11 audit is still queued: seller is
  always credited but a buyer with no users row is never debited. Known,
  bounded, play-money era — but it's the exact class that becomes a headline
  post-cutover.
- **The sticker fee lattice grew after the audits**: 95/3/2 with per-sheet
  collab rerouting, atomic inside the sticker RPCs. The conservation pass
  should now assert art + sticker invariants in one sweep (the daily economy
  audit is the natural home).
- **The RPC internals are still the largest untested surface.** July's suite
  tests every route above them; the Postgres function bodies where money
  actually moves have zero tests (free plan blocked branch DBs). New option
  this round opens: the 45-file migration mirror is now complete enough to
  boot the schema into a throwaway Postgres **in CI** and exercise
  app_mint/app_buy/app_accept_offer/app_sticker_* directly — no Supabase
  branch needed. That's the single highest-value test investment left.

### 3.3 The sticker store is the one seam that isn't cutover-clean
Deliberate and known — but now decision-adjacent: the sticker **market**
(secondary) moves money server-side atomically, while the **store** (primary)
grants ownership client-side in device state synced to the account. Two
consequences: print-run caps — Brendon's decision of record, ALL 18 sheets
limited — are unenforceable until the primary buy moves server-side
(`86bayvczh`, correctly queued), and the ERC-1155 ownership read swap at
cutover has a second, unbudgeted half. Recommend: one build, before mainnet,
same session as 3.2's sticker invariants.

### 3.4 Delivery weight — the last thing a sharp dev will ding
The shared first-load is a healthy ~106 kB, but every art-rendering surface
pulls a **~1.3 MB engine chunk** because the registry statically imports all
147 engine files. Per-engine lazy loading was deferred in round 1 *pending the
determinism harness* — the harness now exists with committed goldens, so the
gate is open. Related and compounding: **the giants kept growing** —
globals.css 11.6k → 12.1k lines in four days (the albums-grid class collision
already burned a session; that bug class scales with the file), ProfilePageBody
at 2,057 lines, 43 files now over 800 lines. Both items are mechanical,
Opus-able, and proven safe by existing harnesses (golden hashes for the
engines; built-CSS byte-diff for the split).

### 3.5 You can see errors now — you still can't see usage
Telemetry is error-only. There is no measure of which features users actually
touch: no spell-cast counts, no surface-open counts, nothing. Pre-launch this
is fine; the day real users arrive, every product question ("do people find
the Composer?", "does anyone use Workspaces?") becomes a guess — for a
platform whose core risk is the iceberg problem, flying blind on discovery is
the one blindness left. The mold exists (search_log, the telemetry beacon):
one tiny event counter — name + day + count, no identity beyond what the app
already holds — answers "which mechanics land" forever. Small build, big
compound value.

### 3.6 The health convention didn't survive the July firehose
/api/health has the same 4 checks it shipped with (db, sweep heartbeat, last
event, last Dispatch). Since then: stickers market, Sentinel, war + takeover
sweeps, the newsletter, native push. "Every mechanic ships a health line" is
in the convention list; July shipped ~10 mechanics and zero lines. One
backfill session, then hold the line in review.

### 3.7 Paper drift, round 2
`docs/api-spec.md` was verified 07-13 at 79 routes; there are 96 now. The
Alchemy webhook route still carries its "TRANSPLANT FILE — drop into PriceOS"
header from the indexer repo — a stale comment sitting on the hottest
security-critical file in the app. Both are minutes to fix; both mislead
fresh sessions, which is the exact failure class the operating contract
exists to prevent.

---

## 4. TIER 2 — craftsmanship under the microscope (none urgent, all real)

1. **The 19-provider pyramid** in the root layout — unchanged, works,
   pure context-window tax and a hazing ritual for every fresh session.
   Fold-worthy whenever a session is already in there.
2. **242 hand-rolled fetches.** The shared hook exists and is the convention
   for new surfaces (correct call — no rewrite); worth migrating only the
   surfaces that keep disagreeing about the same number (follower counts,
   floor reads) as they get touched anyway.
3. **The prehydration script duplicates the Mood Ring math** in a string that
   must stay in draw-for-draw lockstep with the real module. Deliberate,
   commented, working — but it's a silent-divergence risk with a cheap pin: a
   unit test that computes both paths for today ± 30 days and asserts equal
   hex. Ten lines, permanent insurance.
4. **126 art files are type-check exempt** — accepted posture from round 1,
   restated: the golden-hash harness IS the compiler for art. Fine.
5. **Generated-types drift check is convention-only** (CI has no DB creds).
   Acceptable; the convention has held so far — keep it in the session
   ritual.
6. **The indexer fold-in is complete** — webhook + reconcile + lib live
   in-app; the indexer repo branch is now historical reference. Its ClickUp
   folder should say so (its open tasks — first Sepolia live-run, ATH/holder
   map, reorg depth — are real but describe the in-app pipeline now).

---

## 5. The PM layer — ClickUp drifted again, in a new way

Round 1 found zombies and fixed them. The drift came back wearing a different
coat: **July's ships mostly bypassed ClickUp entirely** — five straight
sessions logged "ad-hoc chat batch, no task of record." The In-Progress rails
are empty while WIP.md carries a 1,200-line queue. And task *bodies* rot while
truth lives in comments: the Sepolia task still describes deploying
"PDCollection, NOT PDStickers (deferred)" — reality is stickers deployed,
aligned, and 22/22 green including Seaport fills.

**Zombies found today (need your confirm to close, one line each):** the
urgent "Vercel paused — re-enable pollers" task (Vercel is dead; Cloudflare
crons replaced the pollers) · "Finalise airdrop + deploy $PRICE" (deployed
07-03) · "Set up pricediscussion.eth wallet" (it holds the supply) ·
"Cloudflare migration before mainnet" (done) · "Secondary Market — Make It
Real" (built) · studio + sticker-studio build tasks (built; only DNS taps
remain) · security-folder items done in the hardening round (idempotency ·
secrets inventory · monitoring, mostly) · shipped ideas still open in the
Ideas bank: Aura, Fog of War, Price Lens, Genome, Price Target
(predictions), The Watch (Sentinel), The Anchor, NPC Cast, The Bench ·
"Digital Familiar — Bestiary" sitting In Progress · four June decision tasks
with June due dates that shipping has since decided · the BET-xx → security
queue merge from round 1, never executed.

**The fix that fits reality instead of fighting it:** keep per-feature tasks
for *queued* work, but give ad-hoc sessions a standing **rolling ships task
per month** — one comment per session, five lines, same breath as the WIP
update. The contract's "ClickUp moves with the work" failed twice now because
it demands per-feature ceremony mid-firehose; a month-task comment is
30 seconds and keeps the board honest. Plus one 45-minute triage sweep with
your yes/no list to clear the zombies above.

---

## 6. The product review — features, gameplay, game design (the shoot-the-shit, honest)

### What PD actually is now
Counting systems, not buttons: **~45 named mechanics** across six layers —
identity (handles, colorways, sprites, Sigils, factions, natal charts,
Identity Plate), economy (mint, two-rail market, offers/criteria, stickers
with print runs + collabs + want-lists, completionism, portfolio), social
(pings, follows, circle, Friend Inspector with lenses, gossip, Spite Book,
mutes, vouches), knowledge (Cartography with Sybil nets, Composer, Tribunal,
Genome, Arbitrage Map, sentiment + predictions, Rewind), living world
(Dispatch + digest, PriceDay, Mood Ring, NPC cast, Gnome, Celestial, War,
Takeovers, Sentinel), and meta (1,000 achievements, PriceRank, streaks, Lane
Runner, Workspaces, a 23-pill Spell Book, setup codes). The Spell Book stub
list hit zero this week. That is a staggering amount of shipped, coherent
product for one person and a model.

### The moat, restated with more conviction
Round 1 said personality density. After reading everything again: **the moat
is that PD is a *place* with *laws*.** Deterministic art, write-once pins,
viewer-local time, honest empty states, a fixed glyph language, an economy
with a daily newspaper of record. Laws compound — every mechanic that obeys
them makes the next one feel inevitable. Marketplaces are interchangeable;
worlds with consistent physics are not. Nobody vibecodes their way to a
coherent 193k-line world — *that* is the story when the microscope arrives,
and the code substantiates it.

### The four design risks that matter now (ranked, with concrete moves)

**1. Literacy, not density.** 23 spells, 16 grouping dimensions, lenses,
workspaces, codes — the game has deep systems and no taught progression.
Discovery-as-gameplay is the brand, but every great secret-heavy game forces
one first rung (Fez teaches rotation before it hides anything). PD's first
ten minutes currently teach: here is a gallery. **The concrete move:** a
designed first-session rung using pieces that already exist — achievements +
pings + one NPC — that ends with a new user having starred one piece, written
one note, cast one spell. Wiring and copy, not a build. The iceberg keeps its
depths; the surface gets a ladder.

**2. The thin room.** NPC coverage is now genuinely good (menus, Gnome,
Celestia, the sim economy's pulse). The remaining exposure is mechanics whose
*output* needs a crowd: the predictions histogram with 4 voters reads as a
dead feature; a War with two oath-takers reads as an empty stadium; Audience
counts of 1 are worse than none. The house already invented the answer —
honest tail buckets — extend it: **every crowd-shaped readout gets a designed
n<K state** that owns the small room instead of exposing it (below K, the
histogram becomes "the crowd is still forming · N calls sealed").

**3. Appointment vs. ambient.** The daily rhythm is strong (9AM Dispatch,
PriceDay, Mood Ring, streaks). What's missing is the *event* — a moment
people show up for together. The monthly predictions reveal is sitting right
there: make it a telegraphed occasion the Dispatch previews and covers
(the cutover doc's closing-bell instinct, applied monthly). Same for
takeover windows: telegraphed sieges give spectators a reason to be present,
and spectacle is what the feeds/gossip/Dispatch machinery was built to
amplify.

**4. The front door.** Everything meaningful is behind a wallet connect — the
coldest cold start in consumer software, and PD's depth makes it costlier:
the people most likely to evangelize it are the ones who'd wander the world
before committing. The Dispatch, docs, and llms.txt are public; **the
decision** (not build — decision): which of the hook surfaces — home feed,
project pages, Cartography in spectator mode — should render logged-out?
Every surface that does becomes shareable marketing; every one that doesn't
is a wall. This is the highest-leverage launch-funnel question and it's
purely your call.

### What I'd lean into
1. **The Dispatch as the public artifact.** It's the marketing engine wearing
   a feature's clothes — every edition is shareable proof the world is alive.
   The digest is BUILT and dormant behind two DNS records + one key. Those
   taps are pure upside.
2. **The ops story as lore.** Post-mainnet, "/deploy — how a solo founder
   ships an immutable contract stack from a phone" is a devs-marvel artifact
   in itself. The pages exist; the story writes itself when the time comes.
3. **Stickers as the social object.** Want-list matchmaking, swaps, gifts,
   collab sheets — the most multiplayer-shaped economy in the app, and the
   one with the lowest literacy cost (everyone understands stickers).
4. **The determinism discipline as a public docs page.** The engine-goldens
   story ("the art is a pure function; here's the proof harness") is catnip
   for exactly the dev audience you want marveling.

### What I'd hold (said plainly, as asked)
**No new nouns before cutover.** The Ideas bank holds 120+ banked mechanics —
good, keep banking. But the platform doesn't need another system; it needs
the cutover calls, the money pass, the funnel rung, and the taps. If I were
you I'd declare the feature set launch-frozen and spend the next stretch of
Fable minutes exclusively on §3 + §7 — the app is already more world than any
launch audience can drink; every additional mechanic pre-launch adds weight
to the cutover and thins the polish budget. The discipline that shipped 45
systems can also hold the line at 45.

### And the sequencing call, since you asked what I'd change
**Drive to mainnet now.** Sepolia is 22/22, /deploy is rebuilt for mainnet
with audited artifacts, contracts are 319-green with the sticker re-audit
trigger correctly noted. The critical path is short and mostly decisions:
your five cutover calls → money-logic pass (§3.2) + sticker primary
server-side (§3.3) → Mythic re-audit of the changed sticker paths → staging
split → ceremony. Every pre-mainnet week adds sim history the cutover has to
answer for and keeps the rate limiter conversation theoretical. The world is
ready to be real.

---

## 7. The consolidated homework list (ordered; ★ = carryover from round 1)

**Yours (the taps — ~45 min total):**
1. ★ Upstash secrets on the Worker → rate limiter ON (5 min) — §3.1
2. ★ Uptime pinger at /api/health (5 min) — §3.1
3. ★ Backups: check cadence, decide Pro/PITR pre-mainnet (10 min) — §3.1
4. ★ THE CUTOVER CALLS — five decisions, recommendations attached (20 min,
   unblocks three workstreams) — §3.1
5. Zombie-sweep confirms — the §5 list, yes/no per line (10 min)
6. Dispatch digest DNS ×2 + key (5 min) — §6
7. The front-door decision: which surfaces render logged-out — §6

**Fable-designed (I spec, Opus executes, per the metering rule):**
8. Money-logic pass: conjured-ETH debit fix + art+sticker conservation
   invariants into the daily audit — §3.2
9. Sticker primary buy server-side + print-run cap enforcement — §3.3
10. RPC-internals test rig: boot the migration mirror into throwaway
    Postgres in CI, test the money function bodies directly — §3.2
11. First-session rung: the designed onboarding quest from existing pieces —
    §6 risk 1
12. Thin-room states: n<K designs for predictions/war/audience surfaces —
    §6 risk 2

**Opus-able with briefs (mechanical or well-gated):**
13. ★ Per-engine code-splitting, gated on the (now existing) golden-hash
    harness; report the first-load delta in the PR — §3.4
14. ★ Split the giants: globals.css by surface (byte-diff proof),
    ProfilePageBody + the 800-line club, one per PR — §3.4
15. Usage counter: tiny event beacon + day-count table + a /stats read —
    §3.5
16. Health backfill: one line per July mechanic (stickers, sentinel, war,
    takeover, newsletter, push) — §3.6
17. Docs truth pass: api-spec re-verify at 96 routes; strip the transplant
    header off the webhook route — §3.7
18. Mood Ring lockstep pin test — §4.3
19. ClickUp triage execution after your confirms + the rolling-ships-task
    convention — §5
20. ★ Staging split (second Worker + DB branch) — at cutover, design already
    in the contract doc — §3.1/§6
21. Mythic re-audit of the sticker money paths (already scope-commented on
    the audit task) — the last gate — §6

**Standing conventions (hold the line):**
22. Every new mechanic ships its health line + smoke test (it slipped in
    July — enforce at review) · new CSS in styles/{surface}.css · applied
    migrations mirrored same-session · new surfaces use the shared hook.

---

*Report only — nothing beyond this document changed. Round 1 remains the
baseline record; where they disagree, this round is current. Sources: the
repo at 975e177, the live preview (fetched + headless-driven today), the
ClickUp workspace (both open-task pages + six gate tasks read in full), and
the sibling repos, all read 2026-07-17.*
