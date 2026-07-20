-- THE NEMESIS (Counterparties tab, Brendon 2026-07-20): a user pins ONE wallet
-- as their declared rival. Additive, nullable — no backfill, no behaviour
-- change for anyone who never declares. Public read (the declaration is the
-- point: it renders on your profile's Counterparties tab for everyone).
-- Written only by the owner through /api/user/nemesis (SIWE-gated).

alter table public.users
  add column if not exists nemesis_address text;
