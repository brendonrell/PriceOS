-- FAIR DRAW — the settlement service's ledger (the off-chain half; brief:
-- docs/briefs/fair-draw-settlement.md, Brendon approved the build 2026-08-03).
--
-- drops        = one row per windowed drop: the window instants, the status
--                walk (WINDOW → QUIET_CLOSED | CONTESTED → SETTLED), the
--                beacon block + hash, the on-chain commitment, and the full
--                published transcript (the trust product).
-- drop_entries = one held signed mint order per wallet per drop (unique —
--                the one-order-per-wallet law), its band at snapshot, and
--                its life: HELD → EXECUTED / TORN_UP / VOIDED.
--
-- Reads: the transcript on `drops` is public (SELECT to anon/authenticated,
-- house pattern). `drop_entries` has NO select policy AT ALL, deliberately:
-- a held signed order is a broadcastable transaction — exposing it would let
-- a stranger execute someone's mint out from under the choreography — and
-- row order must never leak arrival order (entries are simultaneous). The
-- public read surface for entries is the transcript's canonical ordering,
-- nothing else. Every write goes through the service role in /api/drops.

create table if not exists public.drops (
  id bigint generated always as identity primary key,
  project_id text not null,
  project_address text not null,
  window_open timestamptz not null,
  window_close timestamptz not null,
  supply integer not null check (supply > 0),
  status text not null default 'WINDOW'
    check (status in ('WINDOW', 'QUIET_CLOSED', 'CONTESTED', 'SETTLED')),
  seal_seconds integer,
  beacon_block bigint,
  beacon_hash text,
  commitment text,
  transcript jsonb,
  created_at timestamptz not null default now(),
  unique (project_address, window_open)
);

create table if not exists public.drop_entries (
  id bigint generated always as identity primary key,
  drop_id bigint not null references public.drops (id),
  wallet text not null,
  -- The complete pre-signed mint transaction the app holds ("a signed
  -- instruction, never funds"). Never exposed to any client.
  signed_order text not null,
  seats integer not null default 1 check (seats >= 1),
  -- Priority band at the pre-drop standing snapshot; null until contested
  -- banding runs at close.
  band integer,
  status text not null default 'HELD'
    check (status in ('HELD', 'EXECUTED', 'TORN_UP', 'VOIDED')),
  tx_hash text,
  created_at timestamptz not null default now(),
  unique (drop_id, wallet)
);

create index if not exists drop_entries_drop_idx on public.drop_entries (drop_id);
create index if not exists drops_status_idx on public.drops (status);

alter table public.drops enable row level security;
alter table public.drop_entries enable row level security;

-- The drop row + transcript are the public record.
create policy drops_public_read on public.drops
  for select to anon, authenticated using (true);

-- drop_entries: no policies on purpose — service role only (see header).
