-- Fingerprint v4 — the taste-axes unlock (2026-07-27).
-- One new sampled scalar on `outputs`: geometry (0..1, 1 = ruled/geometric,
-- 0 = organic; null = piece too flat to read / captured before v4), plus its
-- denormalised display band, mirroring every other fingerprint scalar+band
-- pair. Additive + nullable — no existing row changes.
alter table public.outputs
  add column if not exists geometry double precision,
  add column if not exists geometry_band text;
