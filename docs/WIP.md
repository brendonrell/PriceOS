# WIP — Live Task State

> Single source of truth for **what's in flight right now**. The SessionStart
> hook prints this into every fresh chat's context. **Last thing before ending a
> session: update this file.** Keep it short — it's a baton, not a log.

---

- **Branch:** all work is on `dev`, pushed, tree clean. This chat's task
  branch `claude/familiar-feature-overhaul-aesgss` is trash (work is on dev) — Brendon deletes on GitHub.
  **Stale local-dev self-heals** via the SessionStart hook (re-syncs local `dev` → `origin/dev`).
- **Updated:** 2026-06-22 (latest). This session = **DIGITAL FAMILIAR overhaul + NPC CAST +
  project-follow tape gags + a big batch of spot edits** (🐉 below), all shipped to dev.
  Prior: STICKER MODE polish (🏷️), HALO 4-PROJECT (🌗), OUTPUT ATTRIBUTES (🪪), STARRED/WISHLIST (⭐).
- **QUEUED (not built):** **milestones-on-the-tape** — surface ALL project milestones (FIRST BLOOD,
  LUCKY 22, CENTURY CLUB, HALO, PER MILLE, ARCHETYPE, HI-DEF + sell-out/graduated lifecycle) onto
  The Tape. Confirmed source = the homepage milestone feed (`projects.milestones` JSONB / home feed,
  NOT the events ledger) — so this needs a global milestone source merged into `useTapeFeed`/`/api/feed`.
  Follow + unfollow gags already shipped this session; milestones are the remaining piece Brendon asked for.

## 🐉 DIGITAL FAMILIAR + NPC CAST + tape gags — shipped to dev 2026-06-22
- **Familiar:** all 35 species now selectable + animated (engine knew only 5); all tiers unlocked for
  testing; per-character personality dialogue where RANK informs TONE only (zero "respect you" lines);
  **Omniscience** (default ON, set-and-forget — reads the user's live DB record/feed, weaves non-specific
  facts in) with a modal toggle + Customize (outline off/random/color) + Energy (chill default/active/
  hyped/greed/fear/ngmi, BitDaemons scurry off-screen-and-back clipped, higher tiers move classier);
  poke-on-tap / long-press-to-open modal w/ italic thoughts + gesture hints; Old Gods drawn bigger via
  MORE CHARACTERS (not zoom); "Turn off Familiar" in modal, re-enable in spell book. Titans = SEMI-RARE.
- **NPC Cast:** 8 locked characters (Rocco/Eddie/Mick/Carl/Mimi/Romy/Steven/Celestia) live off-screen on
  side walls, speaking randomly (~12–22s). Each has a unique Unicode font (Mick = bold fraktur) + unique
  entrance anim; Courier New name label above the bubble (pure B/W per polarity, solid, subtle keyed
  shadow — white for black text); Petey-popout bubble in toast style, single solid box + JS measurer so
  it hugs its text, half-size tail; per-speak jitter; Eddie sneaks walls + gets shooed back; never
  obstructs clicks; awareness engine v1 (page/piece reactions + rare fourth-wall break). Button stays
  "NPC", toast says "NPC Cast: ON/OFF". Size pill REMOVED — plain on/off.
- **Project-follow tape gags:** project follows you on collect, unfollows when you dump your whole bag
  (read-time holders check via `from_zeroed` on the feed — no migration); rendered on all three rails.
- **Spot edits batch:** cartel icon beside @brendon (mutuals perk); spell-book icon sizes (hammer/
  arbitrage/deactivate/tarot/aura/redacted); +More tab icons (star/album); multiselect ring outside the
  hover square (half-thick desktop); +More sort remembers locally (default newest); Discord divider
  removal + desktop width cap; menu tape uses the LIVE feed (was mock); sticker store desktop stacked
  previews (uniform half-height, toggle "Sticker Store: COMPACT", MOBILE UNCHANGED); MY PD price-logo
  toast → "Logo: \$PRICE / Standard"; MY PD desktop icon nudges (stickers/ambient/price-logo).

## 🏷️ STICKER MODE — big polish pass shipped to dev 2026-06-22
- **Store** = STICKER STORE // BY PD. Carousel CTAs pinned to card bottom (no jumping); a ⊞
  **expand toggle** flips the rail into a two-up vertical grid. Empty **attention-yellow promo
  strip** above the ticker (60px tall, hidden in expanded view). Footer auto-counts live sheets
  + an **OpenSea** link. Buy **confirm modal now fires for EVERY sheet** (wallet gate removed —
  sim buy). Output sheet = **3 columns** with gutters + a **thin** kiss-cut line.
- **⊞ is now the sitewide Stickers icon** (home action row + MY PD Sticker Mode toggle); added to
  `docs/GLYPHS.md`. Was ▶ / ▣.
- **Ticker** = the store's salesman, AUTO-GENERATED from the catalog + per-sheet release dates
  (`lib/stickers/ticker.ts`): per-sheet sell lines w/ recency badges, live store facts
  (cheapest/top-shelf/newest/totals), sprite+familiar+true-name cameos, **rare eggs** (~12% of
  opens). NO quips. **FORMATTING is the ORIGINAL** (2 copies, −50%, 26s) — Brendon was furious
  about speed/size meddling; only the CONTENT changed. Do NOT touch the ticker speed/format again.
- **Manager modal rebuilt on the Ambient Light shell** (`.ambient-pop`): same swipe **windows +
  page dots**, chip rows, and a real **Sticker Setup Code** (`STCKR`, copy/paste/apply) + Surprise
  + a hidden **SPILL** word-egg. Compact STORE pill in the header. Same height as ambient. Pages:
  Layout(+Rows/Align) · Style(Tilt/Width/Flip) · Sheets+Stickers grid (grid shows ALL owned).
- **CRASH FIX (the big one):** profile hero crashed when many sheets were owned+on — Output
  stickers each paint a full generative canvas, so a hero full of them = a wall of renders. Hero
  now **SELECTS its set up front** — round-robin **balanced across the on-sheets**, capped to the
  arrangement's room, max ~4 painted-art stickers — then places exactly that (no render-then-hide).
  Wrapped in an **error boundary** so a sticker fault can never take down the profile. Expected
  case (10+ sheets all on) is handled: it samples a balanced spread, never everything.
- **Reset:** mock seed zeroed (no profile auto-seeded) + a **one-time device wipe**
  (`pd_stickers_reset_v2`) clears owned + on/off state once on load — clears Brendon's overloaded set.
- Files: `lib/stickers/{catalog,owned,heroPrefs,setupCode,ticker,sprites,logoPaths}.ts`,
  `components/stickers/{StickerArt,OutputSticker,AnimatedSticker,HeroStickers,StickerManagerModal,BuySheetButton}.tsx`,
  `components/StickersModal.tsx`, `styles/stickers.css`. Ownership is localStorage (no DB yet).

## ✅ HALO 4-PROJECT — SHIPPED to dev 2026-06-21 (commit `d145e2c`)
- 4 abstract bright-cyberpunk (anime/Promare) gen-art projects, LIVE on dev, 0 mints:
  **Lustre** (warm iridescent foil · firstchannel-ai · `#F2B01E`),
  **Bloomwater** (deep-jewel marbled ink · overprint-ai · `#1A2E8C`),
  **Voltaic** (high-voltage plasma · filament-ai · `#A3FF12`),
  **Facet** (pastel-prism cut glass · lapidary-ai · `#C9B6FF`). Each its own bespoke palette;
  given to kindred 1-project AI artists (NOT opus4-8/Brendon). Distinct soundtracks
  (Tim Hecker / Hiroshi Yoshimura / Plastikman / Sigur Rós), **staggered `uploaded_at`** to
  read as a release series. DB rows added (0 mints, milestones {}, graduated_at null).
