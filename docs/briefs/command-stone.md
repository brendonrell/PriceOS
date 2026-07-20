# Brief · The Command Stone (for a fresh Fable session)

**From:** the 2026-07-19 Opus ideation session (Brendon's order: hand the queued
specs to fresh chats as briefs). **Read `CLAUDE.md` first — the whole operating
contract applies.** Work on `dev` rules; present the numbered CEO list before
pushing app code. **Ideas here are the spec — but confirm the glyph + any open
call with Brendon before locking.**

> This is the big one. Build it in stages and present each stage; do NOT ship the
> whole thing blind. Reuse-first (Rule #0): almost every "hand" below already
> exists as a real feature — the Stone is a NEW SHELL over that machinery, never
> a reinvention.

## What it is (the north star — Brendon's words)

The Command Stone is **PD's "AI character."** Every other character on the
platform has a *personality* — the Digital Familiar ⚝, the Project Gnome, Petey,
the NPC cast. The Stone has **power and intelligence.** It *acts* like AI — it
feels smart — while the others are charm.

The metaphor is already in PD's blood: the Sigil is **carved in stone**, the
Marginalia is **struck from the stone**, "the stone remembers." The Stone is the
thing you **etch into**.

## ⛔ The one settled decision: $0, SIMULATED intelligence

- **NOT a real model. No LLM, no per-call cost, no runtime AI.** The "intelligence"
  is **simulated**: great intent-parsing + **full access to all PD data** +
  purpose-built widgets. It feels sharp because it *sees everything* (calendar,
  PriceDay, dossiers, the whole ledger/market), not because it thinks.
- Everything the Stone "understands" is deterministic/scripted parsing of the
  typed line → route to the right data/widget. Budget it like any other $0 PD
  feature.

## Form + behaviour (Brendon's spec)

- **Logged-in only.**
- A **thin bar pinned at the bottom**, persistent and hovering — same nature as
  the **Top Bar Calendar**. It must **NOT touch Safari's chrome** (float above the
  browser's bottom UI / iOS home indicator; respect the safe-area). PD is
  **PWA / web only, no native** — build entirely within web/PWA constraints, and
  it's being pushed **hard on iOS PWA**, so verify there.
- **Launch = SWIPE UP FROM THE BOTTOM.** (Brendon may add a second entry point
  later; leave room. Do **NOT** use the logo long-press — the logo must stay a
  reliable "return home.")
- **Tap the bar → it expands** taller / full-height, with a **flashing typing
  indicator** and **no prompt text** (empty by default; an optional idle
  "ascii-sparkle" flourish is Brendon's call).
- **Long-press → collapses** back to the thin bar.
- **"Almost WatchOS in nature":** it carries **full calendar + PriceDay info**,
  and **each capability is its own summonable widget/complication** — a deck of
  little widgets, not one text box.

## The intent model — GO / FIND / ETCH / CAST (Brendon called this spec "PERFECT")

One input that **reads intent** instead of making you pick a mode. The rule:
**bare words = GO/FIND; a verb word (todo · note · anchor · watch …) = ETCH.**
The user never chooses a mode — the Stone hears it.

- **GO** — jump to any project, piece, collector, page, tool, or spell. This
  **absorbs the existing Global Search** (`GlobalSearchBar` + `/api/search`) —
  one door, not a second search box.
- **FIND** — the same live search + plain-language inline answers `/api/search`
  already returns (floor / volume / who-holds / PriceDay, etc.).
- **ETCH** — the new power: **natural-language creation.** Say it, it exists:
  - `todo: buy Prisms under 0.1` → a To-Do with an **◊ ETH target** (the
    **Sentinel** arms it and watches server-side, already built).
  - `note on Prisms #7: minter said it's his favourite` → a private **Note**.
  - `anchor Fumage at 0.2` · `watch Voltaic floor` · `wishlist Arcology #3`.
  - **Etch flashes a preview chip before it commits** — e.g.
    `❍ BUY · Prisms · ◊0.1 — etch?` — so a mis-heard line never carves junk into
    the user's tools. Undo-friendly.
- **CAST** — flip a spell or pull on a Workspace/persona by name (`degen`, `fog`,
  `appraiser`).
- **Answer AND act in one breath:** ask `Fumage floor?` → it replies inline **and**
  offers `◊ anchor it?` right there.

## The hands (its widgets) — everything Brendon listed

Each is a widget/complication; each REUSES an existing PD feature where one exists:

1. **Search** (GO/FIND) — reuse Global Search.
2. **Composer ⊚** — the query builder; launch/embed it.
3. **To-Do composer** — ETCH to-dos (reuse To-Dos + Sentinel).
4. **Note creation** — ETCH notes (reuse Notes ⊟).
5. **User docs search** — search **inside the docs**. Fable is building docs
   search separately; the Stone **rides the same index** — build the index once,
   both use it. The docs are already published machine-readable (`/llms.txt`,
   `/llms-full.txt`, the `workers/pd-mcp` worker). (Global Search does NOT search
   docs today — confirmed.)
6. **Calculator** — reuse the Calc.
7. **User dossier** — a read on any collector (holdings · trade record · rank ·
   PriceScore/Streak). Reuse Vault / profile / circle-stats machinery.
8. **Artist dossier** — a read on any artist (body of work · releases · identity).
9. **Matrix Maker** — a **mini table creator** (Brendon's name).
10. **Mini gallery** — with prev/next nav arrows.
11. **Gen-art prompter** — prompt it to make gen art; specifically **ASCII gen art
    based on the logged-in wallet**. **Deterministic** (wallet-hash → the existing
    ASCII/gen engines, e.g. `paintAsciiStandin` / the art engines), **not** a live
    model — stays $0.
12. **Ask PD** — **FOLDED IN** (Brendon's call): natural-language Q&A over the whole
    ledger is **one hand of the Stone, not a standalone feature.**
13. **Full calendar + PriceDay** widgets.

## Reuse map (Rule #0 — find these, wire them; don't rebuild)

Global Search (`components/dropdown/GlobalSearchBar.tsx`, `/api/search`) ·
Composer (`components/composer/ComposerModal.tsx`) · To-Dos + the Sentinel
(`lib/push/webpush.ts`, the reminder sweep) · Notes · Anchor · Watch · Wishlist ·
the Calc · Workspaces + Setup Codes (`lib/state/SetupCode.ts`) · the ASCII/gen
engines · the docs index. The Stone is the surface that unifies them.

## Open (raise with Brendon, don't guess)

- **Glyph** for the Stone — none assigned; propose from the vocabulary and
  device-verify per the #1 glyph gate (`docs/GLYPHS.md`). Do not invent silently.
- **Second launch spot** — Brendon may add one beyond swipe-up.
- **Idle-state flourish** (empty vs. ascii-sparkle) — his call.

---

## ⛔ STAGE 4 ADDENDUM — THE PRESENTATION PASS (Brendon, 2026-07-20 — read this FIRST in the fresh chat)

**The vessel is FINAL — do not redesign it.** As shipped 2026-07-20 (dev): the
resting pill is THE original stone bar (26px, 6px corners, look untouched);
swipe up from the bottom edge summons it, swipe down puts it away, and it
LIVES there while you scroll (outside taps only fold the tab; route changes
keep the pill). Typing opens results as **ONE giant black tab extending out of
the stone's top — rounded top corners (his explicit call), inline, never
taking the window.** The pill flattens its top to receive the tab. When the
pd miniplayer is live, the stone stacks one band ABOVE it (body.pd-fm-live).

**What stage 4 actually is (his words): the PRESENTATION is the gap.**
"I was hoping for watchOS, not search we already have." North stars, verbatim:
**magic tablet meets macOS Spotlight meets TARS meets watchOS**, and **Raycast
is a big inspo**. The tab's contents must become CUSTOM BLACK WIDGETS — big
type, real data, glanceable cards — not the .gsr search rows (those already
exist in Global Search; reusing their anatomy inside the tab was scaffolding,
not the destination). Answers should read like TARS: terse, confident, large.

Widget list = the numbered deck above (calendar · PriceDay · calc · dossiers ·
mini gallery · Matrix Maker · wallet ASCII gen art · Ask PD · docs search).
**miniplayer mini is SHIPPED** (soundtrack hits play through the one real
player over `lib/fm/fmBus.ts` — extend its widget, don't rebuild it).

**Corner law inside the vessel:** the tab wears Brendon's rounded top corners;
the two pills are pills; every chip/key/region inside is SQUARE. Sitewide, the
corner law now lives in `docs/GLYPHS.md` — read it.
