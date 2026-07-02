-- ════════════════════════════════════════════════════════════════════════
--  PROJECTS — contract_address: the on-chain keying bridge + cutover flag
--  2026-07-02 · The indexer receives events keyed by CONTRACT ADDRESS; the
--  app + DB key projects by SLUG (projects.id). This column is the mapping:
--  set it when a project deploys on-chain and the indexer resolves
--  address → slug through it (tracked-projects cache).
--
--  It doubles as the PER-PROJECT CUTOVER FLAG: while NULL the project is
--  sim-only (app-side mint/market writes allowed); once set, the app
--  refuses sim money-writes for that slug so the chain path and the sim
--  path can never both record the same activity (double-counted volume).
--
--  Additive; applied live 2026-07-02 (Brendon's "fix all of these" go).
-- ════════════════════════════════════════════════════════════════════════

alter table public.projects
  add column if not exists contract_address text unique;

comment on column public.projects.contract_address is
  'Lowercased on-chain contract address. NULL = sim-only project; set = on-chain (indexer maps events through it, app sim money-writes disabled).';
