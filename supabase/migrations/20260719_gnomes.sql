-- THE GNOMES — the awakening ledger (Brendon, 2026-07-19).
-- One row per project whose gnome has WOKEN: a gnome sleeps in the hill
-- until an unknown (server-seeded) amount of the project is minted; the
-- wallet whose mint strikes that hour owns the gnome. Rows are written
-- exactly once by the service role (the gnome route) and never updated —
-- an awakening is permanent. Rarity is cast from real traded volume at
-- the waking hour and locked.
create table if not exists public.gnomes (
  project_id text primary key,
  awakened_at timestamptz not null default now(),
  owner_address text not null,
  token_id integer not null,
  rarity text not null
);

alter table public.gnomes enable row level security;

-- Everyone may see who keeps a gnome (ownership shows on the project tab);
-- all writes go through the service role only (no insert/update policies).
drop policy if exists gnomes_read on public.gnomes;
create policy gnomes_read on public.gnomes for select to anon, authenticated using (true);

create index if not exists gnomes_owner_idx on public.gnomes (owner_address);
