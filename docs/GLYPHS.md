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
| Graduated | 12 | ⟢⟢ | U+27E2 ×2 | doubled — entered Now Minting |
| First Blood | 1 | † | U+2020 | first mint (sized down a touch) |
| Lucky 22 | 22 | ♧ | U+2667 | white club = clover/luck (☘ is emoji — banned) |
| Century Club | 100 | Ⅽ | U+216D | Roman numeral 100 |
| Halo | 777 | ⬭ | U+2B2D | tilted oval halo (raised — it sits low) |
| Per Mille Club | 1,000 | ‰ | U+2030 | the logo mark, rendered in **Inter** |
| Archetype | 1,200 | ✻ | U+273B | six teardrop-spoke asterisk (the solid 6-pt ✶/✷ reads as mint; 12-pt ✹ is Listed) |
| Hi-Def | 4,000 | ⬢ | U+2B22 | crystal facet |
| Ascension | sold out | △ | U+25B3 | rising triangle |

---

*Source files: `components/dropdown/settings/MyPingsRow.tsx`,
`components/ArtworkCard.tsx`, `components/achievements/AchievementsGrid.tsx`,
`lib/pings/render.ts`, `lib/data/tapeEvents.ts`, `app/globals.css`
(`.notif-item .n-icon`, `.st-icon`, `.ach-cell-glyph`, toast rules).*
