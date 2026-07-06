# Friend Inspector — total inner rebuild (design brief)

**Status:** approved direction, build-ready. First build of the next session.
**Scope:** the ENTIRE interior of the Friend Inspector (`components/FollowersModal.tsx`).
**Chrome:** UNTOUCHED. Same outer shells — compact ambient-pop popup + jumbo
sticker-mgr-plus expansion via ↑. Brendon: "I don't want new outer chrome but I
want a totally reworked app inside that menu chrome."

---

## Brendon's exact constraints (2026-07-05/06, verbatim anchors)

1. "I don't like the inner ui of friend inspector I want it totally redone —
   the way the PriceSprites are shown, the user cards etc needs reworking."
2. "Not a wow pass. A big rebuild but inside that menu chrome."
3. "Remember this is a *social media app* so getting friend inspector right
   (girls will love this one lol) is key and **we want to birth rivalries
   here**. We have other features like rivalry things in ClickUp that can use
   the friend inspector as their ui/launch spots."
4. "I don't want it to be corny I want slick we don't want twee we want
   cyberpunk."
5. **"We want *cyberpunk friendship bracelet* — this is MAXIMALIST cyberpunk."**

## The north star: cyberpunk friendship bracelet

NOT cold-terminal minimalism. NOT a sterile intel file. The warmth of a
friendship bracelet — charms, keepsakes, shared history, personal tokens —
rendered as **dense, neon, ornamental data**. Every friend card should drip
with detail like a decked-out cyberdeck: stacked glyphs, sigils, stat
readouts, relationship artifacts. Maximal information density that reads as
*adornment*, not clutter. Slick chrome, zero twee, zero corny.

Design tests for every element:
- Would this feel at home engraved on a charm? (warm, personal, earned)
- Is it rendered like instrumentation? (monospace stats, glyph vocabulary,
  precise alignment, luminous accents)
- Rule #2 applies hard: full-strength legibility, no half-opacity washes.
- Glyphs come ONLY from `docs/GLYPHS.md` (⚬ followers · ⚯ following ·
  ⚭ mutuals · ⬚ collected · ⟠ volume/spent · ⟁ cartel · ✺ artist · ◊ ETH).
  No invented iconography, no emoji.

## What exists today (being replaced, interior only)

- Four tabs: FOLLOWERS ⚬ / FOLLOWING ⚯ / MUTUALS ⚭ / PROJECTS ⬚.
- Flat sortable rows: sprite + @name chip, ✺ badge, inline ⬚/⟠/⚬ stats, ★.
- v1 dossier (shipped 2026-07-05, superseded by this rebuild): row-tap unfolds
  shared-project ⟁ chips + COLLECTS chips. Keep the *idea* (tap → depth);
  replace the execution wholesale.

## Interior rebuild — what the new app is

A social instrument with two altitudes, matching the two shells:

**Compact (ambient pop):** the bracelet. Your circle as a dense, scannable
strip of people — PriceSprite-forward (sprites BIG, the hero of each card,
not a 20px chip beside a name), charm-like relationship markers, live stats.

**Jumbo (sticker-mgr-plus):** the inspector proper. Full friend dossiers:
- PriceSprite displayed large + identity block (@handle, ✺, sigil when built).
- Relationship panel: ⚬/⚯/⚭ state, starred ★, follow/unfollow action.
- The comparison spine — YOU vs THEM, side by side: ⬚ collected · ⟠ spent ·
  ⚬ followers · shared ⟁ projects. This is the rivalry seed: every dossier
  is implicitly a head-to-head.
- Shared-history charms: mutual projects, overlap counts — the "friendship
  bracelet" beads, each a tappable token opening the real project.

## Rivalry launch spots (design the sockets NOW, features come later)

These ClickUp features name the Friend Inspector as their natural UI home.
The rebuild must leave visible, intentional slots — not build the features:

| Feature | Task | What it needs from the Inspector |
|---|---|---|
| **Argue** — staked opposite takes on a token's value, next sale settles, loser wears a scar badge | `86b9eretz` | A per-friend action socket (challenge from the dossier) + a badge row on the card (scars/wins) |
| **The Understudy / Counterweight** — algorithmic temporal following; Counterweight = formally inscribed rivalry | `86b9fcnnc` | A relationship-line slot on the dossier (`◈ following · 47 days behind` style) |
| **PriceTwin** — your algorithmic taste twin (high priority, renamed from Kindred 2026-07-04) | `86b9fcngz` | A designated twin marker on the card + dossier |
| **Sigil Color Factions** — Warm vs Cool camps, six tribes, THE top-level rivalry | `86baf786c` | Faction color as a card accent once Sigils ship — cards should have one accent channel ready to be faction-painted |

Concretely: the dossier layout reserves (a) a **badge/charm row** (Argue scars,
future markers), (b) a **relationship line** slot (Understudy/PriceTwin
verdicts), (c) one **accent color channel** per card (faction paint). Empty
slots render nothing — no placeholder cruft.

## Data available (all live today)

- `/api/follows` — the graph (followers/following/mutuals).
- `/api/social/circle-stats` — batch per-address: collected, spentEth,
  followers, isArtist.
- `/api/user/{addr}/owned-projects` — for shared-⟁ intersection (v1 pattern).
- `/api/project-follows` — PROJECTS tab rows.
- Cartel mutual counts — `lib/social/cartel.ts`.
- Leaderboard PriceScore — available for the comparison spine.
- Stars — `artistStarStore` / `projectStarStore` (shared DB-backed sets).

## Hard constraints

- Outer chrome, open/close mechanics, tab structure entry: reuse EXACTLY
  (Rule #0). The rebuild is everything rendered inside.
- PROJECTS tab: keep its function; restyle to match the new language.
- All four tabs stay; sorting stays (may be re-expressed, not removed).
- No new endpoints required for v1 of the rebuild — design to the data above.
- Toast casing per §9. PNG-only previews. VS-15 glyph discipline.
- Nothing extra beyond this brief without naming it and asking (Build-to-spec).
