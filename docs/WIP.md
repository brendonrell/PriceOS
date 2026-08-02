# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.
>
> **The shipped record lives in `docs/WIP-ARCHIVE.md`.** When a session ships,
> its round moves there and only the live items stay here. **The ⛔ locks in the
> archive still bind** — the index below names every one; read the full entry
> there before touching that surface.

---

## 🧭 NEXT UP — fresh session starts HERE

⛔ **2026-08-01 (LATEST) — OPEN ITEMS, IN BRENDON'S OWN WORDS.**

0. ✅ **THE KEYCHAIN HANG IS SETTLED AND SHIPPED (2026-08-01, `a131e9ce`).
   ⛔ DO NOT RE-DERIVE IT. THE SHAPE IS LOCKED:**
   - **THE RINGS ALL STAY ON THE TAG ROW**, 13px apart. Never move a whole rig
     down — that drops its ring off the row (a session did exactly that and it
     had to be undone).
   - **DIFFERENT CHAIN LENGTHS ARE WHAT MAKES THE SHAPE.** Every charm's own
     chain is the same six links, so equal-length chains hang level and read as
     a flat row. A three runs 6 / 12 / 9 links (middle lowest); a pair runs 12
     on the left, 6 on the right.
   - **THEY LEAN.** A three tips the outer two out (−15° / 0 / +14°); a pair
     tips the short right-hand one out (+11°). The lean rides gravity, so tilt
     still finds true down. **He approved the lean in a screenshot; a later
     session dropped it and told him it was never there — that was wrong and
     cost his trust. It stays.**
   - **The art draws past its own box** — tilted, a petal or a raised hand
     swings outside the box it was sized in and used to get shaved off.
   - **Randomness is WHICH ONE IS IN FRONT**, redrawn every page load. Nothing
     else is random. (Live depth-swapping while they swing was tried and
     REJECTED: it flashed at rest and the charms passed through each other.)
   - Equipping: the Depanneur wears as many as you like, a TOP 3 picks which
     hang, and the switcher's SHUFFLE draws the three fresh each page load.
1b. **⛔ NEW CONTRACT RULE — #-0.55 MODALS (Brendon, 2026-08-01, in fury).**
   Acting inside a modal NEVER closes it (only ×, an outside tap, or Esc), and
   its scroll must work inside itself. The keychain switcher was closing on
   every pick, shuffle and match; that is fixed. Read the rule in `CLAUDE.md`
   before building any card, sheet, bubble or panel.

