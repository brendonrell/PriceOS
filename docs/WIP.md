# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`, fully pushed, tree clean (origin/dev `e37ef15`).
  This chat's task branch `claude/artist-showcase-perf-fixes-pco3qn` is trash
  (work is on dev) — Brendon deletes on GitHub.
- **Updated:** 2026-06-13. Latest session = **artist showcase + perf + polish**
  (block directly below). Earlier 06-13 sessions logged further down.

## ✅ SHIPPED 2026-06-13 — artist showcase + perf + polish (on `dev`)
- **Artist Showcase = project carousels.** An artist profile's Showcase tab now
  carries **Created / Regular** trait pills; Created shows home-style carousels
  of the artist's projects, Regular is the old curated grid. Non-artist profiles
  unchanged; artists land on Showcase even with an empty curated set.
- **Project "+ More" sub-nav.** Same trait-pill tabs as the profile +More:
  **Stats / Replay / Albums / Genome / Sentiment** group the stacked sections
  (Stats = Price Stats + ATH&Holders; Sentiment = Price Targets + Disagreement).
- **Avalanche perf.** Sandpile toppling rewritten to a bounded active-box pass
  (abelian → byte-IDENTICAL art, verified vs old loop across seeds; ~1.4–2×).
- **Heavy-paint handling (general).** Canvas virtualizer paints to a per-frame
  time budget + an eager-burst budget, so heavy engines fill in progressively
  instead of freezing mount/scroll.
- **Chrome sample on connect-menu retract** — kicks a hashsyn resample so the
  iOS chrome tint returns to the art, not stuck on the menu's black.
- **PWA external links → Safari.** Global interceptor + `lib/pwa/openExternal.ts`:
  in a standalone PWA every external link hands off to mobile Safari (no in-app
  sheet); normal browsers keep new-tab. ⚠ Leans on iOS standalone link
  behaviour — confirm on-device.
- **The Tape redone.** `@name verb COLL #id · price`, dim diamond between events
  (fixes the "0.16 ETH@brendon" collision — items had no separator).
- **Home polish:** sort/filter bar moved INTO the hero so its gap from the tabs
  matches the project page; volume stat = integer ETH; New Uploads shows the
  upload time in place of the redundant "UPLOAD" tag.
- **Shuffle:** re-roll fires on LEAVING the tab (next project pre-chosen) + cards
  lazy-paint → entry lag gone.
- **Stickers marketplace:** scanline removed; faint text darkened + bolded.
- **Mint toast** lingers 4000ms (doubled).
- **Project renames/recolors** (slugs unchanged → DB link intact): "Stars Nobody
  Named"→**Names Withheld** (violet `#B026FF`), "Scissors, No Plan"→**Hard
  Splice** (crimson `#FF005C`), "Crossette"→**Use Once, Remember Always**. New
  names were Claude picks off Brendon's "try again" — open to swap.

## ✅ SHIPPED 2026-06-13 — follow-up edits pass (on `dev`)
- **Sort grouping REWORKED** (Brendon corrected the first cut). The standalone
  `GROUP` pill is GONE. Grouping is now a small tappable **letter modifier on the
  ID/PRICE sort buttons** — dim **G** (off) → **C** (colour) → **O** (owner) —
  exactly like FEED's `$`. Grouping only applies while sorting by ID or PRICE
  (suppressed on FEED/fog). Colour bucketing unchanged (`lib/art/outputColor.ts`,
  palette math, zero lag; Hothurt = one colour bucket).
