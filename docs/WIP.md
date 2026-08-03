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

**No open build item.** The remaining work is WAITING ON BRENDON (below) plus
one infra action: **the pd-mcp Worker deploy** (ClickUp `86bb4wzn5` — a
session with Cloudflare access runs `wrangler deploy` from `workers/pd-mcp/`;
that same deploy provisions mcp.pricediscussion.com).

✅ **2026-08-03 (LATEST) — NPC CAST WOW PASS 3 SHIPPED** (on `dev`, tip
`a6a149d`, tree clean, type-check clean; his "Push!!" in chat; ClickUp
`86b9fcp11` commented). The anti-formulaic round for the spell-book cast:

- **Cold opens are a context-gated BANK now** — hour, visit count, deep-link
  landing, obsession, {name} all gate which greeting plays; several are
  walk-in mid-conversation scenes, the first beat's timing varies, and the
  used-ledger keeps logins from replaying last night's opening. ⛔ The old
  three-fixed-scenes opening is GONE — never reintroduce a hard-wired
  greeting sequence.
- **Celestia prophecy engine:** once a session she names a quality ("a red
  one is on its way"); when a real matching piece lands on screen she
  collects by name, sometimes with a witness react. Dies silently on a miss.
- **Running-gag follow-ups:** scenes seed delayed one-liner callbacks
  (the chili gets finished, the open bet stays open) — sessions read as one
  episode.
- **Conversational timing:** the pause before a reply scales with its
  length — short retorts snap back.
- **Sight upgrade:** the v4 geometric↔organic read joins sight lines +
  duet topics, plus double-fact combo reads; four new comedy scenes.
- **Bubbles smaller** (13px, tighter, narrower cap — sizing math + styles
  kept in sync) and **every resident has an EXIT motion** matching their
  entrance signature (leaving phase; reduced-motion falls back to fade).

✅ **2026-08-03 — THE SIX-ITEM ROUND SHIPPED** (on `dev`, tip
`a5bb21b`, tree clean, type-check clean, 213 vitest green, achievements
verifier green; his approval in chat, then "Let's wrap"). ClickUp
`86bb7dpw7`. The locks:

- ⛔ **ACHIEVEMENT DELIVERY IS SETTLED (his spec, verbatim): no push, no
  badge, NO UNLOCK TOASTS — ever again.** The ONE surface is a rolled Pings
  row ("N new achievements") that keeps counting while unread; its ping card
  lists the batch and doors to the profile achievements tab. Both unread-count
  endpoints exclude the kind. Never restore per-unlock toasts (PriceRankSync
  deliberately only nudges the score surfaces now).
- **Depth-ladder de-spam stretch:** the action-count families' early rungs
  moved out past the key milestones. Per family the rung COUNT and POINTS
  sequence are unchanged — catalog still exactly 1,000, Mjölnir wall
  re-proven. ⛔ Don't re-densify the early rungs; run the verifier after any
  catalog edit as ever.
- ⛔ **THE MY PINGS PILLS ARE SETTLED, UNTOUCHED.** A label pass on the five
  taste pills shipped in the batch and Brendon vetoed it ("I didn't want the
  ping pills changed") — reverted byte-for-byte. Do not re-propose labels
  there. The machinery is verified honest: all nine toggles gate the panel,
  the toasts AND native push; interest pings roll up per piece.
- ⛔ **THE SOCIAL FEED DOES NOT BELONG ON USER PROFILES.** The 2026-08-02
  profile ☻ lens was REVERTED byte-for-byte. It lives on the ARTIST SHOWCASE
  only — the showcase sort row's ☻ swaps the Created carousels for the social
  feed scoped to that artist's own projects (`?project=` accepts a comma list
  now). The project-gallery lens stayed. On the showcase the ☻ long-press
  lands on the social lens (NEW USERS is home-only).
- **The stone knows the brand:** HOTHURT / ATTENTION / the ‰ logo / PETEY
  world entries; the colour entries FLASH the stone's accent while answering,
  then hand back via the stored style. ⛔ **Petey is BRAND, not app — Atlas
  #0172 is RETIRED, never reused**; the Atlas pages read the true top number
  (`ATLAS_MAX_N`), not the entry count.
- **Docs index order is HIS exact spec** ($PRICE Token after For Collectors ·
  Smart Contracts before Fair Draw · App → Marketplace → PriceScore → Feature
  Atlas → highlighted sections A→Z). ⛔ "The" survives ONLY on The App, The
  Marketplace, The Gnomes — Rewind/Fingerprint/Dispatch/Exchange dropped it
  in the nav AND their page titles. Don't reintroduce it.
- **Profile action row:** SHARE wears its full pill ALWAYS; Takeover ⚑ and
  the Exchange ⇌ are glyph-only beside it with a clear self-naming toast on
  tap. Visibility rules (takeover floor, exchange conditions) unchanged.
- **Albums docs read fully public everywhere, plainly** — no was-private
  history narration anywhere (his explicit instruction).

✅ **2026-08-03 (LATEST) — THE PDMCP WOW PASS SHIPPED** (on `dev`, tip
`414fe4c`, tree clean, worker type-check clean; his go: "Would like all of
this"). ClickUp `86bb78fbt` CLOSED — this also closes the last item of
`docs/briefs/keychain-review-and-pdmcp.md`. The locks:

- **The 2026-07-28 MCP revision is REAL and was verified against the
  published spec directly** (base, versioning, streamable HTTP, discovery,
  caching, Apps extension, changelog) — never trust a prior pass's claims
  about it without that read. The stateless upgrade did NOT change our
  architecture (built stateless day one); it changed the conformance skin.
- **Fixed this round:** `server/discover` now answers `supportedVersions`
  (the old `protocolVersions` field never existed in any spec revision — a
  strict client read "supports nothing") + required caching hints on the
  discovery reply · `-32022` refusals carry `data.supported`/`data.requested`
  · modern-era HTTP statuses (400 malformed/version/header, 404 unknown
  method) · the mirrored `MCP-Protocol-Version`/`Mcp-Method`/`Mcp-Name`
  headers validated presence+match (Base64 sentinel decoded) for requests
  declaring 2026-07-28 · version read from `params._meta` where the spec puts
  it · MCP Apps advertised in `capabilities.extensions` · the installed app's
  own 192px icon inlined on discover/initialize identity (per-result identity
  stays lean — never put the icon there, it rides EVERY reply).
- **Dual-era is the shape:** legacy handshake clients (2025-03-26 →
  2025-11-25) keep lenient flat-200 behaviour, `initialize`/`ping` answer for
  them only; modern requests get full strictness. Batch arrays = always
  legacy.
- **Rides the pd-mcp `wrangler deploy`** — pushing PriceOS `dev` does NOT
  deploy this worker; it is its own Worker (`86bb4wzn5` is the deploy task).

✅ **2026-08-03 (SECOND SESSION) — FAIR DRAW IS COMPLETE MINUS THE CHAIN
CEREMONY (Brendon: "a completed feature minus actual chain stuff").** On
`dev` (tip `75e5cfb`), tree clean, type-check clean, **213 vitest green**.
ClickUp `86bb7cz4a`. The locks:

- ⛔ **THE TIMING IS SETTLED (his calls, in fury at my 24h/1h proposals —
  the feature is FAST):** window = **the opening minute (~60s)** · draw =
  seconds · **seal = seconds typically, 15-MINUTE HARD CAP** (only a
  thousands-deep battle nears it) · contested = CONGESTION ONLY (more taps
  than pieces inside one window; buys minutes apart are never contested).
  The docs' stale "a few hours" seal copy was corrected. **Never propose
  hour/day-scale waits on any part of this feature again.**
- ⛔ **THE BAND CUTS ARE SETTLED (his approval): RELATIVE, PER DROP —
  top 20% of the room = band 0, next 40% = band 1, rest = band 2.**
  Ladder = held → spend → tenure, snapshotted at window OPEN; ties break
  on the wallet (neutral); boundaries unpublished by nature. There was no
  real collector data to cut from (3 test wallets) — relative cuts
  self-calibrate forever; don't revisit.
- **Built:** drops + drop_entries tables (live DB + repo migration; held
  signed orders are SERVICE-ONLY — a held order is a broadcastable tx,
  never expose it; arrival order structurally never leaks) · entry route
  (one per wallet per drop) · banding (`lib/drops/banding.ts`) · the
  close sweep (every-minute cron: quiet → broadcast all; contested →
  snapshot → bands → beacon → draw → seats → winners → finish; cascade
  walks the drawn permutation, `voidEntry` for bot tear-ups inside the
  seal) · the public transcript page `/drops/[address]` with the verifier
  running the REAL engine in the reader's browser against the on-chain
  anchor · fair-draw docs DIAGRAMS (his ask — bands ladder, two endings,
  settlement timeline + fail-open rail, cascade strip).
- ⛔ House gotcha, learned the hard way: new tables do NOT go into the
  curated Database Tables type — the typed query path collapses to never
  (why `calls`/`listings` never joined it). Local row interfaces + cast
  reads + `as never` writes = the working idiom everywhere.
- **Remaining = chain steps, HIS actions:** settlement key ceremony
  (propose + accept on the factory, Remix), then the Sepolia rehearsal —
  which also carries the mint-button sign-and-enter wiring (needs Phase C
  app↔chain; today's mint is the chainless sim, so there is nothing real
  to sign yet).

✅ **2026-08-03 — FAIR-DRAW ROUND ONE SHIPPED** (on `dev`, tree clean,
type-check clean, **201 vitest green**): the **draw engine** — the
provably-fair core. Bands (0 first, whole-band strict) → unbiased seeded
shuffle (keccak counter-mode + rejection sampling — equal odds are EXACT) →
one full permutation: head wins, tail IS the cascade (no second draw, no
discretion). Seed = keccak(entriesRoot ‖ beacon blockhash mined AFTER
entries close) — nobody, PD included, can pick or predict it. Commitment =
keccak over the canonical transcript (what `closeWindowContested` anchors
as `drawCommit`); `verifyDraw` lets any stranger replay the draw and check
both the commitment and the on-chain seats. Also verified: the three
public fair-draw docs pages read accurate against the contract, line for
line. Two stale background monitors from the 08-02 session were killed
(his screenshot ask — nothing was still needed).
His words: **"PDMCP wow pass!! MCP got upgraded and is now stateless does
that change our build? We want state of the art. Opus did an initial pass
post-upgrade."** Brief: `docs/briefs/keychain-review-and-pdmcp.md` §2 —
read the current MCP spec (modelcontextprotocol.io), diff `workers/pd-mcp/`
against it, propose findings + a build list for his go. ClickUp `86bb78fbt`.

✅ **2026-08-02 — THE FULL PRE-MAINNET CONTRACT PASS IS DONE** (his ask:
"review ALL smart contract things… final pass before mainnet"). pd-contracts
`main` tip `9f2c5c5`, 403 forge tests green, **CI run #1 green on GitHub**.
PriceOS `dev` carries the docs round. ClickUp: `86bb5nt0f` CLOSED,
`86bb78fbt` commented. The locks:

- **KEYCHAIN REVIEW (item 1 of the queue) — CLOSED.** Verdict: contracts
  deploy-safe (all four under EIP-170), security pass clean (forge-proof
  keeper-bound attestations · replay-proof polish · art provably never
  repaints · charset-guarded names · no ETH rests). ONE real bug, fixed on
  his go (`4d6d8d1`): **the 2026-07-31 accessory tuck had only landed in the
  app** — the chain still drew crowns/halos/bows/antennae/wings floating
  high. Ported verbatim from the app engine (the parity reference), pinned
  with a placement test so it cannot drift back.
- ⛔ **THE PDFactory SIZE BLOCKER IS FIXED — the ClickUp task was NOT stale**
  (it had grown: 32,023 B, over by 7,447). The cause was structural: the
  factory embedded PDProject's ~20KB creation bytecode by running the `new`
  itself — a part-store split of factory logic could never have fixed it.
  **The fix (`9f2c5c5`): `PDProjectDeployer`**, a zero-governance satellite
  the factory spawns in its own constructor and is alone allowed to call.
  Factory now **12,035 B (12.5KB headroom)**; same one-transaction Remix
  deploy; behaviour byte-identical (suite green). ⛔ Never move the `new`
  back into the factory.
- **THE SIZE GATE EXISTS AND IS GREEN:** `script/check-sizes.sh` + a GitHub
  Actions workflow (gate + full suite on every push; deps cloned per
  foundry.lock pins). pd-contracts CLAUDE.md now names the gate part of the
  build ritual. A green suite alone is still NOT deployability.
- **Rest of the family reviewed clean** — Factory · Project ·
  PaymentSplitter · LibraryRegistry · Stickers · StickerSplitter: money
  paths, fail-open window, seal bounds, JSON/UTF-8 + URL guards, splitter
  accounting all verified against source, no defects. Integration: the
  indexer rides standard Transfer + Seaport events (immune to every shipped
  round); studio constants refresh at the next Sepolia deploy as planned.
- **PUBLIC DOCS ARE CURRENT (his ask #3):** real createProject signature
  (colorway + windowed overload) · entry window documented (fail-open) ·
  marketplace attributes · **the language shelf: p5.js · three.js · regl ·
  d3, vanilla always** · NEW Contracts—PDKeychains page (in the docs nav) ·
  storage-fee governance corrected (the ADMIN tunes the dial; the writer key
  pins previews — the old page had it wrong) · verification status tells the
  truth (403 tests, CI gate, Sepolia stack one revision behind until the
  next rehearsal).
- **The next Sepolia rehearsal now carries:** marketplace attributes + the
  factory split (verify `factory.projectDeployer()` on Etherscan too — the
  runbook §A.3 says so) + the keychain accessory fix.

**SHIPPED FROM THE QUEUE 2026-08-02 (second session):**
- **Stone** — the whole sort row (gaps included) is exempt from the
  triple-tap summon, every surface.
- **Ping popup** — a person's ping wears their **PriceSprite as the card's
  top row** (ID-row size; the kind title stands in under ASCII-ID and while
  the face loads) · a to-do reminder carries a live **MARK DONE** toggle that
  completes the real to-do in place (card stays open, recurring reschedules,
  the OPEN TO-DOS door stays).
- **Docs How lines** — 66 `**How:**` one-liners across pages + headings; the
  docs search leads with the item's How line in bold (the answer 90% of
  searches came for), body snippet as fallback. ⛔ Never invent a gesture —
  items whose door isn't on record carry no How line. (Also: collector-tools
  wore the banned ⚓ — now ♆ per the 2026-07-31 lock.)
- **Docs diagrams — 23 annotated UI schematics** (the customer-success
  pass): house SVG style (Courier · currentColor · square boxes · 4px
  controls · theme-aware), numbered callouts + a tap legend under each,
  hand-editable in the markdown. MY PD is the flagship.
- **The sort-row smileys are REAL** — ☻ rides the profile Collected sort row
  and every project gallery: tap = the home social feed's exact styling and
  blocks (streaks · scenes · albums · panoramas) scoped to that wallet's
  story / that project's outputs activity. `/api/feed/social` grew `?actor=`
  and `?project=` lenses; relationship badges still read the viewer's graph.
  ⛔ Page-local state only — nothing persists into saved sorts, Setup Codes
  or grid presets. Any real sort tap hands the grid back.
- **OWNERS + TAG-ROOM MODALS REBUILT** ("horrible; start from scratch"):
  OWNERS leads with the room's shape (owners · % unique · **TOP-3 %** whale
  read), rows wear ⚭/⚯/⚬ relationship marks and **unfold in place** into the
  owner's art strip + stake % + a FOLLOW/UNFOLLOW door; tag rooms lead with
  the room's weight (people · ◊ spent · ⬚ owned — CABAL narrows the sums
  too) and carry per-row follow doors. ⛔ The locked two-half user-row
  anatomy, the modal shell, and the shipped sorts all stayed.
