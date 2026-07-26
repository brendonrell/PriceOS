# BRIEF — The Conviction / Call Ledger

> **Status: SPEC'D 2026-07-26, not built.** Origin: King Mode Keeper #5
> (ClickUp Atlas → "Keepers — Greenlit (full specs)"), re-verified against the
> live app 2026-07-26 by the Opus ClickUp review. This brief supersedes the
> King Mode spec where they differ — the app moved (Cloudflare cron fleet,
> Price Targets shipped, the Receipt shipped).

**One line:** one tap posts a **signed, timestamped, public, immutable** price
call that **auto-resolves CROWNED or REKT** against the floor — a permanent
win/loss record per user. PD's reputation spine.

Marketing line: *"Call it. The chain settles it. Right forever — or wrong
forever."*

---

## ⛔ Read first — how this is NOT Price Targets (both exist, on purpose)

**Price Targets is LIVE** (shipped 2026-07-13): ONE sealed, retargetable
30-day floor call per project per calendar month, revealed only as an
aggregate histogram when the month turns
(`app/api/project/[slug]/predictions/route.ts`,
`app/api/user/[address]/targets/route.ts`, table `price_predictions`,
zero public policies — the seal is structural).

**Conviction is the opposite product** and must not touch it:

| | Price Targets (live) | Conviction (this brief) |
|---|---|---|
| Visibility | Sealed until monthly reveal | **Public the second it's posted** |
| Editable | Retargetable while window open | **Immutable, ever** |
| Window | Fixed monthly | **Caller picks the deadline** |
| Output | Crowd histogram vs reality | **Personal W–L record + CROWNED/REKT verdicts** |
| Emotional register | The sealed crowd game | Public bravado, receipts forever |

Do NOT refactor, rename, merge, or "unify" the Targets code. Conviction is a
new, parallel system. Copy must keep the two distinct (Targets keeps its name
everywhere; this feature's noun is **the Call**, the surface is **the
Ledger**).

## Grounding — verified in the repo 2026-07-26

- **Floor feed:** `projects.floor_price_eth` — already the anchor for
  predictions, targets, search, the Stone. That column IS the resolution
  oracle for v1. (Post-indexer, real sales can join it — Phase 2.)
- **Auth:** `lib/auth/siwe` (`getSession` / `requireAuth`) — the write route
  is session-gated exactly like `/api/calls`-shaped peers.
- **Resolution job:** the established cron pattern — every-minute Cron
  Trigger dispatched from `custom-worker.ts`, KV probe-and-exit gate
  (~15 min real cadence), fail-closed on `CRON_SECRET`. Copy the
  `price-holdings` / `economy-audit` shape verbatim. ALSO resolve-on-read
  (a GET that notices an expired/crossed open call settles it) so the ledger
  is never visibly stale between sweeps. Both paths must be idempotent and
  agree (same pure `resolveCall(call, floorNow, now)` function).
- **The Receipt is LIVE:** `lib/output/receipt.ts` — client-canvas card,
  canonical art, PNG to the share sheet, $0. A resolved call generates a
  Receipt **variant of that card** (verdict pill CROWNED/REKT + the call
  line + record) — do not build a second card system.
- **Score cap:** any PriceScore/achievement feed from calls is clamped under
  `GAMEABLE_SCORE_CAP` (`lib/achievements/engine.ts`) — rank stays earned by
  on-chain money, calls can't farm it.

## v1 claim shape (recommendation — Brendon rules before build)

A call = **direction + target floor + deadline**, on a project.

- `FLOOR ≥ X by T` (bull) · `FLOOR ≤ X by T` (bear). Two types only in v1.
- Window picks: **24H / 7D / 30D** (no free-form dates in v1).
- **Resolves early on cross:** the first floor write meeting the target
  settles it CROWNED immediately. Otherwise at deadline: target not met →
  REKT. Boundary is inclusive (≥ / ≤), server clock, deterministic.
- Server stamps `floor_at_call` + created_at; a call whose target is already
  met at post time is rejected (no free CROWNs).
- Per-user record = `W–L` (e.g. `7–2`), computed. Per-project Oracle weight
  (earned by being right in that collection) = computed/cached — Phase 2
  surface, don't build UI for it in v1.

## Data + API

- NEW table `calls(id, user_address, project_id, token_id null, claim_type,
  target_eth numeric, window_end timestamptz, floor_at_call numeric,
  status 'open'|'crowned'|'rekt', resolved_at null, floor_at_resolve null,
  created_at)`. RLS: SELECT to anon/authenticated; writes via service route
  only (immutability = no UPDATE/DELETE surface at all; resolution writes
  status once via service).
- `POST /api/calls` (SIWE) · `GET /api/calls?project=` / `?user=` ·
  resolution inside the cron sweep + on-read settle.

## UI (placements are DOORS — ⛔ Rule #-0.4: Brendon confirms each BEFORE code)

- **The Call affordance** — proposed: on the project page near the existing
  Targets surface. NOT built until Brendon names the spot.
- **The Ledger** — proposed: a profile surface beside the Targets ⬚ tab:
  record chip + open calls + settled history with inverted CROWNED/REKT
  pills. NOT built until Brendon names the spot.
- Toasts per casing law: `Conviction: CROWNED · 7–2` · `Conviction: REKT`.
- Glyphs from `docs/GLYPHS.md` only — the Ledger needs a mark; candidates
  screened against the glossary + emoji-mapping gate, picked by Brendon.
- Corner law: 4px controls. Full-strength chrome, mid-tone-colorway proofed.

## Phasing

1. **v1 ($0, now):** post + public ledger + resolve vs current floor (cron +
   on-read) + record + Receipt variant + score cap.
2. **Phase 2 [indexer]:** resolve against real sales/floor history; Oracle
   weight surfaces; feeds The Whisper.

## Acceptance

A posted call is signed, server-stamped, publicly listed, and cannot be
edited or deleted by anyone including its author; it settles deterministically
(early-cross CROWNED or deadline REKT) with cron and on-read paths agreeing;
the user's record updates; a Receipt can be shared; PriceScore impact stays
under the anti-farm cap; Price Targets is byte-for-byte untouched.