- **Starred artists are account-backed (DB).** Was localStorage `pd_artist_pinned`
  only; now rides the `users.settings` envelope (new `artistStars` key) like
  starred/wishlist/breadcrumbs — follows the viewer across devices. Pushes only on
  real pin/unpin (empty first render can't clobber), restores on the hydrate event.
- **Home search bar spacing** — the popped-open search input sat flush under the
  pills; added the 16px breathing room the project bar gets from the hero column.

## ✅ SHIPPED 2026-06-13 — Home-as-directory + stability session (on `dev`)
- **STABILITY SAFETY NET (the deep cause of "half our features crash").** The
  app had **zero error boundaries**, so any render-phase throw white-screened
  the whole site. Added a routed-page catch (page crash keeps the shell + a
  retry), a last-resort root catch, and a per-feature boundary wrapping **every**
  globally-mounted modal/chrome island (`components/shell/ErrorBoundary.tsx` +
  `app/error.tsx` + `app/global-error.tsx`). Contained crashes now log. This is
  containment — each underlying feature bug still needs hunting, but safely.
- **GREY CAROUSELS FIXED (lazy-paint eviction bug).** The canvas virtualizer's
  60-canvas LRU cap was evicting **on-screen** tiles — on the multi-carousel
  home page the top rows greyed the instant lower rows painted. Eviction now
  **skips any tile currently intersecting the viewport**; off-screen tiles still
  release so the GPU stays bounded on deep scrolls.
- **HOME = Projects directory.** Now Minting pours in **every** graduated (12+)
  project — old 30-cap gone — with `HomeFacetBar`: Newest / Oldest / A–Z, Artist
  filter, search. Same bar on New Art. **Shuffle left bare on purpose** (a sort
  bar fights the "shuffle is random" call — flagged). Bar carries the 40px page
  inset (20px mobile) so pills line up with the rows.
- **SHUFFLE reworked.** Each tab entry surfaces a **different random project** +
  **24 random outputs** of it (`ShuffleGallery`, `SHUFFLE_SIZE = 24`).
- **REAL Identity Plate export.** PriceSprite modal EXPORT now composes the live
  sprite + PriceRank + wallet name onto the current colorway → downloads a PNG
  client-side (was a COMING-SOON toast). Icon centered. ⚠ **No Sigil renderer
  exists in the app** — card = sprite + rank + name, not a sigil.
- **Polish:** Shuffle tab icon nudged down 2px (desktop). **Featuring /
  Collected-by row reads entirely in Rubik** — @name links were inheriting
  Courier (`.collected-by-row .profile-link` now forced to Rubik mono caps).

## 🅿️ PARKED
- **ANOINTED — Brendon parked it.** Visual/alignment is cheap; the **real
  feature is a big standalone backend build** (one-✢ pledge · 60-day lock ·
  zero-sum moves · Cult→Egregore leveling · Prime Relic). Canonical spec:
  ClickUp doc page `2kyd6gx6-1434` (Anointment & Egregore System).
- **Trait pills on the project "+ More" tab** — same pill styling, sub-nav over
  its sections (Replay / Albums / Price Stats…). Discussed, not built.

## ✅ SHIPPED 2026-06-13 — frontend feature session (on `dev`)
- **PriceDay is real.** Epoch = first launch day **2026-06-12 = #1**, counted on
  the **MONTREAL calendar** (his timezone; matches the Mood Ring flip —
  `priceday.ts` + `layout.tsx` boot epoch in lockstep). Project popover computes
  its real number (was hardcoded `#47`). Contents still seeded test-phase.
- **Home load fix:** per-project carousels lazy-paint; only the first row is
  eager (was painting all ~30×12 canvases up front). Carousel/threshold verified
  12 (the "6" was only stale comments).
- **Spot edits:** footer Mood Ring icon +1px/bold · gas modal de-Hothurt'd ·
  trait-pill fill snaps (no fade) · artwork details: removed unasked Last
  Sale+Floor rows AND fixed the Details pill to toggle closed · hover icons wrap
  · profile: removed trailing follower count, PPL→FOLLOWERS, VOL 0 not `—`.
- **My Notes filter works** (demo notes seeded into `pd_token_notes`; filter
  re-runs on `pd:notes-changed`). **Stargazing** search visible + exact-state
  restore on exit.
- **Sort GROUPING shipped** (then reworked — see the follow-up block above for
  the final letter-modifier form; the original GROUP pill was replaced).
- **Breadcrumbs** wired + **account-backed (DB)**: Recent pill filters the
  gallery to recently-opened tokens; the trail now rides `users.settings`
  (`breadcrumbs` key) so it follows the viewer across devices (was localStorage).
- **Feeds are real:** the project FEED view + the Tape (ticker + menu) read our
  own pre-chain `events` (`/api/project/[slug]/feed`, `/api/feed`); both APIs
  resolve addresses → `@handles`. Removed the mock seed arrays.
- **Ghost null states for feeds** ("show, don't tell"): empty/loading feeds show
  **6 ghost rows** w/ the real layout + varying icons, ghost content rectangles,
  **−33% opacity** (`components/GhostFeed.tsx`). On project FEED, home New
  Uploads, menu Tape.

## 🎯 NEXT — queued (NOT started)
- **PriceDay almanac → DB-real (Brendon wants this).** Each day's contents
  (minted/uploaded/biggest sale *that day*) can come from REAL `events` bucketed
  by Montreal day — no indexer needed. Still seeded placeholders today.
- **localStorage → DB candidates — AWAITING BRENDON'S CALL (he said check first
  before converting).** Surveyed all remaining local-only state; these likely
  want account-backing (same `users.settings` rail as starred/breadcrumbs/
  artistStars): **artist notes** (`pd_artist_notes`), **token notes**
  (`pd_token_notes`), **calendar day notes** (`pd_day_notes`), **per-project
  anchor price** (`pd_anchors`), **custom colorway colour** (`pd_custom_color`),
  **spellbook hammer count** (`pd_hammer_count`). Correctly device-local (leave
  alone): debug persona, demo-seed guard (`pd_notes_seeded`), last-viewed tab
  (`pd_project_tab`). Don't convert until Brendon picks which.
