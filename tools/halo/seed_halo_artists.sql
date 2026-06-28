-- STAGED seed for the 6 new halo artists + projects (2026-06-28).
-- Mirrors the existing -ai account shape: a users row + artist_allowlist row +
-- a projects row each. Idempotent (ON CONFLICT DO NOTHING). NOT YET APPLIED —
-- run against Supabase project zspxpfwlwikdxwavffjn only on Brendon's go.
begin;

-- lowgravity-ai → @orbital
insert into users (address, handle, ens_name, account_level, showcase, showcase_style, settings, calendar_state, grid_presets, workspaces, setup_codes, sim_eth_balance, price_rank, price_score, price_streak, streak_best, created_at)
values ('0x5412d61c61cf84c76e6f5b1d80ee0e5f76504339', 'lowgravity-ai', 'lowgravity-ai.eth', 0, '{"slots":[null,null,null,null,null,null]}', 'grid', '{}', '{}', '{}', '{}', '{}', 10, 0, 0, 0, 0, now())
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values ('0x5412d61c61cf84c76e6f5b1d80ee0e5f76504339', now())
on conflict (address) do nothing;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('orbital', '0x5412d61c61cf84c76e6f5b1d80ee0e5f76504339', 'orbital', 'Orbital', 444, 0, 0.08, '#ff5e5e', 'OLAK5uy_muokP2ArFXF_yuj0Qnh_5_QmfFMpwqFj4', 0, 0, '{}', '[]', '[]', now() + interval '60 days', now())
on conflict (id) do nothing;

-- offset-ai → @pressroom
insert into users (address, handle, ens_name, account_level, showcase, showcase_style, settings, calendar_state, grid_presets, workspaces, setup_codes, sim_eth_balance, price_rank, price_score, price_streak, streak_best, created_at)
values ('0x2e315cfb5d2114c4355ffd00b4315466111a0bc4', 'offset-ai', 'offset-ai.eth', 0, '{"slots":[null,null,null,null,null,null]}', 'grid', '{}', '{}', '{}', '{}', '{}', 10, 0, 0, 0, 0, now())
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values ('0x2e315cfb5d2114c4355ffd00b4315466111a0bc4', now())
on conflict (address) do nothing;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('pressroom', '0x2e315cfb5d2114c4355ffd00b4315466111a0bc4', 'pressroom', 'Pressroom', 512, 0, 0.05, '#ff48a0', 'PLWQigmFvFjPdvjrUyTTkpocV3KHfibXmO', 0, 0, '{}', '[]', '[]', now() + interval '60 days', now())
on conflict (id) do nothing;

-- nightpour-ai → @cinder
insert into users (address, handle, ens_name, account_level, showcase, showcase_style, settings, calendar_state, grid_presets, workspaces, setup_codes, sim_eth_balance, price_rank, price_score, price_streak, streak_best, created_at)
values ('0x9aaec587cd4446872e04d687209c168f39f0c3e8', 'nightpour-ai', 'nightpour-ai.eth', 0, '{"slots":[null,null,null,null,null,null]}', 'grid', '{}', '{}', '{}', '{}', '{}', 10, 0, 0, 0, 0, now())
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values ('0x9aaec587cd4446872e04d687209c168f39f0c3e8', now())
on conflict (address) do nothing;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('cinder', '0x9aaec587cd4446872e04d687209c168f39f0c3e8', 'cinder', 'Cinder', 333, 0, 0.12, '#ff7a18', 'PL2MEf0Id3TeFo6QBeY76d_zvOicDoG_lg', 0, 0, '{}', '[]', '[]', now() + interval '60 days', now())
on conflict (id) do nothing;

-- headways-ai → @catenary
insert into users (address, handle, ens_name, account_level, showcase, showcase_style, settings, calendar_state, grid_presets, workspaces, setup_codes, sim_eth_balance, price_rank, price_score, price_streak, streak_best, created_at)
values ('0x900c1a60ac0632a1e4b88ba6b7c8fcccfaa48cc5', 'headways-ai', 'headways-ai.eth', 0, '{"slots":[null,null,null,null,null,null]}', 'grid', '{}', '{}', '{}', '{}', '{}', 10, 0, 0, 0, 0, now())
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values ('0x900c1a60ac0632a1e4b88ba6b7c8fcccfaa48cc5', now())
on conflict (address) do nothing;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('catenary', '0x900c1a60ac0632a1e4b88ba6b7c8fcccfaa48cc5', 'catenary', 'Catenary', 256, 0, 0.1, '#ffb02e', 'PL4NXUZspQ7BwHO5UnqrS6ZX-Pn7Hc_XwS', 0, 0, '{}', '[]', '[]', now() + interval '60 days', now())
on conflict (id) do nothing;

-- nightlawn-ai → @topiary
insert into users (address, handle, ens_name, account_level, showcase, showcase_style, settings, calendar_state, grid_presets, workspaces, setup_codes, sim_eth_balance, price_rank, price_score, price_streak, streak_best, created_at)
values ('0x695d8f5c394998c98edbd2e85890a42711a81c06', 'nightlawn-ai', 'nightlawn-ai.eth', 0, '{"slots":[null,null,null,null,null,null]}', 'grid', '{}', '{}', '{}', '{}', '{}', 10, 0, 0, 0, 0, now())
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values ('0x695d8f5c394998c98edbd2e85890a42711a81c06', now())
on conflict (address) do nothing;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('topiary', '0x695d8f5c394998c98edbd2e85890a42711a81c06', 'topiary', 'Topiary', 360, 0, 0.07, '#1fae5a', 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY', 0, 0, '{}', '[]', '[]', now() + interval '60 days', now())
on conflict (id) do nothing;

-- slacktide-ai → @slack-water
insert into users (address, handle, ens_name, account_level, showcase, showcase_style, settings, calendar_state, grid_presets, workspaces, setup_codes, sim_eth_balance, price_rank, price_score, price_streak, streak_best, created_at)
values ('0x612338d725f9d9c2396c19020a289a18c05d9093', 'slacktide-ai', 'slacktide-ai.eth', 0, '{"slots":[null,null,null,null,null,null]}', 'grid', '{}', '{}', '{}', '{}', '{}', 10, 0, 0, 0, 0, now())
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values ('0x612338d725f9d9c2396c19020a289a18c05d9093', now())
on conflict (address) do nothing;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('slack-water', '0x612338d725f9d9c2396c19020a289a18c05d9093', 'slack-water', 'Slack Water', 288, 0, 0.09, '#1ec8c8', 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs', 0, 0, '{}', '[]', '[]', now() + interval '60 days', now())
on conflict (id) do nothing;

commit;
