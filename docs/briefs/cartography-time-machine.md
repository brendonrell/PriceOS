# Brief · Cartography — The Time Machine (for a fresh Fable session)

**From:** the 2026-07-19 Opus Cartography session. **Read `CLAUDE.md` first.**
Work on `dev` rules; present before pushing. This slots into
`components/CartographyModal.tsx` + `styles/cartography.css`, alongside the
zoom / close-× / minimap / legend-filter / double-tap controls **already shipped
this session** (dev tip `d33ae3e8`).

## The button (placement LOCKED by Brendon)

A single control showing **three glyphs: `⇠ ◷ ✧`**, in the **bottom-right control
stack, directly under FIT** (the `.carto-controls` column: WAR · ME · FIT · ⇠◷✧).
- Glyphs are on-vocab (`docs/GLYPHS.md`): `⇠` rewind arrow · `◷` (U+25F7) PD's
  clock/recent mark · `✧` (U+2727) the "arrives" star. VS-15 (`︎`) on each.
- Style: reuse `.carto-ctl` so it matches ME / FIT exactly.

## The behaviour (Brendon approved — "love the timeline spec")

Tapping `⇠ ◷ ✧` drops a **slim timeline along the bottom of the map** — genesis on
the left, **now** on the right.
- **Drag the handle to rewind the whole map to that moment:** land that hadn't
  risen yet **sinks back into the sea**, territories **shrink to their size then**,
  and that moment's **mints/sales replay** as you pass them.
- A **▶ play** button runs it **forward like a time-lapse**, genesis → now — watch
  the whole platform grow up.
- Tap `⇠ ◷ ✧` again (or an ×) to **return to live.**

## Data + reuse (it's all there)

- `/api/cartography` events carry **timestamps**; territory area = **minted count
  up to time T**; holders give inhabitants. Reconstruct state at T from the ledger.
- The **echo/replay** mechanism + the **ripple / comet / beacon** FX already exist
  in the engine — reuse them for the scrub playback.
- The camera (`flyTo`, `cam`), coastlines (`coastPath`/`coast`), and the render
  loop are all in place — the Time Machine is a time-cursor over the same world.

## Note

Keep it a **layer over the live map**, not a separate screen. When off, Cartography
is exactly as it is now. Present the scrubber UI to Brendon before shipping — he is
particular about the map's chrome (he pixel-placed the other controls).