- **Sort grouping — remaining:** profile facet bar has no group modifier yet;
  artist dim belongs on profile/multi-project; rarity + last-sold dims have **no
  data source**.
- **Pings still mock** (`PingsBox` → `MOCK_PINGS`); real
  `/api/notifications/[address]` + Realtime ready to wire.
- **Extend ghost-null pattern** to other empties (home Now-Minting carousels
  need a ghost-card variant; `GhostFeed` is the reference).

## ⚠️ KNOW THIS (next session)
- **ClickUp NOT updated (both of today's frontend sessions)** — the comment
  write keeps hitting a permission gate in this environment and won't post.
  Mirror today's summaries to ClickUp task `86b9f30kr` next session (covers:
  PriceDay, feeds, ghosts, breadcrumbs DB, grouping rework, artist-stars DB,
  home search spacing).
- **The Tape/feeds show real data only** → empty until mints/lists happen (by
  design; ghost rows cover the empty look).
- **On-chain thumbnail (contracts) — budget SETTLED 2026-06-13 (other session):**
  on-chain WebP poster is **8–48 KB (48 KB ceiling)**, NOT 16 KB. Built
  `PDProject` still has the old **16,384-byte cap** — flagged as a pre-deploy fix
  (→ 49,150) in the ClickUp **Combined Pre-Mainnet Spec**, which also logs the
  OPEN questions (format WebP/AVIF/JPEG · raise ceiling? · display policy · ~$5
  storage · rudxane "broke at 75 KB") — none decided. A small on-chain image
  can't be full-screen-sharp for busy art at any budget; full res is the
  on-chain script's job, the poster is the grid/card/external fallback.
- `users.profile_hex` DB default + `projects.uploaded_at` are **live PROD**
  Supabase changes (prior session).
- Mood-Ring boot-paint (`app/layout.tsx`) must stay in lockstep with
  `lib/mood/mood.ts` AND `lib/priceday/priceday.ts` (all share the June-12
  Montreal epoch now).
