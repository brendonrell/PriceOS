-- THE MUSHROOM MARKET — gnome listings (Brendon, 2026-07-19).
-- A keeper may hang a sign on their gnome's door: ask_eth set = listed at
-- that price; null = not for sale. Writes go through the SIWE-guarded
-- listing route (owner only); the public read shows the market hall.
alter table public.gnomes add column if not exists ask_eth numeric;
alter table public.gnomes add column if not exists listed_at timestamptz;
