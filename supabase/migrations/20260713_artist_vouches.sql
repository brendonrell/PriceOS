-- ARTIST VOUCHES (Brendon's artist batch, 2026-07-13): word of mouth as a
-- mechanic. A whitelisted artist holds TWO vouch slots — a name they put
-- forward for the filter. Vouches are input to Brendon's whitelist call
-- (each one also pings @brendon's inbox), never an automatic admission.
-- Service-role only (RLS on, no public policies). Applied live 2026-07-13.

create table if not exists public.artist_vouches (
  voucher_wallet text not null,
  vouched text not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (voucher_wallet, vouched)
);

alter table public.artist_vouches enable row level security;
