-- MIRROR of live migration 20260712233440_rewind_social_snapshots (backfilled
-- into the repo 2026-07-13 — hardening item 11).
-- The Rewind ◄ R4 seed: one tiny row per account per PriceDay so profiles /
-- leaderboard become rewindable in v2. History not recorded is gone forever —
-- this starts the tape now (Rewind spec, "the one decision with a deadline").
CREATE TABLE IF NOT EXISTS social_snapshots (
  address     text    NOT NULL,
  day         integer NOT NULL,
  followers   integer NOT NULL DEFAULT 0,
  following   integer NOT NULL DEFAULT 0,
  holdings    integer NOT NULL DEFAULT 0,
  price_score integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (address, day)
);
ALTER TABLE social_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_snapshots_read_anon  ON social_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY social_snapshots_read_auth  ON social_snapshots FOR SELECT TO authenticated USING (true);
