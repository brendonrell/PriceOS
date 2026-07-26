# BRIEF — Deep Zoom

> **Status: SPEC'D 2026-07-26, not built.** Origin: King Mode Keeper #4
> (ClickUp Atlas → "Keepers — Greenlit (full specs)"), re-verified against the
> live app 2026-07-26. Pure client feature: no tables, no routes, $0.

**One line:** pinch into any piece and it **re-renders razor-sharp at the new
scale** — there is no stored image to pixelate, only the deterministic math.
The three-second "how'd they do that" a gallery can't copy.

Marketing line: *"Zoom forever. There's no image to pixelate — only the math."*

---

## Grounding — verified in the repo 2026-07-26

- **Render path:** every engine paints via `render(canvas, tokenId, width)`
  through `renderArtwork` / the ProjectContext paint. Re-render at a larger
  width IS the whole feature. Never touch or re-derive the canonical render —
  same seed, same math, bigger canvas (or a sub-rect of it).
- **Gesture field is occupied by ONE-finger:** `components/OutputPreview.tsx`
  (~line 832) — horizontal swipe = prev/next, swipe down = dismiss, 44px
  threshold, `touch-action: none` on the surface, and a tap opens the full
  artwork page (gated so a swipe never navigates). **Deep Zoom is
  TWO-finger-only** and must leave every one-finger behaviour byte-identical.
  While zoomed >1×, one-finger becomes PAN of the zoomed art; swipe-nav and
  tap-to-page suspend until zoom returns to 1× (they resume exactly as they
  were). Apple's reserved edge gestures stay untouched — never intercept the
  bottom edge.
- **Both canvases:** portrait and landscape artwork paths in the modal get it.

## Perf discipline (this IS the spec)

- **Re-render on gesture END / detent stops — never per frame.** During the
  pinch, transform-scale the existing bitmap (cheap, blurry is fine
  mid-gesture); on release, repaint at the new effective width and swap.
  Respect "always feel moving forward": visible motion (the existing pulse
  vocabulary) between release and the sharp swap — never a frozen frame.
- **Hard pixel ceiling.** Clamp max canvas area well under the iOS Safari
  canvas-memory crash line; one REUSED offscreen canvas, never a fresh
  allocation per zoom; cap to one render in flight (a newer gesture cancels
  the pending one).
- **Deep zoom = sub-rect render.** Past the full-canvas ceiling, render only
  the visible crop at full resolution instead of the whole piece bigger.
- **Per-engine cost tiers.** Cheap engines (Prisms-class) are near-free at any
  scale — Phase 1. Heavy engines (Oracle-grain-class) ship in Phase 1b behind
  lower zoom caps / sub-rect-only. Tier table lives in the code with the
  caps, one place.

## UI (doors — ⛔ Rule #-0.4: Brendon confirms BEFORE code)

- **In:** pinch on the art in the Output modal. **Out:** pinch back below 1×
  or the modal's existing × — zoom state never persists; reopening the modal
  is always 1×. Default OFF by nature (nothing happens until the user
  pinches). Brendon confirms this door pair before build.
- **Zoom readout:** proposed small accent pill (e.g. `3.2×`) while zoomed,
  gone at 1×. Placement + whether it exists at all = Brendon's call.
- Max zoom depth per engine tier = Brendon's call (proposed 8× cheap / 4×
  heavy as the starting numbers).
- No new glyphs without the `docs/GLYPHS.md` gate; corner law 4px;
  full-strength chrome.

## Phasing

1. **Phase 1:** cheap engines, full-canvas re-render on release, pixel
   ceiling + reused offscreen canvas.
2. **Phase 1b:** heavy engines via sub-rect + lower caps.

## Acceptance

Pinching a cheap-engine Output on iPhone stays crisp deep into zoom (sharp
swap on release, motion during), no crash on any engine; one-finger swipes,
tap-to-page and dismiss behave exactly as today at 1×; pan works while
zoomed; heavy engines are clamped and stable; the canonical render is never
altered; zero network, zero storage.
