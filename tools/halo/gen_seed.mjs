/* Generate the STAGED seed SQL for the 6 new halo artists + their projects.
   Mirrors the existing -ai account shape (users + artist_allowlist + projects).
   Writes tools/halo/seed_halo_artists.sql. Does NOT touch the DB. */
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';

const addr = (h) => '0x' + createHash('sha256').update(h).digest('hex').slice(0, 40);

const A = [
  { handle: 'lowgravity-ai', slug: 'orbital',     title: 'Orbital',     color: '#ff5e5e', supply: 444, price: 0.08, st: 'OLAK5uy_muokP2ArFXF_yuj0Qnh_5_QmfFMpwqFj4' },
  { handle: 'offset-ai',     slug: 'pressroom',   title: 'Pressroom',   color: '#ff48a0', supply: 512, price: 0.05, st: 'PLWQigmFvFjPdvjrUyTTkpocV3KHfibXmO' },
  { handle: 'nightpour-ai',  slug: 'cinder',      title: 'Cinder',      color: '#ff7a18', supply: 333, price: 0.12, st: 'PL2MEf0Id3TeFo6QBeY76d_zvOicDoG_lg' },
  { handle: 'headways-ai',   slug: 'catenary',    title: 'Catenary',    color: '#ffb02e', supply: 256, price: 0.10, st: 'PL4NXUZspQ7BwHO5UnqrS6ZX-Pn7Hc_XwS' },
  { handle: 'nightlawn-ai',  slug: 'topiary',     title: 'Topiary',     color: '#1fae5a', supply: 360, price: 0.07, st: 'PLitsxevT321MbKWfv5sSHOjVfPCou9EsY' },
  { handle: 'slacktide-ai',  slug: 'slack-water', title: 'Slack Water', color: '#1ec8c8', supply: 288, price: 0.09, st: 'OLAK5uy_nYQUGK6taXBkF8pOXguR7fAvX5rPUSPAs' },
];

let sql = `-- STAGED seed for the 6 new halo artists + projects (2026-06-28).
-- Mirrors the existing -ai account shape: a users row + artist_allowlist row +
-- a projects row each. Idempotent (ON CONFLICT DO NOTHING). NOT YET APPLIED —
-- run against Supabase project zspxpfwlwikdxwavffjn only on Brendon's go.
begin;
`;
for (const a of A) {
  const ad = addr(a.handle);
  sql += `
-- ${a.handle} → @${a.slug}
insert into users (address, handle, ens_name, account_level, showcase, showcase_style, settings, calendar_state, grid_presets, workspaces, setup_codes, sim_eth_balance, price_rank, price_score, price_streak, streak_best, created_at)
values ('${ad}', '${a.handle}', '${a.handle}.eth', 0, '{"slots":[null,null,null,null,null,null]}', 'grid', '{}', '{}', '{}', '{}', '{}', 10, 0, 0, 0, 0, now())
on conflict (address) do nothing;

insert into artist_allowlist (address, added_at) values ('${ad}', now())
on conflict (address) do nothing;

insert into projects (id, artist_address, handle, title, max_supply, minted_count, mint_price_eth, custom_color, soundtrack, volume_eth, all_time_high_eth, traits, showcase_ids, milestones, cooldown_until, uploaded_at)
values ('${a.slug}', '${ad}', '${a.slug}', '${a.title}', ${a.supply}, 0, ${a.price}, '${a.color}', '${a.st}', 0, 0, '{}', '[]', '[]', now() + interval '60 days', now())
on conflict (id) do nothing;
`;
}
sql += `\ncommit;\n`;
writeFileSync('tools/halo/seed_halo_artists.sql', sql);
console.log('wrote tools/halo/seed_halo_artists.sql for: ' + A.map((a) => a.handle).join(', '));
