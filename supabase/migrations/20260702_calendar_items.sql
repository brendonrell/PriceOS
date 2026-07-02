-- THE CALENDAR, real: personal day items (the + beside the day note) and
-- GLOBAL items (@brendon-authored platform schedule). Service-role only
-- (RLS on, no policies). APPLIED LIVE 2026-07-02 (calendar_items).
create table public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'personal' check (scope in ('personal','global')),
  owner_address text,             -- null for global
  date_key text not null,         -- 'YYYY-MM-DD' (Montreal calendar)
  time_label text,                -- optional freeform ("14:00", "all day")
  title text not null check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now()
);
create index calendar_items_date_idx on public.calendar_items (date_key, scope);
create index calendar_items_owner_idx on public.calendar_items (owner_address, date_key);
alter table public.calendar_items enable row level security;