- **Spot edit** — the docs ⌕ one size smaller, 2px lower (the ⌕ only, not
  the × it swaps to).
- **ClickUp reconciled** — the missing 2026-07-31 rounds are backfilled
  (`86bb7890t` · `86bb7891h` · `86bb78977`).

✅ **2026-08-02 (EARLIER) — SHIPPED TO `dev` (tip `e4c4778`, auto-deployed):
NEW USERS ☻ feed · battery pass · data-audit fixes · artcoins in the stone.**
ClickUp `86bb77te6` has the full round. The locks:

- **NEW USERS ☻** — long-press the ☻ social pill in the home sort row → the
  last 200 signups as full ASCII-ID rows (the one identity unit), viewer-local
  stamps, minute-fresh while open, rows mounted in screenfuls (the
  viewport-bound law). Rides the Followers-Manager compact shell verbatim.
- **Battery** — the tape scroll is now a pure compositor CSS animation
  (`pd-tape-scroll` + `--tape-half`; the engine's rAF drive is GONE — do not
  reintroduce a per-frame JS tape). Stargazing's placeholder frame loop no
  longer schedules; restore its rAF lines only when real draw work lands.
- **Data audit** — ⛔ **a sale in `events` is `type='XFER'` + non-null
  `price_eth`** ('SALE' is a derived label, never stored; trades are
  `sale_direction='TRADE'`, price null). The SOLD search lane, the stone
  trend, and the last-sale read were fixed for this — never filter events on
  `type='SALE'` again.
