# PD Glyph Glossary — the canonical Unicode icon vocabulary

> **For every future Claude session: DO NOT GUESS ICONS. Look here first.**
> PriceOS uses **VS-15 text-presentation Unicode glyphs** as its iconography —
> a base character followed by **U+FE0E** (written `︎` in code). They render
> as monochrome **Courier** text glyphs (never emoji), which means they're free
> in toasts, labels, and feeds — it's just text. This file is the source of
> truth for which glyph means what, and how each is sized.

All glyphs below ship with a trailing `︎`. Codepoints are the base char.

> **⛔ THE CORNER LAW — CONTROLS ARE 4px, SURFACES ARE SQUARE. THE TRAIT PILLS
> ARE THE ANSWER (Brendon, 2026-07-25: "Whatever the trait pills are, is the
> answer").**
> PD's shape language has exactly TWO corner treatments:
> - **CONTROLS — `border-radius: 4px`.** Buttons, chips, toggles, steppers,
>   inputs-as-pills, badges. This is what `.pill` / `.pill-l1` — the trait pill
>   rows on every Project page — have always been, read straight out of the
>   compiled stylesheet. The house pills ARE the design, and they are 4px.
> - **SURFACES — `border-radius: 0`.** Every panel, card, tile, window, list.
>   (The Albums square-corners call, 2026-07-16, made this platform-wide.)
> **`999px` lozenges are BANNED** — fully-rounded chrome is the AI-slop motif
> `CLAUDE.md` bans by name, not our design. Anything between 5px and 16px is
> equally wrong. When styling: 4px if it's a control, square if it's a surface.
> No third option.
>
> **⚠️ CORRECTED 2026-07-25 — this block used to say the opposite.** The
> 2026-07-20 version demanded `999px` pills and banned 4px, which contradicted
> both the shipped trait pills and `CLAUDE.md`. It was written in frustration at
> mid-rounded corners creeping in and overshot, banning the exact radius the
> house pills use — so sessions reading it rounded controls into lozenges. The
> code settled it. Locked in the Atlas's Spec Locks page too; **do not
> re-derive it.**

---

## 1. Market / trade actions (canonical — from the MY PINGS settings pills)

These are the authoritative market glyphs. Defined on the settings pills in
`components/dropdown/settings/MyPingsRow.tsx` and used everywhere market events
surface (pings, tape, feeds).

| Concept | Glyph | Codepoint | Where it's canonical |
|---|---|---|---|
| Collected / mint | ✦ | U+2726 | `#sn-mints` pill. **SWAPPED with Offer 2026-07-31 (Brendon)** — the four-pointed star is the collect mark now; ✶ moved to Offer |
| Listed | ✹ | U+2739 | `#sn-lists` pill |
| Offer | ✶ | U+2736 | `#sn-offers` pill. **SWAPPED with Collected 2026-07-31 (Brendon)** |
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
| `MINT` (collected) | ✦ | U+2726 | matches MINTS pill |
| `SALE` (your piece sold) | ✦ | U+2726 | collected family |
| `LIST` (broadcast listing) | ✹ | U+2739 | matches LISTS pill |
| `OFFER` | ✶ | U+2736 | matches OFFERS pill |
| `OFFER_ACCEPTED` | ✶ | U+2736 | offer resolved |
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
| social | ⊙ | U+2299 | | rank | ❂ | U+2742 |
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
| Listed | ✹ | U+2739 | the canonical Listed star (§1) — the ON THE MARKET bucket only |
| Listed · HELD bucket | ✦ | U+2726 | the collect mark (§1). ⛔ HELD does NOT wear ✹ (Brendon, 2026-08-02): against the artist's ✺ the two read as the same mark, so a held row looked like an artist row. ON THE MARKET keeps ✹ |
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
- **✶ (U+2736, now Offer — was collected/mint until the 2026-07-31 swap)** — renders **small + low**; bump up + raise
  (pill → 18–20px, `translateY(-1/-2px)`; Pings panel → 16px, `translateY(-1px)`).
- The heavy four/eight-point stars **✸ / ✹** read large/dark — leave at base or
  pull down a step if matched against the lighter ✦ / ✛.
- **✛ (U+271B, wishlist)** is tall + thin — vertical-align sensitive.
- The rest (✦, ◈, ◉, ❖, etc.) sit clean at default.
- ⛔ The nudges above follow the GLYPH, not the concept. The 2026-07-31
  collect/offer swap moved the two marks between concepts and deliberately
  left every hand-tuned size/offset exactly where Brendon set it — re-tuning
  is his call, by eye, not a session's to guess at.

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
  ✴, ❄, ⚛, etc. — BANNED here regardless. (Brendon, 2026-06-15.)
  **⛔ THE SCREENING TEST, SHARPENED 2026-07-25 (Brendon caught this with a
  screenshot).** Judging a glyph by whether its DEFAULT presentation is text is
  WRONG and has shipped bad glyphs. `☁` and `☂` default to text on paper and
  still render as a colour cloud and a purple umbrella in the real world. **The
  only safe test: does the codepoint have an emoji mapping AT ALL?** If it
  appears anywhere in Unicode's emoji data, it is banned — no exceptions, no
  variation-selector rescue. Safe by this test and in use: ☼ ☈ ☽ ⛆ ✶ ✷ ✵ ☾ ⛇.
  Banned by it: ☀ ☁ ☂ ⛅ ⛈ ☃ ☄ ☔.
  **⛔ NEVER ask Brendon to device-check a glyph (2026-07-20, raised in fury):
  he sees every glyph automatically by using the app — a wrong one surfaces
  itself. The gate is the screening above, not icon homework for the CEO.**
- **▦ (U+25A6) = Calendar** (connect-menu panel, `CalendarPanel.tsx`; also the calendar-reminder Ping glyph since 2026-07-12).
- **◊ (U+25CA) = ETH (secondary mark)** — the lozenge the sticker store prices in
  (`components/stickers/BuySheetButton.tsx`), reused for To-Do ETH targets/budgets
  and the war-chest meter (`styles/todos.css`). **NOT the Greek Xi (Ξ)** — that's
  wrong and is being purged. The plain no-line lozenge (Brendon, 2026-07-04).
  **⚠ OVERRIDE (Brendon, 2026-08-27): the old "NOT ⟠" restriction below is
  lifted — Price Targets (Sentiment tab, `ProjectMorePanel.tsx`) now
  deliberately uses the lined lozenge ⟠ instead, to match the connect-menu
  glyph. ◊ remains canon everywhere else prices appear.**
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
| **Lists** | ≡ | U+2261 | PD's official Lists mark — RESERVED, use it wherever Lists needs an icon. The bars-family alternatives were all spoken for — ≣ is the Book of Conquests, ▤ the Dispatch (moved to ❡ 2026-07-28; ▤ is the Palette attribute's now), ▦ the Calendar, ☰ the Heaven trigram — so ≡ is the one (Brendon, 2026-07-25). Its only other appearances are inside the sigil/sprite/familiar character pools, never as an icon. **It does NOT ride the Starred sort-row button**, which reads LISTS, word only (Brendon's call the same day) — don't "restore" it there |
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
| The Dispatch (morning paper) | ❡ | U+2761 | **CHANGED 2026-07-28 (Brendon: the old ▤ was "too close to calendar").** The curved-stem paragraph ornament — the press mark, printed prose. Dingbats family (✶ ✦ ❖ ❍ ❐ all ship from it), no emoji mapping, and free repo-wide (raw + escaped) at pick time. Leads the home news rail pill, the docs, the About modal. **▤ (U+25A4) is now the Palette attribute's alone** (`lib/output/attributes.ts`) — never reuse it for the Dispatch |
| The Fingerprint | ⌾ | U+233E | NEW 2026-07-28 (Brendon asked for one) — concentric rings, the whorl. Reclaims the codepoint §12 recorded as FREED when Price Lens took ◎; its only other appearance is inside the sprite character pool (`lib/sprites/data.ts`), never as an icon — the ≡ precedent. APL functional-symbol family, no emoji mapping. Wears: the docs page title + the Atlas entry. Proposed by Claude, one line to swap |
| Takeover | ⚑ | U+2691 | the raid flag; profile inscriptions, cast sheet, Offers-HQ badge. Deliberately NOT ◈ (spec draft used it, but ◈ is the streak glyph). Renamed from "Hostile Takeover" 2026-07-14 |
| Composer (query builder) | ⊚ | U+229A | Brendon's pick 2026-07-13 from a 20-option round — math's composition operator (f∘g), the truest "compose". Wears: modal title, Spell Book pill, SAVE AS PROGRAM, Programs shelf. Replaced the spec-era ◎, which moved to Price Lens the same day. Device-verify per the #1 gate |
| Price Lens | ◎ | U+25CE | took the bullseye from the Composer (Brendon, 2026-07-13) — the lens you read prices through. MY PD pill + docs feature index. Frees **⌾ (U+233E)**, Price Lens's old mark. The Genome's docs entry (which also wore ◎) moved to ≎ the same day — no collision |
| The Exchange (head-to-head trading) | ⇌ | U+21CC | The trade window, the profile/output TRADE pills, the TRADE ping family. ⚠ Deliberately NOT the ⇄ from the task name — **⇄ (U+21C4) is the Arbitrage Map's** (shipped 2026-07-17); the equilibrium harpoons ⇌ are the free twin. Device-verify per the #1 gate |
| The Genome | ≎ | U+224E | Brendon's pick 2026-07-13 — the stacked kin-pair, deliberate blood-relative of ≍ Closest Sibling (§7) so the two kinship reads rhyme. Docs feature index + any future Genome surface. Device-verify per the #1 gate |
| Composer launcher arrow | ⤤ | U+2924 | Brendon's pick 2026-07-13 — trails "launch Composer ⤤" on the Global Search first-row launcher (the open-elsewhere hook arrow). Only there; not a general "open" mark. Device-verify per the #1 gate |

> All three ship with the trailing VS-15 `︎` like every glyph here, and carry
> the standard #1 glyph gate: device-verify as monochrome TEXT on iOS; if one
> tofus, it needs a swap.

## 12a. The Command Stone ⌘ (2026-07-19 build)

| Concept | Glyph | Codepoint | Notes |
|---|---|---|---|
| The Command Stone | ⌘ | U+2318 | Brendon's approval 2026-07-19 — the command sign. The bar, the panel header. Device-verify per the #1 gate |
| **Anchor** (Stone chips · stat tiles · gallery delta stamp) | ♆ | U+2646 | NEPTUNE — the trident. **Brendon's pick, 2026-07-31**, replacing the interim ↧ across every anchor surface: it is nautical (an anchor reads instantly), one distinct mark, text-presentation on iOS, and grep-verified unused. ⚓ itself stays BANNED (emoji-default on iOS). NOT ⟟ (Grail Pin), NOT ⏚ (Grid Presets — see below) |
| **Grid Presets** | ⏚ | U+23DA | ⚠ CATALOGUED LATE (2026-07-19): this has SHIPPED on the Collected/project/home facet bars (grid-preset slots popup) since the presets build but was never entered here — a Stone-session anchor pick collided with it and Brendon caught it. The glossary is only trustworthy if EVERY shipped glyph lands here: **grep the codebase, not just this file, before claiming a glyph is free** |

> The Stone's other chips reuse canon exactly: ❍ To-Do · ⊟ Note · ⬚ Watch
> (project star) · ✛ Wishlist.

| Concept | Glyph | Codepoint | Notes |
|---|---|---|---|
| **List row grab handle** | ⠿ | U+283F | 2026-07-25 — the grip on a List's rows while the list is in edit mode (the ✎). Reclaims the codepoint ASCII Art Mode retired in §12d; braille has no emoji mapping, so it passes §7 |
| **Sentiment Weather** (MY PD pill) | ⛆ | U+26C6 | Brendon's pick, 2026-07-25 — chosen from the feature's own weather set and the only member of it that survives the emoji test. Replaces ◒, which stays Gravity's (`lib/output/attributes.ts`) |
| **PriceDay** (Output Almanac row) | ✶ | U+2736 | 2026-07-25 — was ☀, a glyph this file already banned. ✶ is PriceDay's established mark (the search-answer precedent, §12) |
| **The Calc** | ƒ | U+0192 | ⚠ CATALOGUED LATE (2026-07-20): shipped on the artwork modal's calc tab (`OutputPreview`) since the Calc build but never entered here — found during the Stone stage-4 pass (the Grid-Presets lesson again: grep the codebase, not just this file). Now also titles the Stone's CALC widget |
| **Replay** (project +More pill) | ⏴ | U+23F4 | **Brendon's pick, 2026-07-31.** The single left triangle — Replay is a scan back through the project's record. Replaces an interim ⧖ (U+29D6) that shipped and rendered as NOTHING on iOS: hourglasses are off the table. NOT ⟳ (PD's SHUFFLE mark), NOT ↻ (to-do recurrence) |
| **Price Story** (project + output +More pill) | ▼ | U+25BC | **Brendon's pick, 2026-08-17.** Promoted from the chapter rail's own connector arrowhead (`.mk-story-line::after` in `styles/market.css`, a pure-CSS border triangle, not a glyph) into the section's pill icon — the down-triangle already meant "Price Story" everywhere it appeared, so it became the mark. Filled, not hollow (NOT ▽ U+25BD) |
| **Stats** (project + output +More pill) | ⋚ | U+22DA | **Brendon's pick, 2026-08-20.** LESS-THAN EQUAL TO OR GREATER-THAN — a three-way comparison mark, read as distribution spread across the tab's Price Stats / ATH & Holders tiles. Grepped free repo-wide (raw + escaped) at pick time; no emoji mapping. Wears the project +More pill AND the Output +More pill (`MORE_PILLS` icon field, `components/artwork/ArtworkPageBody.tsx`) — Output has no Sentiment tab, so this is Stats' only new surface there |
| **Sentiment** (project +More pill only — no Output Sentiment tab) | ⚼ | U+26BC | **Brendon's pick, 2026-08-20.** SESQUIQUADRATE — an astrological aspect glyph (tense/bearish read), picked for the tab that surfaces Price Targets + Disagreement Score (what the crowd thinks). Kin to the celestial-aspect family already in the vocabulary (☍ Nemesis §12g, the natal-chart trio §12b). No emoji mapping, grepped free at pick time |
| **Rewind** (the day rewind — RESERVED, not yet on any surface) | ⋘ | U+22D8 | **Brendon's pick, 2026-07-31**, banked for the Rewind so Replay's ⏴ can never be mistaken for it. Deliberately NOT wired to any control yet — the day Rewind gets a mark, this is the mark |

> **Stage 4 widget titles (2026-07-20) reuse canon only — nothing new:**
> ▦ Calendar · ✶ PriceDay (the search-answer precedent) · ƒ Calc ·
> ☻/✺ Dossier (collector/artist row tiles) · ⬚ Gallery (project) ·
> ⍢ Wallet ASCII (the ASCII-ID mark, §11) · MATRIX and DOCS deliberately
> glyph-less (no canon fit — omission over a forced icon, §7).

> **The abilities-pass cards (2026-07-28) reuse canon only — nothing new:**
> ▦ THE DAY (calendar concept) · ✶ FIRST MINT (the mint star, §1) ·
> ◷ RELEASE (the Recent/date clock, §12) · ⟠ SPENDERS (volume, §7) ·
> ⚭ MUTUALS · ⚬ FOLLOWERS (the social trio, §12) · ⌂ THE OVERLAP
> (owner/holder, §4) · podium ranks ❶❷❸ then plain numerals (§7).

| Concept | Glyph | Codepoint | Notes |
|---|---|---|---|
| **THE MOODS** (Stone card + rows) | ☾ | U+263E | 2026-07-28, the moods-set build — night/ambience for the castable atmospheres (`lib/stone/moods`, `MoodsWidget`). On the §7 sharpened safe list (no emoji mapping) and grepped free, raw + escaped, before claim. NOT ☽ (U+263D — sentiment Neutral tier + sprite wand, taken) |

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

## 12c. PD miniplayer (components/fm/FmBar — 2026-07-20 build)

| Use | Glyph | Codepoint |
|---|---|---|
| MODE key — cycles the player's five faces | ⎇ | U+2387 ALTERNATIVE KEY SYMBOL |
| Play / transport (established) | ▶ | U+25B6 (VS-15) |
| Pause key | ‖ | U+2016 |
| Next-track key | ≫ | U+226B |

> ⎇ is **Brendon's pick (2026-07-20)** from an 8-option round (the APL quad
> family + key symbols — all screened against this glossary AND the codebase).
> Device-verify ⎇ ‖ ≫ render as monochrome text on iPhone per the #1 gate.
> The closed player is **THE DOT** — a bare 9px `--text-color` disc, no glyph
> (the ▶-chip trial read as a play button and was pulled the same day).

## 12d. ASCII Art Mode — ⎂ (2026-08-15, swapped from ⎀)

| Use | Glyph | Codepoint |
|---|---|---|
| ASCII Art Mode toggle (`AsciiBackupPanel`) | ⎂ | U+2382 DISCONTINUOUS UNDERLINE SYMBOL |

> Swapped 2026-08-15 (Brendon didn't like ⎀). ⎀ (U+2380 INSERTION SYMBOL) is
> now free again — it had replaced **⠿ (U+283F)**, which shipped
> UNCATALOGUED as an escaped literal (`⠿`) — the second audit miss of this
> kind (⏚ precedent, §12a): **grep escaped `\uXXXX` forms too, not just raw
> glyphs, before declaring a codepoint free.** ⠿ stays retired/free too.
> Device-verify ⎂ on iPhone per the #1 gate.
> ⚠ PingArt (`lib/pings/pingart.ts` etc.) still wears ⎀ on purpose — it's a
> distinct feature that shares the ascii concept mark; this swap only
> touched the Mode toggle. Say the word if PingArt should follow it.

## 12d-bis. Cartography Time Machine — ⇠ ◷ ✧ (2026-07-20 build, brief-locked)

| Use | Glyphs | Codepoints |
|---|---|---|
| Time Machine key (carto control stack, under FIT) | ⇠ ◷ ✧ | U+21E0 · U+25F7 · U+2727 |

> The trio reads rewind · time · arrives (the brief's approved mark,
> Brendon 2026-07-19). ◷ is the established Recent/clock mark (§12) and ✧
> the Uploaded star (§8) — context disambiguates (the ◉ precedent). ⇠
> (U+21E0, dashed leftwards arrow) is NEW to the vocabulary — reserved to
> this key; deliberately NOT ◄ (the Rewind bar's, §12) and NOT ⏪-family
> (emoji). Playback keys inside the timeline reuse miniplayer canon ▶ / ‖.

## 12e. Sound layer — ⚟ (2026-07-20, Brendon's pick)

| Use | Glyph | Codepoint |
|---|---|---|
| Sound toggle (workspace dots row, final key) | ⚟ | U+269F THREE LINES CONVERGING LEFT |

> Brendon's pick from a fifteen-option speaker round (sound radiating from a
> source). Screened against this glossary AND the codebase. Its mirror twin
> **⚞ (U+269E) stays free**. The toggle is the LAST icon in the workspace
> dots row, 13px (two sizes above the row's 11px keys), default OFF. The five
> locked blips live in `lib/sound/recipes.ts` — chime (mint) · sparkle
> (achievement) · tick (settings pills) · coin (your sale) · seal
> (offer/trade accepted).

## 12f. Profile tags — glyph picks (2026-07-20, Brendon's picks)

| Use | Glyph | Codepoint |
|---|---|---|
| WTBS tag | ☊ | U+260A ASCENDING NODE |

> **⛔ PERSONA TAGS ARE GLYPHLESS (Brendon, 2026-07-24 — reversed the
> 2026-07-24 assignment round).** Only a few tags wear a glyph: **Artist ✺**,
> **Collector ☻**, the **$PRICE** holder tags (SVG mark), and **WTBS ☊**.
> Every OTHER persona is **colour + label only** — Writer, Podcaster, Curator,
> Trader, Media, Critic, Analyst, Patron, Historian, Builder, Degen all had
> glyphs briefly and were stripped back. ⚲ (the old Podcaster/WTBS neuter) and
> ⚔ (old Degen) are free again; WTBS moved to ☊ and KEEPS it. Do not
> re-assign persona glyphs without Brendon's explicit word.

## 12f-bis. Profile Tags door — ⌑ (2026-08-15, Brendon's pick; reordered 2026-08-16)

| Use | Glyph | Codepoint |
|---|---|---|
| Profile Tags door (Settings ▸ MY PD, first of the pair) | ⌑ | U+2311 SQUARE FOOT |

> A settings-panel entry point, NOT a persona-tag glyph (see §12f above,
> which stays glyphless-by-default) — opens the same tag/colourway
> customization row the @name long-press does, just from a more obvious
> door. Grepped free repo-wide, raw + escaped, at pick time.
>
> **⛔ ORDER + SIZE (Brendon, 2026-08-16):** this glyph now sits FIRST in the
> pair, right of the copy-hex button — the User Showcase glyph (§ above,
> ⑆/⑇/⑈) moved to second. It also renders one size larger than the base
> `.copy-hex-btn` (17px vs 16px), via its own `.profile-tags-door-btn` rule
> in `styles/settings.css`. Do not re-swap without Brendon's word.

## 12g. The Nemesis — ☍ (2026-07-20 build)

| Use | Glyph | Codepoint |
|---|---|---|
| Nemesis Pings (the declared rival moved) | ☍ | U+260D OPPOSITION |

> The astrological OPPOSITION mark — two bodies at 180°, the exact chart
> aspect for a rival — from the same celestial family as the natal-chart
> glyphs (§12b). Globally unique at pick time (screened repo-wide incl.
> escapes), text-default on iOS. VS-15 at render like every PD glyph.
> Rides WATCH_HIT rows with reason `nemesis` (`lib/pings/interest.ts`).

## 12h. The Social Feed ☻ (2026-07-26 build)

| Use | Glyph | Codepoint | Notes |
|---|---|---|---|
| **SOCIAL — the overarching social/user icon** | ☻ | U+263B | ELEVATED 2026-07-26 (Brendon): the collector smiley is now THE social mark platform-wide — collector and user are the same concept, deliberately. Wears the home sort row's social-feed toggle (glyph only, no word; one size up from the ◷'s base + 1.5px drop) and the feed's SCENE block icon |
| SCENE block (feed) | ☻ | U+263B | ≥3 different people hit one project the same day — the smiley marks the convergence. ("SCENE" is a Claude-named label, open to rename) |
| ALBUM block (feed) | ◰ | U+25F0 | canon Album reuse (§3) |
| Price rail (feed type column) | ◊ | U+25CA | canon ETH secondary mark reuse (§7) |

> **⛔ EMOJI-DATA VERIFIED 2026-07-26 (the §7 sharpened test, run against
> Unicode's live emoji data):** U+263B ☻ (FILLED smiley) has **NO emoji
> mapping at all** — safe everywhere, any size. Its hollow twin **☺ U+263A
> IS in emoji data and stays BANNED.** Never swap one for the other.
> The home sort row's ◷ clock also took the same 1.5px drop, scoped to that
> row only (`.sort-btn-clock`) — every other ◷ surface is untouched.

## 12i. Fingerprint taste axes — ∠ ◧ ▓ ∷ (2026-07-27 build)

The four taste-axis tiles on the character sheet's Fingerprint wall
(`lib/output/attributes.ts`) — the Radar's data unlock (Brendon's call:
taste gets measured on the Fingerprint).

| Axis | Glyph | Codepoint | Notes |
|---|---|---|---|
| Geometry (Geometric↔Organic) | ∠ | U+2220 ANGLE | math operator, no emoji mapping; globally new to the vocabulary |
| Colourfulness (Colorful↔Monochrome) | ◧ | U+25E7 | half-black square = the two-tone read; appears elsewhere only inside character-art pools (tabstract/familiars), never as an icon — the ≡ precedent |
| Density (Dense↔Sparse) | ▓ | U+2593 DARK SHADE | packed pixels; deliberate kin to ▒ Texture (medium shade). ASCII-art pools only elsewhere |
| Order (Structured↔Chaotic) | ∷ | U+2237 PROPORTION | dots in rank; NOT ⁘ (U+2058, the GROUP toggle) — different codepoint, different meaning |

> All four pass the sharpened §7 emoji test (no emoji mapping at all) and ship
> with the trailing VS-15 `︎` per convention. Standard #1 gate applies.
> The Darkroom ◉ (2026-07-27, `/art/{slug}/{id}/darkroom`) introduces NO new
> glyph — its task-name ◉ already lives in the vocabulary (the multi-context
> precedent, §7), and its chrome is the standard × + the house pill.

## 12j. PD Keychains — ⚷ (2026-07-27, Brendon's pick)

| Use | Glyph | Codepoint |
|---|---|---|
| Keychains (the capsule machine) | ☯ | U+262F YIN YANG |
| YANG coin slot (Depanneur) | ⚊ | U+268A MONOGRAM FOR YANG |
| YIN coin slot (Depanneur) | ⚋ | U+268B MONOGRAM FOR YIN |

> **⛔ THE ☯ BAN WAS WRONG — CORRECTED 2026-08-01 (Brendon, who read it on
> the real device: "it looks great on iPhone").** U+262F is TEXT-default in
> Unicode — it only turns into an emoji if you hand it the emoji selector,
> which PD never does. It has been shipping bare on the Fates tiles the whole
> time and renders as clean line art on iOS. It is now the **Depanneur's own
> mark**, replacing Chiron ⚷ on the machine cap, the settings door and both
> THE DEPANNEUR buttons, by Brendon's call. ⚷ stays on the charm's chain line.
> The note below is kept for the record of why the coin slots are what they are.
>
> **⚊/⚋ (2026-07-28, the coin-slots build.)** Brendon asked for a yin-yang
> Depanneur mark; the taijitu ☯ was believed emoji-mapped at the time. The I-Ching monograms ARE the literal yang/yin
> lines, carry no emoji mapping, and mean exactly the thing. ⚊ already
> ships as the Fates oracle's I-Ching line (`lib/output/attributes.ts`,
> `lib/project/collectionAnalysis.ts`) — same symbol system, same literal
> meaning; context disambiguates (the ◉ precedent). ⚋ was grepped free,
> raw + escaped, at pick time.

> Brendon's pick from a five-option screened round — astrology's **Chiron,
> literally "the key," the wounded healer** (his call: "Chiron is the
> winner! Wounded healer!"); the glyph IS a key on a ring. Celestial family
> precedent (☊ ☍, §12b/§12g). Screened by the sharpened §7 test: U+26B7 has
> no emoji mapping; the obvious 🔑 ⛓ 🗝 are emoji-mapped and banned.
> Codepoint free repo-wide including escapes at pick time (the ⚲ mention in
> `lib/tags/catalog.ts` is a dead comment, not a claim). Wears: the
> wallet-settings door beside the gnome ⍙ (14px; the gnome dropped
> 14→13.5px the same day, Brendon's call) and the PriceSprite modal
> KEYCHAINS action row. VS-15 + Courier per convention; standard #1 gate.

## 12k. The Vault v2 — ⚿ (2026-07-27 build; glyph swapped 2026-08-28)

| Use | Glyph | Codepoint |
|---|---|---|
| The Vault (vaulted-piece walls) | ⚿ | U+26BF SQUARED KEY |

> The vault mark for the 2026-07-27 rebuild (albums-but-owned-only + stats;
> the sealed door is gone). **A box locked inside a box — a piece held in
> the vault.** Screened by the sharpened §7 test: U+29C8 has no emoji
> mapping (math operator family). Codepoint free repo-wide at pick time.
> Distinct from the multi-select ▣/❐ (§3) and the Cart ▢. Wears: the vault
> cover tiles, the open-vault title, the stats block PIECES tile, and the
> docs. VS-15 + Courier per convention; standard #1 gate — proposed by
> Claude, shipped subject to Brendon's veto (one line to swap).

## 12l. PriceOS Suite — ❏ (2026-07-27, Brendon's pick)

| Use | Glyph | Codepoint |
|---|---|---|
| **PriceOS Suite — the productivity super-app** | ❏ | U+274F LOWER RIGHT DROP-SHADOWED WHITE SQUARE |

> **Brendon's winner from the boxed-candidates round (2026-07-27) — "❏ is
> our winner for PriceOS Suite!"** An app window with depth: the one box
> holding the eight apps. Matches his same-day box law for the Suite (every
> app icon sits in the rounded-square box). Screened: no emoji mapping;
> codepoint was free repo-wide at pick time. Family note: ❐ (§3) stays the
> multi-select unselected badge — different codepoint, different meaning,
> both stay. Wears: the Suite modal title. VS-15 + Courier per convention.

## 12m. Zen Garden / PriceCalm — ⬟ (2026-07-28, Brendon's direction)

| Use | Glyph | Codepoint |
|---|---|---|
| **The Zen Garden — and ⬟ PriceCalm, the Suite's calm room** | ⬟ | U+2B1F BLACK PENTAGON |

> Brendon's direction (2026-07-28): the Zen Garden's own mark fronts
> PriceCalm. ⬟ is the garden's leading stone (ZenGarden's ROCK_GLYPHS) and
> lives nowhere else in the app — the stone IS the garden. Geometric-shapes
> family, no emoji mapping. Wears: the PriceCalm app icon. (The garden's
> other characters stay internal: ⬣ the second stone, ≋ the raked sand —
> ≋ also belongs to the colorway Haze family §7, never reuse it as a mark.)

## 12n. The docs door — ⓘ (2026-08-05, Brendon's pick)

| Use | Glyph | Codepoint |
|---|---|---|
| Docs door (in-app → the manual) | ⓘ | U+24D8 CIRCLED LATIN SMALL LETTER I |

> Brendon's call ("the little i inside the circle glyph for our docs door"):
> the in-app door to a surface's own docs page. Wears: the Depanneur, the
> Exchange trade window, and the Sticker Exchange header — **those three
> only, for now**; adding it anywhere else is his call per surface. Screened
> by the sharpened §7 test: U+24D8 has no emoji mapping (the information
> source ℹ U+2139 IS emoji-mapped and stays BANNED — never swap one for the
> other). Grepped free repo-wide, raw + escaped, at pick time. VS-15 +
> Courier per convention; each door styles itself to match the × beside it.

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

## 14. Platform gen art — Tabstract, Formula (2026-08-16)

Everything on this platform that draws its OWN character art from a fixed
glyph pantry, redrawn live rather than saved as a frozen string. Two live
today; both are gen art, neither is the other — **never let their pools
mix** (see the ⛔ in `lib/tags/formula.ts`).

| Piece | Where | Owner | Redraws | Pantry |
|---|---|---|---|---|
| Tabstract | `lib/title/tabstract.ts` | Platform (the tab title) | Every page load | 6 sets (Phase Lines, Fiber Optic, Geomancer, Braille Tear, Vector Stream, Geometric Cryptography) |
| Formula | `lib/tags/formula.ts` | Each user, worn as a profile tag | Every page load (roll arrives client-side post-mount) | 10 sets (Sediment, Shading, Rain, Circuitry, Orbit, Aperture, Halftone, Static, Ladder, Ogham) |

> **Tabstract** picks one of its six sets at random per load and draws six
> glyphs from it for the browser tab title (`${CONTEXT} ⋮ Price Discussion ⋮
> ${tabstract}`) — platform-owned, not a user setting.
>
> **Formula** is user-owned generative art worn as a tag: numbered by shelf
> position like Albums (never named), up to `MAX_FORMULAS` = 22. The owner
> dials sets (multi-pick from the ten), length (4/6/8/10), weave
> (Scatter/Alternate/Run/Mirror), and spacing from buttons in the picker row
> — see `components/profile/ProfilePageBody.tsx`. Lives as a trigger pill in
> Row 2 of the profile tag carousel (last pill before the all-tags paints),
> which opens the Formula carousel row directly beneath it rather than
> toggling like a normal tag (Brendon, 2026-08-16).
>
> Other platform gen-art touchpoints draw on the same "Tabstract-spirit"
> (deterministic, seeded, redrawn rather than frozen) without sharing its
> pool: the push-notification art in `lib/pings/pingart.ts`, and the digest
> art in `lib/newsletter/digest.server.ts`. `@formula`, `@formulas`, and
> `@tabstract` are reserved handles (`lib/reserved-handles.ts`) so no user
> can squat the names.

---

## Project +More tab — Activity Heatmap (added 2026-08-21)

| Concept | Glyph | Codepoint | Where it's canonical |
|---|---|---|---|
| Activity Heatmap | ℃ | U+2103 | Project + More tab pill (`.is-activity`), `ActivityHeatmapPanel.tsx`. Was ⯐ (U+2BD0), swapped 2026-08-21 — tofu'd on device, plus ℃ reads literally as "heat" |

---

## Profile +More tab — Calls (glyph swapped 2026-08-29)

| Concept | Glyph | Codepoint | Where it's canonical |
|---|---|---|---|
| Calls | ¡ | U+00A1 INVERTED EXCLAMATION MARK | Profile +More tab pill (`.is-calls`), `ProfilePageBody.tsx`. Was ☎ (U+260F WHITE TELEPHONE) — squashed and illegible in Courier, plus carried future-emoji risk. **Brendon's pick, 2026-08-29**, from a 20-option "loud/megaphone/opinionated" round: an unresolved call reads as an opened, unclosed exclamation — the mark literally waits for its close, same as a call waits to seal. Screened and flagged before lock: ¡ is the paired *opening* half of an exclamation in Spanish/Galician/Asturian orthography — a reader literate in one of those scripts may reflexively read a lone ¡ as broken punctuation before the "Calls" label registers. Brendon's call to keep it anyway, given the label sits right beside it. Device-verify as monochrome text on iOS per the #1 gate before final lock (Latin-1 punctuation, no emoji mapping, should be trivial). |

---

*Source files: `components/dropdown/settings/MyPingsRow.tsx`,
`components/ArtworkCard.tsx`, `components/achievements/AchievementsGrid.tsx`,
`lib/pings/render.ts`, `lib/data/tapeEvents.ts`, `app/globals.css`
(`.notif-item .n-icon`, `.st-icon`, `.ach-cell-glyph`, toast rules).*
