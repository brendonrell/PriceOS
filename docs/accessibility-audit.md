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

## OPEN — queued follow-ups (rough order of value)

1. **Focus visibility** — only ONE `:focus-visible` rule exists app-wide.
   Keyboard users get the browser default (often invisible against dark
   colorways). Add a themed global `:focus-visible` outline (colorway-aware,
   Rule #2-strength) + verify it on pills/chips/rows.
2. **Landmark + heading structure per route** — `<main>` exists; pages need a
   pass for one `h1` per route, `nav` landmark on the navbar, and section
   headings that read in order. Helps screen readers and agent page-parsing
   equally.
3. **Agent-readability layer** — per-route `<title>`/meta description with
   real data (piece name, project, floor), and machine-readable output facts
   (the attributes sheet as structured data). The API already serves all of
   it; this is presentation only. Biggest single win for "agents can use PD."
4. **Toast announcements** — toasts are the app's feedback spine but aren't
   `aria-live`; screen readers miss every "Wishlist: ADDED". One attribute on
   the toast container.
5. **Modal focus management** — confirm focus moves into open modals/sheets
   and returns on close; Escape coverage exists in most (verified ambient,
   confirm cards) but needs a full sweep.
6. **Dynamic type** — text is px-sized throughout; iOS text-size settings
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
