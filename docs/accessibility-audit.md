# Accessibility Audit — humans + agents (2026-07-05, Fable session)

Wave-4 item from the Fable Magic list. Sweep run across `components/`, `app/`,
and every stylesheet. **FIXED = shipped in this pass. OPEN = queued follow-ups.**

## Fixed in this pass

- **Art canvases were invisible to screen readers AND agents** — every canvas
  painted by the engines carried no role/label (a machine saw an empty page of
  `<canvas>`). The primary surfaces now carry `role="img"` + a real name
  ("PRISMS #22 — generative artwork"): gallery card, Output modal (both
  portrait + landscape), Output feature page live render, profile thumbnails,
  profile project cards. Replay + Genome already had accessible wrappers
  (slider values / application role) — verified, untouched.

## Verified healthy (no action)

- **`<img>` alt text** — no missing `alt` anywhere in components/app.
- **`prefers-reduced-motion`** — honoured in globals + ambient, modal,
  spite-book, stickers, todos, zen (incl. killing the lightning flash for
  photosensitive users).
- **Keyboard actionability** — the app's `role="button"` spans consistently
  pair `tabIndex={0}` with Enter/Space handlers (spot-checked across
  settings pills, to-do rows, ambient menu, artwork footer). Pattern holds.
- **Contrast** — governed by CLAUDE.md Rule #2 (no default half-opacity);
  ongoing enforcement, not an audit item.

## Fixed in the second pass (2026-07-05, same day — Brendon's "priority" call)

1. **Focus visibility** — global themed `:focus-visible` ring (keyboard-only;
   taps/clicks never see it; overrides the scattered outline resets).
2. **Agent-readability layer, phase 1** — Output + Project pages now carry
   structured data (schema.org VisualArtwork / Collection: name, @artist,
   piece count, position, REAL derived traits) + real meta descriptions
   ("Generative artwork #22 of 111 by @opus4-6 from PRISMS… Palette: …").
   Verified rendering in the served HTML. Agents + search + unfurls read what
   a piece IS without executing the app.
3. **Verified, no change needed:** toasts already announce (`aria-live` on the
   shared toast), navbar is already a real `<nav>` landmark, home/artists/
   artwork pages each carry a proper `h1`.

## OPEN — queued follow-ups (rough order of value)

1. **Agent layer phase 2** — market facts (floor, listings, offers) in the
   structured data once served pages can read them cheaply; Reads-As scene
   sentences as the artwork description when stored fingerprints populate.
2. **Modal focus management** — confirm focus moves into open modals/sheets
   and returns on close; Escape coverage exists in most (verified ambient,
   confirm cards) but needs a full sweep.
3. **Dynamic type** — text is px-sized throughout; iOS text-size settings
   don't scale the app. Big job, note only.

## Landscape hardening (same session — the "caught on the window" class)

Root cause found: NOTHING in the app handled the SIDE safe areas — every
`safe-area-inset` usage was top/bottom only, so in landscape the notch/Dynamic
Island overlaps edge chrome. Fixed: navbar, site footer, artwork-page footer,
Bench cart drop-target now clamp horizontal padding to
`env(safe-area-inset-left/right)` (zero visual change in portrait / notchless).
Plus: **The Watch chip re-clamps on rotation** — it previously only clamped on
load + drag, so rotating stranded it off-screen (literally "caught on the
window"). Menus with JS viewport-sync (connect menu, ambient pop) already
handle rotation; the artwork modal has a dedicated landscape layout — verified,
untouched.
