# PD Glyph Glossary — the canonical Unicode icon vocabulary

> **For every future Claude session: DO NOT GUESS ICONS. Look here first.**
> PriceOS uses **VS-15 text-presentation Unicode glyphs** as its iconography —
> a base character followed by **U+FE0E** (written `︎` in code). They render
> as monochrome **Courier** text glyphs (never emoji), which means they're free
> in toasts, labels, and feeds — it's just text. This file is the source of
> truth for which glyph means what, and how each is sized.

All glyphs below ship with a trailing `︎`. Codepoints are the base char.

---

## 1. Market / trade actions (canonical — from the MY PINGS settings pills)

These are the authoritative market glyphs. Defined on the settings pills in
`components/dropdown/settings/MyPingsRow.tsx` and used everywhere market events
surface (pings, tape, feeds).

| Concept | Glyph | Codepoint | Where it's canonical |
|---|---|---|---|
| Collected / mint | ✶ | U+2736 | `#sn-mints` pill |
| Listed | ✹ | U+2739 | `#sn-lists` pill |
| Offer | ✦ | U+2726 | `#sn-offers` pill |
| Transfer / xfer | ✸ | U+2738 | `#sn-xfers` pill |
| Mutual / follow (social) | ⚭ | U+26AD | `#sn-mutualsOnly` pill |
| Pingtoasts toggle | ⇡ | U+21E1 | `#sn-pingToasts` pill |
| Silent / night mode | ⏾ | U+23FE | `#sn-nightmode` pill |

---

## 2. Pings — notification kind → glyph

The Pings inbox + toasts (`lib/pings/render.ts`). Each kind wears the **same**
glyph that concept wears elsewhere in the app (the panopticon principle).

| Ping kind | Glyph | Codepoint | Notes |
|---|---|---|---|
| `MINT` (collected) | ✶ | U+2736 | matches MINTS pill |
| `SALE` (your piece sold) | ✶ | U+2736 | collected family |
| `LIST` (broadcast listing) | ✹ | U+2739 | matches LISTS pill |
| `OFFER` | ✦ | U+2726 | matches OFFERS pill |
| `OFFER_ACCEPTED` | ✦ | U+2726 | offer resolved |
| `XFER` (transfer) | ✸ | U+2738 | matches XFERS pill |
| `FOLLOW` | ⚭ | U+26AD | mutual / social |
| `PROJECT_FOLLOW` | ⚭ | U+26AD | mutual / social |
| `WISHLIST_HIT` | ✛ | U+271B | the artwork Wishlist glyph (NOT a heart) |
| `WATCH_HIT` | ✛ | U+271B | watch (wishlist family) |
| `STREAK` | ◈ | U+25C8 | streak category glyph |
| `ACHIEVEMENT` | ◍ | U+25CD | the canonical achievements icon; an unlock's own catalog glyph overrides when present |
| `WATCH_HIT` · mutual | ⚭ | U+26AD | interest ping — mutual acted (2026-07-12 pings redesign) |
| `WATCH_HIT` · artist | ✺ | U+273A | interest ping — starred artist acted |
| `WATCH_HIT` · project | ⬚ | U+2B1A | interest ping — starred project moved |
| `WATCH_HIT` · trait | ⨝ | U+2A1D | interest ping — starred trait moved |
| `WATCH_HIT` · rarity | ❖ | U+2756 | interest ping — top-10-rarest piece moved in a held project |
| `PING` · todo reminder | ❍ | U+274D | To-Do due (the To-Do glyph) |
| `PING` · calendar reminder | ▦ | U+25A6 | calendar day item (the Calendar glyph) |
| `PING` · Artist Push | ✺ | U+273A | the artist speaking to holders |

> ⚠️ **No hearts** for wishlist. PD's wishlist glyph is **✛ (U+271B)**, taken
> from the artwork action bar. A `♥`/`♡` is a per-user tape *sigil*, never a
> wishlist icon.

---

## 3. Collection / artwork actions (`components/ArtworkCard.tsx` `.hi-icon`)

