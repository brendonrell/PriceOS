-- THE SIGIL — the forge timestamp (Factions v3.1 §1 · task 86b9erfwp).
-- Null = unforged. Set ONCE by the forge (the /api/me guarded write only
-- fires when the column is still null); never cleared — a tattoo.
alter table public.users add column if not exists sigil_forged_at timestamptz;

-- Public profile reads are column-level grants (see PUBLIC_USER_COLUMNS) —
-- the Sigil is public identity, like the sprite and the rank.
grant select (sigil_forged_at) on public.users to anon, authenticated;
