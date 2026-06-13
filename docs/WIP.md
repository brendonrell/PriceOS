# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** work is on `dev`, fully pushed, tree clean. This chat's task branch
  `claude/frontend-spot-edits-features-akrjnc` is trash (work is on dev) —
  Brendon deletes on GitHub.
- **Updated:** 2026-06-13. Two sessions landed on `dev` today: this
  **frontend feature session** (below) AND a parallel **Home-as-directory +
  contracts/spec** session (its `HomeFacetBar` / "Home as Projects directory" +
  error-boundary + on-chain thumbnail budget — merged on top of this work).

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
- **Sort GROUPING shipped** (was the NEXT priority). `GROUP` cycling pill in the
  sort row → **none / COLOUR / OWNER**. Colour from each Output's **palette
  math** (`lib/art/outputColor.ts`) — no canvas sampling, **zero lag** (Brendon's
  call). **Hothurt is ONE colour bucket, not a separate axis** (his correction).
  Grouped gallery w/ section headers. *Project gallery only.*
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
- **Sort grouping — remaining:** profile facet bar has no GROUP control yet;
  artist dim belongs on profile/multi-project; rarity + last-sold dims have **no
  data source**.
- **Pings still mock** (`PingsBox` → `MOCK_PINGS`); real
  `/api/notifications/[address]` + Realtime ready to wire.
- **Extend ghost-null pattern** to other empties (home Now-Minting carousels
  need a ghost-card variant; `GhostFeed` is the reference).

## ⚠️ KNOW THIS (next session)
- **ClickUp NOT updated by this frontend session** — the comment write hit a
  permission gate and didn't post. Mirror this session's summary to ClickUp task
  `86b9f30kr` next session.
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