- Built via 4-direction jury + evolution + per-project palette pass. Engines: self-contained
  TS in `lib/art/engines/{lustre,bloomwater,voltaic,facet}.ts`, wired in `registry.ts`.
  R&D harness was `tools/halo/` (gitignored renders; removed locally after ship).
- **The bug that cost this session (fixed):** ported engines first exported `traitSchema` as a
  bare array instead of `{ traits: [...] }` → `primaryTrait` (`lib/output/rarity.ts`) read
  `traitSchema.traits[0]` of undefined → client error boundary ("SOMETHING GLITCHED") + a
  `/api/outputs/traits` 500. Fix = wrap each schema in `{ traits: [...] }`.
- **VERIFIED on the live preview** (Vercel share-bypass + headless Chromium): all 4 pages
  render, art canvases draw, no error boundary; matches the `electrum` control. NOTE:
  `/api/outputs/traits` returns 500 for **every** project incl. live electrum — a pre-existing,
  harmless (fire-and-forget) route issue, NOT these projects. Lesson: verify on the real deploy
  before claiming done.

## 🪪 OUTPUT ATTRIBUTES / CHARACTER SHEET — 2026-06-20 — SHIPPED to dev
- **Stored platform traits:** Artist/Project/PriceDay/Natal/Fate + the **Output true name**
  (`outputTrueName` = project Glagolitic name + id) now persist to `outputs`, computed once from the
  mint moment + registry. UI computes live as the fallback until a row fills. Backfills as pieces are
  browsed: ArtworkCard + ArtworkLive fire `reportTraits` (own session dedupe, ungated by colour).
- **~30 deep captures** added to `outputs` (migrations `outputs_stored_platform_traits` +
  `outputs_deep_attributes`): natal element/modality/polarity/ruler/harmony; weekday/season/
  time-of-day/lunar phase+illumination (Montreal tz); I Ching hexagram number/name/glyph/upper+lower
  trigram/changing count/transform/stable; brightness/saturation/complexity bands + tone mood + colour
  temperature + orientation; edition-set rarity (trait/fate/colour count+rank+pct, overall score+bits),
  supply. Derivations live in `lib/output/derive.ts`; rarity tally (memoised per project, deterministic
  over 1..supply) in `lib/output/rarity.ts`.
- **Capture routes:** colour POST (`/api/outputs/color`) now also stores the fingerprint bands;
  new `/api/outputs/traits` POST computes+stores natal/fate/birth/rarity. `/api/outputs/colors` GET
  returns all new columns; `/api/output/[id]` returns stored fingerprint + true_name.
- **Attributes screen** (`components/artwork/AttributesPanel.tsx`, `lib/output/attributes.ts`):
  Artwork ▸ +More ▸ Attributes renders the full sheet as grouped tiles in the achievements-wall
  language (`.attr-*` in globals.css). Groups: Identity, Form, Sky, Almanac, Oracle, Rarity.
- **NOTE:** deep columns are unfilled until pieces are browsed (self-populating); the screen shows
  everything live immediately so nothing looks empty. Brightness/sat/complexity tiles need a piece to
  have rendered once (stored sample). Straggling edits expected — Brendon sending more.

## ⭐ STARRED/WISHLIST + SPRITE POLISH — 2026-06-19 (latest) — SHIPPED to dev
- **Wishlist artist line:** social tags (mutual/following/follower glyph + follower count) +
  `by:` prefix + slightly-smaller ✺ badge, mirroring Starred. Shared via `lib/social/useArtistSocial.ts`.
  Social glyph + count nudged up 1px in Wishlist only.
- **Starred:** follower count no longer underlined; mutual glyph 2 sizes larger (`is-mutual-lg`
  1.54em); desktop artist badge 18px; PriceSprite type-line truncates only near the CTA (118px, was
  150px). Collectors pill moved to first slot after All Starred.
- **Sort bar:** 'Recent' shows the ◷ recent glyph; order Recent > $PRICE > FLWRS > AZ.
- **Output page hero stats row** transplanted from profile (plain flex `.stats-row`, no `.stats-grid`)
  so it lays out identically; output's own data.
- **Showcase cap fix:** the 6-cap now counts only renderable picks (`getProject != null`), so a
  stale slug never shows an empty frame while blocking adds; stale keys self-heal on load. Brendon's
  DB showcase cleared to empty (had a dead `lettersneversent` no-hyphen slug).
- **User PriceSprite storage:** already frozen at signup (`price_sprite_resolved`); **50 legacy
  seeded users backfilled in DB**. `artistColorStore` composes the stored/derived face for starred users.
- **PriceSprite eyebrows (Windows):** ID Rectangles (held-by chip + profile identity sprite) now
  overlay each brow correctly via new `components/SpriteFace.tsx` + `winBrow.splitFace` — the
  connect-menu fix generalised to a whole face string. Apple/iOS untouched.
- **Own profile:** @name (triple-tap egg) reads as plain text (no link cursor); the PriceSprite beside
  it is the visible link → opens the PriceSprite modal, owner only. Title star 20% smaller on desktop.
- Setup Codes multi-value + audience tokens (watch metric / ping toasts / menu tape / audience) landed
  in `lib/state/SetupCode.ts`.
- **Row hover highlight** now applies to EVERY starred row type (the `.trait-row:hover{background:none}`
  override that suppressed it on trait/soundtrack/project rows is gone). **Grail pin** runs bigger +
  slightly lower on desktop. Eyebrow fix confirmed covering the profile identity sprite too.

## 🎨🥚 GENERATIVE COLORWAY — profile name easter egg 2026-06-18 (latest) — SHIPPED to dev
- **Triple-tap your OWN @name** on your Profile Page → a row of colourway pills shoves open in-flow
  under the title (pushes the hero down, never floats; tap again to close). Owner-only. Pills wear the
  faint PriceDay value-pill style (`pill-l3`).
- **Pills** (each sets Profile Colorway live via `useProfileHex.setHex`, so the Settings → Profile
  Colorway field updates in lockstep): Hothurt Red `#FF0055` · Attention Yellow `#FFE600` · Dot Black
  `#111111` · Matrix White `#E0E0E0` · fixed **@brendon Blue `#0109FF`** · the user's **own generated
  colour** (named by `classifyRgb`, e.g. Brendon = `#E33BC1` "Magenta") · a **back pill** (⇠⇠) that
  reverts to the colorway in play when the egg opened.
- **GUARANTEED UNIQUE** (Brendon's call): signature colour stored in `users.signature_hex` (partial
  unique index; column-granted anon/authenticated). Assigned + uniqueness-checked at signup
  (`uniqueSignatureHex` in `lib/profile/signatureHex.ts`, wide H×S×L generator ~200k colours), egg
  reads the stored value. **All 52 existing accounts backfilled** (migrations applied; Brendon rerolled
  through the system). Files: `ProfilePageBody.tsx`, `signatureHex.ts`, `app/api/users/create/route.ts`,
  `lib/supabase.ts`. Logged in Atlas → Profile Page → Identity.

## 🌦️ AMBIENT FX — scenes + Rays + Nature + Lightning storm 2026-06-18 (latest) — SHIPPED to dev
- **6 new scenes** (P1, total 12): Thunder · Disco · Ember · Frost · Static · Nebula.
- **P3 bottom-half, two sections** (`AmbientStrip.tsx`, `styles/ambient.css`): **Rays**
  (Off/Shafts/Beams/Halo) + **Nature** (Clear/Fireflies/Pollen/Petals/Spores — renamed from "Weather").
  Each Nature option is a DISTINCT phenomenon via box-shadow-SCATTERED particles (no drifting lattice):
  pollen rises · petals fall+tilt · spores hover+glow-pulse · fireflies = 3 out-of-sync warm blinkers.
  (Cut along the way per Brendon: rain/snow/embers, then Seeds/Dust; Rays Curtain; Sunburst never added.)
