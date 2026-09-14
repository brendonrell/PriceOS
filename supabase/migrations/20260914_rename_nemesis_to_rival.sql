-- Rename "nemesis" to "rival" throughout, DB side (Brendon 2026-09-14).
-- The declared-rival column on public.users was originally named
-- nemesis_address (see 20260720_nemesis.sql). Renaming in place preserves
-- existing data and the column default/nullability.

alter table public.users
  rename column nemesis_address to rival_address;
