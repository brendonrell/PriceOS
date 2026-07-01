-- Fingerprint v2 — "the deep look" (2026-07-01).
-- Additive columns on `outputs` for the richer per-piece visual read sampled
-- from the painted canvas: accent colour, palette count, contrast, measured
-- warmth, gravity (where the visual weight sits), symmetry, air (negative
-- space), texture (grain). Scalars stored raw (0..1) + denormalised band words,
-- same pattern as the v1 brightness/saturation/complexity trio. Backfills as
-- pieces are viewed (the existing self-populating capture path).

alter table public.outputs
  add column if not exists accent_color   text,
  add column if not exists accent_share   real,
  add column if not exists palette_count  integer,
  add column if not exists palette_band   text,
  add column if not exists contrast       real,
  add column if not exists contrast_band  text,
  add column if not exists warmth         real,
  add column if not exists warmth_band    text,
  add column if not exists gravity        text,
  add column if not exists symmetry       real,
  add column if not exists symmetry_band  text,
  add column if not exists air            real,
  add column if not exists air_band       text,
  add column if not exists texture        real,
  add column if not exists texture_band   text;
