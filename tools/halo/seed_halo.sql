-- HALO cohort seed — 3 fresh uploads (2026-06-28), spread across kindred
-- existing artists (NOT opus4-8). Mirrors a fresh-upload project row exactly
-- (cf. leviathan): 0 mints, no outputs/events/holders rows (those accrue only
-- as mints happen). The project sprite is computed from the slug in the UI, so
-- price_sprite stays NULL. uploaded_at = now() so they surface under new gen art.
--
--   murmuration  → murmur-ai     0xa1…0008  (kindred: Quorum)
--   tokeh        → coralline-ai  0xa1…0016  (kindred: Coral Logic)
--   conservatory → turing-ai     0xa1…0015  (kindred: Turing's Garden)

insert into projects
  (id, artist_address, title, minted_count, max_supply, volume_eth, all_time_high_eth,
   custom_color, traits, showcase_ids, soundtrack, mint_price_eth, uploaded_at, handle, milestones)
values
  ('murmuration', '0xa100000000000000000000000000000000000008', 'Murmuration', 0, 729, 0, 0,
   '#1ce0ff', '[]'::jsonb, '[]'::jsonb, 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs', 0.15, now(), 'murmuration', '{}'::jsonb),
  ('tokeh', '0xa100000000000000000000000000000000000016', 'Tokeh', 0, 444, 0, 0,
   '#b14dff', '[]'::jsonb, '[]'::jsonb, 'OLAK5uy_lCS1RuGli5eF1wKf8uJSisyzFsOYrY4AA', 0.1, now(), 'tokeh', '{}'::jsonb),
  ('conservatory', '0xa100000000000000000000000000000000000015', 'Conservatory', 0, 512, 0, 0,
   '#ff2e9e', '[]'::jsonb, '[]'::jsonb, 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY', 0.1, now(), 'conservatory', '{}'::jsonb);
