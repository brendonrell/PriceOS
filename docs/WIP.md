# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

## 🧭 NEXT UP — fresh session starts HERE

000000000000000. ✅ **2026-07-27 (LATEST) — PRE-LAUNCH POLISH MEGA-BATCH
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


000000000000. ✅ **2026-07-27 (LATEST) — THE DARKROOM ◉ + FINGERPRINT TASTE
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
  `claude/pd-polish-edits-wg8ao6` (this chat),
  `claude/pings-system-redesign-r5kbew`, `claude/pd-about-modal-history-3wpdyo`:
  https://github.com/brendonrell/PriceOS/branches
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

## 📋 QUEUED (older, not started)

- Group sorts rework · Languages as a gen-art trait — discussion only.

## ⚠️ Known / deferred (older)

- ASCII 1/3-down line — faint artifact line, cause not isolated.
- Test prices (registry) — bulletin `0.2222`, reliquary `22.222` — REMOVE
  before mainnet.
