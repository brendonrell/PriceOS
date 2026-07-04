# Museum Mode — build spec

Scoped with Brendon 2026-07-04. **This file is the build contract for Museum
Mode.** Not built yet — this is the agreed shape before code.

## One-liner
Museum Mode is the apex **Showcase style** — a fourth+ option alongside Static /
Generative / Gen-curated / Artist — that lays a collector's *whole* collection
out as several auto-curated themed "halls" at once. It is only available while
you hold enough pieces to fill it: **222 held**, revocable.

## Origin of the idea
Started as a ladder of collection-count perks (10/25/50/100/250/500/1000).
Brendon's call: collapse the ladder to **one** perk — Museum Mode — because a
perk should exist **only while earned**, and **utility is the gating lens**. A
perk that claws back isn't punitive when the feature literally can't function
below the line. Museum needs a deep collection to build multiple rooms, so
holding the pieces *is* the reason it's on.

## What it is (reuse, not a new engine)
- Gen-curated (`lib/profile/genCurated.ts`) already inspects what a wallet owns
  and emits **every feasible themed recipe** — mono-colour walls, an artist's
  room, a full-spectrum corridor, complementary splits, zodiac galleries, etc.
  Today it draws **one** set of up to 6 and shows it.
- **Museum Mode renders MANY of those recipes at once**, each as a captioned
  "hall" (a labelled row/wall of that collector's pieces), reshuffled every
  visit. Same curation brain; it fills a building instead of a shelf.
- Rendering reuses the existing gallery cards and the `gencurated-caption`
  element already in `ProfilePageBody`. Each hall = one recipe's caption + its
  picks. No new card component, no new curation logic.

## The unlock — utility gate
- **Threshold: 222 pieces currently held** (`holdings.total >= 222`, the same
  computed count the achievements engine already derives; see
  `lib/achievements` and the `l_held_*` ladder). 222 chosen by Brendon — it's
  also an angel number the app already treats as special (the "All Is Well"
  token egg, angel-number curation).
- **Currently-held, not lifetime.** The perk is live only while the collection
  can feed it. Sell below 222 and it winks off.
- **Why 222 works on utility grounds:** several rich halls only co-exist once
  the pool is deep and wide enough that multiple recipes are simultaneously
  feasible. Below that, the room-based layout would collapse to one or two
  sparse rows — i.e. it wouldn't be a museum.

## Revocation behaviour
- If a live-held count drops below 222, Museum Mode:
  1. greys out / disables in the Settings showcase-style picker, and
  2. the profile **falls back to the collector's previous style** (default
     Static) so their profile never renders broken.
- Toggle timing: **live** — re-evaluate on the same signals that already refresh
  holdings, so crossing the line reflects without a manual refresh. (If live
  proves noisy in practice, a daily re-check is the fallback — decide during
  build, not now.)

## Settings integration (locked-state)
- Museum appears in the Settings showcase-style picker (`MyPdSection`) as a
  **teased/locked row** until earned: label + live progress
  ("Museum — unlocks at 222 held · you're at 180"). Brendon's call: **tease it,
  don't hide it** — visible goals get chased. Adjustable if it reads as clutter.
- Once held ≥ 222, the row is selectable like any other style; selecting it
  fires the existing `pd:showcase-style-changed` event so the profile re-renders
  live, same as the other styles.

## Data / plumbing touchpoints (for the build session)
- `ShowcaseStyle` type (`lib/supabase.ts`): add `'museum'`.
- `showcase_style` column already stores free text — no schema change needed to
  store the value; the CHECK (if any) on style must accept `'museum'`.
- `effectiveShowcaseStyle()` (`lib/profile/showcaseStyle.ts`): resolve
  `'museum'`, **and enforce the gate** — if stored style is `'museum'` but the
  viewed profile holds < 222, resolve to the fallback style instead. This makes
  the gate authoritative at render time, not just in the picker.
- `ProfilePageBody`: a `museum` branch in the showcase render that calls the
  gen-curated engine for **N recipes** (not one) and lays them out as captioned
  halls.
- Gate input: the same held-count the achievements engine computes
  (`holdings.total`). Confirm the exact source of truth for a *viewed* profile's
  held count during build (own profile vs visitor view).

## Achievement link (Brendon's original "link to achievement" note)
- Museum Mode pairs with the existing collection milestone badges
  (`l_held_*` — "A Wall" / "A Gallery" / "A Collection" / "An Estate" /
  "A Museum" at 1,000). Earning the pieces is the **badge**; using them as a
  museum is the **perk**. No new achievement required for v1.

## Open items to settle at build time
- Number of halls Museum shows at once, and how it picks which recipes (all
  feasible? a capped, de-duplicated spread across kinds?).
- Own-profile vs visitor: does a visitor see the museum of any collector with
  ≥ 222, or is it own-profile-first like the current showcase-local picks?
- Exact held-count source for a *viewed* profile (own device store vs server
  row) so the gate is consistent for owner and visitors.

## Status
Spec agreed 2026-07-04. **Not built.** Queue for a build session.