- **Artcoins in the stone** — all 54 tracked coins from the
  PD_FEEDS_fx-artcoin-feed Pools sheet (Brendon's Drive; the sheet IS the
  source of truth for WHICH coins) live in `lib/stone/tokens.ts` tagged
  `family: 'artcoin'`; typing `artcoins` deals the family as a tappable hand.

✅ **SAME DAY, SECOND ROUND — ALL SHIPPED AND SESSION WRAPPED** (PriceOS
`dev` tip `1d7cd9f`, tree clean, type-check + 192 tests green; pd-contracts
`main` tip `9f5047b`, 401 forge tests green. ClickUp `86bb787qr`):

- **LIVE FLOORS SHIPPED.** ⛔ `projects.floor_price_eth` has NO writer
  (nulled by the 2026-07-03 reset) — every floor reader now goes through
  `lib/market/floors.ts` (lowest active unexpired listing): conviction calls
  (create + resolve + cron), portfolio targets, counterparty valuations,
  search, stone trend. **Never read the stored column again.**
- **NEW USERS ☻ IS A FEED, NOT A CARD (his correction).** Long-press the
  home ☻ pill swaps the section exactly like FEED/SOCIAL — feed-row grammar,
  full ASCII-ID rectangles, minute-fresh, screenful-windowed. The popup card
  is deleted; the door and close are the section swap itself.
