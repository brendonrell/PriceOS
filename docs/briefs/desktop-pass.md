# Brief · The Desktop Pass (for a fresh Opus session)

**From:** the 2026-07-13 pre-launch Fable session (Brendon's order: hand bulk
sweeps to Opus). **Read `CLAUDE.md` first — the whole operating contract
applies.** Work on `dev` rules; present before pushing app code.

## Brendon's ask (verbatim intent)

> Full app pass to make sure desktop is good everywhere and often gets perks
> for the big screen, but no breaking anything — just adapted, optimized
> desktop versions of everything.

## What is ALREADY DONE (do not redo)

- **The Windows Chrome crash — FIXED + shipped (dev `c3e1b07`).** The three
  always-mounted full-viewport overlays (Stickers sheet, Spite Book,
  Panopticon) kept `backdrop-filter` while hidden — three whole-window GPU
  blur surfaces alive on EVERY page. Blur now applies only on `.active`.
  Lesson for this pass: **never leave `backdrop-filter` (or heavy `filter`)
  on a hidden/at-rest fixed overlay.** If you add/adjust overlays, blur goes
  on the open state only.
- **QR login on desktop — verified working.** Connect menu → Connect Wallet →
  WalletConnect shows the scan-with-phone QR (RainbowKit). Don't rebuild it.
- The tape's FADED (1) / STANDARD (2) modes are desktop-only by design; the
  top connect-menu glyph now cycles THE TAPE, the My PD ⏥ pill cycles the
  MENU TAPE (swapped 2026-07-13, deliberate).

## The sweep (surface by surface)

Run the app at 1920×1080 and 2560×1440 (headless Chromium is pre-installed —
use the local `npm start` + Playwright screenshots; NEVER trust a guess).
For every surface: does it read as a NATIVE desktop app, not a stretched
phone app?

1. **Home** — gallery grid density, hero, Now-Minting carousel, feed width.
2. **Project page** — gallery columns at wide widths, facet bar, Replay,
   Genome, Anointed tab.
3. **Output page** — art size vs. rails, timeline width, sort bar.
4. **Profile** — Showcase, Collected grid, +More panels (incl. the new
   VAULT panel), sticker hero.
5. **Connect menu / dropdown stack** — width, search, calendar, pings,
   to-dos, notes at desktop sizes.
6. **Modals** (About PD, Priceos changelog, Cartography, Composer) — max
   widths, whitespace, scroll bodies.
7. **The tape(s)** — legibility of desktop-only modes.
8. **Docs site** (`/docs/*`).

**Perks worth proposing (present to Brendon as a numbered list FIRST —
IDEAS ARE NOT A GO-AHEAD):** wider gallery columns / more per row, hover
affordances that don't exist on touch, keyboard navigation (arrows through
galleries), side-by-side layouts where mobile stacks, bigger art on output
pages, multi-column feeds. Build only what he picks.

## Hard rules for this pass

- **No breaking mobile.** Every change behind `min-width` media queries or
  desktop-only branches. Mobile pixels must be byte-identical.
- Rule #2 (visibility): full-strength chrome; no faint/tiny/skinny.
- Reuse existing components/classes (Rule #0) — adapt, never re-invent.
- GPU discipline: no new always-on `backdrop-filter` / large animated
  `filter` regions; blur on open states only.
- Verify with screenshots at desktop sizes on a MID-TONE colorway before
  presenting.
