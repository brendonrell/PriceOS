# BRIEF — Architecture + technical-debt audit (global view, pre-launch)

**For a fresh Opus 4.8 session. Read CLAUDE.md first; subagents allowed —
this brief is the one that BENEFITS most from fanning readers out.**

## The ask (Brendon, 2026-07-03)

The app was "built somewhat piecemeal and ad hoc, most features thought up
long after initial build." He wants the global view: **high-level things that
would make the app better architected — with meaningful, concrete benefits —
and technical debt best dealt with BEFORE launch.** Launch = Sepolia test
phase → mainnet (see `docs/sepolia-test-phase.md`).

## What to audit (the whole repo, with these lenses)

1. **Load-bearing duplication & drift** — same concept implemented N ways
   (data fetching, modals, list rows, market logic, follow graphs). Only
   flag where unification has a REAL payoff (bug class eliminated, surface
   for new features); cosmetic sameness is not debt.
2. **Client/server boundaries** — pages that block paint on heavy queries,
   force-dynamic everywhere vs cacheable reads, oversized client bundles
   (the wallet/market libs are known-heavy; the engine chunk is deliberate).
3. **The sim→chain seam** — the app runs a simulated economy today; real
   contracts flip per-project via `projects.contract_address`. Audit how
   cleanly the sim/real split is factored; anything that would smear when
   the first real project flips is PRE-LAUNCH debt by definition.
4. **API surface consistency** — ~34 route groups grew organically: auth
   wrapper usage, error shapes, rate-limit coverage, validation. Uneven =
   exploitable or breakage-prone.
5. **State layers** — contexts/localStorage/Supabase Realtime/polling: what
   owns what, where double-sources of truth exist.
6. **Fragile hotspots** — files sessions keep re-breaking (WIP.md history
   is the map: icon nudges, shell class reuse, prefetch storms).

## What NOT to do

- No rewrites-for-elegance, no framework churn, no "modernize X" without a
  named benefit Brendon can feel (fewer crashes, faster pages, safer launch,
  features unlocked). He is explicitly skeptical of change for its own sake.
- Do NOT touch code in this session. The deliverable is paper.

## Deliverable

1. In chat: a ranked TOP-10 (max), one line each: the debt → the payoff →
   effort (S/M/L) → pre-launch or post-launch. Brendon picks what proceeds.
2. For each item he picks: write `docs/briefs/debt-<slug>.md` in this same
   self-contained format so a fresh Opus chat can execute it. Add the run
   order to `docs/briefs/README.md`. Push briefs only (docs are
   pre-approved; code is not).