- **`artcoins` in the stone** deals the whole 54-coin family as a tappable
  hand (tap → that coin's live card).
- **LANGUAGE TRAIT SHIPPED ("Let's do it!!!") — Fate's exact pattern,
  settled:** platform trait pill (after Rising) · facet in every birth-order
  row · LANGUAGE shelf leading the group hold-menu (⛔ hidden on a single
  project's own page — one project = one language, the ORIENT dead-tap law)
  · `language:p5` search grammar. Value = the project's declared language
  (`ProjectDef.language`), Studio-era = the on-chain library binding; house
  engines read JavaScript. Group glyph = `{` (plain-char family; his to
  swap). Spec = `docs/languages-trait-spec.md`.
- ⛔ **LAUNCH LIBRARY ROSTER SETTLED (Brendon): p5.js · three.js · regl ·
  d3.** Audio (tone.js) and WebGPU deliberately held back. Blessing each is
  HIS one-time on-chain write at launch (~0.2–0.5 ETH total at quiet gas).
- **pd-contracts: MARKETPLACE ATTRIBUTES SHIPPED to `main`.** tokenURI now
  emits **Language** (registry "name version", copied FROZEN at construction
  — the inflaterId never-read-live discipline; "JavaScript" for vanilla),
  **Colorway** (NEW createProject param, both overloads — empty or exactly
  six BARE hex chars, no '#'/'%' — factory `_assertColorway` guard; unset
  omits the attribute), **Edition Size**. Five new tests; the differential
  fuzz reference mirrors the shape. **Rides Brendon's next Sepolia deploy;
  the PD-Docs contract pages' createProject signature is stale until that
  docs refresh.**

**WAITING ON BRENDON (his on-chain actions, his pace):** next Sepolia
rehearsal deploy carries the new attributes; library blessings at launch.
**QUEUED:** more TokenWorks strategy coins — needs his names, then verified
pins (the PNKSTR fake-clone lesson). · Studio create-flow passes colorway at
the cutover.

⛔ **2026-08-01 — OPEN ITEMS, IN BRENDON'S OWN WORDS.**

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

2. ✅ **THE COLLECTED-TAB / CONNECT-MENU LAG IS SETTLED AND SHIPPED
   (2026-08-02, `5f3a3c6`). ⛔ DO NOT RE-DIAGNOSE IT — the answer is in the
   latest round below: the gallery had lost its bound, twice over.** The
   keychain work below was real cost and stays; it was never this symptom.

   **PROFILE LAG — TWO REAL CAUSES FOUND AND SHIPPED 2026-08-01. UNCONFIRMED
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

✅ **2026-08-02 (LATEST SESSION) — THE COLLECTED GALLERY IS BOUNDED BY THE
SCREEN AGAIN** (on `dev`, tip `5f3a3c6`, tree clean, type-check clean):

- ⛔ **THE ANSWER, AND IT IS SETTLED: THE GALLERY HAD LOST ITS BOUND, TWICE.**
  A gallery's cost must be set by the SCREEN, never by how much someone holds.
  Two changes had quietly removed that, and together they made collecting a
  punishment. **Brendon found both directions himself (Rule #-3):** *"I used to
  have over 1k pieces without issue why the fuck is it loading them all"* and
  *"we see like 6 on screen at a time what the FUCK happened to the lazy
  loading we had".*
  1. **The mounted window was skipped entirely UNDER 1000 pieces** (the
     2026-07-06 solid-once-loaded pass), so a collection got **SLOWER as it got
     smaller** — 749 tiles with their hover rows and badges all built in one
     go, while 1000+ windowed and flew. **The window now applies at every
     size**: a first screenful, then grow as the viewer scrolls.
  2. **A tile that had loaded once was pinned to eager loading + a main-thread
     decode FOREVER** (2026-07-07, to kill the carousel flash). Right for tiles
     you can reach — but it applied to every tile ever scrolled past, so
     hundreds of decoded pictures stayed held. **The pinning now follows the
     screen**: near tiles keep the flash-free treatment UNCHANGED, far ones
     hand the decoded copy back and take it again a full viewport before they
     can be seen. Same observer shape and lookahead the canvas gallery already
     had (Rule #0) — the tile never leaves the page, so nothing reflows and
     nothing pops. **NO AMPUTATION: the no-flash behaviour is intact.**
  ⛔ **The lesson to carry: when tiles went from live renders to pictures, the
  canvas virtualizer's LRU bound was never carried across.** Any new tile
  surface must be bounded by the viewport before it ships.
- **Ruled out with evidence, do not re-chase:** every one of the 749 pieces he
  holds has its picture pinned in storage (swept all of them) — nothing
  live-renders, nothing self-heals in the background, no recent project or mint
  is involved, and no tile is oversized. The picture reader is NOT the cause
  (his words, and the round below is corrected).

✅ **2026-08-02 (EARLIER) — THE REAL LAG CAUSE · STICKERS · KEYCHAINS
SWITCH · GROUPING PERSISTENCE · RARITY SORT · STICKER MODES** (on `dev`, tip
`180fe78`, tree clean, type-check clean, 192 tests green. ClickUp `86bb734jz`
+ `86bb735t6`):

- ⚠️ **SUPERSEDED 2026-08-02 (later the same day) — THE PICTURE READER WAS NOT
  THE CAUSE.** Brendon: *"that wasn't the thing, this problem was just as bad
  before that change."* The double-download below was real and the fix stands,
  but it did not explain the lag. **The cause is in the round below — read that
  one.** Do not re-chase the reader.
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

- ✅ **The `PDFactory` size blocker is FIXED (2026-08-02)** — 12,035 B with
  12.5KB headroom via the deployment-arm split, and the size gate runs in CI
  on every push. ClickUp `86bb5nt0f` closed. (Full record in the round above.)
- ✅ **ClickUp is reconciled (2026-08-02).** The 2026-07-31 rounds are
  backfilled (`86bb7890t` · `86bb7891h` · `86bb78977`) and the 2026-08-02
  queue round is logged (`86bb78f8y`).
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

- **The settlement key ceremony** — create the key, propose + accept its
  address on the factory (Remix). The service ships dark behind the
  fail-open until then, by design.
- **The next Sepolia rehearsal deploy** — carries marketplace attributes, the
  factory split (also verify `factory.projectDeployer()` on Etherscan), the
  keychain accessory fix, and now the **Fair Draw end-to-end rehearsal**
  (quiet close + a forced contested close; the transcript page verifying
  green is the gate). Library blessings (p5.js · three.js · regl · d3) at
  launch.
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