| Action | Glyph | Codepoint |
|---|---|---|
| Star (bookmark) — on / off | ★ / ☆ | U+2605 / U+2606 |
| Wishlist | ✛ | U+271B |
| Album | ◰ | U+25F0 |
| Note | ⊟ | U+229F |
| To-Do | ❍ | U+274D |
| Grail Pin | ⟟ | U+27DF |
| Cart | ▢ | U+25A2 |
| (open / detail) | ⟙ | U+27D9 |
| Showcase | ⑆ | U+2446 |
| Mute (Hammer) | ⟙ | U+27D9 |

> **Output stars are silent; taste stars are LOUD (revised 2026-07-12,
> Brendon's pings redesign).** Starring a PIECE stays a low-stress bookmark —
> never generates a Ping. Starring an ARTIST (✺), PROJECT (⬚), or TRAIT (⨝)
> is a declared interest and now DRIVES the interest Pings above. Wishlist
> remains the strongest signal (buy intent → financial Pings).

> **To-Do done state** (`components/dropdown/TodosBox.tsx`, 2026-07-04) — a
> completed To-Do flips **❍ (U+274D, pending) → ✓ (U+2713, done)** and the row
> strikes through + sinks to the bottom. ✓ is a NEW glyph in the vocabulary —
> device-verify it renders as monochrome TEXT on iOS before final lock (the #1
> glyph gate); if it tofus, swap it. Deliberately NOT the filled circle ● (that's
> the Audience presence dot, §10).

### Showcase-mode toggle (`components/dropdown/settings/MyPdSection.tsx`)

The profile Showcase style cycles through an OCR-dingbat family (U+2446–U+2449).
Cycle order (Brendon, 2026-06-20): **Artist › Static › Generative › Gen Curated**
— Artist only appears for whitelisted artists who've released ≥1 project.

| Style | Glyph | Codepoint |
|---|---|---|
| Static | ⑆ | U+2446 |
| Generative | ⑇ | U+2447 |
| Gen Curated | ⑈ | U+2448 |
| Artist | ⑉ | U+2449 |

> **Gen Curated** added 2026-06-20 (auto-curates the collection into themed
> sets). Its glyph and **Artist**'s were **swapped** the same day — Gen Curated
> took `⑈`, Artist took `⑉` (Brendon). The toggle's base `Showcase` glyph in the
> §3 table (`⑆`) is the Static/default face.

### Multi-select per-row indicator (Starred / Wishlist rows)

The selectable-row badge reuses the canonical gallery multi-select glyph
(`.ms-check-badge`): **❐ (U+2750)** unselected → **▣ (U+25A3)** selected. The
Starred/Wishlist rows adopted it 2026-06-20 (they previously drew a plain box,
which read as the Cart `▢`). Never use the Cart `▢` (U+25A2) for selection.

---

## 4. Achievement category glyphs (`components/achievements/AchievementsGrid.tsx`)

Fallback glyph per achievement category, used when an achievement has no `icon`
of its own. Rendered at 22px (`.ach-cell-glyph`).

| Category | Glyph | Codepoint | | Category | Glyph | Codepoint |
|---|---|---|---|---|---|---|
| primary (minting) | ◍ | U+25CD | | curation | ✦ | U+2726 |
| trading | ⊟ | U+229F | | identity | ◉ | U+25C9 |
| social | ⊙ | U+2299 | | rank | ❖ | U+2756 |
| projects | ⌗ | U+2317 | | artist | ✺ | U+273A |
| anointing | ✢ | U+2722 | | lore (easter eggs) | ⁂ | U+2042 |
| streak | ◈ | U+25C8 | | og (longevity) | ⌖ | U+2316 |
| myth (the Odin arc) | ⍟ | U+235F | | | | |

> **rank / PriceRank = ❂ (U+2742)** — the "sun" glyph (circled open-centre
> eight-pointed star). Moved off `❖` on 2026-06-16 so `❖` (U+2756) is free for
> **RARITY** sitewide (Brendon). Update any new rank surface to `❂`; never use
> `❖` for PriceRank again.

> **myth = ⍟ (U+235F)** — added 2026-07-02 with the MYTH achievement section
> (the Odin arc). Shares the ringed star with the Spell Book's Stargazing pill —
> already iOS-proven there; context disambiguates (same precedent as ◉, §7).

> **Achievements icon = ◍ (U+25CD)** — the striped/barred circle shown on the
> achievement tiles. This is the canonical, app-wide "achievements" mark (not
> just a tile fallback): the single source of truth lives in
> `lib/achievements/icon.ts` (`ACHIEVEMENTS_ICON`). The achievement-unlock Ping
> falls back to it, and the **PriceRank** Network filter pill inherits it
> (Brendon, 2026-06-27). Deliberately NOT the `❂` rank-sun above — PriceRank's
> pill wears the achievements icon, on purpose.

### Gallery grouping glyphs (the standalone GROUP toggle — Brendon, 2026-06-16; redesigned 2026-07-12)

Grouping is a **standalone icon-only toggle leading every groupable sort row**
(project page · Collected · Starred/Wishlist rows) — no direction arrow, one tap
advances the surface's grouping cycle. It no longer rides inside each sort
button's cycle (the 2026-06-18 "one-button grid sort" design is retired). At
rest (no grouping) the toggle wears **⁘ (U+2058, GROUP toggle resting face —
the four-dot cluster, "pieces grouped")** — NEW glyph, Brendon's pick
2026-07-12 (replaced the first-pass ▥ the same day; ▥ is free again); device-
verify per the #1 glyph gate. While a grouping is live the toggle wears that
dimension's glyph below and lights like an active sort. The settings DEFAULT
SORT row leads with the same pill (icon + dimension name) — it sets the saved
DEFAULT grouping that boots the app and re-applies on project entry. One glyph
per dimension:

| Group | Glyph | Codepoint | Source |
|---|---|---|---|
| none (resting) | ⁘ | U+2058 | the toggle's resting face (four-dot cluster); group HEADERS still show no glyph |
| Artist | ✺ | U+273A | the artist-category glyph (§4) |
| Project | ⬚ | U+2B1A | the project stats-row dotted square (`.stat-icon-box`) |
| Artist + Project | ✺⬚ | — | two-level combo (artist over project) |
| Owner | ⌂ | U+2302 | holder / where the piece lives |
| Dominant colour | ◉ | U+25C9 | the Haze dropper (samples colour — see §7) |
| Artist + colour | ✺◉ | — | two-level combo (artist over colour) |
| Project + colour | ⬚◉ | — | two-level combo (project over colour) |
| Owner + colour | ⌂◉ | — | two-level combo (project page — owner over colour) |
| Last sold $ | $ | — | coming soon |
| Rarity | ❖ | U+2756 | freed from rank for rarity sitewide — **REAL since 2026-07-16** (pdRarity tiers, the Vault's read) |

**The 2026-07-16 expansion** (Brendon: "way more group options… deep cuts deep
in the cycle") — every face reuses an existing meaning or a plain character
(the `$` precedent); values resolve in `lib/state/groupDimensions.ts`:

| Group | Glyph | Codepoint | Source |
|---|---|---|---|
| Listed | ✹ | U+2739 | the canonical Listed star (§1) |
| Fate | ䷲ | U+4DF2 | the Fate facet-bar L1 pill glyph (already shipped) |
| Temperature (warm/cool) | ° | U+00B0 | plain char (`$` precedent) |
| Light (brightness bands) | ◑ | U+25D1 | the lunarGlyph disc family (shipped in Celestial); NOT ◐ — that stays Shadow's |
| Mood (tone words) | ~ | U+007E | plain char |
| Orientation | ▭ | U+25AD | block-element family (long-proven text) |
| Moon phase | ○ | U+25CB | the lunarGlyph full-moon disc (shipped in Celestial) |
| Zodiac (natal sun) | ⍟ | U+235F | the sky/Stargazing star — context disambiguates (the ◉ precedent) |
| Born on (weekday) | ▦ | U+25A6 | the Calendar square (§7) — a birth-day read |
| Faction | ⚐ | U+2690 | the war banner (§13); the faction itself stays a colour, per the war rule |
| Numerology | # | U+0023 | plain char — id classes (The First · Palindromes · Primes · Round Numbers · Sevens) |

> Grouping headers are **collapsible**: a small triangle leads each header —
> ▾ (U+25BE) open, ▸ (U+25B8) folded — and tapping the row folds its pieces
> away. Folding a section also folds its sub-headers. (Brendon, 2026-06-18.)

---

## 5. Per-glyph sizing — Courier, and which glyphs need nudges

There are **three** treatments these glyphs render under. They are NOT the same
size, so matching a panel row to a toast requires pinning values.

| Slot | font | size | notes | source |
|---|---|---|---|---|
| `.notif-item .n-icon` (Pings row) | Courier New forced | **14px** | width 16px, centered, opacity .9 | `app/globals.css` |
| `.st-icon` (settings pill) | Courier | **16px** + per-glyph nudges | `transform: translateY` per glyph | `app/globals.css` |
| toast (`.ens-copy-toast` etc.) | Courier New forced | **12px** bold | glyph is inline in the message string, no per-glyph span | `app/globals.css` |
| `.ach-cell-glyph` (achievement tile) | Courier | **22px** | no nudge | `app/globals.css` |

**Glyphs that mis-size at base and need a nudge** (PD already proves this on the
settings pills, and the Pings panel mirrors it via `.ping-ic--<KIND>`):

- **⚭ (U+26AD, mutual/follow)** — renders **small**; bump up (pill → 20px; Pings
  panel → 17px).
- **✶ (U+2736, collected/mint)** — renders **small + low**; bump up + raise
  (pill → 18–20px, `translateY(-1/-2px)`; Pings panel → 16px, `translateY(-1px)`).
- The heavy four/eight-point stars **✸ / ✹** read large/dark — leave at base or
  pull down a step if matched against the lighter ✦ / ✛.
- **✛ (U+271B, wishlist)** is tall + thin — vertical-align sensitive.
- The rest (✦, ◈, ◉, ❖, etc.) sit clean at default.

> Verification note: exact glyph metrics are **font-dependent**. PD targets
> Courier; the per-glyph nudges above were tuned against real devices (iOS
> Courier). A Linux/headless box uses a Courier *clone* (Courier 10 Pitch /
> Liberation Mono), so it's good for **relative balance + "is it missing"**
> checks, but final pixel sign-off is a real device on the dev preview.

---

## 6. Tape / ticker per-user sigils (`lib/data/tapeEvents.ts`)

Decorative per-handle sigils on the scrolling tape — **not** kind icons. Examples:
☀ (U+2600), ⚙ (U+2699), ⚡ (U+26A1), ♥ (U+2665), ♦ (U+2666), ◈ (U+25C8), ✶ (U+2736).
These belong to a *user*, never to an action.

---

## 7. Conventions

- Always append **`︎`** (VS-15) so the glyph renders as text, not emoji.
- **Strictly non-emoji / 100% iOS-safe.** A glyph is allowed only if iOS renders
  it as a monochrome TEXT glyph, never a colour emoji. Many symbols carry an emoji
  presentation iOS applies even WITH VS-15 — ☘ (shamrock), ☀ ♥ ♦ ⚡ ⚙, dice ⚀–⚅,
  ✴, ❄, ⚛, etc. — BANNED here regardless. Verify a new glyph on a real device
  before locking it. (Brendon, 2026-06-15.)
- **▦ (U+25A6) = Calendar** (connect-menu panel, `CalendarPanel.tsx`; also the calendar-reminder Ping glyph since 2026-07-12).
- **◊ (U+25CA) = ETH (secondary mark)** — the lozenge the sticker store prices in
  (`components/stickers/BuySheetButton.tsx`), reused for To-Do ETH targets/budgets
  and the war-chest meter (`styles/todos.css`). **NOT the Greek Xi (Ξ)** — that's
  wrong and is being purged; **NOT the lined lozenge ⟠ (U+27E0)** — that's the
  volume / grail-pin feed. The plain no-line lozenge (Brendon, 2026-07-04).
- **◉ (U+25C9) = Haze-mode dropper / colour-sample tool** (`ColorwayPicker.tsx` —
  grabs the live page bg into the Haze slot). Reused as the **dominant-colour
  grouping** glyph (dropper = sampling colour). Distinct from its §4 identity-
  category achievement use; context disambiguates. (Brendon, 2026-06-16.)
- **▧ (U+25A7) = Swatches** — the character sheet's tappable hex-chip tile
  (`lib/output/attributes.ts`). NOT ▦ (Calendar, reserved) and NOT ▩ (Entropy
  Visualizer). (2026-07-11.)
- **≍ (U+224D, "equivalent to") = Closest Sibling / genome kin** — the
  character sheet's nearest-kin tile (`lib/output/attributes.ts`). NOT the
  Haze variation family ≋≊≅≃≂ and NOT the copy glyph ⧉. (2026-07-11.)
- **⧉ (U+29C9) = COPY** — copy-to-clipboard affordance (address/ID copy in
  ProfilePageBody, ProjectMorePanel, AmbientStrip, StickerManagerModal).
  Never reuse for anything else. (Noted 2026-07-11.)
- **↗ (U+2197) = SHARE** — catalogued as the PD share/send glyph, kept in the
  vocabulary. NOTE: the share buttons themselves wear the **▶ play mark**, not
  ↗ — Brendon reverted the ↗-on-buttons trial 2026-07-15 (the play icon reads
  better to him); ↗ stays reserved here for future share/send use. Brendon's
  pick 2026-07-14 from a 20-option round — chosen for a clean "send this
  outward" read with zero flag/report baggage (a lone ⚑ was misreading as
  "report this account"). Device-verify as monochrome text on iOS per the #1
  gate.
- **Podium medals ❶ ❷ ❸ (U+2776–U+2778)** = the top-3 ranks on every
  leaderboard (PriceScore · Clubhouse · Lane Runner). Filled negative-circled
  digits; ranks 4+ stay plain numerals. The Clubhouse keeps ⛳ for #1 (its
  leader flag) and wears ❷ ❸ for 2nd/3rd. Paired with a faint descending row
  tint, NO colour (Brendon, 2026-07-14). Device-verify per the #1 gate.
- Force **Courier** (`'Courier New', Courier, monospace`) anywhere a glyph shows.
- When a glyph doesn't fit a context, it's fine to **omit** it rather than force
  a mismatched icon (taste call — Brendon, 2026-06-14).
- The eye should land on the *new state*, not the category — toast casing puts
  the changed thing in ALLCAPS.

---

## 8. Project milestones — home activity feed (`lib/home/milestones.ts`)

The home feed's project-lifecycle events. All iOS-safe text glyphs, deliberately
distinct from the reserved market stars (✶✹✦✸). Per-glyph size/alignment nudges
live in `app/globals.css` (`.af-ic--*`).

| Event | Count | Glyph | Codepoint | Note |
|---|---|---|---|---|
| Uploaded | — | ✧ | U+2727 | a new piece arrives |
| Graduated | 18 | ⟢⟢ | U+27E2 ×2 | doubled — entered Now Minting |
| First Blood | 1 | † | U+2020 | first mint (sized down a touch) |
| Lucky 22 | 22 | ♧ | U+2667 | white club = clover/luck (☘ is emoji — banned) |
| Century Club | 100 | Ⅽ | U+216D | Roman numeral 100 |
| Halo | 777 | ⬭ | U+2B2D | tilted oval halo (raised — it sits low) |
| Per Mille Club | 1,000 | ‰ | U+2030 | the logo mark, rendered in **Inter** |
| Archetype | 1,200 | ✻ | U+273B | six teardrop-spoke asterisk — Archetype’s glyph, KEPT, never retire (Brendon, 2026-06-16) |
| Hi-Def | 4,000 | ⬢ | U+2B22 | crystal facet |
| Ascension | sold out | ▲ | U+25B2 | rising triangle (filled; moved off △ so Top Holders could take the hollow △, Brendon 2026-06-24) |

> **Stargazing Mode** (Spell Book pill, `SpellBookSection.tsx`) now wears **⍟
> (U+235F)** — the ringed star, freed from PriceRank (which took the sun `❂`).
> Archetype keeps its own glyph `✻` (U+273B), unchanged. (Brendon, 2026-06-16.)

---

## 9. Project True Name — the secret-name glyph identity (`lib/project/trueName.ts`)

Every Project gets a permanent, unique **True Name** — a 4-letter word in
**uppercase Glagolitic** (the oldest Slavic alphabet; we use the Christian angle
— *Glagolitic* means "the word / to speak"). The community speaks a Project into
being and the True Name is what gives it its identity (the golem / "true name"
mythos). Shown under **Social** in the project's +More panel; searchable later.

| Field | Value |
|---|---|
| Script | Glagolitic, **uppercase only** |
| Codepoints | **U+2C00–U+2C2E** (the 47 uppercase letters) |
| Length | 4 letters per name |
| Namespace | 47⁴ = **4,879,681** unique names |
| Render class | `.project-true-name` (`app/globals.css`) |

Examples (live): PRISMS = `ⰅⰒⰗⰚ`, ORACLE = `ⰓⰆⰬⰏ`.

> **⛔ iOS COMPATIBILITY IS ESSENTIAL — and these glyphs PASS (Brendon,
> 2026-06-16).** Any glyph PD ships MUST render as monochrome text on iPhone or
> it is dead on arrival — this is the #1 gate for every glyph in this doc, not a
> footnote. Uppercase Glagolitic (U+2C00–U+2C2E) is **verified rendering
> natively on iOS 26 / iPhone 12** with NO bundled font. (Lowercase, the astral
> scripts — cuneiform, Linear B, Tai Xuan Jing — and any new set are NOT assumed
> safe: device-verify before locking.) This is distinct from the VS-15 system
> glyphs in §1–§8, which carry the trailing `︎` and force Courier; True Name
> letters are plain BMP letters, no VS-15.

---

## 10. The Audience — live presence (`components/project/AudienceIndicator.tsx`)

Per-project "people here right now" read in the project header stats row. The
indicator dot **breathes** continuously while the room is live (so it reads as
real presence, not a toggled "watching" button).

| Slot | Glyph | Codepoint | Note |
|---|---|---|---|
| Live presence indicator | ● | U+25CF | solid dot, always breathing; distinct from the portfolio **Shadow** half-circle ◐ (U+25D0) |
| Present watcher (reveal) | ● | U+25CF | one dot per live viewer |
| Anon / signed-out watcher | ◌ | U+25CC | dotted circle, dimmed |
| MY PD **Audience** toggle | ● | U+25CF | same dot as the feature (was ◐) |

> ◐ (U+25D0) stays the **Shadow** portfolio-pill glyph — the Audience moved to a
> solid ● so the two no longer read as the same thing (Brendon, 2026-06-18).

---

## 11. Settings toggles & Spell Book — 2026-06-18 reshuffle

| Control | Glyph | Codepoint | Note |
|---|---|---|---|
| Spell Book **Redacted** (was Portal slot) | @ | U+0040 | Arial, bold; same glyph as the old MY PD Redacted toggle. Drives `redactedMode` |
| Spell Book **Price Ghost** | ᗝ | U+15DD | reassigned from the retired **Portal** pill |
| Spell Book **The Watch** | ⬬ | U+2B2C | solid horizontal oval — echoes the live MINTED stat chip's oval shape; the free twin of Halo's hollow ⬭ (U+2B2D, §8), so the ellipse family is iOS-proven (Brendon, 2026-06-20) |
| MY PD **ASCII-ID** (back in the Redacted slot) | ⍢ | U+2362 | also lives in the PriceSprite modal; both drive `asciiId` |
| **Stickers** (sitewide) | ⊞ | U+229E | the canonical Stickers icon — home action row, MY PD Sticker Mode toggle, the store's expand control, and the Sticker Manager title. Replaced the old ▶/▣ (Brendon, 2026-06-22) |
| **Workflows** ☇ | ☇ | U+2607 | Brendon's pick (2026-07-05) — the TEXT lightning (never the ⚡ emoji, which is banned). Lives beside the To-Dos `+` (its only entry) and titles the Workflows sheet. Device-verify on iPhone per the #1 glyph gate |

> **Portal** retired (it did nothing): its slot became **Redacted**, its glyph
> ᗝ moved to **Price Ghost**, and Price Ghost's old ⦾ (U+29BE) is freed. The
> Redacted toggle left MY PD for the Spell Book; **ASCII-ID** returned to MY PD
> in its place. (Brendon, 2026-06-18.)

> Grouping-collapse triangles (§4 note) sized up: ▾/▸ now render at 26px.

---

## 12. Starred / Wishlist row surface — 2026-06-19

The profile +More Starred + Wishlist row lists, their sort bar, the per-row
square tiles, and the top-bar Grail-pin pills.

| Concept | Glyph | Codepoint | Where |
|---|---|---|---|
| **Trait** (the trait icon) | ⨝ | U+2A1D | Starred trait-row square tile + the top-bar **trait** Grail pin. Replaced the old ★ tile (Brendon, 2026-06-19) |
| Recent (sort) | ◷ | U+25F7 | the 'Recent' sort in the Starred/Wishlist sort bar shows this glyph (same icon as the project artworks trait pills); sort order is Recent ◷ → $PRICE → FLWRS → AZ. Also the home Now-Minting **date sort** — the word DATE is retired, the clock wears the slot (2026-07-12) |
| Soundtrack (row tile + Grail pin) | ▶ | U+25B6 | soundtrack row square + the top-bar **soundtrack** Grail pin leading glyph |
| Project (row tile) | ⬚ | U+2B1A | project row square |
| Artist / Collector (row tile) | ✺ / ☻ | U+273A / U+263B | artist vs collector row square |
| Grail Pin (per-row toggle) | ⟟ | U+27DF | the pin toggle above each row's ✕ (matches §3); bigger + lower on desktop |
| Artist badge (beside @name) | ✺ | U+273A | Starred + Wishlist artist rows; one size smaller on desktop, slightly smaller again in Wishlist |

**Social relationship glyphs** — beside an artist/collector @name in Starred and
Wishlist rows (and the held-by / collected-by chips):

| Relationship | Glyph | Codepoint | Note |
|---|---|---|---|
| Mutual | ⚭ | U+26AD | renders large here — drawn two sizes up from the others |
| Following (you → them) | ⚯ | U+26AF | bumped one size to match |
| Follower (them → you) | ⚬ | U+26AC | bumped one size to match |

> **⨝ (U+2A1D) is a math operator** — it's the new Trait icon (Brendon,
> 2026-06-19). Like every glyph here it must device-verify as monochrome text on
> iOS before it's locked; if it tofus, it needs a fallback.

