# BRIEF — Usage counter: see which mechanics people actually touch

**For a fresh Opus 4.8 chat. Read `CLAUDE.md` first and obey all of it.
Origin: Architect Report round 2 §3.5 — telemetry sees errors, nothing sees
usage; with ~45 mechanics and discovery-as-gameplay, "do people find X?"
is unanswerable the day real users arrive. Half-session build.**

## The design (privacy-clean by construction)

- **Data**: one table `usage_counts (day date, key text, n int)` — counts
  per feature per day. NO identity, NO addresses, NO sessions, NO paths
  with user content. Nothing to leak because nothing personal is stored.
- **Write path**: tiny `POST /api/telemetry/usage` (same family as the
  error beacon: rate-limited, fire-and-forget, never blocks UI, fails
  silent) → service-role RPC `usage_bump(key)` upserting today's row.
  Client helper `trackUse(key)` — one line at each call site, debounced
  per key per session so idle re-renders don't count.
- **Read path**: none in-app for now (no UI — nothing extra). Counts are
  read via the Supabase dashboard / MCP when Brendon asks. A readout
  surface is a separate future decision.

## The initial vocabulary (~20 keys, additive forever)

spell casts (one key per Spell Book pill — the 23) · composer.open ·
cartography.open · dispatch.read · rewind.open · stickers.store ·
stickers.market · binder.open · friendinspector.open · tribunal.open ·
tarot.open · gnome.tap · lanerunner.start · workspace.switch ·
search.open · docs.visit · calendar.open · takeover.cast · vault.open ·
completionism.open. Wire each at the surface's existing open/cast handler —
no new UI, no behaviour change, nothing visible.

## Gates

- Migration (table + RPC + RLS: service-only writes, no anon read) —
  present to Brendon, apply on his word, mirror same-session.
- Zero UX change; if a call site would need visible restructuring, skip it
  and note it.
- Add the smoke test (beacon accepts, bad keys rejected, rate limit) and a
  health line is NOT needed (this is not liveness).
- Keys are append-only vocabulary — document the list in the route header.

## Done when

Beacon live · ~20 surfaces instrumented invisibly · counts visibly
incrementing in the table from real preview taps · test green · brief
deleted in the completing PR.
