-- Fingerprint v3 — the QUANTITATIVE read (2026-07-01).
-- The countable things a human actually notices: the distinct shapes of colour
-- in a piece ("two blue squares and a yellow circle"), their arrangement, and
-- the generated human sentence. Additive on `outputs`; backfills as pieces are
-- viewed (the existing self-populating capture path). `shapes` keeps the full
-- region list (colour / kind / share / position) so future sort groupings can
-- ask things like "every piece with a yellow circle".

alter table public.outputs
  add column if not exists scene        text,
  add column if not exists shape_count  integer,
  add column if not exists pattern      text,
  add column if not exists shapes       jsonb;