> **PriceSprite eyebrows on Windows** (not a glyph — a render note): the eyebrow
> combining marks (U+0300 grave / U+0301 acute / etc.) don't anchor over the eye
> in Windows Courier New. The ID Rectangle (held-by chip + profile identity
> sprite) and the connect-menu sprite overlay each brow's spacing twin above the
> eye on Windows only. Apple/iOS render the combining marks natively and are
> never touched. (`lib/sprites/winBrow.ts`, `components/SpriteFace.tsx`.)

## Platform tools (2026-07-12 build — Cartography · Rewind · Dispatch)

| Tool | Glyph | Codepoint | Notes |
|---|---|---|---|
| Cartography (living map) | ◫ | U+25EB | from the feature's own task name (`FEATURE · Cartography ◫`); modal header + docs |
| The Rewind (time scrubber) | ◄ | U+25C4 | the spec's candidate glyph, adopted; RewindBar banner |
| The Dispatch (morning paper) | ▤ | U+25A4 | NEW — printed-page square; leads the home news rail pill. No collision (▥ freed 2026-07-12 stays free) |
| Takeover | ⚑ | U+2691 | the raid flag; profile inscriptions, cast sheet, Offers-HQ badge. Deliberately NOT ◈ (spec draft used it, but ◈ is the streak glyph). Renamed from "Hostile Takeover" 2026-07-14 |
| Composer (query builder) | ⊚ | U+229A | Brendon's pick 2026-07-13 from a 20-option round — math's composition operator (f∘g), the truest "compose". Wears: modal title, Spell Book pill, SAVE AS PROGRAM, Programs shelf. Replaced the spec-era ◎, which moved to Price Lens the same day. Device-verify per the #1 gate |
| Price Lens | ◎ | U+25CE | took the bullseye from the Composer (Brendon, 2026-07-13) — the lens you read prices through. MY PD pill + docs feature index. Frees **⌾ (U+233E)**, Price Lens's old mark. The Genome's docs entry (which also wore ◎) moved to ≎ the same day — no collision |
| The Genome | ≎ | U+224E | Brendon's pick 2026-07-13 — the stacked kin-pair, deliberate blood-relative of ≍ Closest Sibling (§7) so the two kinship reads rhyme. Docs feature index + any future Genome surface. Device-verify per the #1 gate |
| Composer launcher arrow | ⤤ | U+2924 | Brendon's pick 2026-07-13 — trails "launch Composer ⤤" on the Global Search first-row launcher (the open-elsewhere hook arrow). Only there; not a general "open" mark. Device-verify per the #1 gate |

