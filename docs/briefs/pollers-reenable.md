# BRIEF — Re-enable the two frozen pollers, the Cloudflare-cheap way

**For a fresh Opus 4.8 session. Read CLAUDE.md first; subagents allowed.
Smallest brief — can ride right after the snappiness pass.**

## Context

During the Vercel free-tier CPU crisis (2026-06-27) two background pollers
were hard-disabled behind flags to stop usage drain, and Brendon froze them
("stay off until I say"). On 2026-07-03 — post-Cloudflare-migration — he
asked for them back, re-engineered so a sudden CPU-slurp can't recur:
caching etc. The Cloudflare plan includes 10M requests/mo + 30M CPU-ms;
polling at launch scale is a rounding error — the Vercel fear doesn't
transfer, but the re-enable must still be engineered polite.

## The two flags

1. `RPC_PING_DISABLED` — `lib/rpc/rpcEngine.ts`. The ⌁ latency pill: polled
   `/api/rpc-ping` every 4–8s per tab. Button currently inert.
2. `PINGS_POLL_DISABLED` — `lib/state/PingsContext.tsx`. Unread-pings count:
   `/api/pings/count` every 15s + live-event nudge + visibility refetch.
   (Menu still pulls once on open — that stays.)

## The spec (Brendon's words: "prevent that issue moving forward…
but instead caching etc")

- Flip both flags back on.
- **Poll only while the app is open AND visible** — background tabs and
  hidden PWAs go quiet (both pollers had partial visibility logic; verify
  and complete it).
- **Serve repeat asks from cache** so N tabs / N users don't do N× work:
  rpc-ping is global — cache the response server-side (the timed-cache
  mechanism the other cached routes use, KV-backed) so upstream Alchemy is
  hit once per interval regardless of audience. Pings count is per-user —
  keep it lean (HEAD-count query) and lengthen the interval if profiling
  says so; the existing live-event nudge covers immediacy.
- Note: `/api/gas` + `/api/rpc-ping` had their edge-runtime directives
  dropped during the migration (one Workers bundle now) — confirm both
  routes behave on the Workers runtime before re-enabling their consumers.

## Constraints

- The pill UI, the pings badge, their glyphs and motion: EXACTLY as they
  were. This is a re-enable + plumbing change, zero visual change.
- Present the CEO list incl. the worst-case requests/month math at 100
  concurrent users; merge only on Brendon's go.
