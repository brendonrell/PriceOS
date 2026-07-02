/*
 * lib/priceday/almanac.server — the PriceDay almanac engine, SERVER-ONLY.
 * One source builds the day for every surface: the /api/priceday route (the
 * built modals), the global-search PriceDay powerup, and the calendar's
 * selected-day column. Real ledger + deterministic seeded prose: every day
 * keeps its own sentences forever, no upkeep.
 *
 * SIM GENESIS NOTE (Brendon, 2026-07-02): the current epoch is the sim run —
 * PRISMS stands as sim genesis. At the real launch, reset PRICEDAY_EPOCH to
 * the first real project upload (one line in lib/priceday/priceday.ts) and
 * every surface re-anchors together.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProject } from '@/lib/project/registry';
import { PRICEDAY_EPOCH } from './priceday';

const DAY_MS = 86_400_000;

export interface AlmanacRow { label: string; value: string; href?: string }

export interface PriceDayAlmanac {
  number: number;
  date_label: string;
  minted: AlmanacRow[];
  uploaded: AlmanacRow[];
  biggestSale: AlmanacRow | null;
  flavor: string;
  /** THE DAY'S PRICE STORY — a few beats, distinct from an output's story:
   *  a day is a scene, not a biography. */
  story: string[];
  tallies: {
    mints: number; sales: number; volume_eth: number;
    listings: number; offers: number; uploads: number;
  };
}

/* UTC instant of Montreal midnight for a UTC-midnight calendar index. */
export function montrealMidnightUtcMs(calUtcMidnight: number): number {
  const probe = new Date(calUtcMidnight + 6 * 3_600_000);
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Montreal', hour: 'numeric', hourCycle: 'h23' })
      .format(probe),
  );
  const offsetH = (6 - hour + 24) % 24;
  return calUtcMidnight + offsetH * 3_600_000;
}

export function dayWindow(n: number): { startSec: number; endSec: number; calDay: number } {
  const calDay = PRICEDAY_EPOCH + (n - 1) * DAY_MS;
  return {
    calDay,
    startSec: Math.floor(montrealMidnightUtcMs(calDay) / 1000),
    endSec: Math.floor(montrealMidnightUtcMs(calDay + DAY_MS) / 1000),
  };
}

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function pick<T>(seed: number, salt: number, options: T[]): T {
  return options[(seed + salt * 2654435761) >>> 0 % options.length % options.length] ?? options[0];
}

