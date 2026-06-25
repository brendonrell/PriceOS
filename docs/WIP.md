# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** all work is on `dev`, pushed, tree clean. This chat's task branch
  `claude/link-responsiveness-bg-flash-3nmhvl` is trash (work is on dev) —
  Brendon deletes on GitHub. Stale local-dev self-heals via the SessionStart hook.
- **Updated:** 2026-06-25 (session 2 — link responsiveness / bg flash). Shipped to `dev`:
  1. **In-app navigation** — internal links route client-side (global interceptor
     in the shell, bubble-phase, fully guarded; `<main key={pathname}>` for a fresh
     per-route subtree). Page never tears down → snappy native feel + the theme
     background glides old→new (existing 0.3s fade rides nav) instead of black flash.
     Open overlays (modal/cart/dropdown) close on a real route change. Petey bubble
     closes on Home tap ($PRICE deliberately doesn't).
  2. **Profile colour first-frame** — server-known `profile_hex` painted into the
     first frame via an inline boot script (cold load) + owner hex set in a layout
     effect (in-app nav) → no grey flash on profiles.
  3. **Carousel preload** — per-track IntersectionObserver (rooted on the scroller,
     ~2-tile horizontal margin) paints tiles two over via `forceRenderKeys`, so the
     pop-in happens offscreen. NOTE: a viewport-side rootMargin does NOT work for
     carousels (the track clips its own off-screen tiles) — must measure from the track.
  4. **Starred social pills** — Followers / Following / Mutuals promoted from
     Collectors-only sub-pills to TOP-LEVEL pills right after Artists. Filter
     collectors + artists (people follow graph) + projects (held = project follows
     you / explicit follow = you follow it / mutual = both). `/api/project-follows`
     now tags each project with `held` + `following`. Outputs excluded until their
     watch/fandom follow is wired. No count badge on the 3 pills (tally is live-graph).
  5. **CLAUDE.md** — "caveats are not a reflex" rule added (§7) + the rules-reminder
     hook line reworded (no caveat unless one urgently matters).
- **OPEN / NEXT:**
  - **Button-flash polish** — on nav the bg is instant but the new page's buttons/
    bubble lag until its data loads (force-dynamic fetch window). Fix = render the
    page frame instantly + stream data, so buttons land WITH the bg. Bg must stay
    instant — never defer it (Brendon, hard constraint). Own focused pass.
  - **Outputs social follow** — wire the watch/fandom output-follow, then add outputs
    (Followers-only) to the Starred social pills.
  - Safari compact-mode black line at top: wait out iOS27 (Brendon's call).
- **Prior session (still live on `dev`):**
  1. **Project graduation visual analysis** — graduated projects (≥18 mints) gain
     an aggregate character sheet in Attributes (collection Form, palette spectrum,
     trait/fate spread + rarest/most-average piece, Collective Fingerprint); first
     22 editions rendered on demand, rest lazy. Milestone badges on every project.
  2. **Followers Manager** — rebuilt the old full-screen followers modal on the
     Sticker Manager shell: COMPACT floating popup (FIXED height, matches Sticker
     Manager, no jump) + PLUS full-screen (`100dvh`, empty preview slot reserved at
     top). Rows = two clean lines (sprite+@name, then icon+number stats:
     ⬚ collected · ⟠ spent · ⚬ followers), sortable; relationship tag + ✺ artist
     badge; projects show ✺ creator · ⬚ minted/supply · ⟁ Cartel mutuals, with real
     @name + PriceSprite. Stars reuse the DB-backed artist/project star sets, pinned
     to top + alphabetised. STICKERS store button in the header.
     New `/api/social/circle-stats` (batch collected/spent/followers/artist) +
     enriched `/api/project-follows`.
  3. **Sticker Manager** — colour-filter row now leads with a clear (×) circle.
  4. **Profile Starred → Collectors** — Followers / Following / Mutuals sub-pills
     filtering starred collectors by the viewer's real follow graph.
  5. **CLAUDE.md** — added the hard rule: stop firing permission prompts, all
     permission pre-granted (§7).
- **QUEUED (not built):** milestones-on-the-tape; My Network "Fresh Wallets"
  (Alchemy first-tx). Followers Manager preview slot is intentionally empty
  (Brendon has plans for it).
- **HARD-WON LESSON (this session):** the followers list cut-off was a reused
  `.collectors-list` (fixed 250px scroll box) — when reusing a shell, check its
  classes don't impose height/overflow. Compact = FIXED height + inner scroll;
  PLUS = full screen. Don't add borders/placeholders Brendon didn't ask for.