> All three ship with the trailing VS-15 `︎` like every glyph here, and carry
> the standard #1 glyph gate: device-verify as monochrome TEXT on iOS; if one
> tofus, it needs a swap.

## 12b. Celestial Tracker — the birth-sky trio (2026-07-17 redesign)

The Celestial Tracker spell renders each Output's astrological **big three**
as a silent glyph run (card top edge · output title): **sun sign · TRUE
mint-moon phase disc · rising sign**, in that order — Sun/Moon/Rising is the
astrological convention, so **the order IS the label; no words render**
(Brendon, 2026-07-17 — words and the hexagram focus were the old tracker's
failure). Data is the real natal engine (`lib/project/natal.ts`, the Montreal
sky at mint) + the proven lunarGlyph discs.

| Concept | Glyphs | Codepoints | Notes |
|---|---|---|---|
| Zodiac signs (sun + rising) | ♈♉♊♋♌♍♎♏♐♑♒♓ | U+2648–U+2653 | ✅ **iOS device-verified 2026-07-17** (Brendon's iPhone, all 12 + the trio render monochrome text with VS-15) — family LOCKED |
| Moon phase | ○◔◑◕● + waning twins | (lunarGlyph) | already shipped/proven — the disc's inline opacity IS the illumination at mint |

## 13. THE WAR — Factions glyphs (2026-07-13 build, spec v3.1 §11)

One vocabulary across the ceremony, the tape, pings, the Book, and the
Cartography war layer. Canonical constants: `lib/factions/factions.ts`
(`WAR_GLYPHS`). The faction itself never wears a glyph — the faction IS the
colour; a swatch/flag in the faction hex is its only mark.

| Concept | Glyph | Codepoint | Notes |
|---|---|---|---|
| Corner (quadrant, fallen) | ▟ | U+259F | block-element quadrant — the corner IS a quadrant; mirrored per corner via CSS transforms |
| Siege (contested ground) | ▞ | U+259E | opposing quadrants — two colours contesting one square |
| Banner (swept / conquest) | ⚐ | U+2690 | the HOLLOW flag. Deliberately NOT ⚑ (U+2691) — that's Takeover's, and the takeover is money while the banner is war |
| The Book of Conquests | ≣ | U+2263 | ledger lines — the chronicle |
| Struck from the stone / the crypt | ‡ | U+2021 | double dagger — kin to First Blood's single † (§8), struck twice |

> All five ship with the trailing VS-15 `︎` and carry the standard #1 glyph
> gate: device-verify as monochrome TEXT on iOS (block elements + daggers are
> long-proven text; ⚐ shares ⚑'s already-shipped family) — if one tofus, swap
> it before the war UI locks.

### The Sigil (generative — like True Names, not a fixed glyph)

**THE SIGIL** (`lib/sigil/sigil.ts`, 2026-07-13) is a per-wallet generative
3–4 glyph rune-string — deterministic from the address, forged once,
permanent. Its glyph POOLS are part of this fixed vocabulary and are
**LOCKED**: edges `⟨⟩ ❮❯ ◁▷ ⌐¬ ⌜⌝ ⌞⌟ ⟦⟧ ‹›`, cores
`✦ ◆ ❖ ✛ ◈ ⌖ ✜ ⊕ ✚ ◍ ❂ ⍟ ✢ ⟡ ✣ ◉`, sides `· ∙ : ⋮ — ~ ≡ ° ∴`, plus
combining accents above/below (the PriceSprite-eyebrow mechanic). Changing a
pool re-rolls every forged tattoo on the platform — append-only, Brendon's
sign-off required, device-verify any addition per the #1 gate. Grammar rules:
no brow-curve edges, no mirrored squiggle flanks (faces are banned — a Sigil
is never a Sprite), no cross/dagger strokes (martial reads are banned).
Renders wherever a name renders: after the @name (tape · navbar · profile),
the carousel Sigil ring, the corner-logo override, the Marginalia stamps.

---

*Source files: `components/dropdown/settings/MyPingsRow.tsx`,
`components/ArtworkCard.tsx`, `components/achievements/AchievementsGrid.tsx`,
`lib/pings/render.ts`, `lib/data/tapeEvents.ts`, `app/globals.css`
(`.notif-item .n-icon`, `.st-icon`, `.ach-cell-glyph`, toast rules).*
