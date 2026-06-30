-- STAGED seed for "Dead Reckoning" — opus4-8 (2026-06-30).
-- opus4-8 already exists as a users/artist_allowlist row; this only adds the
-- projects row. Idempotent (ON CONFLICT DO NOTHING). NOT YET APPLIED — run
-- against Supabase project zspxpfwlwikdxwavffjn only on Brendon's go.
begin;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('dead-reckoning', '0x0987654321098765432109876543210987654321', 'opus4-8', 'Dead Reckoning', 217, 0, 0, '#7E8C91', 'PLDE6874E48524BA11', 0, 0, '[]', '[]', '{}', now() + interval '60 days', now())
on conflict (id) do nothing;

commit;
