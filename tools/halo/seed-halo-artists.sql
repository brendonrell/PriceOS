-- HALO surreal cohort — live-DB seed (2026-06-28)
-- Creates 4 new AI-artist accounts + 9 project rows, mirroring the existing
-- -ai artists (users + artist_allowlist; wallets row not needed — matches
-- fathom-ai's footprint). Idempotent (ON CONFLICT DO NOTHING). Heliodon is
-- intentionally OMITTED — it ships later (umbra-ai's staggered second drop).
-- Run ONLY with Brendon's explicit go (live Supabase write, §4 ship gate).

begin;

-- ── 4 new artist accounts ────────────────────────────────────────────────
insert into users (address, handle, ens_name, account_level, price_rank,
  showcase_style, sim_eth_balance, price_score, price_streak, streak_best,
  showcase, settings, calendar_state, grid_presets, workspaces, setup_codes)
values
  ('0xa200000000000000000000000000000000000001','tender-ai','tender-ai.eth',0,0,'grid',10,0,0,0,'{"slots":[null,null,null,null,null,null]}','{}','{}','{}','{}','{}'),
  ('0xa200000000000000000000000000000000000002','newsprint-ai','newsprint-ai.eth',0,0,'grid',10,0,0,0,'{"slots":[null,null,null,null,null,null]}','{}','{}','{}','{}','{}'),
  ('0xa200000000000000000000000000000000000003','veil-ai','veil-ai.eth',0,0,'grid',10,0,0,0,'{"slots":[null,null,null,null,null,null]}','{}','{}','{}','{}','{}'),
  ('0xa200000000000000000000000000000000000004','umbra-ai','umbra-ai.eth',0,0,'grid',10,0,0,0,'{"slots":[null,null,null,null,null,null]}','{}','{}','{}','{}','{}')
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values
  ('0xa200000000000000000000000000000000000001', now()),
  ('0xa200000000000000000000000000000000000002', now()),
  ('0xa200000000000000000000000000000000000003', now()),
  ('0xa200000000000000000000000000000000000004', now())
on conflict (address) do nothing;

-- ── 9 project rows (id = slug; cooldown fires at upload = now()+60d) ───────
-- columns: id, artist_address, handle, title, max_supply, custom_color,
--          soundtrack, mint_price_eth, uploaded_at, cooldown_until
insert into projects (id, artist_address, handle, title, max_supply, custom_color, soundtrack, mint_price_eth, uploaded_at, cooldown_until)
values
  -- tender-ai
  ('loaded-question','0xa200000000000000000000000000000000000001','loaded-question','The Loaded Question',777,'#f7c400','PLUEMihO9lT7-yvLCQxUOojL_dcRNwRW06',0, now(), now()+interval '60 days'),
  ('provenance','0xa200000000000000000000000000000000000001','provenance','Provenance',256,'#b23a2e','OLAK5uy_mGng1-1F5dTzxQK7ONy9aqE350bh9ayHc',0, now(), now()+interval '60 days'),
  ('datum','0xa200000000000000000000000000000000000001','datum','Datum',333,'#14365e','OLAK5uy_msIUSKs_bvqV-eWDtz84ZMQ2ZxCcWZWeM',0, now(), now()+interval '60 days'),
  -- newsprint-ai
  ('off-register','0xa200000000000000000000000000000000000002','off-register','Off Register',256,'#ff5a3c','OLAK5uy_mkw5lnHV_WtzF65IfSBTHqHcj_bvqiBU0',0, now(), now()+interval '60 days'),
  ('interference','0xa200000000000000000000000000000000000002','interference','Interference',222,'#8a93a0','OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs',0, now(), now()+interval '60 days'),
  -- veil-ai
  ('against-the-light','0xa200000000000000000000000000000000000003','against-the-light','Against The Light',256,'#b8a070','PL4NXUZspQ7BwHO5UnqrS6ZX-Pn7Hc_XwS',0, now(), now()+interval '60 days'),
  ('drapery','0xa200000000000000000000000000000000000003','drapery','Drapery',222,'#7a3b3b','OLAK5uy_kS0xK-8stFnvAtN5wIIAidUD2MAXSOxAI',0, now(), now()+interval '60 days'),
  -- umbra-ai (Vestibule only; Heliodon held for later)
  ('vestibule','0xa200000000000000000000000000000000000004','vestibule','Vestibule',256,'#c2613b','OLAK5uy_lpG0l4Qyw1VEijbIO1usIb9gMy7V7zFnA',0, now(), now()+interval '60 days'),
  -- fathom-ai (existing artist) — Noise From Below 2 sequel
  ('noise-from-below-2','0x04c270a8801e2c36102eb5ef0286c31b2f095e21','noise-from-below-2','Noise From Below 2',128,'#8A6E3C','PL2MEf0Id3TeFo6QBeY76d_zvOicDoG_lg',0, now(), now()+interval '60 days')
on conflict (id) do nothing;

commit;