export async function buildPriceDayAlmanac(db: SupabaseClient, n: number): Promise<PriceDayAlmanac> {
  const { startSec, endSec, calDay } = dayWindow(n);
  const startMs = startSec * 1000;
  const endMs = endSec * 1000;
  const seed = fnv(`priceday:${n}`);

  const [mintRes, saleRes, listRes, offerRes, projRes] = await Promise.all([
    db.from('events').select('project_id, token_id, to_address, timestamp')
      .eq('type', 'MINT').gte('timestamp', startSec).lt('timestamp', endSec)
      .order('timestamp', { ascending: true }).limit(500),
    db.from('events').select('project_id, token_id, price_eth, to_address')
      .eq('type', 'XFER').not('price_eth', 'is', null)
      .gte('timestamp', startSec).lt('timestamp', endSec)
      .order('price_eth', { ascending: false }).limit(200),
    db.from('events').select('project_id', { count: 'exact', head: true })
      .eq('type', 'LIST').gte('timestamp', startSec).lt('timestamp', endSec),
    db.from('events').select('project_id', { count: 'exact', head: true })
      .eq('type', 'OFFER').gte('timestamp', startSec).lt('timestamp', endSec),
    db.from('projects').select('id, title, artist_address, uploaded_at')
      .gte('uploaded_at', new Date(startMs).toISOString())
      .lt('uploaded_at', new Date(endMs).toISOString())
      .limit(50),
  ]);

  const mints = (mintRes.data ?? []) as { project_id: string; token_id: string; to_address: string | null }[];
  const sales = (saleRes.data ?? []) as { project_id: string; token_id: string; price_eth: number; to_address: string | null }[];
  const uploads = (projRes.data ?? []) as { id: string; title: string; artist_address: string | null }[];

  const addrs = Array.from(new Set([
    ...mints.map((m) => m.to_address),
    ...sales.slice(0, 1).map((s) => s.to_address),
    ...uploads.map((u) => u.artist_address),
  ].filter((a): a is string => !!a)));
  const handleByAddr = new Map<string, string | null>();
  if (addrs.length > 0) {
    const hs = await db.from('users').select('address, handle').in('address', addrs);
    for (const u of (hs.data ?? []) as { address: string; handle: string | null }[]) {
      handleByAddr.set(u.address, u.handle);
    }
  }
  const who = (a: string | null) => {
    if (!a) return '@—';
    const h = handleByAddr.get(a);
    return h ? `@${h}` : `${a.slice(0, 6)}…`;
  };
  const titleOf = (slug: string) => getProject(slug)?.displayName ?? slug;

  const MAX_ROWS = 4;
  const minted: AlmanacRow[] = mints.slice(0, MAX_ROWS).map((m) => ({
    label: `${titleOf(m.project_id)} #${m.token_id}`,
    value: who(m.to_address),
    href: `/art/${m.project_id}/${m.token_id}`,
  }));
  if (mints.length > MAX_ROWS) minted.push({ label: `+ ${mints.length - MAX_ROWS} more`, value: '' });
  const uploaded: AlmanacRow[] = uploads.slice(0, MAX_ROWS).map((u) => ({
    label: u.title,
    value: who(u.artist_address),
    href: `/art/${u.id}`,
  }));
  const top = sales[0] ?? null;
  const biggestSale: AlmanacRow | null = top
    ? {
        label: `${titleOf(top.project_id)} #${top.token_id}`,
        value: `${Number(Number(top.price_eth).toFixed(3))} ETH`,
        href: `/art/${top.project_id}/${top.token_id}`,
      }
    : null;

  const volume = sales.reduce((s, e) => s + Number(e.price_eth), 0);
  const listsN = listRes.count ?? 0;
  const offersN = offerRes.count ?? 0;

  // THE DAY — the one-liner the modals wear.
  let flavor: string;
  if (mints.length === 0 && sales.length === 0 && uploads.length === 0 && listsN === 0 && offersN === 0) {
    flavor = pick(seed, 1, [
      'A quiet day. The record keeps it anyway.',
      'Nothing moved. Somebody was watching, though.',
      'The room held its breath.',
    ]);
  } else if (volume > 0 && sales.length >= 3) {
    flavor = pick(seed, 2, [
      `A trading day — ${sales.length} sales, ${Number(volume.toFixed(3))} ETH changed hands.`,
      `${Number(volume.toFixed(3))} ETH on the move across ${sales.length} sales.`,
    ]);
  } else if (mints.length >= 5) {
    flavor = pick(seed, 3, [
      `A minting day — ${mints.length} new pieces found keepers.`,
      `${mints.length} fresh mints. The supply grew, the room with it.`,
    ]);
  } else if (uploads.length > 0) {
    flavor = pick(seed, 4, [
      `${uploads.length === 1 ? 'A new project arrived' : `${uploads.length} new projects arrived`}. Genesis energy.`,
      'New work on the wall. The day belonged to the artists.',
    ]);
  } else {
    const bits: string[] = [];
    if (mints.length > 0) bits.push(`${mints.length} mint${mints.length === 1 ? '' : 's'}`);
    if (sales.length > 0) bits.push(`${sales.length} sale${sales.length === 1 ? '' : 's'}`);
    if (listsN > 0) bits.push(`${listsN} listing${listsN === 1 ? '' : 's'}`);
    if (offersN > 0) bits.push(`${offersN} offer${offersN === 1 ? '' : 's'}`);
    flavor = `${bits.join(' · ')} — a working day on the record.`;
  }

  // THE DAY'S PRICE STORY — a scene in beats (distinct voice from an
  // output's biography): opener → market beat → closer.
  const story: string[] = [];
  story.push(pick(seed, 5, [
    `PriceDay ${n} opened like any other. It wasn't.`,
    `Day ${n} on the record.`,
    `The ${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'} day PD had been running.`,
  ]));
  if (mints.length > 0) {
    story.push(pick(seed, 6, [
      `${mints.length} mint${mints.length === 1 ? '' : 's'} — ${mints.length === 1 ? 'one keeper stepped up' : 'the collectors came'}.`,
      `The mint button earned its keep: ${mints.length} pressed it.`,
    ]));
  }
  if (top) {
    story.push(pick(seed, 7, [
      `The big one: ${titleOf(top.project_id)} #${top.token_id} for ${Number(Number(top.price_eth).toFixed(3))} ETH.`,
      `${who(top.to_address)} paid ${Number(Number(top.price_eth).toFixed(3))} ETH for ${titleOf(top.project_id)} #${top.token_id} and made the day's headline.`,
    ]));
  }
  if (offersN > 0 || listsN > 0) {
    story.push(`${listsN > 0 ? `${listsN} listing${listsN === 1 ? '' : 's'}` : ''}${listsN > 0 && offersN > 0 ? ' and ' : ''}${offersN > 0 ? `${offersN} offer${offersN === 1 ? '' : 's'}` : ''} hit the book.`);
  }
  if (story.length === 1) {
    story.push(pick(seed, 8, [
      'The ledger has quiet pages too.',
      'A rest day. They count the same.',
    ]));
  }

  const dateLabel = new Date(calDay).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).toUpperCase();

  return {
    number: n,
    date_label: dateLabel,
    minted,
    uploaded,
    biggestSale,
    flavor,
    story,
    tallies: {
      mints: mints.length,
      sales: sales.length,
      volume_eth: Number(volume.toFixed(4)),
      listings: listsN,
      offers: offersN,
      uploads: uploads.length,
    },
  };
}