- **Lightning storm pattern** (12th pattern): Thunder = ice + lightning + fast + dim 88 — dark with a
  LONG slightly-brighter rumble flicker → SOFT flash-flash strike + afterglow + synced sky-flash overlay
  (`.ambient-flash`), NO rain (moody not scary). Reduced-motion disables the flash.
- **AMBI codes** (`lib/state/AmbientCode.ts`): lightning appended to patterns; rays+nature ride the
  11-char code. **Full round-trip verified (0 failures).** All FX independent layers → work in Sphere too.
- **KEEPERS LOCKED** (Brendon, final): Rays = Off/Shafts/Beams/Halo · Nature = Clear/Fireflies/Pollen/
  Petals/Spores. Atlas → Global UI / Persistent Layers fully synced to match.

## 🎚️ AMBIENT MENU v2 — 3-PAGE PAGER, ATMOSPHERE, EGGS 2026-06-17 (latest) — SHIPPED to dev
- **3-page swipe pager** (half-size iOS dots; remembers last page in localStorage `pd_ambient_page`):
  P1 Scenes+Color · P2 Pattern+Speed+Dim+Level · P3 **ATMO·SPHERE** (one left-label section: Glow
  [spill brightness] + Reach [spill distance] shown together; persisted/DB, NOT in the share code).
- New options: patterns **Drift + Throb**, speed **Turbo**, dim presets **Shadow(80) + Abyss(86)**
  (appended → codes back-compatible). **Setup Code** footer = slim one row + dotted UNDERLINE on the
  field (no box). Sun ☼ title glyph +2 / bold.
- **Wave hue-spin:** the BAR now hue-spins in lockstep with the spotlight (shared `amb-hue` /
  `amb-wave-bg`, same duration) so strip = the colour of the light it throws. Hue spin is a FEATURE.
- **Hidden eggs:** sun 5-tap → spectrum; hold-Surprise → nova; word-codes in the field; **tap "SPHERE"
  on P3 ×3 → the bar balls into an orb** (`sphere-mode`, transient).
