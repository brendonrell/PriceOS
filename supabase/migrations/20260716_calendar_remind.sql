-- Calendar ↔ Pings fine control (2026-07-16, the Calendar Sheet build).
-- Each calendar item carries its own reminder plan:
--   'off'    — never ping
--   'attime' — ping at the item's HH:MM (or the 09:00 Montreal all-day
--              default) — the behaviour every existing row already has
--   '15m' / '1h' — ping that long before the item's time
--   '1d'     — ping the day before, at the item's time
-- The todo-reminders sweep reads this; the Calendar Sheet writes it.
alter table calendar_items
  add column if not exists remind text not null default 'attime';

alter table calendar_items
  add constraint calendar_items_remind_check
  check (remind in ('off', 'attime', '15m', '1h', '1d'));
