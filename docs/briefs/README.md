# Briefs — how to run these

Each file here is a self-contained task brief for a **fresh Opus 4.8 chat**
(Brendon starts it and says: *"Read docs/briefs/<name>.md and do it."*).

**Run ONE brief at a time, in this order, merging between** — they touch
overlapping code and parallel chats would collide:

1. `desktop-home-crash.md` — fix the Windows/Chrome home-page tab crash
2. `wallet-auth-ens-review.md` — reliability verdicts before strangers connect
3. `architecture-debt-audit.md` — the global view; outputs MORE briefs here
4. `snappiness-pass.md` — transitions + tap response (+ crash learnings)
5. `pollers-reenable.md` — bring back the two frozen pollers, Cloudflare-cheap

Rules that bind every brief: read `CLAUDE.md` first and obey ALL of it —
especially: feature branch off latest `dev`; present Brendon a numbered
CEO-level list; merge to `dev` ONLY on his explicit "push"/"approved";
NO AMPUTATION; fix/deliver ONLY what the brief names; verify with the real
production build. Delete the brief file in the same PR that completes it.
