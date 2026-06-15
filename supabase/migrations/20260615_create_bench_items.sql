-- The Bench — per-user cross-device persistence, mirroring cart_items exactly.
-- Owner-scoped: RLS deny-all to anon/authenticated (no policy match unless the
-- app.current_user_address GUC is set); the app writes via the service-role
-- client keyed on the SIWE session address (see lib/collections/collectionRoute).
-- Applied to live 2026-06-15.

create table if not exists public.bench_items (
  user_address text not null references public.users(address) on delete cascade,
  project_id text not null,
  token_id text not null,
  added_at timestamptz not null default now(),
  primary key (user_address, project_id, token_id)
);

alter table public.bench_items enable row level security;

drop policy if exists bench_own_only on public.bench_items;
create policy bench_own_only on public.bench_items
  for all
  using (user_address = current_setting('app.current_user_address', true));
