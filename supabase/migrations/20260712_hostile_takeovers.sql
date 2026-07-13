-- MIRROR of live migration 20260712234602_hostile_takeovers (backfilled into
-- the repo 2026-07-13 — hardening item 11).
-- HOSTILE TAKEOVER — one collector's blanket premium bid on another's whole
-- position in a project. Public, inscribed, 72h, non-cancellable.
CREATE TABLE IF NOT EXISTS takeovers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caster_address   text NOT NULL,
  target_address   text NOT NULL,
  project_id       text NOT NULL,
  price_eth        numeric NOT NULL,
  token_ids        jsonb NOT NULL,
  token_count      integer NOT NULL,
  accepted_count   integer NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'active',  -- active|completed|partial|withstood
  cast_at          timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  resolved_at      timestamptz
);
CREATE INDEX IF NOT EXISTS takeovers_caster_idx  ON takeovers (caster_address);
CREATE INDEX IF NOT EXISTS takeovers_target_idx  ON takeovers (target_address);
CREATE INDEX IF NOT EXISTS takeovers_project_idx ON takeovers (project_id);
ALTER TABLE takeovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY takeovers_read_anon ON takeovers FOR SELECT TO anon USING (true);
CREATE POLICY takeovers_read_auth ON takeovers FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS takeover_acceptances (
  takeover_id uuid NOT NULL REFERENCES takeovers(id),
  token_id    text NOT NULL,
  price_eth   numeric NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (takeover_id, token_id)
);
ALTER TABLE takeover_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY takeover_acc_read_anon ON takeover_acceptances FOR SELECT TO anon USING (true);
CREATE POLICY takeover_acc_read_auth ON takeover_acceptances FOR SELECT TO authenticated USING (true);

-- The blanket offers ride the real book; the link column lets acceptance
-- attribute a sale to its takeover and lets the Offers HQ badge them.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS takeover_id uuid;
CREATE INDEX IF NOT EXISTS offers_takeover_idx ON offers (takeover_id) WHERE takeover_id IS NOT NULL;
