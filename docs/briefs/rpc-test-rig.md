# BRIEF — RPC test rig: boot the schema in CI, test the money functions directly

**For a fresh Opus 4.8 chat. Read `CLAUDE.md` first and obey all of it.
Origin: Architect Report round 2 (`docs/ARCHITECT_REPORT_2026-07-17.md` §3.2).
Run order: FIRST of the money-workstream briefs — `money-logic-pass.md` and
`sticker-primary-serverside.md` both want this rig to validate against.**

## Why

The 40-test suite exercises every route ABOVE the database; the Postgres
functions where money actually moves (`app_mint`, `app_buy`,
`app_accept_offer`, `app_sticker_buy`, `app_sticker_accept`, the swap/criteria
functions, `app_merge_user_state`) have zero tests. July's hardening round
couldn't fix this: the Supabase project is on the free plan (no branch DBs —
verified, create rejected). The unlock: the repo now mirrors its migrations
(`supabase/migrations/`, 45 files) — enough to boot the schema into a
**throwaway Postgres inside CI** and call the function bodies directly.

## The design

1. **Schema baseline.** The mirror starts 2026-06-14 — the BASE tables
   (users, projects, outputs, events, wallets…) predate it. So step one is a
   one-time schema-only dump of the live DB into
   `supabase/schema-baseline.sql` (the logical-export path was proven in
   hardening item 17; schema only, NO data, no secrets). Document inside the
   file: baseline date + "regenerate by re-dumping; never hand-edit."
2. **Boot script** (`tools/db-rig/`): start Postgres (GitHub Actions service
   container, `postgres:15`), create the Supabase roles the SQL expects
   (`anon`, `authenticated`, `service_role`) + extensions (`pgcrypto`,
   `citext`), apply `schema-baseline.sql`, then every migration dated AFTER
   the baseline, in filename order. Any failure = red build.
3. **Tests** (vitest + `pg`, new file family `tests/rpc/*.test.ts`, seeded
   fixture rows): mint happy path + sold-out + wrong-price rejection ·
   buy debits buyer / credits seller / conservation to the wei ·
   **buy with NO buyer users row (today: conjured ETH — pin current
   behaviour, flips to rejection after `money-logic-pass.md`)** ·
   accept-offer paths · sticker buy/accept: 95/3/2 split exact, collab
   rerouting exact · settings merge atomicity · idempotency-key replay at
   the DB layer.
4. **CI wiring**: separate job in `.github/workflows/ci.yml` so app-build
   speed is untouched; runs on the same triggers.

## Rules

- Read-only against the LIVE database (the one dump). Never point the rig at
  it. The rig DB is disposable per-run.
- No app code changes at all. This brief is tools/tests/CI only.
- If a migration fails to apply in the rig because it assumed live-only state,
  fix the RIG (shim), never the migration history.

## Done when

Rig boots green in CI · every listed function has happy + rejection + 
conservation coverage · the conjured-ETH pin test documents today's gap with
a comment pointing at `money-logic-pass.md` · README run-order updated ·
brief deleted in the completing PR.
