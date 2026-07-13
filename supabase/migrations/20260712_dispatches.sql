-- MIRROR of live migration 20260712233825_dispatches (backfilled into the
-- repo 2026-07-13 — hardening item 11).
-- The Dispatch — PD's morning paper. One immutable row per edition
-- (keyed by publication PriceDay); the page renders stored rows only, so
-- a URL cited today reads identically in five years.
CREATE TABLE IF NOT EXISTS dispatches (
  day        integer PRIMARY KEY,
  cal_date   date NOT NULL,
  body       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispatches_cal_date_idx ON dispatches (cal_date);
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY dispatches_read_anon ON dispatches FOR SELECT TO anon USING (true);
CREATE POLICY dispatches_read_auth ON dispatches FOR SELECT TO authenticated USING (true);
