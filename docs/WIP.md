# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`, fully pushed, tree clean. This chat's task
  branch `claude/youthful-curie-ildq71` is trash (work is on dev) — Brendon
  deletes on GitHub. Earlier strays may persist (ClickUp `86badm7pa`).
- **Updated:** 2026-06-12 (home-page mega-session)

## ✅ SHIPPED THIS SESSION (all on `dev`, Brendon-tested through many rounds)
1. **Home page is REAL** (ClickUp `86bad5g49` closed): "Price Discussion" hero
   (date hidden on mobile), live stats off the DB, tabs **Now Minting**
   (default; server-seeded carousels — no loading gap; half-size art-only
   tiles, eager paint) / **New Art** (live uploads feed, allcaps project
   links) / **⟳** (gallery-grid shuffle, re-rolls per tab entry, no button).
   Live = Supabase Realtime push (publication enabled on projects/events) +
   poll fallback; `/api/home` + server seed share one computation
   (`lib/home/homeData`).
2. **Hero CTAs:** EXPLORE (random project) + SHUFFLE ▶ (random project
   soundtrack). Both uniform random — **neutrality is law on home; the
   platform never picks favourites.** CTA sizing law: the forced width
   belongs to the mint pill ONLY; every other CTA is content-sized.
3. **Social rows:** two sprite+name chips (sim's collected-pair, full
   rectangle port + Rubik handle font), live DB sprites with wallet-derived
   fallback ('observer' default vibe until the artist picks). Home: always
   two lines (one chip per line), sim line-height 1.6 rhythm, pair re-rolls
   per page LOAD (live ticker retired). "Featuring" pulls the real registry
   roster.
4. **Mood Ring** (`lib/mood`): daily generative home colour + 90s-chart mood
   word, flips at MIDNIGHT MONTREAL, hue salt 200 (re-rolled off green
   2026-06-12 → magenta). ⚠ colour math is MIRRORED in the boot-paint script
   in `app/layout.tsx` — change both or home flashes. Footer middle row:
   "Today's Mood Ring Colour: #HEX" + **Today's Stars** (daily natal sky).
5. **Footer = 3 rows** (system / easter eggs / links + Studio placeholder).
6. **Multi-select REAL** for Star / Wishlist / Add-to-Album (project +
   profile bars; albumStore account-backed like stars; picker card).
   Marketplace actions + To-Do stay stubs.
7. **Breadcrumbs REAL** — last-5 actually-visited per project (recorded on
   output-modal open), replacing the random sample.
8. **PWA:** manifest correct for Android (maskable icons added). **NO install
   pill anywhere — Brendon's explicit call after an overreach; never re-add.**
9. Home carousel tiles: art only (no #id/owner caption).

## ⚠️ KNOW THIS (next session)
- **CLAUDE.md gained TWO hard rules today — read them:** "ideas ≠ go-ahead"
  (discussion mode vs build mode) and "push = everything outstanding". Also:
  every commit co-authors Brendon (trailer is in CLAUDE.md §0).
- Mood Ring's boot-paint mirror (above) and the AI-engine rng-order warning
  from last session still stand.
- Sales tab was REMOVED from home (Brendon's tab set is exactly the three).

## NEXT (queued, not started)
- Home ⟳ Shuffle real platform-wide build — ClickUp `86badx02w` (currently
  samples Prisms only via the global provider).
- Footer easter-egg row: more daily one-liners — ClickUp `86badx034`,
  Brendon picking (Today's Fate / First Blood / Streak / Consensus Price).
- Albums browsing surfaces still shells — see comment on `86b9b5jgj`.
