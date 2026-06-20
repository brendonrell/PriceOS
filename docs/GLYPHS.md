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
| `ACHIEVEMENT` | *(its own)* | — | uses the unlock's catalog glyph; falls back to ✦ U+2726 |
| `PING` (p2p message) | ✉ | U+2709 | direct message |

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
| Mute (Hammer) | ᚦ | U+16A6 |

> **Stars are silent.** Starring is a low-stress, frequent bookmark — it never
> generates a Ping. Wishlist is the opposite (a buy-intent signal) and DOES
> drive financial Pings.

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

> **rank / PriceRank = ❂ (U+2742)** — the "sun" glyph (circled open-centre
> eight-pointed star). Moved off `❖` on 2026-06-16 so `❖` (U+2756) is free for
> **RARITY** sitewide (Brendon). Update any new rank surface to `❂`; never use
> `❖` for PriceRank again.

### Gallery grouping glyphs (the cycling sort modifier — Brendon, 2026-06-16)

Grouping is the small cycling character on the active sort pill (like FEED's `$`),
first state always = none. One glyph per dimension:

| Group | Glyph | Codepoint | Source |
|---|---|---|---|
| none (resting) | *(none)* | — | pure sort — NO glyph shown (Brendon, 2026-06-18) |
| Artist | ✺ | U+273A | the artist-category glyph (§4) |
| Project | ⬚ | U+2B1A | the project stats-row dotted square (`.stat-icon-box`) |
| Artist + Project | ✺⬚ | — | two-level combo (artist over project) |
| Owner | ⌂ | U+2302 | holder / where the piece lives |
| Dominant colour | ◉ | U+25C9 | the Haze dropper (samples colour — see §7) |
| Artist + colour | ✺◉ | — | two-level combo (artist over colour) |
| Project + colour | ⬚◉ | — | two-level combo (project over colour) |
| Owner + colour | ⌂◉ | — | two-level combo (project page — owner over colour) |
| Last sold $ | $ | — | coming soon |
| Rarity | ❖ | U+2756 | freed from rank for rarity sitewide |

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
- **▦ (U+25A6) = Calendar** (connect-menu panel, `CalendarPanel.tsx`) — reserved.
- **◉ (U+25C9) = Haze-mode dropper / colour-sample tool** (`ColorwayPicker.tsx` —
  grabs the live page bg into the Haze slot). Reused as the **dominant-colour
  grouping** glyph (dropper = sampling colour). Distinct from its §4 identity-
  category achievement use; context disambiguates. (Brendon, 2026-06-16.)
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
| Ascension | sold out | △ | U+25B3 | rising triangle |

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
| MY PD **ASCII-ID** (back in the Redacted slot) | ⍢ | U+2362 | also lives in the PriceSprite modal; both drive `asciiId` |

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
| Recent (sort) | ◷ | U+25F7 | the 'Recent' sort in the Starred/Wishlist sort bar shows this glyph (same icon as the project artworks trait pills); sort order is Recent ◷ → $PRICE → FLWRS → AZ |
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

---

*Source files: `components/dropdown/settings/MyPingsRow.tsx`,
`components/ArtworkCard.tsx`, `components/achievements/AchievementsGrid.tsx`,
`lib/pings/render.ts`, `lib/data/tapeEvents.ts`, `app/globals.css`
(`.notif-item .n-icon`, `.st-icon`, `.ach-cell-glyph`, toast rules).*
