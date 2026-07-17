# Briefs — how to run these

Each file here is a self-contained task brief for a **fresh Opus 4.8 chat**
(Brendon starts it and says: *"Read docs/briefs/<name>.md and do it."*).

**Run ONE brief at a time, in this order, merging between** — they touch
overlapping code and parallel chats would collide.

## The active queue (Architect Report round 2, 2026-07-17)

1. `rpc-test-rig.md` — boot the schema in CI, test the money functions
   directly (unlocks 2 and 3)
2. `money-logic-pass.md` — kill conjured ETH + conservation invariants
   (art + stickers) + the 07-11 hygiene remainder
3. `sticker-primary-serverside.md` — store buys server-side, print-run
   caps become real
4. `engine-code-splitting.md` — the 1.3 MB art chunk goes lazy
   (harness-gated; highest regression risk in the folder)
5. `giants-split.md` — the 12k-line stylesheet + the 800-line club,
   byte-identical proof method
6. `usage-counter.md` — privacy-clean feature-usage counts (half-session)

## Still queued from earlier rounds (order after the six — Brendon's pick)

- `desktop-pass.md` — perks for the big screen
- `studio-phase2.md` — artist studio to 100%
- `discord-feeds-worker-migration.md`
- `ios-push-notifications.md` — blocked on a Brendon tap (build variable)
- `snappiness-pass.md` — partially superseded by later perf work; re-verify
  scope before running
- `pollers-reenable.md` — Vercel-era; verify what the Cloudflare cron fleet
  already covers before doing anything

## Not run items

- `fundamentals-hardening.md` — the hardening workstream's baton/checklist
  (19/22 done; the three deferred items became queue items 4–5 above +
  the staging split at cutover)
- `architecture-debt-audit.md` — superseded by the two Architect Reports
  (`docs/ARCHITECT_REPORT_2026-07-13.md`, `…2026-07-17.md`)

Completed-and-shipped briefs get deleted in their completing PR
(2026-07-17 cleanup: composer-v1, friend-inspector-rebuild,
desktop-home-crash, mainnet-tester — all verified shipped in WIP history).

Rules that bind every brief: read `CLAUDE.md` first and obey ALL of it —
especially: feature branch off latest `dev`; present Brendon a numbered
CEO-level list; merge to `dev` ONLY on his explicit "push"/"approved";
NO AMPUTATION; fix/deliver ONLY what the brief names; verify with the real
production build. Delete the brief file in the same PR that completes it.
