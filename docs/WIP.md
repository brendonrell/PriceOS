# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

0. ✅ **2026-07-31 (LATEST) — THE SOUND LAYER GREW UP: three new blips, two
   sound swaps, an iOS wake-up fix, and THEME MUSIC — eight original pieces,
   one per surface, behind a long-press. All on `dev` (tip `b78983d`), tree
   clean, build green, 12 tests passing. Nothing outstanding.**

   **BLIPS.** Everything now plays at **3/4 volume**. Three new sounds chosen
   from an audition page and wired: **nudge** (any ping that isn't a sale,
   accept or achievement — no ping is silent now), **clunk** (a mint that
   failed — that was previously indistinguishable from nothing happening),
   **tuck** (added to your wishlist, fired from the store so every button
   gets it). A bulk add is capped to ONE blip, not one per item.

   **TWO SWAPS (Brendon's call, in order):** mint ⇄ accept, then mint ⇄
   achievement. Net result — mint = the five-note ascending run, achievement
   = the blooming four-note resolve, accept = two warm bells. The swaps move
   the RECIPE BODIES, never the call sites, so each name still means its
   event.

   **iOS: sound survives app switching.** iOS suspends audio when you leave
   and does NOT restore it on return — the layer stayed dead until you
   toggled it off and on. Now it wakes on returning to the tab, on the next
   touch, and on pageshow.

   **⛔ THEME MUSIC — the decisions that cost the most rounds. Do not undo:**
   - **The door (confirmed BEFORE the build, per Rule #-0.4): LONG-PRESS the
     ⚟ sound key to summon, LONG-PRESS again to dismiss.** Default OFF. A
     plain tap still toggles the blips, untouched. Holding also turns the
     sound layer on, since a theme can't be heard without it.
   - **Eight pieces, named as Brendon specified:** Homepage AM/PM, Output
     Page, Profile, Artist AM/PM, Busy Mint, Sold Out. AM/PM splits at noon
     on the VIEWER's clock (§9).
   - **⛔ THE OUTPUT PAGE THEME HAS NO TUNE.** Rejected twice for being
     distracting, then once for being sleepy. The answer: a melody is what
     the ear locks onto and follows — leave it out and you get energy without
     pulling attention off the art. **A test enforces this.**
   - **⛔ THE BUSY MINT THEME IS NOTHING BUT THE TICK, IN EVERY SECTION.**
     Four song-shaped attempts were rejected ("more annoying than
     energizing"). A mint is twenty seconds of tension, not a song. Its
     middle section once brought in a pad + arpeggio and Brendon called it
     immediately. **A test enforces this too.**
   - **⛔ HOMEPAGE PM (arcade) KEEPS ITS CLIPPED BACKING** (`tight: true`).
     He heard the ringing version and chose the clicky one. Never "improve".
   - **Ducking:** the theme fades to silence when the miniplayer starts and
     returns when it stops. The artist's soundtrack always wins.
   - **It STREAMS** — built two bars ahead of the playhead, so a minute-long
     piece starts as fast as an eight-second one and never stalls the page.
     Rendering a whole theme up front would freeze a phone for seconds.
   - Themes are SILENT on every surface not listed above, on purpose.

   **The audition page** (a published artifact) is where all of this was
   chosen — it plays every blip and every theme. Rebuild it rather than
   guessing if the set is ever revisited.

1. ✅ **2026-07-30 (LATEST) — GROUPING REBUILT TO THE APPROVED MODEL ·
   PROJECTS PRO IS THE INSPECTOR FOR PROJECTS · THE FRIEND INSPECTOR STRIP ·
   FIRST-OPEN LAG KILLED ON EVERY SLIDING PANEL. All on `dev` (tip
   `af8cdefe`), tree clean. Nothing outstanding.**

   **GROUPING — the artifact IS the spec.** Brendon approved a working model
   (an artifact) and said "add italics then push that". It was shipped in
   pieces first and he was right to call it: **when he approves a model, match
   it line for line, not halfway.** Where it landed:
   - Staircase step DOUBLED — level 2 at 60px, level 3 at 120px.
   - The connector runs from the PAGE EDGE in to each title (52px / 112px),
     not a stub beside it.
   - Level 3 labels are ITALIC. Labels step 13 → 12 → 11.
   - Fold triangle 32/26/21 and the dimension glyph both FULL STRENGTH; the
     count is BOLD.
   - **⛔ HEADERS SPAN THE ROW.** The old cap-to-its-pieces'-columns rule is
     gone — it stranded a small group's glyph mid-row.
   - **⛔ THE ART IS NEVER INDENTED.** The staircase is the TITLES' alone.
     Indenting cards narrowed the columns and wrecked the grid.
   - **⛔ 4-ACROSS IS DEAD** — reverted to the exact pre-change state (see the
     new REVERT rule in CLAUDE.md). A grouped grid is TWO across, like an
     ungrouped one.
   - The layer menu: a third of the screen tall, slots CASCADE (each pill
     begins where the number above it sits), and **any dimension with nothing
     to split on this surface greys out** — computed live per surface.
   - The group control wears the TOP layer's glyph with a **+** when more
     layers sit under it, and its long-press target is an invisible pad that
     takes NO space (a first pass padded the button — vetoed).

   **SPEED (sorting/grouping).** The control now paints the instant you tap it
   (the grid rebuild is deferred a frame, the same trick the trait pills have
   always used); one rebuild per tap instead of two; dead grid-measuring
   removed; and the new arrangement lands with ONE short settle on the grid —
   deliberately not one animation per card.

   **⛔ FIRST-OPEN LAG WAS ALWAYS THE CONTENT, NOT THE SLIDE (Brendon,
   2026-07-30: "you've been chasing the animation").** Sliding panels started
   their reads on OPEN, so the first open sat on the network, showed a loading
   line, then re-laid itself out. Fixed with ONE shared warm cache
   (`lib/net/warmCache.ts`): the read happens while the page is idle, the panel
   seeds from it synchronously, and each open re-reads in the BACKGROUND behind
   the cached copy so nothing goes stale. Wired into Completionism, the
   Purchase Pal (market + months + holdings) and the Exchange picker. The Cart
   fetches nothing; offer sheets are per-piece so there is nothing to warm.

   **PROJECTS PRO — now the Friend Inspector, for Projects.** Tabs with counts
   (ALL · HELD · STARRED · MINTING), sort (A–Z · newest · size · minted), three
   lenses, star-to-pin, tap-to-unfold dossier (mint progress, outputs, price,
   uploaded, cartel), and a preview strip (project roster / 30 days).
   **⛔ FACTIONS ARE A FILTER ONLY** — never drawn on a row (Brendon: "not
   everyone will give two fucks about factions"). Creator profile tags DO ride
   the rows, and both factions and tags are offered as filters.

   **FRIEND INSPECTOR STRIP — rebuilt.** The scrolling WIRE and the starfield
   MAP are gone ("I hate our friend inspector preview"). Three live reads on
   the same floating-chip nav: OVERLAP (your holdings vs your circle's — tap a
   project to narrow the ledger to its holders), ROSTER (the circle as faces,
   mutuals ringed), 30 DAYS (activity by day — tap a day to narrow the ledger).

   **WORN KEYCHAIN — the draw path was rebuilt (Brendon: "at like 10fps…
   REMOVE PRIOR FIXES and start fresh").** The cause was one SVG holding the
   ring, links and charm: moving a group inside it re-rasterizes the whole
   vector every frame. Now each link and the charm is its OWN pre-drawn layer
   moved by a transform only. Also: **with tilt granted the scroll shove is
   OFF** — the two drives were fighting and that was the scroll-up stutter.

   **PROJECT TAGS ARE OFF BY DEFAULT** platform-wide now (they were the one
   default-on exception). Otherwise unchanged — one tap in the picker wears one.

   **MINIPLAYER — the toast wordmark law.** Toasts must write the LOWERCASE
   `miniplayer`; that is what the italic + ™ treatment matches. A session
   capitalised all ten and silently killed both. Also: USB pop-outs centre on
   the SCREEN (the stick is offset 11px so cap+body read centred), and the
   changer/play/forward glyphs each dropped 0.5px (pause untouched — settled).

   **SHOWCASE COUNTDOWN** lost its box and sits on the page's normal side
   buffer; the Studio copy keeps its frame.

1. ✅ **2026-07-30 — SPOT-EDIT ROUND: STICKER STORE · FOOTER · DOCS ·
   DEPANNEUR · THE WORN KEYCHAIN'S COST, all on `dev` (tip `7e03bb5`), tree
   clean. Nothing outstanding.**

   - **Sticker store** — the bottom crawl's type went 12px → 14px.
   - **Footer** — the gwei readout now opens the Gas Tracker (`open('gasTracker')`).
   - **Docs** — the ⌕ key is box-locked (24px tall · 30px wide; 23/27 under
     480px) with the glyph centred, so it matches its neighbours and the
     ⌕ ↔ × swap can't resize or shift it. Its display is `inline-flex` in
     both the base and the ≥1024px rule.
   - **Depanneur — a second tap on the SAME keychain closes its detail**
     (clears the pick, and the just-cranked charm too, or it fell straight
     back into view).
   - **⛔ "TALLER" MEANT THE SHADOW, NOT THE HEIGHT (Brendon, 2026-07-30).**
     The yin/yang slots keep their 15px padding; the block under them went
     3px → 8px, and the press + held states travel that same 8px. A first
     attempt padded them to 26px — wrong, reverted.
   - **⛔ NEVER PRINT A WORD FOR THE ODDS (Brendon, 2026-07-30: "IF YOU WRITE
     STRONG PEOPLE WILL THINK STRONG").** The streak box printed `STRONG ODDS`
     beside a 1-DAY STREAK, which reads as nonsense — the tier is the BETTER
     of streak and rank, and his rank was buying it. It now states the real
     numbers off the same cuts the roll uses (`oddsFor()` in the engine):
     `RARE 15.5% · ULTRA 7%`. The word list is gone; don't bring it back.

   **⛔ THE WORN KEYCHAIN WAS LAGGING THE APP — THE MOTION WAS NEVER THE
   PROBLEM (Brendon, 2026-07-30: "I know your solution will be to change the
   hanging or remove it… Not allowed. I want what we have but fixed").**
   The physics, constants and look are UNTOUCHED. Two real causes:
   1. The chain hangs OUTSIDE its own box (`overflow: visible`), so every
      swing frame invalidated the hero AND the profile tab panel underneath
      and repainted them at 60fps — that was the tab-change lag. `.pd-charm-hang`
      is now promoted (`will-change: transform` + `translateZ(0)`), so a swing
      repaints only itself.
   2. It solved forever, off screen and backgrounded. An IntersectionObserver
      (80px margin) + `visibilitychange` park the loop; on return it drinks and
      discards the missed kicks so it can't fling. Waking is gated the same way.
   **Never "fix" this by slowing, simplifying or removing the swing.**

   **⛔ THE SOUNDTRACK BUTTON PRESSES ▶ ITSELF — DO NOT UNDO THIS (Brendon,
   2026-07-30, in fury: "it never fucking loads it just stays stuck on TUNING…
   WE CONTROL THE FUCKING BUTTON").** Tuning used to hand the player ONE start
   request; if it didn't take, nothing asked again and the readout sat on
   TUNING until he pressed ▶ by hand. `FmBar` now holds a `wantPlay` intent and
   re-fires the same `playVideo()` the ▶ key makes, every 400ms, until the
   sound is genuinely PLAYING — cleared instantly by a pause, a close, or
   success, so it can never fight the user. After ~4s it parks on PAUSED rather
   than lying about TUNING. **Never "simplify" this back to a single call.**

   **Closing the player no longer takes the page down.** YouTube's own teardown
   throws when the iframe hasn't reported ready; the throw hit the app error
   screen. Teardown is guarded and any leftover iframe is swept.

   **⛔ NO FILLED PILL ON A USB RING KEY, IN ANY STATE (Brendon, 2026-07-30,
   twice — the second time with a screenshot).** Bare glyph at rest; a press
   dips the glyph (opacity .62), never a block behind it. **The trap that bit
   us:** the shared `.fm-btn:hover` fill is NOT face-scoped and sits LATER in
   the file, and on iOS the last-tapped key keeps `:hover` forever — so the
   fill kept reappearing behind whichever key was touched last, and the
   `(hover: hover)` block never applies on a phone. It is now killed
   unconditionally for every ring key except ▶ (which owns its frame).
   **SHUFFLE: ON is full-strength + bold, OFF sits back at .62** — the active
   state is never the dimmer one.

   **USB geometry this round.** Play glyph moved inside its frame (the FRAME
   never moves — nudges are done with its padding, not a transform); play frame
   8px wider, 4px each side, growing from its centre. Changer, forward, shuffle
   and × each nudged sub-pixel. **The stick now centres on CAP + BODY**, not
   the body alone — the cap hangs 22px off the left end, so the chassis carries
   an 11px offset. TUNING breathes (1.4s, full↔half, never dark, stands down
   under reduced motion) — the LCD canvas supports a `flashRow`.

   **Home news rail.** One continuous marquee anchored to the WALL CLOCK — it
   used to resume from wherever the last mount left it, so every fresh load
   replayed the first few pills and the tail was unreachable. Face pills now
   draw the NAMED account's sprite (they were drawing the viewer's own, because
   the sprite engine is a single global for whoever is signed in) — still, not
   animated; Brendon parked animating everyone's for now. Sprite size back to
   the site's 13.6px, and **a new §9 rule: PriceSprites never get scaled up
   without him asking.** Copy: KEYCHAINS!, and ALMOST MINTING → ALMOST
   GRADUATED.

   **The random full-page loading screen is FIXED.** React re-injects the boot
   overlay on a client-side page change; the only thing keeping it inert is a
   stamp on `<html>` — and that stamp was set ONLY inside the fade's finish
   callback. Any boot where the callback never ran (loader already gone, or the
   app backgrounded across the fade) left the session unstamped and the next
   in-app change painted a full Loading screen. The stamp is now guaranteed.
   The last two hard-loading taps — a project tag on a profile, and opening a
   place from Cartography — route in-app (the map closes first).

1. ✅ **2026-07-30 — MINIPLAYER POLISH ROUND (earlier).**

   **USB face.** Black screen's left edge moved in 10px. Play key bigger, the
   pad ring around it smaller. Changer glyph down one size. Shuffle up two
   sizes. Shuffle / play / × shifted 2px right; shuffle and × pulled 2px in
   toward play. The body's own cast shadow now throws 24px further LEFT so the
   dark band under the shell runs past the cap.

   **⛔ THE CAP IS FINISHED — DO NOT TOUCH IT (Brendon, 2026-07-30, twice, the
   second time in fury).** The bottom-edge problem lives on the BODY and is
   fixed on the BODY. Two sessions-worth of attempts lit the cap instead after
   he had explicitly ruled the cap correct. See the new **RULE #-3** at the top
   of `CLAUDE.md`: when Brendon names the piece, that IS the diagnosis; a failed
   attempt does not reopen it.

   **Dot-matrix readout.** The top line now runs the full width of the glass
   because the meter bars are too short to reach it; lines two and three still
   stop short of them. The DECK face now reads on the same dot-matrix glass —
   same size, same artwork window, same keys — and its old CRT scanline veil is
   gone (it fought the pixel grid).

   **The headphone lead is DELETED.** Built, iterated (thicker tube, a plug body
   at the shell), then Brendon killed the whole idea. Markup and styles are
   fully removed — do not resurrect it.

   **Error screen.** The crash/reload screen's two lines were dimmed to 60–70%;
   the dimming is off and both are a size larger.

2. ✅ **2026-07-30 — THE CONTRACTS CAUGHT UP: rarity ported, ELEMENTS
   added, and a DEPLOY BLOCKER fixed (Opus 5). App on `dev` (tip `ccb3cae`),
   contracts on `pd-contracts` main (tip `3259851`). Both trees clean.**

   **Nothing is outstanding.**

   **⛔ CONTRACT PARITY IS RESTORED — the note below about it being broken on
   purpose is now HISTORY, do not act on it.** `lib/keychains/engine.ts` is
   still **the reference implementation** (the app led the rarity rebuild and
   the contract was brought UP to it) — never "restore parity" by reverting the
   app. The contract now matches it byte-for-byte: proven across 64 renders,
   8 seeds × both coins × all four luck tiers, SVG and attribute sheet.

   **THE RARITY REBUILD IS ON THE CHAIN.** Colour / finish / chain metal roll
   per charm off its own seed; palette is tiered (tier first, then the coin
   weights pick the member, so every colour stays rollable on both coins);
   `finishForRank` and the whole `chainTier` streak ladder are deleted.
   **LUCK** (0–3) is derived onchain at the crank from an app attestation and
   frozen into the token forever — it only widens the rare end, and **polish
   and transfers can never repaint a charm** (tested both directions). Luck
   lives on the TOKEN, not the renderer, because the renderer is swappable and
   a minted charm's luck must not move under it.

   **⚠️ TWO WIRING CHANGES THE APP/DEPLOY MUST HONOUR:**
   - `crank(coin, streak, rank, deadline, sig)` — **the app must sign the crank
     attestation or luck stays 0.** An empty sig cranks at floor odds by
     design, so the machine keeps turning if the signer is down.
   - Renderer constructor is now `(shapes, faces, traits)`. **Deploy order:
     Shapes → Faces → Traits → Renderer → PDKeychains.**

   **ELEMENTS — the new TOP-LEVEL attribute (Brendon, 2026-07-30).** Six
   elements, two shapes each, each with a colour; **leads** the trait sheet.
   AIR (heart·bolt) orange · SPACE (star·moon) blue · FIRE (tag·spark) red ·
   MINERALS (gem·planet) green · WATER (flower·clover) yellow · TIME
   (ghost·alien) purple. It is a **classification of the existing shapes, not
   a new roll** — no salt, no change to the gene roll, the art untouched, so
   rarity falls out of the shape weights already in place: **AIR 24 · WATER 22
   · SPACE 19 · FIRE 12 · TIME 12 · MINERALS 11** (minerals rarest). Colours
   are defined onchain (`PDKeychainTraits.elementHex`) and in the app
   (`ELEMENT_HEX`) but **deliberately not drawn in any UI yet — placement is
   Brendon's call, do not invent one.**

   **⛔ A GREEN TEST SUITE IS NOT EVIDENCE A CONTRACT CAN DEPLOY. Learned the
   hard way 2026-07-30.** `PDKeychainRenderer` had been **over the EIP-170
   limit (24,576 B) since the 2026-07-28 eyes/yin-yang round** — it could not
   have been deployed at all, and it sat that way for two days because that
   round measured tests but never bytecode. `forge test` does not enforce the
   limit. **Always `forge build --sizes` after touching a renderer.** Fixed by
   the pattern already in place: new **`PDKeychainTraits`** part store #3 holds
   every trait NAME table, the element colours and the attributes JSON; the
   renderer resolves genes and hands indices over. Renderer 26,762 → **20,588
   (+3,988 headroom)**, output byte-identical after the move. 396 tests green.

   **⛔ NEXT BLOCKER, ALREADY QUEUED — `PDFactory` is 29,891 B, over the same
   limit by 5,315.** Pre-existing, untouched, and it will block a factory
   deploy. ClickUp `86bb5nt0f` (high) with the recommended fix + the companion
   guard: **wire `forge build --sizes` into the build so this cannot regress
   silently.** Brendon has not yet ruled on the guard.

   **DEPANNEUR SPOT EDITS this round:** count line now reads "WHAT'S YOUR
   FAVOURITE *COMBINAISON*?" (italic, not bold — `<b>` renders pink there and
   would read as another stat) · YIN/YANG slots 5px taller each side and now
   sit **visibly sunken when selected** (face drops onto its floor, shaded lip
   along the top edge — no layout shift, and it holds while pressed) · the ⚷
   came off the panel title, which is now 14px and on its own baseline. All
   three title/slot rules are **scoped to `.dp-plus`** so the stickers and
   followers heads keep their own treatment.

   **⛔ THIS CONTAINER'S GIT HISTORY IS TRUNCATED — "N commits not on dev" can
   be an ARTEFACT, not lost work (learned 2026-07-30).** Local `dev` looked
   like it held 50 stranded commits with no common ancestor; it was really just
   a stale pointer on a 26 July commit, and every one of those commits' changes
   was already in `dev`. **Confirm against file CONTENTS before acting on a
   commit-count difference.** Fixed by repointing the ref; zero drift now.

   **BRENDON ACTIONS:** `PriceOS` still has **71 stale `claude/*` branches**
   (`pd-contracts` is clean — just `main`). Some read like real features, and a
   merge check from this container is not trustworthy for old branches (see the
   truncation note above) — **offer the proper contents-based sweep before he
   bulk-deletes.** He has not yet ruled on the contracts-`dev`-branch question
   either: recommendation was **no** (a dev branch buys nothing without an
   environment behind it; tag what gets deployed instead + add the size gate).

---

1. ✅ **2026-07-29 — THE KEYCHAIN RARITY REBUILD + THE DEPANNEUR'S
   OWN WORLD (Opus 5). All on `dev` (tip `67b29a7`), tree clean.**

   **Nothing is outstanding.**

   **⛔ CONTRACT PARITY IS BROKEN ON PURPOSE — read this before touching
   keychains.** Brendon killed the old rarity system (*"they all come out gold
   it's boring"*) and explicitly freed the art from the contract: *"we're pre
   launch bot the artist was just Fable lol."* `lib/keychains/engine.ts` is no
   longer a byte-faithful port — **it is now the reference implementation** and
   `pd-contracts` has to be brought UP to it before any deploy. The full port
   spec is commented on ClickUp `86bb46epm`; the app-side record is on
   `86bb46etv`. Do NOT "restore parity" by reverting the app.

   **⛔ THE ART BELONGS TO THE CHARM, NOT THE KEEPER.** The bug: finish read
   the keeper's RANK and the chain read their STREAK, both live — so every
   charm in a rack came out the same gold on the same thread, and nothing you
   pulled could look different from anything else you owned. Now:
   - Colour / finish / chain metal all roll **per charm off its own seed** on a
     common→rare ladder. Gold and chrome are genuine rare pulls.
   - **Streak and rank buy LUCK instead** — an odds tilt (0–3) banked into the
     charm at the crank and kept forever; max streak roughly doubles the rare
     end. They never repaint a charm afterwards.
   - Every charm gets the approved six-link chain off the split ring as its
     floor. The streak-gated cord tier is deleted.
   - Old charms re-roll their look (they were all wearing rank-gold). Expected.

   **THE WORN KEYCHAIN HANGS FROM THE TAG ROW.** Ring pinned to the end of the
   row, charm hanging off the chain's last link, over what's below. **It is a
   CHAIN, NOT A BAR** — each link is its own body on its own segment (verlet,
   ring pinned, links length-constrained, charm swinging off the end), driven
   by real device gravity; scroll shoves it, shake rattles it. **If it ever
   twitches again, the first thing to check is the tilt smoothing** — the raw
   orientation stream is jittery and feeding it in unfiltered is what made it
   "jump all over the place". Renders 20% larger than the first cut.

   **TILT IS ALWAYS ON.** The iOS motion permission ask rides the **first
   EQUIP** — the one tap iOS will let us ask on. The on/off pill is gone.

   **THE DEPANNEUR IS ITS OWN WORLD** — pinned dark at any colorway (Brendon's
   explicit call, so it is NOT a Rule-#2 washout), wearing Fable's approved
   sheet: masthead (KEYCHAINS**!**, pink mark), the pink count box with the
   streak on a bar inside it filling toward the next odds tier, THE CAST
   header + sub line verbatim, tiles captioned with name-or-shape. Coin slots
   and crank read as real buttons; the crank is dead until a coin is in.
   Instructions point at the right step first (PICK YIN OR YANG · DROP A COIN
   · SEE WHAT FALLS OUT). It has **its own pull-to-refresh** — the app's PWA
   pull deliberately bails inside modals, so this is the same pill and feel
   rebuilt on the panel's scroller, refreshing the rack rather than the app.

   **TWO SMALLER SHIPS**
   - **The rarity ❖ came back on the Output stats row.** When that stat became
     PD Rarity it moved off Courier onto Arial, and iOS carries no U+2756
     there — the glyph vanished silently. **Every ❖ on the site must sit in
     Courier.**
   - **FRIEND INSPECTOR LITE** (`components/FriendInspectorLite.tsx`) — the
     follower count on an Output opens a plain list of who follows that piece:
     same chrome, same ASCII-ID rows, no tabs/duel/stat columns. **The parent
     project leads the list** — an Output is always followed by its project
     (parental support), which is why the count is never 0; without that row
     the list reads one short of the number that opened it.

---

0. ✅ **2026-07-29 — THE MARQUEE ROUND (Opus 5). All on `dev`
   (tip `c0f13d4`), tree clean.**

   **Nothing is outstanding.**

   **⛔ THE LOOP BUG — the rail never actually looped.** The scroll animation
   translated by -50% of the RAIL'S OWN WIDTH, but an absolutely-positioned
   flex row collapses to its container's width, so it slid half a screen and
   snapped back mid-pill ("break and cut and restart"). Fix: the rail is sized
   to its content (`width: max-content`), so -50% is one true run. **If any
   other rail on the site ever "cuts and restarts", this is the first thing to
   check** — the Tape rail and `.fi-wire-rail` share the same keyframes.

   **SHIPPED THIS SESSION — all on the home news rail**
   - Title of the PriceDay card is **WELCOME TO** (over "PriceDay #55").
   - Seamless loop (above) · **per-visit shuffle** (content-keyed hash, so a
     late-arriving pill slots in without re-dealing the rail and cutting the
     glide) · caps raised 12 → 24 and 3 → 5.
   - **THE GREETING CARD** — GOOD MORNING / AFTERNOON / EVENING / NIGHT off the
     viewer's own clock (5 / 12 / 17 / 22). **1 visit in 10 it drops to
     lowercase `gm` / `gn`** — morning and night only, there's no shorthand for
     the others. Stat under it: new projects in the last 24h → **2 visits in 10
     it counts "since your last visit"** instead (visit is stamped every time;
     only shows when something actually landed). Falls back to minting-now,
     then total pieces.
   - **SEVEN HELPFUL CARDS**: almost-minting (within 5 of the threshold) ·
     cart · bench · a followed artist's upload · a followed artist's next
     window · wishlist moved · your own window shouting OPENS TODAY inside 24h.
   - **SEVEN RELATIONSHIP CARDS**: offers on your pieces · your oldest open
     offer ("Sent 34 days ago") · live takeover either side · your nemesis ·
     top counterparty · faction oath · mutuals wearing Open To Trades.
   - **THE POTPOURRI FIX** (his words: *"a personalized potpourri of
     interesting stuff instead of a parade of endless projects graduating"*).
     Moments are dealt in ROUNDS — one per family before any family repeats,
     max 3 per family. And **your own cards are pulled out of the shuffle into
     their own pile and woven back in every 3rd slot**, so the rail reads as
     yours.
   - **BRENDON'S CARDS — God Mode (PD Studio) now has editorial control.**
     Top line · headline · detail · glyph · link · order, with LIVE/PARKED,
     EDIT, REMOVE. New `home_news_cards` table (applied to the live project);
     public read of LIVE rows only, writes service-role behind a SIWE +
     owner-wallet check. **This is the "admin studio" the old CURATED_NEWS
     comment promised — it exists now.**

   **⛔ HE HATES A PARADE.** Any surface that lists platform events will drift
   into one loud family. Deal by family, cap the family, weave the personal in.

<details>
<summary>Earlier the same day — PROFILE SPOT-EDITS · KEYCHAIN · FORMULA</summary>

0. ✅ **2026-07-29 — PROFILE SPOT-EDITS · THE HANGING KEYCHAIN ·
   FORMULA (Opus 5). All on `dev` (tip `7d5c46c`), tree clean.**

   **Nothing is outstanding.**

   **⛔ THE PACE RULE FINALLY LANDED — DON'T LOSE IT.** He said *"this is so
   not like you, in the best way… finally the correct spot edit pace I
   wanted."* What produced it: he says **"spot edit"** → find the line, change
   it, commit, next. No screenshots, no harnesses, no exploratory greps, no
   build-watching. Rules #-0.9 and #-2 are the whole job on those turns.

   **⛔ NEW RULE #-0.85 — THE MOMENT YOU ASK FOR A PUSH, YOU STOP. DEAD.** His
   approval cannot reach you while you are still acting; he fires "push!"
   instantly and then watches you putz around for minutes. The push ask is the
   LAST thing in the turn. Also: a background check hands the turn back after
   you finish — **do not fill that space by re-sending your report.** He caught
   it twice and it made him angry both times. End quietly.

   **SHIPPED THIS SESSION**
   - Tag paint row: Dot → **All Dot**, Matrix → **All Matrix**, All Blue →
     **All @brendon blue**. (An "All Original" pill was built and then REMOVED
     at his word — deselecting the active paint is already the method.)
   - **Now Buying** wears the buy mark **✦** (was ✸, shared with Now Selling).
     Its spin: 21px, 0.5px up, 3s — twice the old speed. **Now Selling was NOT
     touched** and still wears ✸ at 20px/6s.
   - The Exchange **⇌** in the wallet row: 24 → 20px.
   - **THE WORN KEYCHAIN.** 10% bigger (69 → 76). It now **floats** — it holds
     a pill-height slot in the tag row so the row never grows, and the art
     expands out of that spot over its neighbours. The **chain is back**,
     pinned by the charm's FOOT so the character stays put and the chain grows
     UP out of the row. The **name-tag banner is OFF** on the worn charm (it
     was eating half the box and was unreadable) — the name is still on the tap
     and in the popup.
   - **THE KEYCHAIN HANGS FOR REAL.** A shared pendulum drives every charm on
     the page: scroll velocity shoves it, gravity and drag settle it, it sleeps
     when nothing moves, and it is fully still under reduced-motion.
     **Tilt is opt-in and its door is the owner's own charm** — the charm popup
     carries a **TILT: OFF/ON/BLOCKED** pill, shown only on your own charm.
     iOS grants motion per-SITE off a deliberate tap, so one tap makes every
     charm on every profile tilt; a refusal is permanent (Safari settings to
     undo) and everything falls back to the scroll swing.
   - Reserved handles: **@formula · @formulas · @tabstract · @lanerunner**.

   - **FORMULA — the 4th personalization row. BUILT AND SHIPPED.** ClickUp
     `86bb5gwbk` carries the full record. A user's own generative Unicode art
     project worn as a tag: **Formula #1 … #22**, numbered by shelf position
     like Albums, never named. Row 4 of the profile carousels, empty by
     default. Browsing shows each piece drawn live with a pencil beside it;
     the pencil turns the row into the editor — every parameter is a button IN
     the row, no modal. **It REDRAWS every page load** (one shared roll per
     load; the server renders roll 0 and the real roll lands after mount, so
     first paint can't disagree with itself). Parameters: Sets (multi, last
     one can't be dropped) · Length 4/6/8/10 · Weave
     Scatter/Alternate/Run/Mirror · Spacing. **Ten NEW sets — Formula is its
     own artwork, NOT Tabstract, and must never borrow Tabstract's six.**
     The database column is applied to the live project.

   **⛔ THE "THEN" MISREAD — don't repeat it.** He said *"build and push that.
   Then wrap, thanks!"* and it was read as "wrap INSTEAD". **"Then" means
   AFTER.** He had to say so twice. When an instruction chains two jobs, do
   both, in his order.

</details>

<details>
<summary>Earlier the same day — HOME NEWS RAIL ROUND</summary>

0. ✅ **2026-07-29 — HOME NEWS RAIL ROUND (Opus 5). All on `dev`
   (tip `4b373a0`), tree clean.**

   **Nothing is outstanding.**

   **⛔ THE SCOPE RULE WAS BROKEN AGAIN — READ RULE #-2 BEFORE YOU TOUCH
   ANYTHING.** After the round shipped he said *"the created tab thing was for
   their profile"* — a CORRECTION. It was treated as a BUILD INSTRUCTION and a
   second placement got added (the +More › Created path). He was furious:
   *"WHY DO YOU DO THIS EVERY FUCKING TIME... WE HAVE A RULE NOT TO ADD SCOPE."*
   Reverted immediately. **THE LESSON: a correction, a clarification, or a
   question is NOT a job. Answer it. Do not reach for the keyboard.** When he
   tells you where something belongs, he is CONFIRMING the boundary, not asking
   you to widen it.

   **THE COUNTDOWN LIVES IN EXACTLY THREE PLACES — DO NOT ADD A FOURTH:**
   the Studio dashboard · the bottom of an artist's Created tab (profile) ·
   the home rail pill. He confirmed this explicitly.

   **SHIPPED THIS SESSION**
   - **THE HOME NEWS RAIL went from 3 pill families to 15.** It only ever
     carried uploaded / graduated / sold-out, so it read as a graduation feed.
     Now: mint progress (HALFWAY / LAST n / FINAL PIECE) · platform round
     numbers · the three BIG milestones only (Century · Per Mille · Hi-Def —
     the mid-ladder stays OFF, that was the 2026-07-06 noise call) · artist
     debut + second project (these REPLACE the plain UPLOADED pill, never
     double it) · project birthdays · today's PriceDay + Mood Ring · biggest
     sale of the day · a project's first-ever resale · top collector · a
     daily-rotating profile-tag head-count · newest faces on the sprite chip
     (built since the rail shipped, unused until now) · live ETH + gas · the
     viewer's Kin, rarest piece and next upload window · Keychains / Stickers
     / Docs / PD Studio.
   - **THE READ** (`lib/gas/read.ts`) — gas as ONE WORD (DIRT CHEAP → BRUTAL)
     so it's a glance, not arithmetic. His idea; reuse it anywhere gas shows.
   - ⚠ **KIN DID NOT EXIST FOR USERS.** He asked for "the person closest to
     your taste" believing it did — in the code Kin is artwork-to-artwork
     (`nearestKin`), and Neighbourhood is wallets-around-a-piece. Shipped as
     shared-projects-held overlap, flagged to him in the ship note. If a real
     taste engine ever lands, that pill should move onto it.
   - **UPLOAD WINDOW COUNTDOWN** — live ticker, shared formatting in
     `lib/artists/window.ts` so the three surfaces can't disagree.
   - **⛔ PER MILLE IS ALWAYS THE SVG.** The home activity feed AND the rail
     both painted the ‰ as a text character; both now use `PerMilleMark`.
     His words: *"Per Mille logo must always be the svg."* Grep before adding
     any new ‰ surface — the Inter-glyph treatment is NOT the answer anymore.
   - Created facet pill's count wore an unstyled class and rendered as bare
     text — now the same badge the Status facet has.
   - Mini profile tag contents nudged a further 0.4px down (0.8px total).

   **NOTE ON COST:** the home payload now runs 2 extra capped reads on every
   home load/poll, and the rail turns the gas feed on for every home visitor
   (globally cached at 12s, so coincident polls collapse). Fine at launch
   scale — revisit if home traffic gets real.

</details>

---

<details>
<summary>Earlier the same day — TAG + IDENTITY-ROW ROUND</summary>

0b. ✅ **2026-07-29 — TAG + IDENTITY-ROW ROUND (Opus 5). All on
   `dev` (tip `43f6d11`), tree clean.**

   **Nothing is outstanding.**

   **⛔ THE TOP RULE WAS SHARPENED TWICE TODAY — READ `CLAUDE.md` FIRST.**
   He asked to bold the project tags; the pill border got thickened too, and
   he was furious ("hardcore psycho behaviour"). The rule now names the
   mechanism: **his words are the EDIT, not a look to go and achieve.** Never
   reach for the border/container/spacing/neighbour to get there. Before
   saving, ask of every line: *did he TYPE this?* Also added: **spot edit vs
   build** — a spot edit is literal with ZERO judgment; when unsure which he
   means, it is a SPOT EDIT. And: **never sit and watch a build** — pushes to
   `dev` deploy themselves and he checks; type-check only when a change can
   break the compile.

   **SHIPPED THIS SESSION**
   - **PROJECT TAGS** (new): one chip per Project an artist made, in that
     Project's live colorway, in their Earned section, tapping goes to the
     Project. The platform's ONLY default-on tag — turned off via a new
     opt-out list (`settings.tagsOff`) so it can never switch itself back on.
     Wears the ⬚ Project mark, thicker lettering than the rest of the row, and
     the ownership check after the name when the VIEWER holds a piece
     (`lib/hooks/useOwnedProjects`). Project pages show them in the By line —
     project chips only.
   - ⛔ **`lib/tags/derive.ts` MUST NOT IMPORT THE PROJECT REGISTRY.** The
     first cut did and it dragged the whole art-engine graph into every
     surface that lists people. Project data now arrives as FACTS from
     `/api/tags` (+ the members route), the pattern the rest of the file uses.
   - **Anon mode** hides profile tags everywhere (hero pills + every list row).
   - **Held-by row** (output page): label, ID rectangle and tags are all
     direct children of ONE row, centred; label lifted 1.8px onto that centre.
     Same technique applied to the project page's artist row ("By" dropped 3px
     onto the @name's baseline) and to **Collected by / Followed by**, which
     now wear the full ASCII-ID (no tags, commas kept, 2 names max).
   - **ASCII-ID rectangle locked to a standard 14px** on every surface, glyphs
     deliberately breaking past its edges. PriceRank now 19px.
   - **Output stats row:** the all-time high spot now shows **PD Rarity** as
     `4/222` with ❖ (the ATH still lives on the Stats wall).
   - **Rarity Labs** — the "POP TABLE" section renamed, with a plain-English
     blurb. Do NOT reach for card-grading framing in the copy; he rejected it.
   - **Followers count** on a profile now confirms itself on arrival — it was
     only ever set at build time and on a follow tap, so it read one step
     behind (following someone could show a follower LESS).
   - Trade button only on profiles that actually hold pieces. Worn keychain
     two-thirds size, centred in the tag row, chain hidden on the profile.
     Created pill carries the artist's project count. Project Social stats wear
     ☻ / ⚯. Toast labels capitalised (gnome keeps its lowercase label).

   **AFTER THE FIRST WRAP — same session, second round (tip `c2356a3`):**
   - **The Exchange has a door**: ⇌ in the wallet icon row, after incognito and
     before the RPC ping, opening straight onto YOUR open trades. The list
     already existed inside the trade window but only appeared once a
     counterparty was picked, so a missed ping had no way back.
   - **Three new pick-your-own tags** at the end of the persona row: Now
     Buying, Now Selling (both wearing the ✸ transfer star, turning once every
     six seconds) and Open To Trades (the Exchange's ⇌, rocking side to side).
     Both motions stop under reduced-motion.

   **⛔ THE LESSON THAT COST THE MOST TIME TODAY:** he asked for an ICON; the
   Exchange had nothing to open, and instead of one line naming that, a whole
   new window got built. He was furious — not at the window (he approved it
   after), but at not being told first. **An unknown that changes WHAT gets
   built is one line to him and no code until he answers.**

   **ClickUp:** updated — the round is logged in 02 · Done (`86bb5c2g8`), and
   the Exchange door started life as a Backlog item (`86bb5c2nm`).

0000000000000000000000000000. ✅ **2026-07-29 (LATEST) — SPOT-EDIT ROUND +
   THE PROCESS CORRECTION (Opus 5). All on `dev` (tip `d5681c2`), tree clean,
   build green, rules confirmed in the compiled CSS.**

   **Nothing is outstanding.**

   **⛔ READ THE NEW RULES IN `CLAUDE.md` BEFORE DOING ANYTHING — this session
   burned a chunk of Brendon's time and he was furious. Three CSS nudges turned
   into a ten-minute production: a screenshot harness, downloaded fonts, a local
   dev server, measurement scripts. NONE of it was asked for.**
   - The old §6 "mobile preview recipe" was **hallucinated scope and is
     DELETED.** Screenshots / harnesses / fonts / dev servers / headless
     browsers are BANNED unless Brendon explicitly asks to SEE something.
     "Check your work" = read the real file + confirm the real output. That's all.
   - **RULE #-1 hardened:** reply INSTANTLY to every message, before any tool
     call. He sees a spinner and "1 task running" when a session goes straight
     to tools — that is the failure. One line first ("researching now"), then work.
   - **NEW RULE #-0.9:** a spot edit is find the line → change it → push →
     next one. Minutes. Batch them as he fires them; never stall the queue.
   - **NEW RULE #-0.8:** the approval gate is on being INCOMMUNICADO, not on
     depth. Reads/greps are free. Anything that takes you out of the
     conversation for a stretch gets named in one line and approved first.

   **What shipped (all spot edits, pushed as they landed):**
   1. **Followers smiley (☻)** — one size smaller and lifted 3px, across all
      three rules that govern it (base · phone · desktop), so the user page and
      both output-page spots stay consistent.
   2. **Output owner row** — "HELD BY" is now the base and everything else in
      the row centres on it; the ID rectangle and the tag pills are vertically
      aligned instead of sharing a bottom edge. (This reverses the `flex-end`
      choice made earlier the same day — that was his call, don't restore it.)
   3. **PriceRank glyph inside every ASCII-ID** — one size up (15px, and 18px
      in the Friend Inspector dossier) and dropped 2px to sit level.

   **⚠️ OPEN, UNRESOLVED — the project page smiley.** Brendon says there IS a
   smiley on the **project page under the Social tab**. Every followers mark
   found in the code there is the grid glyph ⌗, and no smiley appears in the
   project components or the built chunks for that surface. He was asked to say
   what it sits next to; he hasn't yet. **Do NOT go hunting for it — ask him
   one line and move on.**

000000000000000000000000000. ✅ **2026-07-29 — THE ASCII-ID LOCKED ·
   OUTPUT OWNER ROW WRAP + FLUSH · SMILEY SIZING (Opus 5). All on `dev` (tip
   `c8fa959`), tree clean, typecheck green, build green, every rule verified in
   the compiled CSS and screenshotted at iPhone size in BOTH orientations.
   ClickUp `86bb53809`.**

   **Nothing is outstanding — this session is fully shipped and deployed.**

   1. **⛔ THE ASCII-ID IS LOCKED — read this before touching any surface that
      shows a person.** PD's identity unit has ONE name and ONE anatomy, fixed
      in `components/hero/AsciiId.tsx` (the former `CollectedPair`):

      **PriceSprite › PriceRank › @name › Sigil**

      That is the connect-menu identity, verbatim, inside the tinted rectangle.
      Nothing is optional and nothing is reordered per surface. A part is
      absent ONLY when the person genuinely has none — unloaded/unknown sprite,
      unranked account, unforged or owner-hidden Sigil. There are no
      per-surface flags any more; the old `showRank` / `showSigil` props are
      gone on purpose.
      Now rendered identically on: both leaderboards, Collectors, Tag rooms,
      Followers, the **Friend Inspector**, and the output page's owner line.
      (Before this, the leaderboards had no rank badge and nothing but the
      owner line carried a Sigil.)
      Rank + Sigil + address come off ONE cached per-handle profile read
      (`useUserIdentity`, sharing the cache `useUserRank` already had).

   2. **⛔ PROFILE TAGS ARE **NOT** PART OF THE ASCII-ID.** Brendon said it
      twice, so it is written into `components/tags/UserTags.tsx` AND
      `app/globals.css`. Tags are their OWN thing riding in the same **spot** —
      immediately after the rectangle, **outside** it. Never draw a tag inside
      the rectangle; never fold tags into the ASCII-ID component.

   3. **OUTPUT PAGE OWNER ROW — the portrait bug, fixed.** The hero column was
      sizing itself to its WIDEST child, so the holder's tag strip (one nowrap,
      side-scrolling line) stretched the whole hero and dragged the title off
      the right edge in portrait, where the document is clipped rather than
      scrollable. Landscape only looked fine because the content happened to
      fit. The column now takes a definite width, so nothing can widen the page
      and every child's `max-width: 100%` has something to resolve against.
      The mini pills are dissolved into the owner row (`display: contents`),
      making them siblings of the ASCII-ID rather than a block parked inside
      it: they start right after the rectangle, and every wrapped line sits
      FLUSH LEFT with even gaps — the profile tag row's treatment exactly.
      Pills share the rectangle's BOTTOM edge (`align-items: flex-end`) so the
      row reads as one level line; centring can't do it, because "HELD BY"
      carries ascent above the rectangle and pulls the row's centre up past it.
      Tap-to-expand is untouched — the mini strip still swaps for the full-size
      row and back.

   4. **FOLLOWERS SMILEY (☻), stats row.** One size smaller and nudged down,
      then back up a half pixel on Brendon's call. Applied to all three rules
      that govern it (base · phone · desktop) so the surfaces stay consistent.

   **Corrections made mid-session — don't re-introduce either:** the rectangle
   first shipped with the **PriceScore**; Brendon corrected it to **PriceRank**
   and the score readout was removed. The first wrap attempt used inline text
   flow with a per-pill LEFT margin, which indented every wrapped line — the
   gap must never hang on the left.

00000000000000000000000000. ✅ **2026-07-28 — LISTS ROUND: PLAY A LIST
   AS A PLAYLIST · NEW LIST FROM THE PANEL · ARRANGE THE LISTS · MOVED MARKS
   (Opus 5). All on `dev` (tip `916a898`), tree clean, typecheck green, build
   green, every rule verified in the compiled CSS. ClickUp `86bb51qug`.**

   **Nothing is outstanding — this session is fully shipped and deployed.**

   1. **▶ PLAYS A LIST THROUGH THE MINIPLAYER.** A list in MY LISTS carrying
      soundtracks gets a ▶ on its header, in the ◊ total's spot. It sends those
      soundtracks to the player in STORED order (the order the rows were
      dragged into).
      The player gained a **RUN**: first station on air, the rest waiting, each
      rolling on **only when the one playing reaches the end of its own last
      track** — a playlist is never cut short mid-way (it checks the playlist
      index against its length; a single-video station is always "finished").
      Hand-picking a station anywhere **abandons** the run (`start` wipes the
      queue on purpose), and × clears it with the device. The run is NOT
      persisted across an app close — the saved session restores the single
      station, exactly as before.
      **Scope note:** first built gated to all-soundtrack lists; Brendon
      widened it to MIXED lists the same day. It does not lie about what it
      plays — the key and the toast both carry the count when the list holds
      other things too.

   2. **NEW LIST lives on the panel head now.** Before this, the ONLY way to
      make a list was ADD TO LIST on a starred row — the panel's own empty
      state had to send you elsewhere to fix it. No glyph was invented: the
      sort row above is word keys and the ADD TO LIST sheet's create row is the
      words "New List" (Rule #0).

   3. **ARRANGE — the lists themselves reorder** (rows inside have dragged
      since 2026-07-25; the lists never could). Reuses the app's own hold-drag
      **whole** — same ⠿ grip, same lift, same dotted drop ring.
      **⛔ WHY IT'S A MODE AND NOT A BARE HOLD — do not "simplify" this away:**
      the hold on a list name is already FOCUS, and one gesture cannot mean two
      things. ARRANGE takes the hold while it's on and hands it straight back
      when it's off. **Default off.** Focus wins over arrange (a focused list
      hides the others, so there's nothing to arrange against).
      **Order: A→Z stays the default forever.** The first drag switches to the
      user's own order (which freezes what's on screen as the starting point,
      so the drop lands where they aimed); the **A→Z** key — visible ONLY while
      arranging, never resting chrome — puts it back. Nobody can strand
      themselves in an order they can't undo.

   4. **MOVED — a list can tell you something happened in it.** Each list
      remembers what its pieces were asking the last time it was read; anything
      whose ask changed (came up for sale, sold, repriced) wears PD's **dotted
      ring** on the number that moved, and the header carries the count so a
      **CLOSED** list still says so. Opening the list is what clears it, and
      the marks deliberately **survive the read that clears them** (frozen on
      open, released on close) or they'd vanish in the same frame.
      **⛔ DEVICE-LOCAL BY DESIGN — not an oversight, don't "upgrade" it to the
      account envelope.** "Since I last looked" is a fact about THIS device's
      reading; syncing it would mean opening a list on the phone silently
      clearing the marks on desktop. It's a reading mark, not portfolio truth.

   5. **⛔ BULK ADD ALREADY EXISTS — do not build a second one.** It shipped
      2026-07-25: multi-select on All Starred sends the whole selection into
      the ADD TO LIST sheet, which already takes many items at once. It was on
      this round's shortlist and was struck once the code was read.

0000000000000000000000000. ✅ **2026-07-28 — MINIPLAYER DEAD-LINK KILLED ·
   USB HARDWARE PASS · YOUR TRACKS · SLIDE-MODAL HITCH · SUITE/PRICECAL ·
   AD CHANNEL (Opus 5). All on `dev` (tip `1099f77`), tree clean, typecheck
   green, every change verified in the compiled CSS/JS. ClickUp `86bb518mu`.**

   **Nothing is outstanding — this session is fully shipped and deployed.**
   Below is what a fresh chat most needs to know.

   1. **⛔ THE DEAD LINK WAS NEVER A DEAD LINK — do not "fix" this back.** The
      watchdog flagged any station that hadn't reached PLAYING in 12s. On iOS
      that is the NORMAL state: Safari blocks autoplay outside a real gesture,
      so the player parks in CUED — loaded, waiting — and plays the instant ▶
      is pressed ("it fixes itself eventually"). It now flags only a station
      that never reports back AT ALL; ready/cued/buffering/playing/paused all
      clear it, including on a retune of an already-ready player. CUED reads as
      PAUSED, never endless TUNING. Real breakage still flags via the error
      path, which is the thing that actually knows.
      **⛔ SETTLED, BRENDON'S CALL — do NOT reopen:** we do NOT keep a player
      alive up front to win autoplay ("that's retarded"), and a delayed
      programmatic press does NOT clear Safari's gate — it is literally what
      already ran. **The station opens ready and the user presses play.** Done.
   2. **YOUR TRACKS — the viewer's own 22 YouTube playlists.** PRIVATE, in the
      settings envelope beside `starred`, changeable any time
      (`lib/fm/tracksStore`). Vetted by `/api/studio/playlist` — the exact
      route the Studio runs on artist soundtracks, so a link PD would refuse
      an artist is refused here. **UI is the SAME pop-out menu the screen
      opens**, on its own shelf (his call — not a new panel).
      **⛔ THE DOOR, Brendon-confirmed, is the ONLY way in:** tap the USB cap
      to pop it, then **long-press OR triple-tap the tip**; a lone tap
      re-seats the cap. Nothing else on PD mentions the feature.
   3. **Slide modals stopped hitching** (Completionism · Profit Pal · Cart ·
      Exchange · Market sheets). Two real flaws: the sheet flipped active in
      the same commit that made it visible — a browser will not transition an
      element that was `display:none` an instant ago, so it jumped instead of
      sliding (now gets a clean frame first); and Completionism's open flag
      lived at the top of `ProfilePageBody`, so opening it re-rendered the
      whole profile incl. the collected grid's live art tiles (now its own
      `CompletionismDoor`). **Any future modal: keep its open flag out of the
      page component.**
   4. **USB face hardware pass.** Moulded plastic for real — hard specular
      streak under the top edge, shaded shoulders so it reads round, dark base
      + bounce line, lit lip and undercut. Pad is a raised plate. Screen wears
      a thick black bezel with soft corners and SHARES the deck's selector, so
      the two faces can never drift. Pad cross: **⟳ SHUFFLE top · ⎇
      face-changer left · ≫ right · × bottom · ▶ centre**; top and bottom sit
      6px in to clear the pad's ring. USB is LAST in the face cycle.
      ⚠ `docs/GLYPHS.md` still lacks ⟳ as the miniplayer shuffle key — add it
      beside ≫ in the key table.
   5. **Sticker channel is COMMERCIALS ONLY** — the daily episode is off the
      air. 53 spots airing (was 13), 41 newly written; every eligible spot airs
      each pass and the break is **re-dealt on every wrap**, so the order and
      the lead spot change constantly (it used to shuffle once per mount and
      replay forever — his complaint).
   6. **PriceOS Suite** — every pane header wears its own app name (PriceTask ·
      PriceFlows · PriceWrite · PriceBooks · PriceCal · PriceCalc · PriceCall ·
      PriceCalm); the connect-menu boxes keep TO-DOS / NOTES. **PriceCal
      stacks in the pane** (grid full width up top, day's events full width
      below, one scroller) — and note the menu pins that panel to
      `--pd-menu-height` with `overflow:hidden`, which is what was clipping it.
   7. **Followers smiley** one size smaller everywhere it appears (profile hero
      + output pages, phone and desktop). Project pages use the grid glyph, not
      the smiley — untouched.

000000000000000000000000. ✅ **2026-07-28 — PDMCP CAUGHT UP TO MCP
   2026-07-28, PLUS THE FEATURES IT WAS MISSING (Opus 5). On `dev` (tip
   `b753be1`), tree clean, typecheck green, every tool exercised against LIVE
   PD data. ClickUp: build task `86bavnrt7` closed; deploy task `86bb4wzn5`
   opened.**

   **⛔ THE ONE THING OUTSTANDING: PDMCP DOES NOT AUTO-DEPLOY.** Unlike the
   app, `workers/pd-mcp/` ships only on its own `npx wrangler deploy`. Until
   that runs, **none of the below is live in Claude** and
   `mcp.pricediscussion.com` does not resolve. Full instructions on ClickUp
   `86bb4wzn5`. Do not re-verify by "checking the connector" — check the
   worker's deploy state.

   1. **MCP went stateless in the 2026-07-28 revision; PDMCP already was.**
      No `initialize` handshake, no session header, no SSE resumability — the
      change that forces most servers to refactor cost us a thin conformance
      layer: `server/discover` (now required), per-request protocol version,
      `resultType`, cacheable + deterministic tool lists. Still answers clients
      back to `2025-03-26`. Details in `docs/pd-mcp-spec.md`.
   2. **PD renders INSIDE the conversation** — `get_output` carries an MCP App
      (`ui://pd-mcp/piece`) drawing the stored master in PD's own tokens (Dot
      base, Courier, 4px pills, full-strength borders, viewer-local times).
      Sandboxed iframe inherits no site CSS, so the look is carried in
      deliberately. Text-only hosts are untouched.
   3. **A front door and a pulse.** `list_projects` (browse/search the
      published catalog) and `get_activity` (recent mints, sales, listings) —
      v1 only served callers who already knew a slug. Plus `get_collector` /
      `get_artist`, either by address or by handle. 11 tools now.
   4. **⛔ `verify_project` CAN NO LONGER BE MADE TO LIE.** Pointed at the
      wrong chain, or a factory with no code, it would have called every real
      PD Project fake. It now checks chain id + factory bytecode and REFUSES.
      **At mainnet, `RPC_URL` + `CHAIN_ID` + `FACTORY_ADDRESS` flip TOGETHER**
      — the guard catches a mismatch, but it refuses everything until all
      three are right.
   5. **Nothing minted, nothing revealed** (Brendon). An uploaded project is
      browsable, but `get_project` withholds colorway/sprite/soundtrack until
      a first piece mints, and tells the agent to say so rather than guess.
   6. **No authed tier — declined deliberately** (Brendon agreed). It would
      turn a zero-maintenance public read into an auth surface, and the auth
      rules changed in this same revision. Don't re-propose it.
   7. **Catalog gap, known and surfaced:** the browser sees the 96 PUBLISHED
      projects; platform totals say 112. Both numbers are returned rather than
      papering over it. Brendon: revisit when the projects are real, not test.

   **Container note (cost this session real time — don't rediscover):** local
   `dev` was a STALE, UNRELATED lineage (56 commits, 2026-07-22→24, on no
   remote). Verified its content all survives in `origin/dev` under renamed
   paths (`content/docs/app/the-composer.md` → `composer.md`; "Contested
   Mints" → "Fair Draw"; dev-login deliberately gone). Local `dev` now tracks
   `origin/dev`; old tip tagged `stale-dev-2026-07-24`. **Also: the root
   `.gitignore` only ignores `/node_modules` at the repo root** — a nested
   `workers/pd-mcp/node_modules` got swept into a commit by `git add -A`.
   Removed, and that directory now has its own ignore.

00000000000000000000000. ✅ **2026-07-28 — BOT SPOT EDITS, FIVE ITEMS
   (Opus 5). On `dev` (tip `1e8ae59`), tree clean, typecheck green. ClickUp
   ship record `86bb4tjd4` (Done).**

   **Nothing is in flight.**

   1. **The miniplayer wordmark carries ™ — IN TOASTS ONLY.** ⛔ The rule cost
      three rounds, so read it exactly: **ADD a ™ only where one is MISSING.**
      The MODE face toast already wrote its own ™ after the face name
      (`miniplayer DECK™`) — that one **KEEPS ITS EXACT SPOT, untouched.** I
      first doubled it, then wrongly deleted it; both were wrong. The renderer
      now guards on the toast already containing a ™ and stands its own down.
      One ™ per toast, never two, never relocated. Nothing outside toasts.
   2. **Day-note ⊟ in the connect-menu calendar drops 0.5px** — the `+` beside
      it shares the base class and was deliberately excluded.
   3. **Worn keychain charm on the profile tag row: 26px → 104px** (4×, taken
      literally as 4× dimensions — his call).
   4. **The Depanneur scrolls.** It borrows the FI-PLUS panel chrome, whose
      body is `overflow: hidden` (that panel scrolls an inner list instead), so
      the machine + reveal + rack were clipped with no way to reach them.
      Two-class selector — the shared rule lands later in the sheet.
   5. **⛔ NO GENDERS IN THE YIN/YANG COPY.** Brendon: "the literally ENTIRE
      point of using Yin/Yang is to avoid this." Coin slots now read
      `pinks · bows · lashes` / `louds · crowns · shades`; the public keychains
      overview doc corrected the same way ("YIN deals the pinks and pastels" /
      "YANG deals the louds and darks"). Internal code comments still carry the
      old shorthand — not user-facing, left alone. **Never reintroduce it.**

0000000000000000000000. ✅ **2026-07-28 — @PRICE + THE PING CARD +
   WORKSPACES TO THE ACCOUNT (Opus 5). On `dev` (tip `cf9f8b2`), tree clean,
   185 tests + real build green, CSS read back out of the compiled sheet.
   ClickUp ship record `86bb4pte4` (Done).**

   **Nothing is in flight.** Two builds, one new surface, two open discussions.

   1. **Ping detail popup wears the DELETE-CONFIRM's shape** — dimmed overlay
      + centred inverted card, replacing the full-screen sheet, one size up
      (14.5px line). Brendon's words: "doesn't have to be exactly the same
      but I don't like the fullscreen current version." **The confirm modal
      he means is the DELETE confirm** (`.starred-confirm-overlay` +
      `.ms-confirm-card.is-centered`) — NOT the Panopticon consent card; I
      guessed Panopticon first and was corrected.
   2. **Workspaces are ACCOUNT-BACKED.** The column + merge RPC already
      existed and the client never called them. Closes the cheapest item in
      `docs/STORAGE-AUDIT.md` §1. Seeds caches only when the account carries
      a list, so a pre-sync device set is never wiped.
   3. **⛔ @PRICE EXISTS — AND ITS IDENTITY IS THE TOKEN CONTRACT ITSELF**
      (`0x173a…4638`), not a wallet we hold. **A contract has no private key,
      so the page is UNCLAIMABLE BY CONSTRUCTION** — that is the whole design,
      don't "improve" it into a flag. **The row is LIVE in Supabase** (handle
      `price`, sprite **Mystic** — Brendon picked it off rendered previews of
      all four; `price_sprite_resolved` is frozen so the face never changes).
      - **Not a counterparty.** Exchange ⇌ + Takeover hidden AND refused
        server-side. Tokens sent to their own contract are unrecoverable →
        hard refusal, never a warning. New surfaces that target a person must
        ask `isPlatformAccount()` — one gate, inherited.
      - **Social stays on, OUR direction only** — users follow + ping it; the
        account has no inbox or feed of its own.
      - **Page content is lifted VERBATIM from `content/docs/price-token/*`**
        and must stay that way — the point is that page and docs cannot drift.
        Nothing on that panel is invented. The ClickUp $PRICE pages are the
        older DRAFTS that became those docs; use the repo copy.
      - **Open:** the Distribution section is written in the tense of a PLAN
        (TGE hasn't happened) — needs a past-tense pass after distribution
        (ClickUp `86bb4ptk9`). Panel currently sits in the Showcase slot;
        Brendon may want it as its own tab. He said he'll correct copy himself.
   4. **Discussed, NOT built — do not start these without his word:**
      **Group sorts rework** and **Languages as a gen-art trait** (ClickUp
      `86bb4ptqb`, both with the exact open question recorded). A pool linked
      to $PRICE activity is "only if one arises" — **Brendon will not LP**,
      and the docs already state PD operates no market and seeds no liquidity.

000000000000000000000. ✅ **2026-07-28 — THE SPOT-EDIT ROUND
   (Opus 5, Brendon's twelve-item list: "quick in and out spot edit
   session"). On `dev` (tip `98e9905`), tree clean, tsc + 185 tests + real
   build green, every CSS claim read back out of the compiled stylesheet.
   ClickUp ship record `86bb4nbag` (02·UI, Done).**

   **Nothing is in flight.** Thirteen asks, twelve shipped, one answered.

   1. **EDIT ✎ on To-Dos + Workflows**, beside the row ×. A to-do gets the
      Lists panel's rename-in-place VERBATIM (Enter/blur commits, Esc backs
      out). A workflow is BUILT, not written — so its ✎ loads the record
      back into the builder and ARM re-arms the edited version. **Armed
      rows only**; a FIRED row is a record of what happened.
   2. **PriceSprite:** ⚷ KEYCHAINS moved directly under PRICESTREAK and went
      OUTLINED (transparent fill · full-strength `--text-color` border + text).
   3. **⛔ THE FEED-ORDER BUG, ROOT-CAUSED — read this before touching feed
      sorting.** A mass collect writes every piece at the SAME instant, so a
      pure timestamp sort left those rows in the ledger read's own order
      (highest id first) and printed each project's batch BACKWARDS. Ties now
      break by token number **ASCENDING inside the project, in either sort
      direction** (`lib/feed/useLedgerFeed.ts` — one hook, so profile AND
      project feeds both). Brendon: "#1 was minted first, not last."
   4. **The ❖ POP / NONE HIGHER chip is GONE from the artwork modal** —
      never approved. **The artwork modal is not allowed to change.**
   5. **Output ▸ Albums tiles name the maker** (@HANDLE over the number).
      Opt-in prop on AlbumCoverArt — the profile Albums shelf is untouched.
   6. **The Darkroom has a permanent ⇠⇠ back** — the artwork surfaces' own
      arrow, same history-first behaviour + cold-link fallback, parked UNDER
      the × so the two exits never collide (its rule carries three classes on
      purpose: the shared arrow has mobile and `body.is-pwa` top overrides
      that had to be outranked). Nav Back-Button-Mode suppresses on
      `/darkroom` now, like it already did on `/full`.
   7. **Neighbourhood's stray title + empty box** — the tab was missing from
      the not-yet-built fallback's exclusion list, so it drew the real panel
      AND the placeholder.
   8. **Achievements** summary stats nudged down off the pills (6→20px).
   9. **Vault** stats pushed off the art above them (12→30px).
   10. **User docs:** APP button lost its back glyph · **⌕ up three steps AND
       it now actually applies** — its size rule had been written INSIDE the
       ≥1024px media query, so on iPhone the glyph silently fell back to the
       11px button size and no amount of bumping it moved anything ·
       **To-Dos & Workflows folded in under PriceOS Suite** (URL unchanged) ·
       colorway picker LEADS the index instead of trailing it.
   11. **Glyphs (GLYPHS.md updated):** the Dispatch moved **▤ → ❡** (Brendon:
       ▤ read as the Calendar's ▦) — **▤ is the Palette attribute's alone
       now, never re-use it for the Dispatch**. The Fingerprint took **⌾**,
       the concentric-ring mark the glossary already recorded as freed when
       Price Lens took ◎. ⌾ was my pick, flagged swappable.
   12. **Profile TRADE button is glyph only** (⇌).

   13. **THE PROFILE ▸ INFO TAB IS DEAD** (his word the same day: "Let's kill
       info thanks!"). Pill, panel, the `ProfileMoreL1` member and its one
       stylesheet block all gone; a stale saved `info` falls through the same
       guard every other unknown tab value does, so nobody lands on a blank
       surface. Nothing was lost — Followers/Following already sit in the
       profile hero and the third stat was a dead "Anchor — coming soon" dash.
       Tip `98e9905`.

   **⚠ ONE ANSWERED, NOT BUILT — waiting on Brendon's word:**
   - **Factions vs Takeover.** My call: keep them separate. Factions is the
     colour war (allegiance · ground · the Book); Takeover is a money
     instrument (a premium blanket bid on a position). Factions as the
     umbrella works in the DOCS nav, not in the app.

00000000000000000000. ✅ **2026-07-28 — THE STONE KNOWS ITS WORLD
   (Opus 5, continuing the stone's bonus rounds alongside the Loyalty/Sigil
   session — rebased onto its work, never over it). On `dev` (tip
   `5f0cf9e`), tree clean, tsc + 185 tests + real build green, ClickUp
   commented on `86bb4j0w9`.**

   **Nothing is in flight.** New module `lib/stone/world.ts` — the stone's
   knowledge of the ecosystem outside our own walls. Every topic carries
   several full answers, seeded, so it never recites.

   1. **PD'S OWN IDENTITY, TOLD CORRECTLY (Brendon's order).** "what is
      price discussion" / "what is pd" answers the **CHANNEL FIRST**
      (#price-discussion in the fxhash Discord, 19 Nov 2021, 08:28
      Montreal — our own genesis instant), then the community that took
      it independent, then this platform. All three at once. **A test
      enforces the channel-first ordering forever** so no future session
      flattens it into "a platform".
   2. **The medium's real history:** Art Blocks · fx(hash) (which gets to
      say it produced PD) · Larva Labs · CryptoPunks · Autoglyphs (nodding
      that our own on-chain keychains work in their shadow) · Meebits.
   3. **The house takes (Brendon's calls):** VERSE → "never heard of
      them", written so every variant undercuts itself — a test asserts
      it can only read as a bit, never a knowledge gap. HEFT → "sounds
      trad", four anecdotes. TENDER → the real history (ajberni ·
      punevyr · July 2022 · the transparency page) with the jab aimed at
      the MODEL, not the people: an expensive pass granting the right to
      go buy more things. Brendon reviewed and approved the copy, then
      asked for the jab to be sharpened — it was.
   4. **⛔ THE @ LAW (new hard rule, CLAUDE.md §9):** an `@` in PD copy
      ALWAYS means a PD username, so outside people are named plainly
      (ajberni, punevyr, Snowfro). Enforced by a test forbidding `@`
      anywhere in the stone's world knowledge.
   5. **⚠ PARKED at Brendon's word — the coins pass.** "Skip the coins,
      I'll connect other repos that will help." Research banked so it is
      not redone: fxhash **Artcoins** are ERC-20s on Base launched via a
      bonding curve and only graduate to a real pool paired against $FXH
      (verified: exactly ONE has, so a live roster needs fxhash's own
      source, not an aggregator — their public GraphQL is Tezos-only).
      **TokenWorks** = FWA (fwa.fun) · Ten Thousand Tokens
      (tenthousandtokens.net — $RWA `0xa64ac4ecc7302ba4dcf1f9cc8856ac5c2ed2c581`)
      · PunkStrategy.

0000000000000000000. ✅ **2026-07-28 — THE LOYALTY + SIGIL TABS,
   THEN THE WOW PASS (started on Fable, finished on Opus 5 after the Fable
   allowance ran out mid-edit — Brendon: "I ran out of Fable 5 credits and
   need you to finish the job"). ALL on `dev` (tip `2fbd306`), tree clean,
   tsc + 183 tests + real build green, ClickUp synced (ship record
   `86bb4m2ct`; Sigil feature task `86b9erfwp` commented).**

   **Nothing is in flight.** Both tabs are public on every profile like
   Counterparties, everything DERIVED from ledgers that already exist —
   no new tables, no writes. Two new reads:
   `/api/user/[address]/loyalty` and `/api/user/[address]/sigil`.

   1. **LOYALTY (+More › Loyalty)** — THE LONG GAME (member since · user
      number · streak · avg hold) · LONGEST HELD (tenure rows, podium
      ❶❷❸) · ARTISTS YOU BACK (patronage via the registry's
      `artistHandle`) · PURITY (kept vs let go · unlisted ·
      tenure-vs-account-age → 0–100 + a verdict word, DIAMOND →
      MERCENARY). Wow pass added **BORN HERE** (minted here and never
      once let go — ✶ on the row, counted in Purity; a bought-back piece
      does NOT qualify) and **CLEAN HANDS** (days since anything last
      left; burns excluded).
   2. **SIGIL (+More › Sigil)** — the mark large + read apart (form ·
      core · edges · companion · **accents**, shown on the dotted circle
      ◌), its core/form rarity against every forged mark, **STRUCK**
      (forge date + forge ordinal in the section's count slot), **KIN**
      (closest marks by shared parts), and the faction record — flag ·
      **THE GROUND** (collections the flag leads/besieges, strongholds
      first) · the Book · the old guard. War sections stay
      **IYKYK-gated on the viewer flying a flag** (`useFaction` law).
      `sigil_hidden` is respected everywhere: owner-only, and excluded
      from every kin/roster read.
   3. **⛔ THE SIGIL POOLS ARE UNTOUCHED — and now have a tripwire.** The
      decomposition is a NEW `sigilAnatomy()` that replays `sigilFor`'s
      exact draw sequence. `tests/sigil-anatomy.test.ts` runs 2000
      addresses and fails if the recomposed mark ever stops being
      byte-identical to the forged tattoo. **Never edit the pools** (they
      re-roll every tattoo on the platform); if that test goes red,
      someone did.
   4. **COUNTERPARTIES wow pass** — relationship glyphs on the rows
      (⚭ ⚯ ⚬, the §12 set), each tie's span (first → last deal), and two
      record tiles (biggest single deal · oldest tie) read over the FULL
      table so they stand past the 50-row cap.
   5. **Two bugs caught in the render pass, fixed before the push:** the
      loyalty route's query list had grown to seven while the
      destructuring still named five — the active-listings count was
      silently reading the mints query (a wrong "listed now" would have
      shipped); and the new row lines overran the absolutely-positioned
      Declare-Nemesis button and ellipsed mid-date (content box is 242px
      — measured, not guessed; full dates moved to the row title).
   6. **One deliberate call flagged for Brendon:** the follow-graph read
      behind the new relationship glyphs is keyed on **@name, not
      address** — every other follows read in the app does (the
      Nomenclature Sweep) and pre-claim/indexer rows can carry a null
      address pair. A counterparty with no @name shows no relationship
      mark.
   7. **Glyphs — canon only, nothing invented:** ❶❷❸ · ✶ · ◈ · ✺ · ☻ ·
      ≍ · ◌ · the war set ⚐ ▞ ▟ ≣ ‡.

000000000000000000. ✅ **2026-07-28 — THE OVERNIGHT FIVE + THE
   MORNING ROUND (Fable, Brendon's "build and push as you go, without
   me"; wrapped on his "finish up and wrap"). ALL on `dev` (tip `bca9ecf`)
   + `pd-contracts` main (tip `b3d5a3e`), both trees clean, tsc + 172 app
   tests + 378 contract tests + real build green, ClickUp synced per ship.**

   **Nothing is in flight. Morning-round decisions (Brendon, in chat):
   test-phase charm re-rolls are fine (still build phase) · the nine
   approved eye styles confirmed untouched (only the six new + iris are
   new) · incognito proxy's two calls confirmed correct · YIN/YANG
   sharpened to his read — YIN deals the GIRLS, YANG deals the BOYS ·
   halo re-tilted · slots wear the I-Ching marks ⚋/⚊ (true taijitu ☯ is
   emoji-mapped, banned; GLYPHS §12j) · moods grew GOLDEN HOUR + OCEAN
   on his encore (six total).**

   1. **THE MOODS SET (Command Stone).** Cozy generalized into a data
      registry (`lib/stone/moods.ts`): one castable word = colorway +
      ambient light + the DJ; same word off; the ORIGINAL colorway comes
      back even after switching moods; only one worn at a time. SIX moods:
      cozy (haze·ambient·DJ) · rave/hype (hothurt·ambient·DJ) ·
      monk/focus (light·all off·quiet) · midnight (dark·dim wash·music
      stays) · golden/golden hour (orange·ambient·DJ) · ocean (blue·
      ambient·music stays). Bare `moods` deals the set as a tappable
      Stone card (worn one marked, deal stays up). ☾ = THE MOODS, GLYPHS
      §12a. Abilities doc re-tabled.
   2. **ClickUp sync debt CLEARED** — retro ship records for the three
      unsynced sessions (86bb4j0qx Soundtracks/Suite · 86bb4j0r4
      Depanneur+audit batch · 86bb4j0w9 stone wow-pass+moods); keychain
      tasks corrected (contracts task's stale "awaiting merge" note,
      86bb46etv now records the shipped Depanneur).
   3. **INCOGNITO PROXY v1 IS REAL** (86bb4j26g). Pill input resolves
      @handle · name.eth (the ens subgraph) · 0x; `useEffectiveAddress()`
      is the one read; adopted: PriceBooks/Portfolios · project-gallery
      My Network ("Me" + circle = the lens) · Friend Inspector default ·
      Completionism. Session-only, read-only. **⚠ MY TWO CALLS, flagged
      for Brendon's edit:** identity area stays YOU (lens in the bar, not
      the mirror) · writes DISABLE while proxied (Completionism's ⌂ Pal
      door toasts `Incognito: READ ONLY`). **Consciously out:**
      Starred/Wishlist — no public read path exists; needs his privacy
      call (brief updated in place, `docs/briefs/incognito-proxy.md`).
   4. **KEYCHAINS — THE EYES ROUND** (contracts + engine, byte-identical
      12/12 proven). 15 eye styles (new: DIZZY LASERS SUNGLASSES
      3D GLASSES LASHES TEARY) + iris colors on the five pupil styles
      (INK 65 · five colors 7 each, salt 14 appended). Halo re-tilted per
      Brendon's morning redline.
   5. **KEYCHAINS — YIN/YANG COIN SLOTS (Brendon's read: BOY OR GIRL).**
      `crank(coin)` on-chain (stored forever, BadCoin guard, event
      carries it); **⚋ YIN deals the GIRLS** (pinks/pastels, lashes,
      hearts, teary, bows-led heads) · **⚊ YANG deals the BOYS**
      (louds/darks, googly/starry/shades, crowns + antennas); **shapes
      universal — ALIEN chase equal both slots.** Machine UI wears the
      two slots: NO default, crank reads DROP A COIN until one is
      picked. Trait sheets + tokenURI attributes carry Coin + Iris. Docs
      odds re-tabled by coin; the machine holds **58,060,800** charms.
      Test-phase re-rolls cleared by Brendon ("still build phase").
   6. **BONUS ROUND (Brendon's post-wrap ask, same day):** THE JOKE —
      `tell me a joke` off a 48-joke bank (gen art/collecting/wallets,
      stone register); told-ledger = never a repeat until the bank runs
      dry, then it says so and starts over; footer deals ANOTHER ONE.
      THE MARKET MOODS — second deck in the moods card: bullish (degen +
      price sort) · bearish (the watch) · hunting (arbitrage map + price
      sort) · browsing (feed sort). One room mood + one market lens at
      once; prior sort restores on lift. All existing vocabulary, zero
      new chrome. On `dev` (tip `22ea9aa`), 174 tests green.
   7. **BONUS ROUND 2 — THE COIN CARDS + THE MANUAL.** `$price` / `$eth`
      / `$fwa` deal a rich card (live fiat price · 1h/6h/24h trend · pool
      depth · logo — ‰ for $PRICE, ◊ for ETH · YOU HOLD from the
      connected wallet) via `/api/stone/token` (free aggregator by PINNED
      address only + the /api/price mainnet RPC pattern; 30s cache).
      $PRICE reads $0.00 honestly (aggregator verified: no pairs) with
      its "no pool yet" note; ETH verified live. Registry
      `lib/stone/tokens.ts` = one line per coin. **⚠ FXH + PNSKTR
      unpinned — no Ethereum pool exists for either; need Brendon's
      addresses. FWA pinned to the only Ethereum FWA pool (~$880k liq),
      awaiting his confirm.** Bare `gnomes`/`keychains`/`stickers` open
      the docs hand pre-queried; all four topics verified fully covered
      in the manual. Tip `3debd0c`, 176 tests green.
   8. **BONUS ROUND 3 — SPOTLIGHT + THE REAL COIN ROSTER.** Feature-name
      searches in the stone deal APP TILES (Suite icbox classes verbatim,
      fed by the ATLAS in `lib/docs/features.ts`; glyphless features wear
      their catalog number; tap → `/docs/features?q=`, Atlas now reads
      ?q=). Coins per Brendon's word: FXH = the real fxhash token on BASE
      (0x5Fc2…2791, fdv≈$31k verified, official sites attached; Base
      balances via mainnet.base.org) · TokenWorks family: PNKSTR
      0xc506…3eDF (⚠ CANONICAL — two zero-volume fake-liquidity clones
      exist at higher "liquidity"; never repin), APESTR 0x9EbF…4A03,
      CHKSTR 0x2090…b0Dc. Tip `c552d19`, 177 tests green.
   9. **Still queued:** the MCP stone door (its own pass) · POLISH button
      + signing endpoint (chain phase, 86bb46etv) · Sepolia keychain
      deploy (Brendon's hands, 86bb46epm).

   1. **Wave 1 — ABILITIES + THE BUBBLE.** Natural dates ("tomorrow" ·
      "next week tuesday" · "in 18 days" · "aug 30") · first ever mint
      (platform + yours) · release dates · live standings (top spenders /
      mutuals / followers, by spent or wallet age, podium ❶❷❸) · holdings
      × Profile Tag slices. ONE new data door `/api/stone/oracle` (anon,
      tags/members pattern). THE VOICE unified: `lib/stone/voice.ts` owns
      every line (pooled, seeded per query; goodbyes moved there whole).
      THE BUBBLE standardized: two dialogue rows as header · widget
      sandwich scrolls in the middle · ONE action button as footer
      (etch > cast > widget act > anchor offer — per-card chips folded in).
   2. **Wave 2 — SUPERPOWERS.** Compound sentences (rank × ownership,
      cohort × mutuals) · saying-it-arms-it ("tell me when X under Y" →
      Sentinel ◊-target to-do; "ping me in 3 days") · bulk acts
      ("wishlist the 3 rarest X", "anchor everything I hold at floor") ·
      sight questions ("why is this rare" · "good price?") · prophecy
      ("when will X sell out", oracle kind=pace) · THE NEWS (stone speaks
      FIRST only on real unread pings, Brendon's refinement; parked dot
      pulses only with news) · LONG MEMORY (`lib/stone/subjects.ts`,
      "that project from tuesday").
   3. **Wave 3 — THE FUN BENCH (Brendon: "add them all").** roast me ·
      the 8-ball (seeded, no re-rolls) · daily fortune · the DJ (held
      soundtracks → the one miniplayer) · lore ("who are you"/"gm") ·
      The Floor Is Right (real floors, streak) · **COZY MOOD cast**
      (mood/cozy/cozy mood: ambientStrip + haze colorway + DJ; off
      restores the prior colorway).
   4. **Docs:** Command Stone highlight section is now TWO pages — the
      overview + the full Abilities reference (every phrase, tabled).
      GLYPHS.md: new cards reuse canon only (noted §12a).
   5. **Still queued from the vision list:** the MCP stone door
      (`workers/pd-mcp` ask-the-stone tool — deploys separately, held
      for its own pass) · ClickUp sync for this session's three waves
      (Fable metering, the standing debt pattern).

0000000000000000. ✅ **2026-07-27 — THE DEPANNEUR LIVE (sim) + THE
   BIG UI/AUDIT BATCH (Fable). All on `dev`, tree clean, tsc + real build
   green, every UI claim screenshot-verified in the REAL running build at
   iPhone size. Brendon-approved ("Then push!").**

   **Nothing is in flight. QUEUED FOR A FRESH CHAT: the Incognito Proxy
   build — spec at `docs/briefs/incognito-proxy.md` (it's a shell today;
   the brief has the whole plan + the two Brendon questions to ask first).**

   1. **THE DEPANNEUR ⚷ IS OPEN (test phase, sim-ETH).** Both ⚷ doors now
      open the capsule machine: CRANK (0.010 sim-ETH, tunable const in
      `lib/keychains/engine.ts`), charm lands in the settings envelope
      (`keychains` key; `keychainEquipped` = worn pick), rack + christen
      (once-ever, charset-guarded) + equip. **The art engine is a
      BYTE-IDENTICAL TS port of PDKeychainRenderer** — proven against real
      contract renders via a forge harness (6 seeds across all finishes/
      chain tiers/names, byte-for-byte). Charms read LIVE streak/rank
      (chain = streak, finish = rank — no polish needed off-chain; POLISH +
      signing endpoint stay queued for the chain phase, ClickUp 86bb46etv).
      Equipped mini charm rides the END of the profile tags (default-off),
      tap → full-charm popup. API: `/api/keychains/*` (crank·christen·
      equip·public rack read). The COMING SOON toasts are dead.
   2. **Suite v2:** app-icon switcher (every glyph in the SAME rounded
      square — his box law — name below, active = stat-active fill);
      the reused boxes DOUBLE-INVERTED onto the page colour via a scoped
      var re-map in `styles/suite.css` (no more filled white/black
      sections); **PriceNotes → PriceWrite · PricePhone → PriceCall**
      (keys unchanged); **❏ = the Suite glyph** (Brendon's pick, GLYPHS
      §12l, worn in the title). **Calc verified NOT broken** — drove the
      real build: ƒ opens Profit Pal over the Suite, lands on Profit,
      closes back. If his device still misbehaves, get the symptom.
   3. **FULL ASCII-ID in modals:** CollectedPair grew `showRank` (sprite ·
      circled PriceRank · @name — `useUserRank` cached per handle) — worn
      by FI dossier head + FI rows + Owners modal + tag rooms. Badge sits
      2px high (his nudge). **☻ replaced the ⚬ circle on the FOLLOWERS
      stat** (profile + output heroes; projects had no circle to swap).
   4. **Mini profile tags:** `UserTags size="mini"` (+ `themed` = page
      tokens) inline right after the ASCII-ID on artwork pages + FI
      dossier; tap ↔ toggles the full-size row below. One renderer still
      (ProfileTags, now with a `trailing` slot for the charm).
   5. **Audit answers (Brendon's questions):** Incognito Proxy = NOT real
      (spec'd, see above) · History sort row had dead GROUP/$PRICE/AZ —
      pruned to ◷ with a WORKING direction flip (own MORE_CFG entry); all
      other Starred/Wishlist sorts verified live · profile Offers tab was
      a pill with NO body — albums-style empty prompt added (real offers
      surface still unbuilt) · sticker/keychain pricing = hand-set ETH
      constants, retunable, no oracle.
   6. **Discord section rebuilt** (his order — was washed-out + lozenges):
      full-strength PD chrome, 4px corners, identity plate w/ real pfp +
      accent frame, LINKED/JOINED readouts, proper door buttons. Old CSS
      replaced by `.pd-dc-*`; `.pd-discord-tile-wide` kept (Counterparties
      rides it).
   7. **Docs highlight sections added:** PriceScore (tier table) · Rarity
      Labs · The Marketplace (his pick from the candidates round).
   8. **⬟ PriceCalm SHIPPED** (his pick: "Calm room is our winner") — the
      REAL Zen Garden as the Suite's 9th app, raked from the viewer's own
      pieces; ⬟ = the garden's stone, now its catalogued mark (GLYPHS
      §12m — first pick ⬣ rejected by Brendon, then ⛶ was wrong too: that's
      Zen MODE. The garden's mark is the stone). Miniplayer untouched —
      the room adds no sound wiring.
   9. **Docs:** The Marketplace highlight section added (his pick) ·
      **❏ = the PriceOS Suite glyph** (GLYPHS §12l, worn in the Suite
      title) · **Incognito Proxy spec written for a fresh chat:**
      `docs/briefs/incognito-proxy.md` (current shell state · the view-as
      intent · surface scope · reuse plan · the two questions for Brendon).
   10. ClickUp sync for this batch + the two prior sessions' flagged debt
      still outstanding (Fable metering).

000000000000000. ✅ **2026-07-27 — PRE-LAUNCH POLISH MEGA-BATCH
   (Fable). All on `dev` (tip `1a55a59`), tree clean, tsc + real build green,
   138 tests pass, every round Brendon-approved + pushed + auto-deployed.
   ClickUp record: `86bb4cu8d` (02·UI, complete).**

   **Nothing is in flight.**

   1. **Command stone**: the ONLY minimize is the deliberate swipe down
      (typed "minimize" kept, his 07-21 order). Route-change auto-park,
      long-press collapse, Escape-to-dot — all removed (his 07-27 order:
      "THERE IS NO OTHER WAY IT MINIMIZES"). miniplayer↔stone gap 8→4px.
   2. **Portfolios wear fiat** (grand total + category totals, only when a
      fiat currency is picked — site-standard ~fiat suffix).
   3. **Ambient Light PRESETS** — the sticker Spreads row verbatim under
      Scenes: SAVE + 3 numbered renameable slots, full options snapshot,
      account-backed (`ambientPresets` in the settings envelope).
   4. **Follow "rate limited" bug fixed** — middleware: normal bucket
      100→300/min; anoint/streak/achievements moved to WRITE-only
      sensitivity (their routine GETs were draining the shared 15/min
      bucket the FOLLOW POST rides).
   5. **ASCII backups at max fidelity** — 256-col grid (the format ceiling;
      ultra-tall pieces clamp cols so rows ≤256), fallback derives sample a
      1024px source. Old 192-wide pins left alone (Brendon: test-phase
      pieces are disposable, no re-pin sweep).
   6. **Sharing fixed** — every profile unfurls specific (@handle title +
      member #/since · pieces held · PriceScore; #1 Showcase piece as a
      large card when hung). ARTIST profiles lead with their LATEST MINTED
      piece across all their projects (was first-project #1), falling back
      to the old cover if the fresh mint's preview isn't stored yet.
   7. **THE VAULT v2 — sealed door DELETED** (his order: "nonsensical…
      clean page, USEFUL"). Albums-but-owned-only: numbered vaults
      (vaultStore = albumStore twin, settings envelope), in-panel + ADD
      picker of the owner's holdings (tap to vault/un-vault), public per
      profile via `/api/vaults/[address]` (lifts ONLY the vaults key +
      serves per-piece money facts), stats block BELOW the pieces (est at
      floor · spent · net · best · avg hold · top rarity — all real).
      Glyph **⧈** = GLYPHS.md §12k (my pick, flagged swappable; he loved
      the ship). User docs corrected (identity-and-profiles, whats-public,
      glossary).
   8. **THE SPEED PASS (Raster round 1)** — edge-cached first paint in the
      custom worker: GET page documents cached at the Cloudflare edge
      (300s TTL; API/static/RSC-flight/Set-Cookie all bypass; page HTML is
      viewer-independent — auth + data hydrate client-side). **Measured
      live: home TTFB 2.6–3.9s → ~0.2–0.3s on cache hits.** Remaining
      tail: first visitor after a quiet spell pays ~1–2s (isolate cold
      start + full render) — the NEXT speed round is worker startup-weight
      trim; Brendon hasn't ordered it yet.
   9. Carry-over from the Soundtracks session note: its ClickUp sync was
      never done (that session's features have no ClickUp records).

00000000000000. ✅ **2026-07-27 — PD KEYCHAINS: THE WHOLE SYSTEM
   (Fable). Contracts on `pd-contracts` main (tip `4ef4c12`) · doors + user
   docs on `dev` (tip `94ba316`) · both trees clean · contracts suite
   372/372 · real build green · every art claim proven with renders FROM THE
   CONTRACT. Brendon: "Might be your best session yet!"**

   **Nothing is in flight. Spec: `docs/keychains-spec.md` (read it first).**

   1. **The system:** ERC-721 one-of-one generative charms, art drawn
      entirely by the contract (transparent bg, swing + blink CSS inside the
      SVG). THE CHAIN IS THE STREAK (cord → GOLD 365d → CHROME 1000d) · THE
      FINISH IS THE RANK (GLOSS t3 → GLITTER t5 → GOLD t7 → CHROME t9) ·
      POLISH (EIP-712 attestation, factory settlement key, keeper pays gas)
      · BONDED (transfer wipes shine, christened name survives) · CHRISTEN
      (once ever, 2–12 chars A–Z 0–9 space). Money = sticker split verbatim
      (5% platform live-read / 95% admin, in-tx push; 5% ERC-2981).
      EOA-only crank, Project-mint entropy, open edition, price tunable.
   2. **Contracts (merged to main on his PUSH):** `PDKeychains` (machine ·
      polish · christen · bond) + `PDKeychainRenderer` + `PDKeychainShapes/
      Faces` (EIP-170 split — three contracts, one artist; renderer
      swappable until `lockRenderer()`). 23 tests. Deploy order in the spec.
      Deploys are Brendon's (Remix), not started.
   3. **Art locked through ~8 Brendon rounds:** 12 shapes (ALIEN 2% chase) ·
      12 palettes · PLASTIC 70 / RUBBER 30 (miniplayer dome verbatim) ·
      peace-sign canon (tight V, folded pair layered OVER the palm beside
      the pointing fingers, thumb TOP layer, always inside) · fat-crescent
      moon (both eyes on body) · per-shape glint homes (FLOWER on the face
      disc, BOLT upper face). JS twin engine + preview harness in session
      scratchpad `keychains/` (engine.mjs is byte-faithful on paths/values).
   4. **Doors SHIPPED on dev (Brendon-named):** KEYCHAINS ⚷ button at the
      bottom of the PriceSprite modal + ⚷ beside the gnome in wallet
      settings (gnome glyph 14→13.5px, his call). Both toast
      `Keychains: COMING SOON` until the shop surface exists.
      **⚷ = Chiron** locked in GLYPHS.md §12j. **The shop is THE DEPANNEUR**
      (his name — Montreal corner store; the capsule machine lives inside).
   5. **User docs SHIPPED (deep):** own nav section — overview (all odds
      tables, 13,063,680 combos) · the-depanneur (machine rules, fair roll,
      money math) · the-living-charm (chain/finish ladders w/ rank names,
      polish fine print, bond table, christening rules).
   6. **Gene-pool gallery artifact** (Brendon has the link; 73 variations,
      animated): republish from scratchpad `keychains/keychains-gallery.html`
      in THIS session's conversation to keep the URL.
   7. **QUEUED — the Depanneur surface build (next big one):** shop UI
      (sim-ETH like the sticker store) · equipped mini charm at the END of
      profile tags (default-off, tap → full charm) · POLISH button + app
      signing endpoint (settlement key already app-side). ClickUp
      `86bb46etv` (02·UI). Contracts task `86bb46epm` (01, In Progress —
      awaiting Sepolia/mainnet deploy, Brendon's hands).
   8. **PROPOSED, awaiting Brendon's word (do NOT build unbidden):**
      YIN/YANG — two coin slots on the machine (one pre-crank choice
      steering palette/face/accessory weights; shapes stay universal so the
      ALIEN chase is equal). Designed in chat 2026-07-27; he never said go.
      Also queued: the EYES upgrade art round (his ask — dizzy, lasers,
      sunglasses, 3D glasses, lashes, teary, iris colors).

0000000000000. ✅ **2026-07-27 — SOUNDTRACKS FIXED · MINIPLAYER SAVED
   SESSION + USB FACE · PRICEOS SUITE (8 apps) · STUDIO CHECKER v2. All on
   `dev` (tip `11d596d`), tree clean, tsc + real build green every round,
   every surface screenshot-verified at iPhone size on a mid-tone colorway.
   Brendon-approved and pushed round by round.**

   **Nothing is in flight. FIRST JOB NEXT SESSION: ClickUp sync** — this
   chat shipped everything below but ClickUp was not updated (close/queue
   per feature with one-line ship notes).

   1. **Soundtracks bug — root-caused with data, fully repaired.** All 83
      station links (49 registry + 34 DB) were health-checked against
      YouTube. Two failure modes: OLAK/auto-generated official-album
      playlists NEVER play in embedded players (33/34 DB rows — dead since
      seeding), and fan bootleg playlists rot (17/49 registry fully wiped;
      BoC was 18/18 deleted). Every dead link replaced with a same-album
      playlist VERIFIED playable+embeddable; registry swapped in code, DB
      swapped via gated SQL (0 broken remain). Audit tooling in scratchpad
      `fm-audit/` (page-parse health check + oEmbed embed test). ⚠ Links
      rot over time: a future dead station = one takedown, swap that link.
   2. **Studio soundtrack checker v2** (`/api/studio/playlist`) — answers
      "will this PLAY in the miniplayer": live-track count, first-track
      embeddability, OLAK/RD hard block, reason strings in the field.
   3. **miniplayer: account-backed saved session** (`fmSession` in the
      settings envelope + `pd_fm_session` cache): saves station+entry+
      seconds on pause / every 15s playing / on app-hide; reopening
      restores the device PAUSED at that exact spot, cued so ▶ (the
      iOS-required tap) resumes. × wipes the save (off stays off).
      Cross-device via hydrate; a session closed elsewhere clears here.
   4. **miniplayer: USB face** (4th, after Deck: deck·usb·signal·disc) —
      Transcend MP330 in PD paint: 206×66 rounded-rect (14px corners),
      colorway domed gradient (NOT black — his correction), inverted-panel
      OLED fully inside the body, one raised square pad (play centre, ≫
      right, ⎇ top, × bottom), steel USB plug out the left end under a
      TAPPABLE colorway end cap (tap off / tap on — Brendon has later
      plans for it). EQ bars answer (2026-07-27): real EQ data is
      impossible (YouTube iframe is sealed); bars stay choreography.
   5. **PriceOS SUITE — the productivity super-app.** ModalName `'suite'`,
      FI-PLUS chrome, icon tabs. DOOR (Brendon-confirmed): LONG-PRESS the
      TO-DOS header in the connect menu. Lands on ‰ Today. Eight apps:
      ‰ Today (dashboard: Fantastical week strip w/ dotted-ring today +
      per-day due counts · today's to-dos completable in place · UP NEXT ·
      pulse tiles war-chest/armed/budget, each a door) · ▦ PriceCal (real
      CalendarPanel) · ❍ PriceTask (TodosBox `suite` mode) · ☇ PriceFlows
      (WorkflowsSheet `inline` mode) · ◊ PriceBooks (real PortfolioView,
      back-arrow hidden) · ƒ PriceCalc (DOOR — opens Profit Pal over the
      Suite) · ⚯ PricePhone (contacts off /api/follows: ⚭ mutuals → ⚯
      following → ⚬ followers; CALL = toast + land on their collection to
      offer on a piece) · ⊟ PriceNotes (NotesBox `suite` mode). All reuse —
      zero re-implementations. Docs highlight page `/docs/suite` beside
      Command Stone. ‰ on the Today tab is the PerMilleMark SVG (his law:
      all per-mille LOGOS are the SVG — swept: trait pill/Vault/feed rows
      already complied; Setup Codes stay text by the monospace exception).
   6. **Names locked by Brendon:** PriceCal · PriceTask · PriceFlows
      (plural, his call) · PriceBooks · PriceCalc · PricePhone (beat
      PriceDex — DEX collides with crypto vocabulary) · PriceNotes.
   7. **PricePhone next steps discussed, NOT built:** missed calls
      (expired offers), sprite contact cards, auto-pick piece on CALL.


000000000000. ✅ **2026-07-27 — THE DARKROOM ◉ + FINGERPRINT TASTE
   AXES (the Radar unlock) + FINGERPRINT DOCS PAGE. On `dev` (tip `e5d455f`),
   tree clean, tsc + real build green, 138 tests pass, geometry read proven
   on real pixels in headless Chromium. Brendon-approved + pushed.**

   **Nothing is in flight.**

   1. **The Darkroom ◉** — `/art/{slug}/{id}/darkroom`: full-res live render
      on the fullscreen stage anatomy, Deep Zoom pixel inspection, real
      palette swatches (tap-to-copy, the character sheet's sampler), INVERT
      negative pill (default off). **Door (Brendon-confirmed): long-press the
      art on the FEATURE page** (DeepZoomLayer gained `onLongPress` — on that
      surface the Darkroom took the hold from the Lens, per his "Ignore
      lens"; the Lens keeps all other surfaces AND works inside the
      Darkroom). Out: standard ×.
   2. **Fingerprint v4 — THE TASTE AXES** (Brendon's call: taste gets
      measured on the Fingerprint; this IS the Radar's data unlock). Four
      tiles on the Fingerprint wall: Geometric↔Organic (∠, NEW pixel read —
      edge-direction coherence), Colourfulness ◧ / Density ▓ / Order ∷
      (transparent composites of the real stored scalars). New `geometry` +
      `geometry_band` columns on `outputs` (migration applied, additive);
      full pipeline sample→store→APIs→tiles; live fallback for pre-v4 rows
      (first-viewer-wins means old rows never re-capture — live IS their
      path). Glyphs catalogued in GLYPHS.md §12i.
   3. **The Fingerprint docs page** — its own feature section like Command
      Stone (`/docs/fingerprint`, nav entry, Outputs page points to it).
      Brendon corrected my first pass (a section inside Outputs) to a
      standalone page — "highlight" means own feature section.
   4. **The Radar ⊕ (86b9eu89c) is UNBLOCKED but stays queued** — its
      per-wallet vectors can now average real per-piece axis values. Genome
      is REAL + shipped (my stale-spec "mockup" claim was wrong; corrected).
   5. ClickUp: Darkroom 86b9eu80j complete w/ ship note · Radar commented.

00000000000. ✅ **2026-07-27 — PD MARKETPLACE + PURCHASE PAL /
   PROFIT PAL. On `dev` (tip `26c2e79`), tree clean, tsc + real build green,
   138 tests pass, deploy verified rendering. Brendon-approved, two rounds
   (build + his edit round).**

   **Nothing is in flight.**

   1. **`/marketplace` — the PD Marketplace page.** Home surface verbatim
      (same Hero chrome, `PD Marketplace` title, home's By @brendon credit +
      Featuring rows, pill tabs), market center: **Listings** = per-project
      carousels of live-listed pieces (cheapest floor first, floor + count in
      each head); **Activity** = the market tape (LIST ✹ / SALE ✶ / OFFER ✦,
      viewer-local stamps). Stats row: LISTED · VOL · OFFERS. Server-seeded
      payload (`lib/marketplace/marketData` + `/api/marketplace`, one shared
      shape), refresh on `pd:project-refresh` + visible poll. **Paints with
      the Mood Ring, same daily colour as home** (ColorwayContext treats
      `/marketplace` as a home surface — it was matching the profile-page
      branch before).
   2. **The Pal — `components/pal/PalPanel.tsx`, one app, two sides, Cart
      slide-up shell, ModalContext name `'pal'`** (payload `'profit'` |
      `'purchase'` | `'purchase:<YYYY-MM>'`). **PURCHASE PAL**: Completionism
      month goal (steppers cycle months, default = THE CLOSE), knobs
      CHEAPEST/BALANCED/RAREST + slider (price↔rarity over real listings,
      `pdRarityRank`), one pick per missing release, ADD PATH TO CART lands
      in the real Cart. **PROFIT PAL**: portfolio tiles (pieces · spent ·
      at-floor · net), per-project EXIT ALL / TRIM paths on the Calc rate
      card (5% royalty + gas), HOT read off the tape personalized to
      holdings.
   3. **Doors (Brendon-confirmed 2026-07-27):** `/marketplace` route only for
      now (he'll place its real entrance later) · Profit Pal button on the
      marketplace action row · Completionism's ⌂ opens Purchase Pal preloaded
      with THE CLOSE. More Pal doors "all over the app" get added **as
      Brendon names them** — never invent one.
   4. ClickUp `86bb3wcu9` complete with ship notes. PR #34 was the record.

0000000000. ✅ **2026-07-27 — REWIND TOGGLE · STICKER SAVE SYSTEM ·
   PING + TAG POPUPS. On `dev` (tip `9e566b4`), tree clean, tsc + real build
   green, 138 tests pass. Three asks, all shipped.**

   1. **The Rewind is a TOGGLE** — the same triple-tap on "Price Discussion"
      that docks the OS at yesterday returns you to now while docked, exactly
      like the bar's ✕.
   2. **Stickers — a SAVE system.** Opening the manager starts a DRAFT: changes
      paint on the hero immediately (you're editing the real profile) but
      nothing reaches the account until SAVE + the app's own confirm card.
      Closing without saving restores the snapshot byte-for-byte. Spreads keep
      their own SAVE and force past the hold, so a discard can never delete
      one. Also: **SPREADS moved to the third window** (Density/Align/Tilt take
      the second) and the Layout preset "SPREAD" is now **SPACED** — the stored
      id is untouched, so every Setup Code and existing profile still works.
   3. **Stickers — the gestures.** A sticker no longer moves when you TOUCH it:
      every grab is earned by the long-press, and touching a lifted one settles
      it. And the **page scrolls** when you drag the sticker area — the canvas
      is `pan-y` now, with the grab claiming the gesture (non-passive
      touchmove) only once the long-press has fired, so hand-placing is
      unchanged.
   4. **Pings go somewhere.** A ping with no deep link (to-dos, achievements,
      streaks, the system) opens a POPUP — the ping in full, the moment it
      landed in the VIEWER's own time, and its door: a to-do opens the To-Dos.
      Never a nav away; the list stays underneath.
   5. **Profile tags open their room.** Tapping a tag anywhere it appears opens
      the people wearing it, sliceable by SPENT · OWNED · JOINED · A–Z plus a
      CABAL ⟁ narrow (you + your mutuals, computed client-side off your own
      circle). New public route `/api/tags/members` — it runs the SAME
      `lib/tags/derive` a profile does, `shownTags` included, so a tag its
      owner hasn't switched on is never listed. Own-profile taps keep their
      existing meaning (customization menu / WTBS cycle). Built on the OWNERS
      modal anatomy verbatim.

000000000. ✅ **2026-07-27 — BRENDON'S FEATURE/BUG LIST SHIPPED (the round
   before). All on `dev` (tip `bbac639`). Fourteen items, each verified before
   claiming.**

   1. **Grouped gallery goes 4-up on mobile** — when a grouping is the active
      sort, the project grid and Collected both double from 2-up. Ungrouped is
      untouched.
   2. **Collected feed names the project** — "collected Prisms #7", price kept.
      One flag conflated naming the project with dropping the price; split.
   3. **TEAM tags — a 4th class, always first.** CEO stays Brendon's;
      @pricediscussion now reads **Deployer**. **WTBS** reserved to @trinity +
      @willpop BY HANDLE (no longer grantable), **Petey** → @petey,
      **BitVerse** → @cspok, **Rudxane** → @rudxane. None of those accounts
      exist yet — the tag simply doesn't appear until they do, and the reserved
      list is one line to change if they pick different names.
   4. **The twelve WTBS treatments** — tap your own chip to cycle; the pick is
      public. Brand acid **#E8FF00 pulled from wtbs.show's stylesheet**, NOT
      sampled off a screenshot (which encoded ~#ECFE52). The blue #3A86F7 is
      Safari's default control colour showing through their unstyled nav button
      — flagged, and Brendon kept it deliberately. **BitVerse** = Courier +
      two-tone wordmark, colours off the logo (bitverse.art is parked).
      **Rudxane** re-rolls every page load across 20 faces: the 16 respellings
      lifted verbatim from the Ode to Rudxane project's own table, the name in
      three casings, and one REAL 180° rotation (not the Unicode flip glyphs).
   5. **⛔ TAGS ARE OFF BY DEFAULT platform-wide** — opt-IN `shownTags` replaced
      opt-OUT `hiddenTags`. A NEW key, not a reinterpreted one: reading an old
      hidden-list as a shown-list would switch on exactly what its owner turned
      off. Discovery is the feature.
   6. **@name lookup fires from the FIRST letter** — it was already wired into
      To-Dos, Notes and the Calendar; the search's 2-character floor made it
      look dead. Fix scoped to the user lane only. Also wired into the
      **workflows @artist field**, which never had it.
   7. **The lookup list flips ABOVE the field** when the keyboard is up —
      measured against visualViewport, resolved before paint.
   8. **Sticker store survives the Rewind** — docking swapped the surface out,
      so the button measured a dead layout, read it as wrapped, and hid.
   9. **Miniplayer art opens the picker on TAB + DISC** (DECK still → YouTube).
   10. **Landscape artwork modal buttons work** — handlers were always correct;
       the root was missing `data-stack-top`, so any other open modal covered it
       and swallowed every tap. Hit-tested: 0/8 reachable before, 8/8 after.
   11. **Miniplayer sits ABOVE the Command Stone** — the stone publishes how
       much of the band it occupies (measured live, so a growing response
       carries the player up with it); 0px when gone, so the resting position is
       byte-for-byte what it was.
   12. **To-Dos AND Notes decoupled from the connect menu's link styling** —
       `.user-dropdown a` made every link a 30px menu ROW, so an @name
       mid-sentence split a to-do into three lines. Notes had it worse (@names
       AND web links). Brendon called the cause; my first repro loaded the wrong
       stylesheet and I wrongly argued it was a width problem.
   13. **GROUPING: three layers.** Tap cycles the MAINS only (artist · project ·
       owner · **tag** · colour · rarity); HOLD opens three slots, tap a slot for
       its full picker. The hardcoded PAIRS are gone — one label engine plus a
       generic N-layer builder both galleries share. Headers **staircase**
       0/30/60. **Profile tags** added as a dimension (a piece groups by its
       owner's leading tag). A layer that can't cut the window is DROPPED
       ("just figure it out"). The menu is the fiat picker's bubble, made a
       column — tall, never wide.
   14. **Storage audit** — `docs/STORAGE-AUDIT.md`.

</details>

---

## ⚠️ OPEN — named, not done

- **Workspaces are device-only and shouldn't be.** The `workspaces` column
  already exists AND the merge function already writes it — the client just
  never calls it. Cheapest real win in the audit: wiring, not schema. Also
  stranded: Composer programs, grid presets, budgets, anchors, day + token
  notes, the nine hero sticker prefs, the saved default grouping, fiat currency,
  portfolio view state. Full list + reasoning in `docs/STORAGE-AUDIT.md`.
- **Two group toggles are NOT on layers** — deliberate, not overlooked: the
  **Composer's** (its grouping lives inside its saved query, so layers need that
  shape extended; its tap cycle DID trim via the shared order) and the
  **Starred / Wishlist / History** one (it groups saved lists on a different
  vocabulary entirely).
- **Achievements tags: PARKED** by Brendon. **Completionism** is specced as a
  tag per month collected ("SEP '26 100%") — not built.
- **BitVerse cycle count + the Rudxane lilac (#C9B6F0)** were my picks; Brendon
  hasn't ruled on them against a live colorway.
- **⛔ The Bench needed NO work** — database-backed since 2026-06-15 (own table,
  RLS, owner-scoped endpoint, cross-device sync). Don't re-open it.

---

## Notes for the next session

- Every UI claim this session was verified by rendering the REAL compiled CSS in
  headless Chromium at iPhone size, not by reading source. That caught two wrong
  diagnoses (the to-do wrap, the landscape modal). Keep doing it — and **look at
  the picture, not just the numbers**: a harness showing two panels side by side
  reads as one wide panel, which cost a round trip.
- The tag system now has FIVE handle/wallet-reserved chips, all deriving in
  `lib/tags/derive.ts` from one small set each. Never grantable.

---

## ✅ SHIPPED 2026-07-13 (Fable) — FOOTER COMPLETE + TIMES + FILTERED-NOT-CURATED (on dev + DEPLOYED 5f13f570, verified live)

One push (merge ab1ee0b). ClickUp task `86bawpvpq` records the ship.
- **About PD modal** — the footer link (was a COMING SOON toast) now opens the
  real thing, built on the PriceosModal changelog chrome verbatim (figlet
  header + scale-to-fit, close-hint, collectors-list scroll body). Content:
  "FILTERED, NOT CURATED" ASCII statement box · two SVG diagrams (the loop:
  artist → filter → project → outputs → market → the talk; the stack: PriceOS
  social layer over the Ethereum art layer) · THE STORY timeline (NOV 19 2021
  #price-discussion channel → the sim → the real app → contracts → the
  language → $PRICE mainnet → the edge → the tools → NEXT: mainnet) · BY THE
  NUMBERS computed live from the real registries (projects, artists, edition
  range, achievements TOTAL_COUNT, MAX_PRICE_SCORE, True Names, 95% artist
  take, 100% on-chain art) · FIND US (X / Instagram / YouTube =
  @pricediscussion + Discord) · CONTACT (price@ + support@pricediscussion.com).
- **Support modal v1** — footer Support link (was a bare mailto) opens a
  prelim modal: support email + Discord fast lane. Brendon edits copy from
  this base (his stated plan for both modals).
- **The Dispatch ×** — standard close-hint fixed top-right on /dispatch;
  history-back when the reader came from inside the app, home on a cold link.
- **⛔ Viewer-local times, always and forever (new §9 rule in CLAUDE.md).**
  All displayed clock times now render in the USER's zone: news rail, home
  New-Uploads feed stamps, profile feed stamps (each had been pinned to UTC).
  Deliberate exceptions stay: day-keyed platform concepts (PriceDay, the
  Dispatch's covered day, natal, Mood Ring) + date-of-record stamps (member
  since / upload date, date-only, still UTC-keyed).
- **Genesis moment fixed** — `#price-discussion` started 11/19/21 08:28 EST;
  was stored 08:28Z (rendered 5h early for everyone). Now stored at its true
  instant **13:28Z**; verified on the live API. Closes the old QUEUED item.
- **Filtered, not curated — sitewide correction (Brendon's order).** The
  platform-level "curated / curation thesis" claim was my drafting mistake.
  Corrected: all `content/docs/` pages (glossary got a Filtered entry;
  user-level curation like Albums/Showcase/Gen Curated untouched) · README
  already correct · **CLAUDE.md §1 wording lock added** · ClickUp: banners on
  PD-Docs doc top page + pages 9 & 61, Atlas "Curation, Identity & Chrome" →
  "Taste, Identity & Chrome" (+ same in Reconciliation), wording note on the
  Master Feature List.
- Deploy: fresh chat-only CF token (NOT stored), OpenNext build + pinned
  wrangler per the recipe; verified live: Supabase URL in the client chunk,
  About modal in the served layout chunk, dp-close on /dispatch, 13:28Z from
  the feed API.

## ✅ SHIPPED 2026-07-13 (Fable, overnight) — THE ARCHITECT REPORT (docs only)

- **`docs/ARCHITECT_REPORT_2026-07-13.md`** — full architecture review Brendon
  ordered before bed: app + DB (live advisors read) + ClickUp + repos. Verdict:
  bones are strong; the gap is scaffolding. Top 5 blind spots: zero app tests ·
  no CI/error-visibility · settings-envelope last-write-wins clobber risk ·
  one-env/one-DB (staging needed at mainnet) · rate limiter likely OFF in prod
  (Upstash secrets unverified — 5-min check, do first). Consolidated 22-item
  homework list at the bottom, tagged Fable/Opus/Brendon. Docs-only push,
  pre-approved. **Waiting on Brendon: read report → pick homework → I'll cut
  ClickUp tasks + Opus briefs on his word.** Also flagged: ~6 zombie ClickUp
  tasks (shipped work still open) need his confirm before closing; CLAUDE.md
  §1 stack line + api-spec.md are stale (noted in report §4.7, not yet edited).
- **UPDATE (same night): Brendon approved ALL 22 items** ("fix all of them
  without disrupting the current flow"). Execution brief written:
  **`docs/briefs/fundamentals-hardening.md`** — the multi-session playbook
  (checklist IS the baton for that workstream; sessions flip its boxes).
  Brendon starts fresh Opus chats pointed at it. Ship gates + no-product-
  disruption rules are baked into the brief; Brendon-gated asks are batched.

## ✅ SHIPPED 2026-07-12/13 (Fable) — THE MEGA-BATCH (all on dev + DEPLOYED, verified live)

Six pushes, in dev order. ClickUp updated per feature (86b9eth7w, 86barg53e,
86b9fcn0d, 86b9g6c7c, 86bafgw65 all complete; 86b9fbrx9 commented).
- **Cartography ◫ (86b9eth7w):** living ecosystem map — territories from
  minted supply w/ seeded coastlines, holders as inhabitants, artist ✺ capital,
  shared-collector continents (periodic force layout), realtime event layer
  (mint ripple+growth, sale comets, listing beacons), 3 LOD depths, wallet
  focus mode. Canvas 2D, zero deps, /api/cartography seed + Realtime channel.
  ENTRY: long-press the home "Price Discussion" name (project-title gesture
  verbatim). WebGL deferred until scale demands (noted in task).
- **Engine perf pass (86bafgw65 + fleetwide):** all 84 engines benchmarked
  headless (playwright + esbuild harness in scratchpad); ~45 were 1-4s/piece.
  Shared grain/mottle/hazeSheet storms → bucket-batched path fills / pixel
  buffers (same rng order); bespoke fixes: vanguard (PIP dot culling, 4.2s →
  0.9s), goldenangle (layer-blur glow, 4.1s → 50ms), corallogic (int grid
  keys), diffusion (inlined laplacian), chladni (near-band mask + LUT
  deposits, 3.3s → 1.65s = current fleet worst). ⚠️ 9 projects' texture layer
  changed → ZEROED to 0 mints on Brendon's order (chladni pressroom ictus
  caustics cyanotype vanguard frost-fern conservatory topiary; holders/events/
  listings/offers rows deleted, aggregates reset). pd-test-alpha untouched.
- **The Rewind ◄ v1 (86barg53e):** triple-tap the home name → whole-OS docked
  at any PriceDay: banner + spine scrubber + RETURN TO NOW; as-of home (stats,
  lists, day log) + as-of project pages (stats-then, gallery capped to
  minted-by-then); read-only by construction (/api/rewind GET only).
  **Daily social tape STARTED** (social_snapshots table + cron — the
  can't-wait piece; R4 profile/leaderboard rewind now possible later).
- **The Dispatch ▤ (86b9fcn0d):** morning paper, 9AM Montreal, covers prior
  day; deterministic seeded prose off the almanac engine ($0/day); immutable
  editions in `dispatches` table; /dispatch + /dispatch/YYYY-MM-DD forever-
  URLs; entries = news-rail ▤ pill + footer 2nd row before Mood Ring.
- **HOSTILE TAKEOVER ⚑ (86b9g6c7c) + own-book offers decision (86b9fbrx9 =
  Option A, Brendon's call):** blanket premium bid on a 3+-piece position;
  1.2× premium enforced (lowest listing → floor → mint); 72h non-cancellable
  (cancel path refuses takeover offers); real per-piece offers w/
  offers.takeover_id; accept flow records yields live; sweep stamps
  COMPLETED/PARTIAL/WITHSTOOD (180d mark); profile ⚑ TAKEOVER action + cast
  sheet + inscription banners; Offers HQ badges blanket rows. NEW glyphs
  logged in GLYPHS.md: ◫ ◄ ▤ ⚑ (all need the iOS device gate).
- **PD-Docs:** new pages for all four tools + corrected the stale "PD does
  not operate a marketplace" claim (own book documented), grouping toggle
  documented, overview/discovery cross-links.
- New crons on the 1-min trigger (all probe-and-exit): social-snapshot,
  dispatch, takeover-sweep.
- DB migrations applied (live Supabase): social_snapshots, dispatches,
  takeovers + takeover_acceptances, offers.takeover_id.

## ✅ SHIPPED 2026-07-12 (Fable, night) — PINGS SYSTEM REDESIGN + ACHIEVEMENT DE-SPAM (dev; batch 1 LIVE)

Full spec + status in ClickUp `86bawky5p`. Two commits on dev:
- **be249c7 (LIVE on the preview):** read = SCROLLING the pings list (open
  marks nothing); unread on top, honest unread-only count; all five MY PINGS
  interest toggles wired to real fan-outs (mutuals / starred artists /
  starred projects / starred traits / rarity top-10 moves in held projects);
  push respect policy (money always, ambience budgeted 4/hr, achievements +
  follow-feed never, pills enforced server-side); to-do + calendar reminders
  → inbox + push; **Artist Push** (Studio, 1 preset ping/month/project to
  holders); achievements: 116 front-loaded trophies → far-climb rungs (still
  exactly 1,000; day-one unlockables 57→20; Mjölnir re-walled 231,000,
  verifier green); docs got a Pings SECTION (overview/controls/artist-push);
  GLYPHS.md updated (interest glyphs; "stars are silent" note revised).
- **a019bd3 (on dev, AWAITING REDEPLOY):** wow pass — push deep-links to the
  piece, sprite moods (awake/blink/yawn) on the lock screen, SEEN divider +
  open-anchor, long-press-to-quiet (unstar artist/project or mute actor —
  NEW POST /api/social/mute, first writer of the `muted` table), 30d+ streak
  guard at 19:00 Montreal, "while you were away" rollup (inbox-only), sweep
  heartbeat → ops ping to @brendon if the cron stalls 10min+ (1/hr max).
- Queued at chain cutover (in the ClickUp task): indexer on-chain sale/mint
  path gets the same interest fan-out.
- Facts future sessions need: interest fan-out rides `app_ping_wishlist_fanout`
  (kind-agnostic RPC) + the users.settings GIN index (artistStars/projectStars/
  traitStars containment probes); kind `PING` was already in the live CHECK
  constraint (no migration needed anywhere in this whole build — zero prod
  writes); pings read route only bumps the broadcast watermark on `all` or
  `broadcast_seen`, never on ids.

## ✅ SHIPPED 2026-07-12 (Fable, evening) — fx-listings-feed LIVE

- **fx-listings-feed LIVE** — fxhash *listings* Worker, objkt-sourced
  (`list_create` on the three fxhash FA2s; lister = event `creator`), old
  bot's compact embed (em-dash title, "Listed by … for …", thumbnail).
  Sheet config carried over: **min $20, single webhook** (`WEBHOOK_MAIN`).
  1-min cron, KV `fx-listings-feed-state`. Verified end-to-end: real card
  rendered in `#fx-listings-feed` + deployed worker manual-run clean. Code
  on `price-discussion` `main` (`workers/fx-listings-feed/`); README's
  pending-port list updated; ClickUp `86b9g4e55` commented.
- Brendon's fresh CF API token was chat-only again — NOT stored; he can
  revoke it anytime (told him).
- Old Apps Script listings trigger: Brendon to disable (it dead-polls the
  dead fxhash API; harmless but pointless).

## ✅ SHIPPED 2026-07-12 (Opus) — Sticker store + PriceSprite modal UI polish (all on dev)

All merged to `dev` + pushed. UI/content only — no data/logic.
- **Sticker store:** outputs sheet **3 cols** (was 4) with even, roomy gaps
  (mobile only); store grid row-cap attempted via plain CSS `max-height` +
  `align-content:start` — **⚠️ this did NOT actually clip (see batch 2 below for
  why + the real fix)**; "album" tab → **"MY
  ALBUM"**; news-ticker row **~⅓ shorter** (10px); header expand arrow **1.5×**
  (33px); card count forced-wraps "N" over "stickers".
- **Both store crawls rewritten (content only, formatting untouched):** store =
  onboard + buy; marketplace = its OWN crawl nudging **listing**, framed as
  recouping toward the next roll of stickers/art (deliberately NO profit/flip
  language). Cast: **all 100 familiars = endorsers**, **@brendon +
  @pricediscussion sprites = platform reps**; ALL placeholder @handles purged
  from the crawl. `lib/stickers/ticker.ts` (buildStoreTicker/buildMarketTicker),
  wired per-view in `components/StickersModal.tsx`.
- **PriceSprite modal achievements line:** the points line was spilling past the
  right margin — count now stays inline with the label, the score drops to its
  own full-width line pinned right; faint tally 0.5→**0.9** opacity.
- **DEFERRED (Brendon's call):** the PriceSprites **sheet you can buy** still
  lists placeholder @handles as its stickers — leave until more real users lock in.

## ✅ SHIPPED 2026-07-12 (Opus, batch 2) — ASCII tab + achievements line + store grid scroll (real fix) (on dev)

All merged to `dev` + pushed. UI/content only — no data/logic.
- **ASCII Backup tab:** button labels → ALLCAPS (`ACTIVATE ASCII MODE`); dropped
  the leading dots (`COPY TXT` / `COPY JSON`); long button `collection`→`COLLECTED`.
- **PriceSprite achievements:** the points line (was `[[ … PTS … ]]`) now **centered**
  and flanked by the canonical achievements icon **◍** each side (`lib/achievements/icon`).
- **⭐ Store stacked grid — the REAL scroll fix (3 failed rounds first).** Batch-1's
  `.ss-grid-view { max-height }` NEVER clipped: the grid is a **flex child of the
  modal column** (`.sticker-sheet`), so its flex auto-minimum = full content height,
  which overrides `max-height` → the modal just grew to show every row (Brendon:
  "forcing itself to show the full grid"). Deploy was NOT stale and the value WAS
  live — the mechanism was wrong. **Fix:** wrap the grid in a dedicated bounded
  scroll viewport **`.ss-grid-scroll`** (`min-height:0` + `max-height` + `overflow-y`);
  the grid keeps its exact layout, the wrapper caps to ~6 rows and scrolls the rest.
  Verified with a headless repro of the real modal structure (offline, file://):
  6 of 9 rows shown, scrolls, modal bounded 632/844px (was ballooning). `gridRef`
  (drag-scroll) + scroll-memory moved to the wrapper.
- **Marketplace button** added left of `MY ALBUM` (same style) → opens the
  marketplace; flips to **`BACK TO STORE`** while in the market and returns you there.
- **Lesson for next time:** when a CSS `max-height` "isn't working," suspect a
  **flex-child that won't shrink** before blaming cache/deploy — verify the served
  asset first (it was correct here), then reproduce the structure headless.

## ✅ SHIPPED 2026-07-11 (evening, Opus) — App security audit (2 fixes; prod DB locked)

Full app security pass (API routes · SIWE/session · Alchemy webhook · crons ·
money/economy; contracts excluded). Core verified solid — mostly prior hardening
held up. Full findings + queued cleanup live in ClickUp **86bawbb7j** (11 · Security).

- **🔴 Critical — LOCKED (prod + dev).** Four trade RPCs (`app_sticker_buy` /
  `app_sticker_accept` / `app_sticker_swap_accept` / `app_accept_criteria_offer`)
  were EXECUTE-able directly by the public anon key via PostgREST, bypassing
  route-level SIWE auth (SECURITY DEFINER, actor-identity-as-arg). The 3 main
  money RPCs were already `service_role`-only; these 4 were missed. Revoked
  anon/authenticated/public EXECUTE (service_role retains → app unaffected).
  Applied to prod + migration `20260711_revoke_public_execute_sticker_offer_rpcs.sql`
  (commit 3cb4eea). Verified live: anon blocked, service_role intact.
- **🟠 outputs/color → first-viewer-wins (dev, c57b13d).** Was an overwrite; any
  signed-in user could re-tag any token's colour/fingerprint with a valid-but-wrong
  bucket (cosmetic — attribute sheet + colour rarity). Now returns early if colour
  is already set, mirroring the write-once preview/ascii pins.
- **Queued (pre-mainnet, none blocking today — all in 86bawbb7j):** money-math
  conservation in the trade fns + `app_buy`/`app_accept_offer` (buyer debit skipped
  when payer has no users row → conjure play-ETH); revoke 11 dead anon SELECT grants;
  pin `search_path` on 3 fns; move `citext` out of `public`; add a script-src CSP;
  flip `SIGNUP_SIM_ETH_GRANT=0` at mainnet cutover.
- Branch: `claude/app-security-audit-s6d24p` (work went straight to `dev`).

## ✅ SHIPPED 2026-07-11 (evening, Opus) — Albums revert + Friend Inspector / Projects Pro UI batch (on dev; Worker NOT yet redeployed)

Merged to dev + pushed. **Preview still stale until the app Worker is manually
redeployed** (needs Brendon's Cloudflare token — see the DEPLOY RECIPE below).

- **Albums reverted** to last night's rebuild (34e03e7): removed this morning's
  90° corners + `width:100%` wrap (`styles/albums.css`) and the 3-across desktop
  block (`app/globals.css`). Kept the fable rebuild. Verified album surface ==
  34e03e7 exactly.
- **Friend Inspector view-as-another-user** — `FollowersModal` now takes a target
  address via the modal `slug` arg (ModalContext); the graph/projects/stats loads
  key on `targetAddrLc` (falls back to `siweAddress`). Profile followers stat opens
  `open('followers','followers', user.address)` → that user's circle, compact.
- **Projects Pro modal** (`components/ProjectsProModal.tsx`, ModalName
  `'projectsPro'`, mounted in PriceOSShell) — FI chrome (compact + PLUS), alphabetical
  `allProjects()` list, rows → `/art/{slug}`. Wired to the home hero PRO stat.
- **PriceSprite card** (`components/FriendSpritePopover.tsx`) — Fiat-bubble-style
  portal+tail popover off the sprite tap; PriceRank (tierFor) + score + circle stats;
  `@name` links to profile. Sprite tap added via `CollectedPair` optional `onSpriteTap`.
- **Full-opacity pill outlines** — `.pill-l2` (globals + modal.css) and `.ambient-chip`
  (ambient.css) borders → `var(--text-color)`; `.smgr-sheet-pill` opacity 0.5→1.
- **Wire/Map** → floating text: `.fi-preview-chip` drops the box, weight 400+op .6
  (de-selected) / 800 (selected); toggle nudged down 3px.
- **Profile stats toasts** — first two stats' values now fire `iconToastProps`;
  followers unchanged (opens inspector).
- **FI title glyph** `.smgr-title-ic` scoped to `.followers-pop/.followers-plus`:
  23px + top -2px; `.fm-icon` centred.

## ✅ SHIPPED 2026-07-11 (late afternoon, Opus) — indexer sweep live + APP WORKER REDEPLOYED

- **App Worker `pricediscussion` REDEPLOYED** (OpenNext build → `wrangler
  deploy`; version 31290bc0). This is a MANUAL deploy — there is NO
  auto-deploy from dev / no CI, and the preview had been stale since ~12:45,
  so this redeploy is what finally put ALL of today's dev-merged work LIVE on
  the preview (attributes stats, NPC pass, Lane Runner, albums-3col, indexer
  fix).
  > **⛔ DEPLOY RECIPE — read before EVER redeploying the app Worker (a bad
  > redeploy cost real time this session).** The app has NO auto-deploy / no
  > CI — the `pricediscussion` Worker is updated ONLY by a manual build+deploy.
  > Steps: (1) `export CLOUDFLARE_API_TOKEN=<Brendon's token>` (he creates a
  > fresh "Edit Cloudflare Workers" token per session; NOT stored). (2)
  > `rm -rf .open-next && npx opennextjs-cloudflare build` — this now reads the
  > COMMITTED **`.env.production`** (added this session: all 8 PUBLIC
  > NEXT_PUBLIC_* values, so the client bundle is correct automatically. BEFORE
  > that commit, a fresh-container build baked EMPTY config → wallet defaulted
  > to mainnet + browser Supabase/push broke; the file is the permanent fix,
  > do NOT delete it). (3) `./node_modules/.bin/wrangler deploy` — use the
  > PINNED local wrangler (4.105); `npx wrangler` may pull 4.110 which fails
  > "Could not detect static files". (4) VERIFY: fetch a client chunk from the
  > live site and grep for `zspxpfwlwikdxwavffjn` (Supabase URL present =
  > config baked). Worker SECRETS (service-role, webhook signing, webpush
  > private, CRON_SECRET, ALCHEMY_RPC_URL, SIGNUP_SIM_ETH_GRANT) live on the
  > Worker, survive redeploys, are NOT in `.env.production`. Mainnet cutover =
  > edit `.env.production` (`NEXT_PUBLIC_CHAIN_ID`→1, mainnet Alchemy URL).
- **Indexer reconcile chunking fix** — the sweep's single wide `eth_getLogs`
  failed on Alchemy's free tier (10-block range cap). Now reads the lookback
  window in ≤10-block windows, capped at 40 windows/run. Added a
  `?fromBlock=&toBlock=` targeted replay door (CRON_SECRET-gated) for surgical
  backfills. On dev + deployed. Verified: rolling sweep clean at head, token-2
  backfilled, idempotent re-runs write nothing.
- **New-account 1M sim-ETH grant (pre-mainnet)** — `POST /api/users/create`
  now seeds every BRAND-NEW account with `SIGNUP_SIM_ETH_GRANT` (default
  1,000,000) `sim_eth_balance` so signups can buy/mint in the test phase.
  Existing balances never overwritten. MANUAL mainnet off-switch (Brendon's
  call): `wrangler secret put SIGNUP_SIM_ETH_GRANT` = `0`. Live.
- **Reconcile sweep 2min → 1min** — one every-minute cron now fires BOTH the
  reminder + reconcile sweeps (custom-worker.ts calls both; wrangler crons =
  `["* * * * *"]`). Cloudflare cron floors at 1 min (30s not possible). Live
  (single schedule confirmed on deploy). Deployed version b0daef1f.

## ✅ SHIPPED 2026-07-11 (afternoon) — THE CLOUDFLARE SESSION (all live, trees clean)

**Deployed to the Cloudflare account (via Brendon's API token, in prod now):**
- **fx-sales-feed LIVE** — the fxhash Discord feed, ported off the dead
  fxhash API onto **objkt GraphQL v3**, running every minute with zero
  errors (verified via Workers analytics, not just manual runs). $20 floor
  kept (Brendon: intentional). All 5 webhooks verified + installed as
  secrets. Facts that must not be re-derived: objkt event roles are
  INVERTED vs fxhash issuer/target (proven on-chain via tzkt); collabs come
  decomposed in token.creators; project size = the token's fxhash gallery
  max_items; images = assets.objkt.media/…/artifact; **Tezos only** —
  fxhash ETH/Base sales have no data source anywhere anymore (flagged to
  Brendon). Code: `price-discussion` repo `workers/` (on `main`).
- **pd-sales-feed deployed dormant** — see NEXT UP #3.
- **PDMCP v1 LIVE** — see NEXT UP #5. Gotcha baked into code + README:
  same-account workers.dev→workers.dev fetches are BLOCKED by Cloudflare
  (error 1042); pd-mcp reaches the app through a **service binding**.
- **CRON_SECRET set** on the app Worker → reminder sweep + indexer
  reconcile crons are no longer failing closed (sweep verified healthy).
- Solved a standing unknown: **the app serves its stored previews
  publicly** at `/preview/{slug}/{id}.v2.png` (R2 binding route) — that IS
  the ART_IMAGE_BASE for pd-mcp and the PD feed.

**Shipped to dev (approved + pushed):**
- **Albums covers: 3 across on desktop** (2 rendered gigantic on
  widescreen; phones unchanged). Root cause of the earlier failed attempt:
  the project-page +More albums mock shares the `.albums-grid` class name
  in globals.css and its 2-col rule was winning — the fix is scoped via
  `.albums-wrap`.
- **Attributes tab: 5 new stats** (Brendon's picks, numerology excluded):
  PD Rarity RANK ("#3 rarest of 105", `pdRarityRank` in lib/output/rarity),
  percentile tags on every Fingerprint band (edition context from
  anon-readable outputs rows — `lib/output/editionStats.ts`, gated on ≥30%
  coverage), Mint Order + speed in Almanac ("3rd mint · 2 min after
  launch"), Closest Sibling via existing `nearestKin` (glyph ≍ — NEW, in
  GLYPHS.md), tappable hex Swatches sampled from the piece's own offscreen
  render (`lib/output/paletteChips.ts`, glyph ▧ — NEW; tap copies, toast
  `#HEX: COPIED`).
- **NPC Cast: bubble wrap FIXED** — `overflow-wrap: anywhere` let the
  width-hug binary search shatter words mid-word ("impatienc / e");
  bubbles + measurer now `break-word`. **Writers-room wow pass:** ~130 new
  lines/scenes in `lib/npc/scenarios.ts` — the "they see the SPECIFICS"
  layer (talk around the watching, show don't tell), new duet topics
  (wide/warm/cold/tilt/grain/centered), more sight lines per character on
  previously-unused axes, more exchanges/streaks/actions/night/morning.
  Selection machinery untouched (the used-ledger already prevents repeats;
  the bank is just much deeper now).
- **Lane Runner fixed**: status + hint lines wrap (nowrap was clipping
  above/below the board), tapping the score line opens the live top-10
  (refetches on open), standings refetch after a submit so REAL @handles
  show — the "@you" placeholder is gone.

## ⚠️ FINDINGS this session (know these)

- **Cloudflare error 1042** = a Worker fetching another workers.dev host on
  the same account. Use service bindings. This will bite ANY new worker
  that calls the app.
- Brendon's Cloudflare API token was pasted in-chat for this session only —
  NOT stored anywhere. Future sessions needing deploys: ask him for a fresh
  token (Create Token → "Edit Cloudflare Workers" template; he knows the
  drill now).
- The `users` table is anon-readable (address → handle) — feeds/tools can
  resolve PD names without auth.
- fx feed ops: manual run = GET the worker URL with `Bearer RUN_SECRET`
  (secret on the Worker). KV state keys: `cursor`, `posted`, `prices`.

## 🧭 WAITING ON BRENDON

- **Eyeball + edit the two new footer modals** (About PD · Support) on
  device — copy is v1, Brendon edits from there.
- **Delete the chat branches** — all merged trash, work is on dev:
  **`claude/baton-outstanding-items-7n1eca`** (the 2026-07-28 marathon —
  exists on BOTH `PriceOS` and `pd-contracts`), plus the older
  `claude/pd-polish-edits-wg8ao6`, `claude/pings-system-redesign-r5kbew`,
  `claude/pd-about-modal-history-3wpdyo`:
  https://github.com/brendonrell/PriceOS/branches ·
  https://github.com/brendonrell/pd-contracts/branches
- **Ticker copy review (2026-07-12)** — Brendon to eyeball the new store +
  marketplace crawl lines and send any wording edits (he said he'd review shortly).
- Feature Atlas re-order · ASCII-Mode glyph ⠿ iPhone check · Lane Runner
  top-10 trigger spot (leaderboard now exists in-game via score-line tap —
  may satisfy this) · docs.pricediscussion.com wiring — all previously
  ClickUp'd.

## 🧭 THE ROAD TO MAINNET

1. ✅ Indexer sweep go-live + token-2 backfill — DONE 2026-07-11 (see SHIPPED).
2. Phase C — app talks to Sepolia (`docs/sepolia-test-phase.md` §3–4).
3. Mythic Audit Pass (`86b9v5wj4`) — the last gate.

## 💡 IDEAS RAISED, NOT QUEUED (2026-07-28 — Brendon asked for "one or two
tiers above" the stone; these are IDEAS, never a go-ahead)

- **The armed stone** — a spoken budget as pre-authorization: "take 0.3 ETH,
  get me into Teletext under 0.1", executed while he sleeps. The watching
  layer (Sentinel to-dos) already exists server-side; the missing piece is
  the authorization. Volume driver; safe to pilot in the sim-ETH phase.
- **The prepared morning** — it finishes the work overnight and greets him
  with it done ("the cart is already packed — say go"), instead of notifying.
- **The stone in your pocket** — a deep link opening PD straight into the
  stone with a question pre-typed, wired to the iPhone Action Button via a
  Shortcut. Cheap; makes it feel OS-level. iOS-first by construction.
- **Stone-to-stone** — your stone negotiates an offer with another keeper's
  stone, both owners confirm the result.

## 📋 QUEUED (older, not started)

- Group sorts rework · Languages as a gen-art trait — discussion only.

## ⚠️ Known / deferred (older)

- ASCII 1/3-down line — faint artifact line, cause not isolated.
- Test prices (registry) — bulletin `0.2222`, reliquary `22.222` — REMOVE
  before mainnet.
