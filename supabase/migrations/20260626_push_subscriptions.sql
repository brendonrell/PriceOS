-- ════════════════════════════════════════════════════════════════════════
--  PUSH SUBSCRIPTIONS — the device registry for "3D Pingtoasts" (native push)
--  2026-06-26 · one row per (user, device endpoint). When a user enables 3D
--  Pingtoasts, the browser hands us a Web Push subscription (endpoint + keys);
--  we store it here so the server can deliver a native OS notification the next
--  time that user gets a ping — even when PD is closed.
--
--  Applied to Supabase project zspxpfwlwikdxwavffjn ONLY on Brendon's go.
--  Idempotent (IF NOT EXISTS) so it's safe to re-run.
--
--  PRIVATE by construction: these rows carry per-device push secrets, so they
--  are NEVER client-readable. RLS is ON with NO select policy — only the
--  service-role client (the SIWE-gated /api/push/* routes + the createPing
--  send path) touches the table. This mirrors the pings trust boundary:
--  recipient === authed-address enforced in app code on the service client.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),

  -- WHO the device belongs to. The only column the send path filters on.
  user_address  text not null references public.users(address) on delete cascade,

  -- The Web Push subscription. endpoint is globally unique per device+browser;
  -- p256dh + auth are the encryption keys the push service requires.
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,

  -- Best-effort UA tag for debugging "which device is this" — never trusted.
  user_agent    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Hot path: "this user's devices" (fan a ping out to every registered device).
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_address);

alter table public.push_subscriptions enable row level security;
-- Intentionally NO policy: the table is service-role only. anon/authenticated
-- get zero rows, which is exactly what we want for per-device push secrets.