2. **PROFILE LAG — TWO REAL CAUSES FOUND AND SHIPPED 2026-08-01. UNCONFIRMED
   ON HIS DEVICE.**
   **⛔ HIS DIAGNOSIS WAS RIGHT ALL ALONG (RULE #-3): IT WAS THE KEYCHAINS, AND
   THE COST WAS PAID WITH NONE EQUIPPED.** Both fixes explain that exactly:

   1. **The park rules ended in a universal selector, in a stylesheet loaded on
      EVERY page.** A selector ending in `*` is matched right-to-left, so the
      browser tested every element on the page and then walked its ancestors
      looking for a charm that usually wasn't there — on every style recalc, on
      every page, whether or not anyone wore a keychain. **That is why
      unequipping never helped.** Now names the three animated classes.
   2. **`will-change` was permanent** on every link and charm body — ~30 live
      compositor layers over a collection-sized grid, held while the chain hung
      dead still. The solver now adds the hint when it starts and drops it when
      the chain settles, parks or unmounts. **The swing keeps the hint; the
      motion is untouched (NO AMPUTATION).**

   3. **The scroll drive on the worn keychain — REMOVED LATER THE SAME DAY**
      (see the latest round below). Every scroll shoved the chain and woke the
      solver; throttling it to one shove per frame was not enough, so the
      drive is gone. Scrolling no longer touches the charms at all.

   *Also fixed the same day:* the identical loose rule on the hero sticker
   canvas.

   *Still standing if he says the lag persists:* the never-removed
   capture-phase `touchend`/`click` listeners in the tilt re-arm
   (`lib/keychains/sway.ts`, `retryOnTap`) — if iOS refuses the cold re-arm,
   every tap site-wide fires an async permission call until it takes. It sits
   behind the same early return today. Only then widen past keychains.

   ⛔ **NEVER WRITE A `*`-KEYED SELECTOR IN A GLOBAL STYLESHEET.** Two shipped
   in this codebase and both taxed every page in the app. `body.bench-dragging *`
   and `.npc-cast *` are the two left — deliberately untouched (not the named
   bug), but they are the same shape.

   ⛔ **THIS CONTAINER CANNOT REPRODUCE HIS DEVICE — DO NOT BURN THE SESSION
   TRYING.** Local dev has no Supabase / Alchemy keys so every data route 500s
   and the app never clears its loading screen; headless Chromium cannot reach
   the live preview (the agent proxy resets its CONNECT). A screenshot/measure
   harness was attempted 2026-08-01 and Brendon killed it: *"it's beyond you
   abandon the screenshot move on now."* **Do not rebuild one.** Reason from the
   code, ship the fix, let him look.

3. ✅ **COLORPEDIA IS BUILT AND SHIPPED (2026-08-01, `292396f` + `d7c29fb`).
   ⛔ DO NOT RE-DERIVE THE ARCHITECTURE — it is exactly the one that was
   spec'd, and it is settled:**
   - **The maths is COMPUTED, never looked up and never LLM'd.** hex · RGB ·
     HSL · HSV · CMYK · LAB · LCH · luminance · contrast, exact for any colour.
   - **The names and history are FIXED DATA baked into the app** — 549 named
     colours, 149 with real history. Nothing is generated at runtime, so
     nothing can be hallucinated in front of a user. Adding colours means
     adding entries; it never means calling a model.
   - **Any colour snaps to its nearest neighbour by CIEDE2000, and the card
     SAYS SO** — the name plus the distance, and when the match isn't exact the
     history is labelled as the NEIGHBOUR's. Never let that honesty be dropped.
   - **The doors (Rule #-0.4) are his:** in = the ◉ Colorway tile on a
     Project's Attributes; out = ×, an outside tap, or Esc. Nothing done inside
     it closes it, and it scrolls in place (Rule #-0.55).
   - **The stone hand** is `color <x>` / `colour <x>` / a bare hex / a tagged
     format. A bare colour word stays a SEARCH, and six-letter English words
     that are valid hex (decade, facade, beaded) stay searches — that guard is
     deliberate, don't loosen it. The separate `stonecolor:` recolour cast is
     untouched.

✅ **2026-08-02 (LATEST SESSION) — THE REAL LAG CAUSE · STICKERS · KEYCHAINS
SWITCH · GROUPING PERSISTENCE · RARITY SORT · STICKER MODES** (on `dev`, tip
`180fe78`, tree clean, type-check clean, 192 tests green. ClickUp `86bb734jz`
+ `86bb735t6`):

- ⛔ **THE LAG WAS THE PICTURE READER, AND HE NARROWED IT HIMSELF (Rule #-3).**
  *"On my profile the lag completely goes away when I'm on the showcase tab or
  +more… it's the collected tab (and now the homepage)"* — the two surfaces
  made of card TILES. The fingerprint reader (shipped 2026-07-31) asked for
  each tile's picture **again with a cross-origin flag**, and that makes the
  browser treat it as a DIFFERENT cache entry from the tile's own `<img>` — so
  every read pulled the whole picture down the wire a SECOND time, then decoded
  it and read its pixels, four a second, for the whole session. The flag is now
  set only when the pictures really are on another host; reads wait for an idle
  moment and stop while the tab is hidden. **He was also right that it was
  recent — everything else we chased was real cost but not the cause.**
- ⛔ **RESTORED, BECAUSE THEY WEREN'T THE CAUSE (his ask):** the keychain
  **SCROLL DRIVE is back byte-for-byte** (the throttled one-shove-per-frame
  version; tilt still wins while orientation is live — *the earlier "do not
  reintroduce a scroll kick" note is SUPERSEDED by this*), and the **inbox
  window is back to 100 pings.** Kept because they cost him nothing: the menu
  builds a screenful of rows until opened, and the chain parks when the phone
  is still or something covers it.
- ⛔ **ACHIEVEMENTS DE-DUPED, STILL EXACTLY 1,000.** Seven conditions each
  awarded TWO trophies; three names were used twice. **The curated core row
  keeps the condition every time** (those ids are what real users have already
  unlocked); the ladder rung moves to a free step in its own family carrying
  its **exact points**, so no total and no Mjölnir wall moved. Verifier green.
  ⛔ Free thresholds are scarce — `depth.ts` GENERATES its rungs, so a literal
  grep will not show them; use the verifier to find collisions.
- **Offers is own-profile only** — on someone else's it could only ever say
  "no offers yet".
- ⛔ **STICKERS: ALWAYS FIT, AND NOTHING HANGS OFF THE LID.** WIDE is deleted
  (*"making the profile wide fucks up so much of the UI"*) and pinned off so no
  saved look, Setup Code or SURPRISE can hand it back. The off-screen cause:
  the safety margins were **CAPPED**, so a sticker whose own footprint exceeded
  the cap got clamped to a margin SMALLER than itself. Now a piece that cannot
  fit at its rolled scale **comes down until it does**. The manager card also
  re-measures whenever the sticker area changes size.
- ⛔ **THE STICKER LOOK IS IN THE DB (it never was).** Arrangement / rows /
  align / tilt / flip / density / border / roll was the ONLY part of a
  decorated profile that never left the device — *"it lasts for days and then
  gone"* was the browser clearing its storage with nothing to restore from.
- ⛔ **KEYCHAINS: ONE SWITCH, AND A PICK BEATS SHUFFLE.** A single KEYCHAINS
  ON/OFF above THE CAST takes the charms off the profile with the rack, the
  pool and the chosen three untouched. **Picking a charm by hand now turns
  shuffle off and sticks** — shuffle was stored ON while he believed it was
  off, and with it on the chosen three are ignored and re-drawn at random every
  page load, which is why his picks didn't show. The Depanneur door closes the
  switcher (leaving for another room is the ONE exception to Rule #-0.55).
- ⛔ **GROUPING IS ON THE ACCOUNT — ALL THREE LAYERS.** L2/L3 lived in page
  state only and the long-press menu saved nothing at all, so a deep grouping
  collapsed the moment he navigated away. Stored as the layers joined with `>`,
  so every value written before this still reads.
- **RARITY SORTING (his design).** #ID and $PRICE each cycle FOUR steps — their
  own two directions, then rarity's two — marked with ❖ exactly where FEED's
  price order shows its $. No new button in the row. FEED's $ up 3px.
  *Assumption stated to him and not yet contradicted: both pills reach the SAME
  rarity order.*
- **HELD wears the collect mark ✦** — it shared the listed star with ON THE
  MARKET, and against the artist's ✺ a held row read as an artist row.
- **Colorpedia** — the search says "Search by: name, hex, RGB, CMYK, HSL", dim
  + italic (placeholder is the deliberate exception to Rule #2); the card opens
  on **pure white when the page is dark, pure black when it's light**.
- **Group toast** carries a second row: ⁘ (longpress for more) ⁘.
- ⛔ **TWO NEW CONTRACT RULES —** #-0.82 **never stop with work outstanding** (a
  new ask goes to the FRONT of the queue, it does not delete the rest; a
  summary of what is still broken is a confession that you stopped), and the
  **portrait-iPhone canvas law** under #-0.5 (nothing may fall off it; a piece
  that cannot fit comes down; an option that only works on a wide screen does
  not ship).

- ⛔ **STICKER MODES REBUILT — THREE GESTURES, ONE OF THEM WILD (his call, then
  his spec).** *"Our modes suck frankly… we can have one wild one but right now
  they almost all read that way"*, then: *"I want the row but artfully placed,
  not a strict row that just looks like a computer placed them."*
  There were seven modes but only TWO ideas — SPACED/ROW were one thing at two
  gaps, and SCATTER/FILL/COLLAGE/SLAPPED were all random placement with
  different caps and overlap flags. Cohesion comes from alignment and
  repetition; those four placed at random and shoved apart until nothing
  collided, which is avoidance, not composition. Each mode is now its own
  GESTURE:
    - **ROW** — one slow WAVE of lift runs along the row so neighbours relate
      the way a hand places them; lean and a whisker of size ride the same wave
      a quarter-turn out of phase; the gaps are uneven. Still a row, it just
      breathes. Seeded — Shuffle re-rolls, a reload repeats it.
    - **PILE** (was STACK) — a constant step along and a constant few degrees
      further round each time, so it reads as ONE gesture. Hue ordering kept, so
      consecutive colours never land on each other.
    - **SLAPPED** — the wild one, and the ONLY one.
  ⛔ **THE RETIRED IDS ARE NOT DELETED.** Setup Codes encode the arrangement by
  its POSITION in `ARRANGE_IDS` and Spreads store the id — removing one would
  silently rewrite every code and look ever saved. They stay in the type and
  normalise on read (`normalizeArrange`): spread/fill → ROW, scatter → SLAPPED,
  collage → PILE. SURPRISE rolls only the live three; the SPILL egg rides the
  wild one.

⛔ **THE DISPATCH EMAIL HAS NEVER SENT AND CANNOT — ONE MISSING SETTING.
BRENDON SAID LEAVE IT (2026-08-01), so it is NOT queued work; this is here so
no session re-investigates it.** The worker has **no Resend key**, so the
signup field turns everyone away and the list is empty — 0 contacts, 0
broadcasts ever created, which is why the 1st, 11th and 22nd were all silent
(the press run quits on "is anyone reading?"). **The code is not the problem:**
the field, the segment, the press run and the verified sending domain all
check out. The fix is a secret named exactly `RESEND_API_KEY` on the
`pricediscussion` Worker — not a Pages project, not a preview environment. Two
keys exist in Resend from July but were never pasted in. Brendon thought he had
added it; the live app proves otherwise (a junk address to the signup returns
"not wired up yet" instead of the invalid-email refusal).

✅ **2026-08-01 (LATE) — SHIPPED EARLIER THE SAME DAY** (`dev` tip `2fa7138`,
tree clean, type-check clean, full suite green):
- **Colorpedia** (item 3 above) and **the stone's colour hand.**
- **Triple-tap to close the stone — restored.** A guard added 2026-07-26 to
  stop a single background tap dismissing it zeroed the tap count on EVERY tap
  while open, which took the third tap with it. It counts while open now; one
  or two taps still do nothing. Swipe-down and long-press are untouched.
- **Docs catch-up.** Five shipped features had ZERO coverage in the user
  manual and now have it: Colorpedia (new page), the Darkroom, the Replay,
  Golf Score · the Clubhouse, Projects Pro. The stone's ability reference
  gained the colour hand. Atlas took #0262–#0264.

⛔ **ZERO-MINT PROJECTS STAY ON ARTIST PAGES — SETTLED (Brendon, 2026-08-01:
"Zero mint projects stay").** Slack Water is live with 0 minted, and **31 of 68
projects have zero mints across 24 artists**, so those artist pages show the
empty ghost rail BY DESIGN — the ghosts are his own 2026-07-03 call (no phantom
art off unminted ids). **This is CLOSED. Do not re-propose hiding them, and do
not treat an empty rail as a bug.** A project with nothing minted is still a
live mint door, and it belongs on its artist's page.

---

## ⛔ LOCKED — settled by Brendon, DO NOT REOPEN

One line each; the full entry is in `docs/WIP-ARCHIVE.md`. **If your change
touches one of these, read it there first.**

**Keychains / Depanneur**
- The worn hang is settled (rings on the tag row · unequal chains · the lean ·
  art draws past its box · randomness is only which one is in front).
- The motion is never the fix — never slow, simplify or remove the swing.
- The art belongs to the CHARM, not the keeper; streak and rank buy LUCK only.
- Contract parity is RESTORED — the app engine is the reference; never "restore
  parity" by reverting the app.
- ELEMENTS lead the trait sheet; their colours exist but are drawn NOWHERE yet —
  placement is Brendon's call.
- Completionism is 24 (a yin and a yang coin per shape). No genders in the
  yin/yang copy. Never print a WORD for the odds — print the real percentages.
- "Taller" meant the shadow, not the height.

**Miniplayer / sound**
- The cap is FINISHED — never touched again.
- No filled pill on a USB ring key in any state; SHUFFLE ON is the bright one.
- The soundtrack button presses ▶ itself until it truly plays — never simplify
  it back to one call.
- The door in is the USB cap tap; no persistent player bar (his call).
- Toasts write the lowercase `miniplayer` wordmark, with ™, toasts only.
- Theme music: long-press the sound key is the door, default OFF · the Output
  theme has NO tune · Busy Mint is nothing but the tick · Homepage PM keeps its
  clipped backing · the Depanneur theme is the OoT shop tune, never arcade.

**Grid / grouping**
- Headers span the row · the art is never indented · 4-across is dead (a grouped
  grid is two across) · the grid never drops a grouping you picked.
- Factions are a FILTER ONLY, never drawn on a row.
- Project tags are OFF by default, platform-wide.

**Glyphs / copy**
- Collect is ✦, offers are ✶ (swapped 2026-07-31). Anchor is ♆. The Greek Ξ is
  banned as an ETH mark — PD's ◊ everywhere. Every ❖ must sit in Courier.
  Replay is ⏴; ⋘ is banked for Rewind. Hourglasses render as nothing on iOS.
- The ‰ is the logo and wears Inter. Per mille in feeds is always the SVG.
- An `@` only ever means a PD username (§9).
- Zero-mint projects stay on artist pages. He hates a parade — deal by family.
- The ASCII-ID is locked; profile tags are NOT part of it.

**Plumbing gotchas that cost real time**
- First-open lag was always the CONTENT, not the slide — warm the read.
- A rail that "cuts and restarts" = the rail isn't sized to its content.
- A green test suite is NOT evidence a contract can deploy — check byte size.
- This container's git history is truncated; confirm against file CONTENTS
  before acting on a commit-count difference.
- `lib/tags/derive.ts` must not import the project registry.
- The reserved-name list gates SIGNUP ONLY — never routing. A claimed name is
  an ordinary page; an unclaimed one 404s on its own via the profile lookup.
- Scrolling never drives the worn keychain. Gravity and a shake do.
- Cloudflare error 1042 = a Worker fetching another workers.dev host on the same
  account — use service bindings.

---

## ⚠️ OPEN — named, not done

**Audited against the real code 2026-08-01 — every line below was checked, and
the stale claims were struck. Do not re-add a struck item without re-reading the
code.**

- **`PDFactory` is 29,891 B, over the 24,576 B limit by 5,315** — pre-existing,
  and it will block a factory deploy. ClickUp `86bb5nt0f` (high) carries the fix
  plus the companion guard (wire the size check into the build). **Brendon has
  not ruled on the guard.** *(Not re-measured this session — the contracts repo
  isn't in this container. The number is from the 2026-07-30 build.)*
- **ClickUp is PART-reconciled.** The 2026-08-01 round is logged
  (`86bb71fzm`, Done in 02 · PriceOS (UI)). **The 2026-07-31 rounds were never
  logged** — their connector was down at the time — so the sound layer, themes,
  the Albums prompt, the glyph swaps, What's Hot and the test-collection hide
  are all missing from the board. Backfill from `docs/WIP-ARCHIVE.md`.
- ✅ **NOTHING IS DEVICE-ONLY ANY MORE (2026-08-01).** The last five — Composer
  programs · budgets · anchors · fiat currency · the Portfolio view state — now
  ride the settings envelope like everything else. **⛔ `docs/STORAGE-AUDIT.md`
  IS STALE and was already wrong before this: it still lists workspaces, grid
  presets, the saved grouping, sticker prefs and notes as stranded, and all of
  those synced weeks ago. Trust the code, never that doc.**
  **The house rule (Brendon, 2026-08-01): "almost no device stuff unless it
  somehow makes sense — db everything is one of our signatures."** Anything new
  that a user sets goes on the account by default.
- **The Composer's group toggle is NOT on layers** — verified: it cycles one
  dimension inside its saved query. Deliberate. Same for the Starred / Wishlist /
  History toggle, which groups saved lists on a different vocabulary.
- ✅ **COMPLETIONISM + PRICERANK TAGS ARE BUILT (2026-08-01).** Completionism =
  one chip per month cleared, `SEP '26 100%`, **@brendon blue (his pick)**.
  PriceRank = **ONE** chip, the tier held right now, Regular → Apex; it replaces
  itself as you climb, tiers 1–2 get nothing, and the colour is **one ramp, not
  ten hues** (`RANK_TIER_COLORS` — slate → Hothurt at Legend → Attention at
  Apex). Both off by default like every tag; both rooms work off the generic
  members route.
- **Test prices (registry)** — verified still live: bulletin `0.2222`, reliquary
  `22.222`. REMOVE before mainnet.
- **ASCII 1/3-down line** — faint artifact line, cause not isolated. Not
  re-checked this session (it's a visual, not a code claim).
- **⛔ The Bench needed NO work** — verified: its own owner-scoped endpoint,
  database-backed since 2026-06-15. Don't re-open it.

---

## 🧭 WAITING ON BRENDON

- **The contract size guard** — wire the byte-size check into the build so a
  renderer can never go over the limit silently again.
- Feature Atlas re-order · docs.pricediscussion.com wiring — both previously
  ClickUp'd.

> **⛔ NEVER QUEUE BRENDON EYEBALL WORK, AND NEVER MENTION BRANCHES (Brendon,
> 2026-08-01).** His eyes are always on the app — "review this copy", "eyeball
> this modal", "check this glyph on device" are NOT items and never go on a
> list. If something is wrong he says so. Stale `claude/*` branches are harness
> litter, not his homework: never list them, never ask him to delete them.

---

## 🧭 THE ROAD TO MAINNET

1. ✅ Indexer sweep go-live + token-2 backfill — DONE 2026-07-11.
2. Phase C — app talks to Sepolia (`docs/sepolia-test-phase.md` §3–4).
3. Mythic Audit Pass (`86b9v5wj4`) — the last gate.

---

## 💡 IDEAS RAISED, NOT QUEUED (2026-07-28 — these are IDEAS, never a go-ahead)

- **The armed stone** — a spoken budget as pre-authorization, executed while he
  sleeps. The watching layer already exists server-side; the missing piece is the
  authorization. Safe to pilot in the sim-ETH phase.
- **The prepared morning** — it finishes the work overnight and greets him with
  it done, instead of notifying.
- **The stone in your pocket** — a deep link opening PD straight into the stone
  with a question pre-typed, wired to the iPhone Action Button.
- **Stone-to-stone** — your stone negotiates with another keeper's stone, both
  owners confirm.
- Group sorts rework · Languages as a gen-art trait — discussion only.