- **Safari chrome when dimming (browser only; PWA untouched via `:not(.is-pwa)`):** BOTTOM toolbar
  darkens via theme-color (works) — gated in AmbientStrip dim effect + ColorwayContext + **FaviconEngine**
  (the favicon engine was the stomper repainting tint→colorway). **TOP status bar = NOT web-controllable
  on Brendon's iOS** — it ignores theme-color (tried live + boot-time at layout.tsx prehydration); left
  as colorway. Don't re-attempt without a real device. The old solid safe-area gutter bars are gated to
  `:not(.is-pwa)` (were showing as black bars in the PWA — that's fixed/confirmed).

## 📲 PWA INSTALL STEP 3 + CONVERSION TRACKING 2026-06-17 (latest) — SHIPPED to dev
- **Signup Step 3** (`components/wallet/PwaInstallStep.tsx`, wired in `AccountCreateModal`): after
  claim, OS-adaptive home-screen nudge. iOS/iPad → Share→Add instruction; **Android** → fires Chrome's
  native install (`lib/pwa/installPrompt.ts` captures `beforeinstallprompt`), circular maskable icon;
  **desktop** (mac/win/linux) → "get PD on your phone" + a real QR encoding `window.location.origin`
  (margin 4, verified decodable). Already-standalone sessions skip it. Main copy in Rubik; iOS-style
  rounded icon elsewhere. OS detect in `lib/pwa/platform.ts`.
- **Zero-cache service worker** (`public/sw.js` + `SwRegistrar` now REGISTERS, not kills): no-op fetch
  handler, caches nothing → keeps the site live (the old caching SW was ripped out for stale builds)
  while making Android eligible for the native install prompt. Real-device Android still unverified.
- **Conversion tracking** (`userState.markPwaUsed` on standalone+signed-in launch in `PriceOSShell`;
  `recordPwa` for the prompt funnel): first-party, NO migration — rides in `settings.pwa`
  (`converted_at` once + `last_used_at` + prompt seen/result). Query via `settings->'pwa'`.
- **Decisions:** no Google Analytics (third-party + crypto-audience blocking; use Search Console for
  SEO if/when). No Courier Prime — Android keeps its native mono (can't ship true Courier New; licensed).
  Notifications NOT built yet (push backend + permission ask is a separate future piece; PWA install is
  the gate, esp. iOS 16.4+). **Idea parked:** internal ads/CRM = one DB ad row + per-user stage state.

## 🎚️ AMBIENT SETUP CODES + UI FIXES 2026-06-17 — SHIPPED to dev
- **Ambient Light is its own world:** separate **Ambient Codes** (`lib/state/AmbientCode.ts`, start
  `AMBI`, no dashes) — never touches the main Setup Code. Menu rebuilt: 2-page **swipe pager** w/ iOS
  dots (Scenes+Color / Pattern+Speed+Dim), persistent **Setup Code + Surprise** footer, close ×, curated
  **Scenes**, **dim slider** (0–100, value rides in the code), section dividers, connect-menu scroll
  cap. Dimming also darkens iOS chrome + safe-area gutters (theme-color respects dim in ColorwayContext).
  Hidden eggs in there (sun 5-tap, hold-Surprise, word-codes) — undocumented on purpose.
- **Grail pins:** dropped fake hardcoded prices (all outputs UNLISTED — DB confirms 0 listings); price
  shows only for a real listing; × now sits inside the pill. **Breadcrumb** dot → colorway-fill + faint
  outline (subtle). **Artist badge:** desktop 16px/+1, mobile 19px/+1; tooltip = "✺ Official PD Artist —
  whitelisted". **Top-6 artist view** hides the colorway picker. Hover-row note icon up 1px.

## 🎚️ COLORWAY-FROM-DB + AMBIENT/SHUFFLE POLISH 2026-06-17 — SHIPPED to dev
- **Project colorway is now DB-driven** (`projects.custom_color`), registry value is the fallback —
  same standard as soundtrack. One resolver `projectColorway(slug)` in the registry; the `/outputs`
  fetch fills an override + repaints via the existing `pd:custom-color-changed` event. Every project
  keeps its own colour; artist can change it without a deploy. (Latent flash only if a DB colour ever
  differs from the registry fallback — offered to make first-paint read DB if Brendon goes DB-only.)
- **Reliquary** colorway → deep charcoal-violet `#15121d` (dim-church interior; lets the glass glow).
  Registry + DB both set so it paints instantly.
- **Ambient strip** now seats directly below the Tape with a ~10px buffer on EVERY device — offset
  mirrors the navbar's own padding per breakpoint/PWA (the notch's safe-area inset was erasing the
  gap → collision). Menu chips → 4px signature pills (were round capsules); ☼ glyph added before the
  menu title (mini LED kept). Lives in the gap between Tape and title; both on together.
- **Home Shuffle tab** + **Stickers button** show only when they fit one line; hide (never wrap)
  otherwise, re-checked on resize/rotate (JS wrap-detection, not a breakpoint). Now Minting / New
  Gen Art / Join The Chat always stay. (Stickers wrap-test uses the chat button's bottom edge — the
  two buttons differ in height and are centre-aligned, so a top-vs-top test misreads the same line.)

## 🖼️ SIX NEW GEN-ART PROJECTS 2026-06-17 (latest) — SHIPPED to dev
- Six fresh projects, artist `opus4-8`, all in `lib/art/engines/` + wired in `lib/project/registry.ts`,
  with **fresh** DB rows in `projects` (graduated_at NULL, milestones {}, description NULL, low
  minted_count, mint 0, Brendon's wallet as artist, colorway + soundtrack set). Surface under New Gen Art.
  - **Test Pattern** — homage to artplusbrad "Over the Air": flat colour-field TV grid + clustered
    digital corruption + CRT vignette.
  - **Cultivar** — homage to Zancan "YYYSEED": BOTANICAL line-work. Rebuilt to **breadth-first**
    growth (the old depth-first drained the branch budget down one path → spindly sticks); now a
    balanced frame-filling blossoming canopy with a visible trunk skeleton.
  - **Pendula** — original: harmonograph silk-knot; per-token amplitudes for variety.
  - **Boreal** — original: aurora flow-field curtains; per-token field rotation + domain warp so
    they fold not comb; Rose magenta palette added.
  - **Reliquary** — original: backlit stained-glass rose window (was rendering black — invalid
    colour-stop string; fixed).
  - **Bulletin** — original: abstract animated teletext mosaic (static in galleries, animates in
    single view at W≥320).
- All 6 run through the specialist **jury** (colour/composition/theory/creative-coding), 2 rounds.
  Perf bounded for galleries: budget caps, shadowBlur/getImageData/animation gated to larger widths,
  virtualizer LRU. Also lightened existing **Coral Logic** + **Avalanche** load (kept their look).

## 🎬 THE AUDIENCE + SPOT-EDIT BATCH 2026-06-16 (latest) — SHIPPED to dev
- **The Audience** — live per-project presence (`◐ N watching`, pulse at 10+, tap-to-reveal
  glyphs, `◌` for anon) on Supabase Realtime (`getSupabaseBrowser`). `useProjectAudience` hook +
  `AudienceIndicator` in the project header stats row. Solo-preview: `?crowd=N`. First-class
  **MY PD toggle** `audience` (default ON, `notifs.audience`, "Audience: ON/OFF"); **Degen moved
  into the Spell Book** after The Watch (hardcoded pill, keeps the auto-sort side-effect).
  Phase-2 still TODO: cross-feed swell + 100+ surge Tape-archive.
- **Tab memory** — per-user, per-project/profile last tab in the `settings` envelope
  (`tabMemoryStore`, no migration); project default = full showcase (6) → Showcase. Profile
  default tightened to `>=6 || artist`.
- **Familiar** — tap a BitDaemon to SELECT it (`setFamiliarSpecies`, live + persisted via
  `familiarSpecies` in settings). On/off + all spell/ping toggles now **write through to the
  account** (`PdNotifsContext` pushSettings + hydrate listener).
- **Ambient Light** — account-backed (`settings.ambient`); ~1/3 shorter glow, **skinnier 6px
  bar** dropped to center in the gap below the Tape, more diffuse; modal label "Color".
- **Bench** — **cap 2** (`BENCH_MAX`). Brendon LOVES the final result. **Whole art always shows**
  (canvas → natural shape, full card width, no crop/letterbox; was object-fit cover). **Masonry**:
  two pieces share width, each its own natural height (stacked = full-width column, side-by-side =
  two equal columns, top-aligned, dynamic divider). **Fit/Wide toggle** (own button, two triangles
  — toward each other = fit-both-no-scroll, apart = wide/full-size; axis-aware glyphs; works in both
  splits). Tighter gutters; stacked panel 85dvh. Drop-target highlight = uniform crisp ring (same
  shape/colour). Drag-refresh crash fix held (`ptrEngine` bows out on `body.bench-dragging`).
  **OPEN: intermittent iPhone crashing** — audited (small canvases, Audience off, no render loop,
  PTR guarded); found no code cause, likely the generic iOS memory ceiling. Brendon parking it for
  a Fable 5 stability pass; needs the exact crash trigger to pin further.
- **`by @artist` byline** — reusable `components/SectionHead.tsx` (title + optional Courier byline);
  the whole "by @name" is one non-breaking unit (never splits at the handle hyphen, wraps as a unit).
  Shuffle header uses it. Now-Minting carousels pre-wired but byline hidden (`SHOW_CAROUSEL_ARTIST`
  false; `.home-carousel-head` flex-wrap added so it's correct when flipped on).
- **Drag-to-scroll** (desktop, mouse-only) on PriceSprite / Stickers / Familiar carousels
  (`useDragScroll` + new `useDragScrollAll`).
- **Smaller:** Stargazing glyph → ✩; pingtoasts pill icon-only; note icon nudged +3px in the
  card hover row; near-black colorways inherit dark-mode treatment; mutuals-with-yourself badge;
  18 AI artists now follow @brendon (DB).

### Queued next (spec-agreed, not built)
- **Sigil** (the glyph) — permanent per-wallet, frozen, curated identity-glyph pool; access glyph
  in the PriceSprite modal; powers the Audience reveal. **Sigil Color = Factions** (Warm: yellow/
  orange/red · Cool: purple/blue/green) filed as ClickUp `86baf786c` — seed of the tribal layer.
- **Hermitage** (quiet monk profile) + **Deactivate** (renamed from Invisible — max-drama public
  exit, secretly browsing; yes/no confirm mini-modal + Tape event).
- **Tribal Alliance** — net-new; awaiting Brendon's pick (Egregore / Cartel / fresh).
- **Project-link first-load bug** (from the very first message this session) — never scoped.

## 🎨 ARTIST SHOWCASE + VIVID MOOD 2026-06-15 (latest) — SHIPPED to dev
- **Artist Showcase = Now-Minting view, scoped to one artist.** New showcase style `artist`
  (`ShowcaseStyle` + `lib/profile/showcaseStyle.ts effectiveShowcaseStyle` over the legacy
  `grid` unset marker → whitelisted artists default to it, **no data migration**; PATCH /api/me
  accepts it; settings gate via new `/api/me/artist`). Showcase tab renders `HomeProjectFacetBar`
  over the artist's projects with **Created · Top 6** lead pills replacing Artist+Project
  (`ARTIST_SHOWCASE_FACETS`); Top 6 = curated grid (`compact`). `HomeProjectFacetBar` gained
  `facets`/`leadPills`/`compact` (home call site unchanged). Stats from extended **/api/artist**
  (uploaded_at/graduated/sold_out/milestones). Traditional Top-6 artists get **Created as the
  first +More sub-tab** instead — created work always reachable.
- **Empty Collected → ghost frames** (normal layout, no blank).
- **Own-profile CTA → "Followed"** opens the Followers modal (Join-the-Chat removed there).
- **Home byline** credits @brendon with real follower count + mutual badge (hidden at 0) —
  same treatment as artist names on project pages.
- **Mood ring palette VIVID** (`lib/mood/mood.ts` + `app/layout.tsx` boot-paint in lockstep):
  old 38–85/42–76 read washed out → **sat 62–100, light 40–60**; deep days auto white text,
  bright days black. `HUE_SALT` 20→55 (today = rich purple).
- **Still-local note:** the artist showcase facet bar shares the profile's single TraitsContext
  with Collected (showcase predicate restricted to its own facets so Collected filters can't
  nuke it); separate providers would fully isolate if it ever matters.

## 🏠 HOME = A REAL DRAW 2026-06-15 — SHIPPED to dev
- **Now-Minting transplant:** home wears the full profile-Collected control surface over
  **projects** (each carousel = one "thing"). Facet pills from each project's **birth moment**
  (upload time) — Artist · @name · PriceDay · Sun · Moon · Rising · Fate — computed live (same
  model as outputs, **no DB**) via `projectTraits`/`projectFate` in `lib/project/registry.ts`.
  Colorway picker, search, **mint-price** range. Sort = Date(birth) · $ Mint · Feed. **Local
  sort, OFF the global SortContext.** New `components/home/HomeProjectFacetBar.tsx`. **Date sort =
  graduation recency** so a freshly-graduated project pops to the top.
- **PROJECT MILESTONES (new):** `lib/home/milestones.ts` — count-based, stamped on the crossing
  mint, backfilled live, all flowing into the feed: First Blood(1) · Graduated(12) · Lucky 22 ·
  Century Club(100) · Halo(777) · Per Mille Club(1000) · Archetype(1200) · Hi-Def(4000) ·
  **Ascension** (sold out). New DB cols on `projects` (added + backfilled live): `graduated_at`,
  `sold_out_at`, `milestones` jsonb. Mint route stamps them (best-effort, never fails a mint).
  **Status facet = milestone tier** (sold-out excluded). Each event has its own iOS-safe glyph
  (see `docs/GLYPHS.md` §8); ⟢⟢ Graduated intentionally bigger; ‰ Per Mille in Inter.
- **Feeds standardized:** both Now-Minting Feed and New Gen Art use the SAME row — icon · date ·
  ACTION (with time stacked beneath, same size) · title. Capped to a column on desktop. Upload =
  ✧ (mint star ✶ stays for real mints).
- **Fate pill = hexagram (䷲), pinned last** on home AND profile Collected (matches project page).
- **SHOWCASE FIXED + DB-BACKED:** the gallery ⑆ was a stub (toasted, never saved) — now wired,
  and `userShowcaseStore` is **account-backed** (writes through to `users.showcase`, hydrates on
  login), capped at 6 → "FULL · 6 max" toast.
- **Offline service worker REMOVED** (was serving stale builds online): `public/sw.js` self-
  destructs, `SwRegistrar` unregisters + clears caches. Runs straight from network now.
- **Profile fixes:** identity copy-icon never clips + sits right; ▶ play icon back on the
  soundtrack/share button (stays regardless of label); own-profile CTA = "Join The Chat".
- **Misc:** mood-ring hue salt rerolled (today = periwinkle); New-Uploads top spacing; Shuffle
  byline ("Project by @artist", Courier) + pre-ready-on-exit (no flash of old project); live
  **flipping featuring row** restored jump-free (locked height); Noise From Below gold restored.
- **DEFERRED / QUEUED (ClickUp Backlog):** project **+More tab** birth-traits readout;
  **all-pages landscape audit**. Persist derived project traits to DB only if on-chain/indexer/
  OpenSea need it (decided: compute live).

## 🧰 SPOT EDITS 2026-06-15 (later) — SHIPPED to dev
Brendon's 8-item spot-edit pass; **6 shipped**, 2 set aside on his word (48kb thumbnails —
he hadn't attached the contract repo; Safari chrome-sampling regression — deferred).
- **Add-to-Showcase picker (NEW):** on your OWN profile the empty-showcase ghosts are now
  tappable → a bottom-sheet picker of the Outputs you hold; tap to feature/unfeature. Own-
  profile showcase grid now reflects those picks live. Source = the existing device-local
  `userShowcaseStore` (same store the output-modal ⑆ button writes; NOT yet cross-device /
  DB — that's the account-backed follow-on). New `components/profile/AddToShowcaseModal.tsx`.
- **Profile activity feed (NEW):** a FEED sort on the Collected tab (`ProfileFacetBar`) swaps
  the grid for this wallet's own ledger events; **ghosts when empty, never hidden** (mirrors
  the project page). Backed by `/api/feed?address=…` (new address filter on the global feed
  route). Shared row mapper extracted to `lib/feed/feedRow.tsx` (project copy left as-is).
- **Ownership/listing-aware artwork CTA:** the output-modal button is now driven by LIVE
  market data (real SIWE wallet via `/api/output/[id]/market` — added `listing` to the read),
  not the seeded `isOwnedByBrendon` flag. own+unlisted→LIST, own+listed→UNLIST, else listed→
  BUY (cart, works), else MAKE OFFER. **No secondary market yet (Brendon) → LIST/UNLIST/OFFER
  are correct-but-placeholder toasts awaiting wiring; ⑆ Add-to-Showcase works today.**
- **+More gutter (systemic):** `#albums-panel`/`#details-panel` now carry the standard page
  gutter themselves (children's redundant h-padding zeroed), so anything added under +More
  inherits the margin instead of going flush-left. Fixes the recurring misalignment.
- **Footer:** top buffer doubled (20→40 / 16→32); opacity 0.35→0.46 (~30% more visible).
- **De-yellow project bgs:** 8 mustard/gold/amber `colorway` values in `lib/project/registry.ts`
  swapped for non-yellow (Turing's Garden→green; others blue/teal/terracotta). **Oracle KEPT
  (#C4902A), Prisms KEPT (#E8FF47), turf-war lime kept** for consistency with Prisms.
- Build verified (`npm run build` clean) + compiled CSS spot-checked. Two parked items above
  await Brendon (contract repo for thumbnails; a clean repro/identification for the Safari fix).

## 🎯 PROFILE + FAVICON + SPOT EDITS 2026-06-15 (late) — SHIPPED to dev
- **Profile hero:** PriceSprite moved out of the @name row into the identity line (replaces
  "Via"), inherits the row colour + full opacity; long ENS auto-shrinks to stay one line on
  mobile (JS fit, never wraps). **Own-profile CTA** in the follow slot: "Mutuals" (opens
  Followers modal → Mutuals tab) at ≥3 mutuals, else "Discord".
- **Favicon (regression, fixed twice):** now repaints on ANY `--bg-color` change via a style
  MutationObserver (rAF-coalesced). It previously only fired on colorway-KEY / route change, so
  on profiles it stayed on the prehydration default (off-white) until something nudged it
  (Brendon's minute-long delay). Tracks every page bg promptly now, sitewide.
- **Discord link standardized:** single source `lib/config/discord.ts`; home/footer/dropdown/
  profile CTA all import it.
- **Dev-login "Login Brendon" button RESTORED on the preview** (S-A1 secret gate reverted — it
  blocked desktop testing; counterproductive in build phase). Production still hard-walled.
  Other security-pass items (RPC halving, handle reservations, pings privacy DB migration) left
  intact — not blocking and not clean to revert.
- **Spot edits:** PriceDay pills read "PriceDay #1"; shuffle icon mobile bigger+nudged; profile
  Followers stat icon bigger+nudged; Bench export uses the export-plate glyph ⍈ (not copy) +
  desktop action icons unbolded; artwork hover row note +2 / grail +1 + vertically centred;
  footer middle row baseline-aligned (Today's Stars no longer drops).

## 🪑 THE BENCH + CART + AMBIENT STRIP + ZEN GARDEN 2026-06-14→15 — SHIPPED to dev
- **The Bench** (OS Tool / Comparison, `86b9jfjc3`): **drag-only, ONE bottom tab.** Hold-drag
  (touch + mouse) a piece → the tab peeks up → drop on it (or the CART drop target when listed).
  Adding **recedes** it to a slim peek (viewport clear); **TAP** the tab to pull the full
  comparison up (side-by-side price/floor/note, portrait↔landscape split, native-share image
  export). Each listed card carries the canonical ▢ add-to-cart icon. **NO buttons/panels** — an
  earlier pass wrongly added a modal pill, gallery hover icon, cart icon, top-bar button + a
  separate button-opened tray; all stripped → birthed "BUILD TO SPEC — NOTHING EXTRA". **Crash
  fixed:** live drag position moved to a module store (was re-rendering every gallery card 60fps
  → mobile-Safari crash).
- **Cart → full potential:** real painted art thumbnails, per-item floor delta, savings-vs-floor,
  sweeping motion on BUY ALL.
- **Cart + Bench are now PROPER DB FEATURES (06-15):** per-user, cross-device via `cart_items` +
  new `bench_items` (owner-scoped, same secure pattern as `/api/me`; anon denied; RLS
  `*_own_only`). `/api/me/cart` + `/api/me/bench` (GET / PUT-replace) + `lib/collections/
  useCollectionSync` (UNION-merge device+server on sign-in, debounced save; logged out =
  localStorage). **Cart "sold-drops-out-on-login" auto-remove NOT wired** — the `listings` table
  is empty, so auto-deleting on it would wrongly EMPTY carts; activates with real listings/
  indexer data. "Only listed can be ADDED" is already enforced at add-time.
- **DESKTOP premium bench — BUILT (06-15):** ≥960px, pulling the tab up opens a roomy centred
  gallery-grade panel (360px art tiles, generous spacing, focus backdrop, tap-outside to recede);
  mobile's compact bottom sheet untouched. **Only remaining open item = the cart sold-removal
  above (waiting on real listings data).**
- **Ambient Strip:** LED light bar BELOW the tape, **OFF by default** (☼ toggle in MY PD, the
  slot Echo Chamber vacated). Tap the bar → options popup (palette/pattern/speed/dim); real
  glow + page dim. **Built blind — wants a visual tuning pass on dev.**
- **Zen Garden** (`86b9jfjc3` sibling): Profile, **Zen Mode only** — portfolio as ASCII stones
  (⬟/⬣) in raked sand (≋) raked into rings around each stone. Pure aesthetic.
- **Settings reshuffle:** Echo Chamber → Spell Book (new ≫ icon); Mood Ring removed from Spell
  Book (handled elsewhere). **Price Lens left ALONE — it's live (floor-relative pricing), not a
  placeholder.**
- **Spot edits:** Now-Minting ghosts 6→12 (locked to carousel size); mood-ring footer icon now
  visible on home; mobile shuffle icon size + centring; **24h clock everywhere** (no AM/PM);
  tape null-state ("nothing happening right now…"); removed the ALL/MONEY pill from the Pings
  header (filter scaffolding kept dormant to re-home later).
- **The Exchange** (`86ba0apqr`): decision = **existing-contract approach** (lean on audited
  swap infra, no own contract). **TODO: park in ClickUp with a robust spec** — NOT done yet.

## 🐛 ASTERISM MINTING + PROFILE-READ FIXES 2026-06-14 (late) — SHIPPED to dev
Brendon hit "Internal server error" minting Asterism + broken profile/artworks reads. Two
regressions, both from recent infra changes (NOT the project additions he suspected):
- **Minting 500** — the pings install dropped the old `notifications` table but left its
  `events` fan-out trigger (`fan_out_event_notifications`) behind, still INSERTing into the
  dead table. Fired only when the minting wallet had a @handle + followers (so fresh test
  wallets minted fine, Brendon's didn't). **Dropped the dead trigger + function** (live +
  `supabase/migrations/20260614_fix_mint_drop_dead_notifications_trigger.sql`).
- **Profile / follows / achievements 500** ("permission denied for table users") — the
  security sweep narrowed `users` to column-level grants; the later PriceScore/PriceStreak/
  best-streak columns never got an anon read grant, so every public profile read errored.
  **Granted anon/auth read on just those 3 public reputation columns** (private cols stay
  locked) — live + `..._fix_public_reputation_grants.sql`. One grant fixed all 4 broken routes.
- **Swept the rest:** every other public read checked — nothing else broken. Inbox privacy
  (pings/ping_cursors service-role-only) is correct & intact.
- **Stars/wishlist** confirmed private-by-design (live in `users.settings`, not broken).
  **Dropped the two empty unused `stars`/`wishlist` scaffolding tables** (live +
  `..._drop_unused_stars_wishlist_tables.sql`). If ever promoted to first-class: MUST stay
  private (owner-scoped) — a public-read table would leak everyone's wishlists. Brendon's
  open call, not built.
- Commits on dev show GitHub "Unverified" (badge only) — this container has no commit-signing
  key; committer identity is correct. Cosmetic, no code impact.

## 🐾 DIGITAL FAMILIAR + NPC CAST 2026-06-14 (eve) — Familiar SHIPPED to dev
**Familiar modal → bestiary** (`components/FamiliarModal.tsx`, `lib/familiar/bestiary.ts`,
`styles/modal.css`). The empty "settings coming soon" placeholder is now a videogame-style
**collection screen**: live floating hero of your companion, a discovered tally, four tiers as
tile rails — **BitDaemons** (16, common, live; current badged YOURS) + **Titans** (7),
**Ascended** (6), **Old Gods** (6) shown locked-but-visible *with their art* so you see what's
earnable. Mobile-first, theme-var only, mirrors PriceSprite + Sticker idioms. Build clean.
- **Art = Gemini-designed this session, Claude-curated.** First-pass, multi-line ASCII via `\n`.
  **Known fix:** Leviathan's `⫿`/`⎈` glyphs don't render (tofu) — swap. Other tall pieces may
  need width normalizing on a real device (not pixel-tested from the container).
- **Unlocks are placeholders** (Brendon tunes later; 1k achievements = levers). FOLLOW-ON build:
  wallet-binding (companion stays YOURS per wallet, not random per-page), bond/growth, live-event
  dialogue, and animating the tall multi-line tiers in the corner (footprint cap ~3–4 rows keeps
  them out of the way).
- **NPC Cast** (separate feature, DESIGN ONLY — banked on ClickUp task `86b9fcp11`): 8 residents —
  Rocco (snob) · Eddie (gossip) · Mick (chronicler) · Carl (Eeyore) · Mimi (predator,f) · Romy
  (warm,f) · Steven (normal) · Celestia (tarot mystic,f). Voice = offhand/deadpan, NO zingers
  (took many passes — references make me copy; "be cool" + extreme-but-grounded is the lane).
  Shares the dialogue reservoir with the Familiar. **Voice-scaling (many lines/character) = NEXT
  CHAT.** Guardrail: market-commentary voices hit patterns, never real names.

## 🛡️ COMPREHENSIVE SECURITY SWEEP 2026-06-14 (master: `docs/security/SECURITY_SWEEP_2026-06-14.md`)
Site-wide adversarial read-only audit (10 parallel auditors → `docs/security/findings/01-10`).
Covers EVERYTHING incl. the indexer (excluded last time) + a LIVE Supabase probe. NO code changed.

**Strong:** contracts clean (no crit/high/med, all 5 incl. PDStickers/PDLibraryRegistry); the
spoof-artist→mint→sellout money path is CLOSED end-to-end (3 locks); prior C1/H1/H2 scoring
exploits VERIFIED fixed (sybil reputation is dead via GAMEABLE_SCORE_CAP); art is genuinely
fully on-chain, "forever" grade A−; no takeover write path, no committed secrets, no admin tier.

**Live issues to fix (off-chain, no money at stake yet):**
- **HIGH S-D1** — pings/ping_cursors readable by ANYONE with the public anon key incl. **p2p DM
  bodies + amounts** (policy `USING(true)` despite "PRIVATE"). NEW, from today's pings ship. Fix first.
- **HIGH S-A1** — `dev-login` = become Brendon on the public preview (prod safe).
- **HIGH S-P1/P2** — Alchemy-budget burn via `price/[address]` cache-key + whole-table reads (`home` etc.); limiter doesn't stop them.
- **HIGH S-I1** — free-text `ens_name` (no ownership/charset check) = artist copycat (visual/phishing only).
- **MED** — limiter fails open/per-instance unless Upstash env set (CONFIRM in Vercel); SIWE chainId/consent unbound; PII anon-readable; handle confusables + missing reserved words.

**Indexer (built, NOT live yet) — pre-launch must-fix:** transfer handler doesn't gate to tracked
PD projects (S-X1), reconcile cron public if CRON_SECRET unset (S-X2), assert signing key at boot
(S-X3); verify `events (tx_hash,log_index)` unique constraint exists in live Supabase.

**Cloudflare move:** good for perimeter (DDoS/WAF/bot) NOT app/data/contract liability; headers won't
carry (need `public/_headers`), req.ip limiter trust won't carry (re-do as edge rules). Keep
service-role key a server-only CF secret; stay on supabase-js.

**Before mainnet (contracts):** run Foundry suite for real, external audit + assembly byte-equivalence
proof, Etherscan bytecode verify. Also: 35 of 41 migrations not in repo; confirm Supabase PITR.

**STATUS — fix batch run on Brendon's "take it as far as you can" (2026-06-14). All build-verified
(`npm run build` clean) + on `dev`:**
- ✅ Reserved-handle list blocks authority/verification impersonation words (`official`,`verified`,
  `mod`,`root`,`system`,`notification(s)`,`announcement(s)`) — S-I3.
- ✅ `ens_name` now rejects invisible/bidi/control characters used for artist copycats (S-I1, the
  charset half; full ENS-ownership verification still TODO).
- ✅ `price/[address]` memoises constant token decimals → 1 Alchemy call/request not 2 (S-P1, partial).
- ✅ `supabase/migrations/20260614_pings_privacy.sql` — **APPLIED to live DB 2026-06-14** (S-D1, HIGH).
  Briefly rolled back during a site-outage triage that turned out UNRELATED (a `useToast`-outside-
  provider error, fixed in another chat), then RE-APPLIED on Brendon's go. Verified: RLS on + 0
  policies on `pings`/`ping_cursors` → anon reads nothing; service-role app path unaffected (bypasses
  RLS). The DM-bodies leak is CLOSED. Confirmed this change never affected the app.
- ✅ **dev-login become-Brendon hole CLOSED (S-A1).** On the public preview it now requires a
  `DEV_LOGIN_SECRET` env + matching `x-dev-login-secret` header; disabled when unset. Local dev
  unchanged. The on-screen button now renders only on localhost (hidden on preview to avoid a dead
  button). To use dev-login on preview again: set `DEV_LOGIN_SECRET` in Vercel + call with the header.

**STILL OPEN — genuine walls (need env/infra/on-chain/money, not code I can ship here):**
- **Rate-limit / DDoS (the big one)** — needs Upstash env keys set in the deployed env, OR (better)
  Cloudflare edge rules at the migration. No env tool in this container. The Alchemy-burn + whole-
  table-read HIGHs are only FULLY closed by this. Until then the per-instance fallback is the only brake.
- **`public/_headers`** for the Cloudflare move (do at migration; would serve a stray file on Vercel now).
- **Indexer pre-launch (S-X1/2/3)** — fixable in code but belongs with indexer go-live, which is gated
  on Brendon's Alchemy webhook setup (not live yet); do them in that workstream.
- **Contracts** — external-firm audit + assembly byte-equivalence proof + Etherscan verify (money/Brendon).
- **Defense-in-depth (not live-exploitable):** SIWE chainId/consent binding (risky to bind before the
  target chain is settled), body-size limits, owner-scoped RLS, anon PII grant tightening — left
  rather than risk breaking working reads/login without Brendon's input on targets.

## 🔔 SHIPPED 2026-06-14 (PM) — PINGS / NOTIFICATIONS SYSTEM (on `dev`, all DB applied, build clean)
The platform-wide notification spine — "Pings" (PD's word for notifications).
Started from a half-built stub (read API + a mock panel); now a full system.

- **Two streams, merged at read time** (`app/api/pings/route.ts`):
  - **Directed inbox** — stored, one row per recipient (`lib/pings/createPing.ts`):
    follow, project-follow→artist, **mint MILESTONE**→artist (1/10/25/50/100/250/
    500/1000…, not every collect — Brendon's call), offer, sale (buy), offer-
    accepted, achievement (self), p2p. Self-suppress + muted-suppress + "+N
    others" rollup, race-guarded by a partial unique index.
  - **Broadcast firehose** — ZERO stored rows (`lib/pings/broadcast.ts`):
    "people/projects you follow did X", computed off shared `events` ⋈ follow
    graph + per-user watermark cursor. Reads BOTH transfer sides so "someone you
    follow BOUGHT this" surfaces.
- **Wishlist Pings** (= the "watchlist") `lib/pings/wishlist.ts`: a listed/sold on
  a wishlisted token pings the wishlisters (jsonb reverse-lookup over
  `users.settings.wishlist`, GIN-indexed; resolve-once + bulk insert).
  **STARS stay silent** (Brendon: stars = low-stress bookmark, never a ping;
  wishlist is the opposite — buy-intent → financial pings).
- **Delivery = $0 polling, NOT realtime.** SIWE has no Supabase-Auth identity →
  can't row-scope a private realtime channel; 200-conn free cap. Cheap **directed**
  count poll (15s) drives the live badge; full feed on open/own-action; a PUBLIC
  `events` realtime nudge makes directed (money) pings near-instant.
  `lib/state/PingsContext.tsx`.
- **UI:** unread **circle badge** on connect button + PINGS panel header (iOS
  style); panel renders REAL pings (mock removed); **ALL/MONEY filter**; **PING**
  button on profiles (p2p compose via value-prompt, mutuals-only). Glyphs = PD's
  canonical set, matched 1:1 to the settings pills + achievement map
  (`lib/pings/render.ts`), verified via a headless screenshot pass.
- **Pingtoasts** = 4-stop cycle **OFF→MONEY→SOCIAL→ALL** (Brendon's "Reese's cup"):
  pill cycles (`MyPingsRow.tsx`), `pdNotifs.pingToasts` boolean→mode with
  back-compat coercion; live toast shows the actual ping, scoped to mode.
- **Archival:** inbox is a LEDGER — reads never delete; financial-signal pings
  kept 365d, social 30d; kind-aware prune (opportunistic + pg_cron). `lib/pings/tiers.ts`.
- **Scale-hardened** (reviewed by subagents): firehose off the count poll, events
  indexes, bulk wishlist fan-out, rollup unique guard, broadcast unread derived
  from the listed items (badge always matches the panel).
- **DB applied (Supabase `zspxpfwlwikdxwavffjn`):** `20260614_pings.sql` (unified
  `pings` + `ping_cursors`; dropped stale `notifications`/`pings`), `_pings_wishlist.sql`
  (settings GIN), `_pings_retention.sql` (tiered prune cron), `_pings_events_idx.sql`
  (events from/to/project × ts), `_pings_group_unique.sql` (open-rollup unique).
- **Glyph glossary:** `docs/GLYPHS.md` — canonical PD Unicode icon vocabulary so
  future sessions never guess icons. (ClickUp MCP **down again** this session →
  put it in the repo, which is the better home anyway.)

**Deferred (Pings):** exhaustive site-wide glyph sweep to APPEND to `GLYPHS.md`
(a research agent was still running at wrap — sprite/calendar/nav glyphs); the
broadcast-unread badge counts regardless of client category-prefs (intentional;
clears on open); H3 could go fully-atomic via a Postgres RPC (the unique-index
guard is sufficient for now); device-pixel sign-off of glyphs on a real iPhone.

## ✅ SHIPPED 2026-06-14 — on `dev` (DB migration applied + verified)
- **Social graph.** Follow people AND projects (Twitter-style) + follower/
  following/mutuals tags. **Bag mechanic:** owning a project's piece makes the
  project follow YOU; selling drops you — a user's follower count includes the
  projects they hold. Followers modal has a real **Projects** tab.
- **Smart social row.** "Followed by" (profiles, live) / "Collected by"
  (projects, server-ranked) surfaces the 2 most relevant faces via
  `lib/social/relevance.ts` (connection strength → PriceRank → jitter), cap 2
  (mobile), hidden when no tie. Homepage "Featuring" row already did this.
- **PriceRank system (skeleton).** PriceScore (number) · PriceRank (tier,
  `lib/achievements/tiers.ts`) · PriceStreak (activates day 60, hard reset, local
  midnight). **Generic engine** `lib/achievements/engine.ts` (+ `/api/achievements/
  [address]`, `/api/achievements/evaluate`, `/api/streak/ping`) scores from the
  real ledger — anti-bot by design. `PriceRankSync` fires evaluate on deliberate
  actions, ticks streak once/day, pops unlock toasts, refreshes the badge live.
- **Achievements wall** — profile +More tab + the identity-modal rail
  (`components/achievements/AchievementsGrid.tsx`), secret/locked as "???".
  Catalog = **~350** (`lib/achievements/catalog.ts` core + `catalogs/ladders.ts`),
  freely editable. Lore: God of PD (`brendon.ts`, hands down Mjölnir), Odin
  (`odin.ts`), Oil Rider, angel numbers, math/gen-art eggs, KOL/GMI.
- **PriceSprite on profiles** — small still Courier face beside the @name.
- **Anointing BACKEND to spec** (`docs/anointment-egregore-spec.md`): one Pledge/
  account, Cult/Egregore levels (`lib/anoint/levels.ts`), Prime Relic, 60-day lock
  (`/api/anoint`). Catalog anointing tier reworked to match.
- **DB (Supabase `zspxpfwlwikdxwavffjn`):** applied — `projects.handle` backfilled
  (all 50), `project_follows`, `anointments`, `user_achievements`, `seasons`,
  `season_standings`, + users progression cols. Migration file:
  `supabase/migrations/20260614_pricerank_social.sql`.

## 🔒 SECURITY AUDIT 2026-06-14 — audit + first fixes SHIPPED to dev (full report: `docs/SECURITY_AUDIT_2026-06-14.md`)
Read-only audit of PriceOS + pd-contracts + pd-price-token (indexer excluded —
being rewritten). Both contracts clean (no crit/high/med). No committed secrets,
no IDOR, SIWE solid. The exploitable risk was all in the gameable PriceRank/
scoring layer.

**FIXED + on dev (Brendon approved push 2026-06-14):**
- **Gameable score cap** (`GAMEABLE_SCORE_CAP=10`, `engine.ts`). Free/off-chain/
  sybil achievements (stars, wishlist, albums, follows, anoints, streak, easter
  eggs) STILL unlock + pop toasts for feedback, but their COMBINED score is
  capped at ~10 of the ~12,000 scale → farming can't reach even tier 1. Rank
  comes only from un-fakeable on-chain facts. Catalog untouched (Brendon retunes
  freely). `tiers.ts` "free grinder maxes mid-tiers" note updated to match.
- **Honest curation badges** — counts only DISTINCT well-formed `slug:id` keys;
  fabricated arrays / empty albums no longer mint tier badges.
- **Streak un-forgeable** — client `localDate` bounded to real server time.
- **No raw DB error leaks** — `serverError()` logs server-side, returns generic.
- **Security headers** — frame/nosniff/HSTS/referrer/permissions in next.config.
- **Tighter per-IP caps** on auth/social/scoring routes + trusted `req.ip`.

**STILL OWED (not code-fixable from here / product calls):**
- **Upstash shared limiter** — needs the env keys set in Vercel (no env tool
  here; deprioritized — switching to Cloudflare Pages soon, and the score cap
  already makes farming pointless; rate-limit is now defense-in-depth).
- **Deeper RLS** — owner-scoped write policies + "no body-supplied address in
  writes" test, then apply to live Supabase (prod-data gated).
- **Contracts** — external-firm audit + library-reader assembly byte-equivalence
  proof before mainnet.
- **Token** — pin GitHub Action SHAs + post-deploy Etherscan bytecode verify.
- **Product call:** should streak / social EVER be a meaningful earner? Currently
  capped to nothing. If yes, they need on-chain gating, not just the cap.
- **ClickUp** — still owed: file the audit + these fixes once the connector is
  reconnected (it hard-failed all session).

## ⚙️ INDEXER 2026-06-14 — serverless rebuild DONE (repo `PriceOS-indexer`, branch `claude/indexer-alchemy-setup-tuezqu` — NOT in PriceOS dev)
- **Pivoted off Ponder/Railway → serverless Alchemy webhook → Supabase**, with a
  Vercel Cron reconcile sweep as the delivery backstop. $0 at launch scale.
  Built, typechecks clean, pushed to the indexer branch. **Ponder fully removed.**
- Idempotency hardened (no double-count of mints/volume on replay), webhook
  signature verification, address auto-registration helper. Both prior open
  questions resolved: the filtered GraphQL Custom Webhook IS free-tier; the
  address-registration API is wired.
- **Full done + what's-left breakdown:** `PriceOS-indexer/docs/HANDOFF.md`
  (+ `docs/INDEXER_SPEC.md`, `docs/ALCHEMY_SETUP.md`).
- **LEFT to go live (needs Brendon):** create the Alchemy webhook on Sepolia →
  hand over its signing key + id; then transplant the routes into PriceOS
  (`app/api/webhooks/alchemy` + the cron) on his green light; deploy a test
  Project to Sepolia; first run flips the ~7 mocked chain-derived API routes to
  real Supabase reads. NOT in dev until that transplant.
- **ClickUp connector FIXED for next session:** the all-session "requires
  approval" failures (both this chat's indexer update AND the security-audit
  items still owed) were a **missing permission allow-rule, NOT a bad
  connection** — now allow-listed for every MCP connector incl. GitHub in
  `~/.claude/settings.local.json`. A FRESH chat reads it at startup and should
  post with zero prompts; mid-session edits don't reload, which is why it kept
  failing live this session.

## ⏭️ OPEN / NEXT (none blocking; Brendon doing edits in a fresh chat)
- **Anointing UI** — backend done, NO on-screen way to place a Pledge yet.
  Build: anoint button + conduit picker on project/output, project level +
  progress + Egregore tab at L2, Prime Relic pin + owner clout badge. Fire
  `pd:anoint-changed` so PriceRankSync evaluates.
- **Project `/@name` routing** — handles exist in DB; the bare/`@`-prefixed
  project-handle URL resolution in `lib/slug.ts` + `app/[slug]/page.tsx` is NOT
  wired (only a 2-entry static set today). User @names already route.
- **Vault → 1,000 achievements.** Re-run the themed batch generators (math /
  gen-art, mythology, behavioural/easter-eggs) — those agents were generated but
  LOST in a container reset (only `ladders.ts` committed). Each is a new
  `lib/achievements/catalogs/<theme>.ts`; wire its import into `catalog.ts`.
- **Achievement ICONS** — every achievement needs a small ASCII/glyph icon
  (`icon?` slot added; grid uses per-category fallback today). Run icon-pass
  subagents per theme.
- **Editing achievements** = edit `lib/achievements/catalog.ts` (names/blurbs/
  points/secret in place; ids are permanent). Engine reads it generically — no
  engine change needed to retune.
- **Deferred design calls (Brendon's):** PriceRank-weighted anoint votes (Sybil
  resistance; v1 is 1 acct = 1 vote); season reset job; leaderboard surface;
  Discord role sync (low-maintenance periodic recompute); calibrate Cult/Egregore
  thresholds (~100/~500 placeholder); calibrate rank tier thresholds vs new max.
- **ClickUp wrap OWED** (still — the connector **hard-failed every call this
  session**: ~10 attempts across 4 methods all returned "requires approval" from
  the ClickUp endpoint while GitHub MCP worked fine; Brendon is reconnecting it).
  Next session, once reconnected: (a) mirror the prior social/PriceRank ship,
  close shipped items; (b) file the **9 security-audit items above** as Backlog
  tasks, priority-ordered, assigned to Brendon + due date + assigned comment.
- **Verify on dev preview** — pushed but not eyeballed through the live app this
  session; worth a visual pass (social rows stay hidden until real ties exist).
