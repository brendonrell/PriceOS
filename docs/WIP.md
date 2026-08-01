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

3. **COLORPEDIA — SPEC'D, NOT APPROVED, NOT STARTED.** ⛔ **He asked to talk it
   through, not to build it. Do NOT write code without his explicit go.**

   *His ask:* a little modal about a given colour — hex, CMYK, the name, maybe
   some history. Needs to cover A LOT of colours. He flagged it as "a perfect
   LLM task".

   *The position given to him, and the reason:*
   - **The maths is free and exact — never LLM it.** hex · RGB · HSL · CMYK ·
     LAB are pure conversions from the colour itself. They compute in the app,
     for ANY colour, with no data and no lookup. An LLM must never be asked for
     a number it could get wrong.
   - **The name + history is the LLM part, and it is generated ONCE, offline,
     ahead of time — never live in front of a user.** Build a fixed vocabulary
     of a few thousand named colours, generate each one's copy in a batch job,
     bake the result into the app as data.
   - **Any colour then snaps to its nearest neighbour in that vocabulary.** So
     an arbitrary hex off a piece of art still lands on a real named colour with
     real copy. Instant, works offline, and cannot hallucinate at runtime because
     nothing is generated at runtime.
   - **The honest limit:** a snapped colour's history is the NEIGHBOUR's history,
     not that exact hex's. The modal has to be honest about which named colour it
     matched to — never imply the exact hex has its own story.

   *Open questions FOR BRENDON — do not answer these yourself:*
   - Where does it open from? (⛔ RULE #-0.4 — the door in AND the door out are
     confirmed with him BEFORE any build. He has not named either.)
   - Which vocabulary? PD already owns colour buckets + the stored dominant
     colours; a public named-colour set is the other option.
   - How much history per colour — a line, or a paragraph?
4. **Golf Score reads as confusing** — he asked why a 29-minted project shows
   "#2 of 111". Answer: it's the engine-size ranking across all 111 registry
   projects, nothing to do with that project's mints. He was told; **no copy
   was changed** (he didn't ask). If it keeps confusing him, that's a copy call.

✅ **2026-08-01 — SHIPPED THIS SESSION** (all on `dev`, tip `71248a7`, tree
clean, type-check clean):
- **Popovers stay open while you scroll them.** A capture-phase scroll listener
  dismissed on ANY scroll including one INSIDE the bubble. Fixed on the grouping
  bubble, the keychain switcher, the friend sprite card, the fiat picker.
- **Three re-render traps killed.** Gallery cards subscribed to the WHOLE
  settings object (any connect-menu touch re-ran every card), to the live toast
  (every toast redrew the grid) and to the live modal stack (opening a modal or
  paging it redrew the grid behind). Cards now take narrow, identity-stable
  handles. Same for the profile thumbs, stickers, bench art and profile rows.
- **Slack Water's project page was a 500, not a 404.** Its Stacks trait was a
  raw NUMBER while every other trait value in PD is text (its own schema
  declares `"7"`..`"12"`); the Pop Table sorts values as strings and threw. All
  68 project pages were swept against the live preview — it was the only one.
- **Feeds match the home feed.** Artist lifecycle, profile activity and project
  activity feeds: date over time in the left column, event word with the ETH
  amount under it in the middle. Price left the sentence on the two that now
  carry it in the column. **The social feed's ◊ rail was deliberately left
  alone** (he flagged it as maybe special and hasn't seen it live yet).
- **Grouping bubble:** layers 2 and 3 wear the trait value pills' ↳, outside the
  pill in the staircase step.
- **Keychain switcher:** WORN label had inherited a line box its own height so
  the letters were sliced; fixed, plus the card can no longer hang off the top
  or bottom of the screen (that clamp is on the shared bubble, so every card
  using it benefits).
- **Now Minting scales.** Under 40 rows nothing changes — every carousel still
  mounts up front. Past that they arrive as you scroll, because each row is its
  own live project read and hundreds meant hundreds of simultaneous reads.
- **ORIENT joins the grouping cycle third-last** (rarity stays last), and ONLY
  where the art can be shaped differently — read off the registry's aspect list,
  so a single-aspect project never offers a dead tap.
- **The Depanneur wears ☯.** The glossary's ban on the taijitu was WRONG — it is
  text-default in Unicode and only becomes an emoji with the emoji selector,
  which PD never uses; it has been shipping bare on the Fates tiles all along.
  Glossary corrected. Chiron ⚷ stays on the charm's chain line.

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

- **The Colorpedia questions** (item 3 above) — the door in/out, the vocabulary,
  how much history per colour.
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
