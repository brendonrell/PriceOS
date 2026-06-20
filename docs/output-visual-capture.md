# Per-Output Visual Capture — proposal

**Status:** proposal (needs Brendon's go — touches the live `outputs` table).
**Why now:** Gen Curated proved the value of *one* captured visual fact
(`dominant_color`). The same one-canvas sampling pass can capture a whole
aesthetic fingerprint per Output, reusable across the app.

## What we store today (live DB, `public.outputs`)
- `project_id`, `token_id` (PK)
- `dominant_color` — **100% populated** (1275/1275). Values: Beige, Black, Blue,
  Brown, Cream, Green, Grey, Magenta, Moon, Orange, Pink, Purple, Red, White,
  Yellow. (Note: `Beige`/`Pink` are stored but not in the code's `ColorBucket`
  set — a small reconcile worth doing.)
- `rarity` — **column exists, 0% populated.** Free win to fill.
- `minted_at`, `updated_at`.

## The capture mechanism we already have
When a piece's art renders we read its canvas and POST a sampled
`dominant_color` (lib/art/colorStore). That same canvas read can compute every
feature below **in one pass** — no new render, no on-chain calls. Backfill the
1275 existing pieces lazily (as they're viewed, like colour today) or in one
sweep.

## Proposed new per-Output columns (the aesthetic fingerprint)
| Column | Type | What it is | Cheap to compute? |
|---|---|---|---|
| `aspect` | text (`square`/`wide`/`tall`) | canvas w:h bucket | trivial (we know the canvas size) |
| `aspect_ratio` | real | exact w/h | trivial |
| `brightness` | real 0–1 | mean luminance | 1 pass |
| `contrast` | real 0–1 | luminance spread | 1 pass |
| `saturation` | real 0–1 | mean chroma (vivid ↔ muted) | 1 pass |
| `temperature` | real -1..1 | warm ↔ cool bias | 1 pass |
| `palette` | jsonb | top ~5 colours + weights | 1 pass (k-means/bucketed) |
| `palette_count` | int | distinct significant hues (minimal ↔ maximal) | 1 pass |
| `complexity` | real 0–1 | edge density / busyness | 1 pass (sobel-ish) |
| `is_animated` | bool | static vs moving | known at render |
| `dominant_hex` | text | exact dominant (not just bucket) | already half-have |

Plus: **populate `rarity`** (trait-frequency based) while we're in there.

## Why this is high-leverage — it's reused everywhere
- **Gen Curated**: new recipe kinds light up immediately. The engine already
  has the `aspect` hook wired; add brightness/saturation/complexity and we get
  "Into the Dark", "Neon Dreams", "Minimalist", "Busy Signal", "Pastel Hour",
  "All Squares", "Widescreen" — for free.
- **Collected gallery**: new sort / group / filter facets (bright↔dark,
  vivid↔muted, simple↔busy, by shape) over what people own.
- **The Radar / taste profile** (ClickUp): real numeric axes to plot a wallet's
  taste shape and find taste-twins.
- **The Genome** (ClickUp): aesthetic-similarity clustering — these features are
  a cheap *proto-genome* (nearest-neighbour by fingerprint) before the full
  parameter-space one exists.
- **Gallery layout**: `aspect` enables true masonry/packing with zero layout
  shift.
- **Performance**: `is_animated` → poster-frame / lazy-anim handling.
- **Achievements & quests**: "own every colour", "a full rainbow", "six squares",
  "a piece of every element" — all become checkable.
- **Search/discovery**: "show me dark, busy, vivid pieces."

## Shape of the change
- One migration adding the columns to `outputs` (+ optional GIN index on
  `palette`).
- Extend the colour-sampling POST to send the fingerprint; store alongside.
- Backfill (lazy-on-view or one sweep).
- **Gate:** schema + write to live Supabase = Brendon's explicit go + a deploy.

## Recommended first slice (smallest win)
`aspect` + `brightness` + `saturation` + `complexity`. Four numbers, one pass,
and Gen Curated + the gallery facets both get noticeably richer the same day.
