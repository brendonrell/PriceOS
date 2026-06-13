# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** all work is on `dev`, pushed, tree clean (origin/dev `f31f0da`).
  This chat's task branch is trash — Brendon deletes on GitHub.
- **Updated:** 2026-06-13. Session = **Site projects expansion → 50 total**.

## ✅ SHIPPED 2026-06-13 — 50 projects live on `dev`
- **25 NEW generative projects** built, wired (registry + index + typed
  traits/schema/aspects), build-verified. Site now lists **50** total (was 25).
  Each has a **custom colorway**, edition size scaled to its variation space,
  multiple **aspect ratios** (not all portrait), and composition/mode variety.
- **The new cohort:** Everyone Is Typing · Night Service · Breach Protocol ·
  Graffiti Soul · Teletext (Gysin) · Chrome Dreams (Y2K) · Riding The Oil
  (Discord sales-feed + 🏄🛢️ reactions) · Quorum (murmuration/price discovery) ·
  Konkret · Ode to Rudxane · The Lapidary (marble/granite/wood/glass) · Warp &
  Weft (Rau) · Price Discovery (order-book canyon/iris/horizon) · Liquid Light ·
  Turing's Garden (reaction-diffusion) · Coral Logic (differential growth) ·
  Divided Light (Swahn pointillist) · Filament (Iskra) · Tessera (Siggi) ·
  Crossed Wires · Asterism · The Golden Angle (phyllotaxis) · Stained Glass ·
  Forbidden Symmetry (quasicrystal) · Trace Routes (PCB) · The Pendulum.
- **Existing fixes:** Every Light In Town sleeve text now fits; Elevations
  blueprint deepened (apparatus + new windows/roofs, colour super-rares).
- **DB reset (Supabase):** ALL 50 `minted_count=0`, mint `events` + `holders`
  cleared, every project given a **unique staggered `uploaded_at`**. → "New Art"
  shows 50 fresh uploads at 0 mints.
- **Engines:** all in `lib/art/engines/ai/core.ts` (@ts-nocheck), each cast()
  verified vs render. Previews via a headless `@napi-rs/canvas` harness (NOT
  committed; container-ephemeral).

## ⏭️ OPEN / NEXT (follow-ups, none blocking)
- **ClickUp wrap OWED (do first next session).** This session's ClickUp tools
  needed approval / weren't working, so it never got updated. Next session:
  mirror this ship into ClickUp — close what shipped (50 projects on dev, DB
  reset), add the queued follow-ups below, and leave Brendon an **assigned
  comment + due date** so it hits his Inbox.
- **Soundtracks — FIX (I overcorrected).** Brendon wanted MOST new projects to
  carry a soundtrack (genre / multi-artist YouTube playlists, matched to the
  work), with **only some silent where silence suits the piece** — NOT all
  silent. I shipped all 25 new ones `soundtrack: null`. Next session: assign
  genre/multi-artist playlists to the pop/energetic/themed ones (Riding The Oil,
  Everyone Is Typing, Graffiti Soul, Breach Protocol, Chrome Dreams, Liquid
  Light, Night Service, Trace Routes, etc.) and KEEP silence only for the
  contemplative fine-art ones (Quorum, Konkret, The Lapidary, Ode to Rudxane,
  Filament, Divided Light, Warp & Weft). Verify the playlist IDs resolve before
  shipping. Map lives in `AI_SOUNDTRACKS` in `lib/project/registry.ts`.
- **Polish candidates:** Asterism, Seedhead, Forbidden Symmetry, Trace Routes
  are solid but a notch below halo — worth a polish pass for the fxhash bar.
  `orbits`(now wired as The Pendulum) is the lightest of the set; `moire` +
  `automaton` engines exist in core but are intentionally **unwired**
  (screensavery / too close to Ciphrd).
- **Halo tier:** Quorum, Price Discovery, Turing's Garden, Coral Logic read as
  the strongest "made-by-a-person" pieces.
- **Verify:** the 50 build clean + previewed well in the harness but were NOT
  re-rendered through the live app this session (container reset) — worth a
  visual pass on the dev preview.
