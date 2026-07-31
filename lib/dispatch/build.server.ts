/*
 * The Dispatch — PD's morning paper, edition builder.
 *
 * One edition per PriceDay, published at 9AM Montreal, covering the PRIOR
 * day — a real morning paper, dated today, about yesterday. Every number
 * comes from the real ledger; the prose is deterministic and seeded (the
 * Price Story pattern — numbers from data, voice from the house, $0 to
 * run). Editions are stored immutable in `dispatches`; this builder only
 * runs once per edition, so the archive is permanent and citable.
 *
 * THE 2026-07-16 WOW PASS — the paper learned to write:
 *   • Deep phrase libraries (lib/dispatch/voice.ts) + ROTATION MEMORY: the
 *     builder reads which phrasings the last ~120 editions used (stored in
 *     each edition's `voice.used`) and refuses to reuse them, so the house
 *     voice doesn't repeat for months even on identical market shapes.
 *   • New computed DESKS, each printed only when it has something real, so
 *     the paper's shape itself changes day to day: THE MARKET DESK
 *     (day-over-day deltas, streaks, record checks against the archive),
 *     PERSONS OF INTEREST (busiest hands, named), NUMBER OF THE DAY (a
 *     rotating stable of calculated curiosities), ON THIS DAY (the paper
 *     quoting its own archive), THE WEEK BRIEFLY (Sunday recap).
 *   • Editions now store their `tallies` and `voice`, so future editions
 *     compute streaks/records/deltas from the archive itself.
 *
 * Saturday + Sunday print the lighter Weekend Edition (shorter, more
 * reflective) — same paper, softer voice.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPriceDayAlmanac, dayWindow } from '@/lib/priceday/almanac.server';
import { formatPriceDate, PRICEDAY_EPOCH } from '@/lib/priceday/priceday';
import { getProject } from '@/lib/project/registry';
import { POOLS, VoiceMemory, fnv, fill, plural, eth, ordinal, daypart } from './voice';
import { HIDDEN_PROJECTS_NOT_IN } from '../platform/hiddenProjects';

const DAY_MS = 86_400_000;

export interface DispatchRow { label: string; value: string; href?: string }

/** An optional extra section — head + any mix of prose/list/rows. The page
 *  renders whatever a desk carries; absent desks simply don't print. */
export interface DispatchDesk {
  head: string;
  prose?: string[];
  list?: string[];
  rows?: DispatchRow[];
}

export interface DispatchBody {
  edition: number;
  /** Publication date stamp, e.g. "JUL 12 2026". */
  date: string;
  /** ISO calendar date of publication (URL key). */
  cal_date: string;
  weekend: boolean;
  lead: { head: string; body: string };
  numbers: DispatchRow[];
  salon: string;
  noted: string[];
  horizon: string[];
  /** Extra desks (2026-07-16+ editions). Older rows simply lack them. */
  desks?: DispatchDesk[];
  /** The covered day's tallies, stored so future editions can compute
   *  streaks/deltas/records straight from the archive. */
  tallies?: {
    mints: number; sales: number; volume_eth: number;
    listings: number; offers: number; uploads: number; top_eth: number | null;
  };
  /** Phrase ids this edition consumed — the rotation memory's food. */
  voice?: { used: string[] };
}

function calDateISO(day: number): string {
  return new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

function isWeekend(day: number): boolean {
  const dow = new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS).getUTCDay();
  return dow === 0 || dow === 6;
}
function isSunday(day: number): boolean {
  return new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS).getUTCDay() === 0;
}

/* ── archive digestion ─────────────────────────────────────────────────
 * Editions since the wow pass store `tallies`; older rows are parsed from
 * their BY THE NUMBERS table so streaks reach back to Edition 1. */
interface ArchDay {
  day: number;
  cal_date: string;
  head: string;
  mints: number; sales: number; volume: number; entries: number;
  topEth: number | null;
}

function digestArchiveRow(day: number, body: DispatchBody): ArchDay | null {
  const head = body?.lead?.head ?? '';
  const cal = body?.cal_date ?? calDateISO(day);
  if (body?.tallies) {
    const t = body.tallies;
    return {
      day, cal_date: cal, head,
      mints: t.mints, sales: t.sales, volume: t.volume_eth,
      entries: t.mints + t.sales + t.listings + t.offers,
      topEth: t.top_eth ?? null,
    };
  }
  const rows = body?.numbers;
  if (!Array.isArray(rows)) return null;
  const get = (l: string) => rows.find((r) => r.label === l)?.value;
  const n = (v?: string) => { const x = parseFloat(v ?? ''); return Number.isFinite(x) ? x : 0; };
  const top = get('Top sale');
  const topEth = top ? parseFloat(top.split('·').pop() ?? '') : NaN;
  return {
    day, cal_date: cal, head,
    mints: n(get('Mints')), sales: n(get('Sales')),
    volume: n((get('Volume') ?? '').replace(' ETH', '')),
    entries: n(get('Mints')) + n(get('Sales')) + n(get('Listings')) + n(get('Offers')),
    topEth: Number.isFinite(topEth) ? topEth : null,
  };
}

/** Build the edition published on PriceDay `day` (covering day-1). */
export async function buildDispatch(db: SupabaseClient, day: number): Promise<DispatchBody> {
  const covered = Math.max(1, day - 1);
  const seed = fnv(`dispatch:${day}`);
  const weekend = isWeekend(day);
  const alm = await buildPriceDayAlmanac(db, covered);
  const { startSec, endSec } = dayWindow(covered);

  // Desk work beyond the almanac: sold-outs + graduations, new accounts,
  // the full day tape (actors + hours), lifetime counts for milestones,
  // the archive (rotation memory + streaks/records/on-this-day), horizon.
  const [gradRes, soldRes, userRes, evRes, coolRes, nearRes, archRes, lifeMintRes, lifeSaleRes] = await Promise.all([
    db.from('projects').select('id, title')
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .gte('graduated_at', new Date(startSec * 1000).toISOString())
      .lt('graduated_at', new Date(endSec * 1000).toISOString()),
    db.from('projects').select('id, title')
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .gte('sold_out_at', new Date(startSec * 1000).toISOString())
      .lt('sold_out_at', new Date(endSec * 1000).toISOString()),
    db.from('users').select('address', { count: 'exact', head: true })
      .gte('created_at', new Date(startSec * 1000).toISOString())
      .lt('created_at', new Date(endSec * 1000).toISOString()),
    db.from('events').select('project_id, type, from_address, to_address, price_eth, timestamp')
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .gte('timestamp', startSec).lt('timestamp', endSec).limit(3000),
    db.from('projects').select('id, title, cooldown_until, artist_address')
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .gt('cooldown_until', new Date(endSec * 1000).toISOString())
      .lt('cooldown_until', new Date((endSec + 7 * 86400) * 1000).toISOString())
      .limit(6),
    db.from('projects').select('id, title, minted_count, max_supply')
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .gt('minted_count', 0)
      .is('sold_out_at', null)
      .limit(200),
    db.from('dispatches').select('day, body')
      .lt('day', day).order('day', { ascending: false }).limit(120),
    db.from('events').select('project_id', { count: 'exact', head: true })
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .eq('type', 'MINT').lt('timestamp', endSec),
    db.from('events').select('project_id', { count: 'exact', head: true })
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .eq('type', 'XFER').not('price_eth', 'is', null).lt('timestamp', endSec),
  ]);

  const grads = (gradRes.data ?? []) as { id: string; title: string | null }[];
  const solds = (soldRes.data ?? []) as { id: string; title: string | null }[];
  const newUsers = userRes.count ?? 0;
  const titleOf = (slug: string, dbTitle?: string | null) =>
    getProject(slug)?.displayName ?? dbTitle ?? slug;

  type Ev = { project_id: string; type: string; from_address: string | null; to_address: string | null; price_eth: string | number | null; timestamp: number };
  const evs = (evRes.data ?? []) as Ev[];

  // The archive (newest-first for streak walks) + the rotation memory's
  // diet, fed OLDEST edition first so the memory knows recency, not just
  // membership (its exhausted-pool fallback is least-recently-used).
  const archRows = (archRes.data ?? []) as { day: number; body: DispatchBody }[];
  const archive: ArchDay[] = [];
  for (const r of archRows) {
    const d = digestArchiveRow(r.day, r.body);
    if (d) archive.push(d);
  }
  const recentPhraseIds: string[] = [];
  for (let i = archRows.length - 1; i >= 0; i--) {
    for (const id of archRows[i].body?.voice?.used ?? []) recentPhraseIds.push(id);
  }
  const archByDay = new Map(archive.map((a) => [a.day, a]));
  const voice = new VoiceMemory(seed, recentPhraseIds);
  const say = (poolId: keyof typeof POOLS, vars: Record<string, string | number> = {}) =>
    fill(voice.pickFresh(poolId, POOLS[poolId]), vars);

  // most-active room + per-actor tallies + hour histogram
  const byRoom = new Map<string, number>();
  const byBuyer = new Map<string, number>();
  const bySeller = new Map<string, number>();
  const byHour = new Map<number, number>();
  const wallets = new Set<string>();
  for (const e of evs) {
    byRoom.set(e.project_id, (byRoom.get(e.project_id) ?? 0) + 1);
    const priced = e.price_eth != null && Number(e.price_eth) > 0;
    if (e.type === 'MINT' || (e.type === 'XFER' && priced)) {
      if (e.to_address) byBuyer.set(e.to_address, (byBuyer.get(e.to_address) ?? 0) + 1);
    }
    if (e.type === 'XFER' && priced && e.from_address) {
      bySeller.set(e.from_address, (bySeller.get(e.from_address) ?? 0) + 1);
    }
    if (e.from_address) wallets.add(e.from_address);
    if (e.to_address) wallets.add(e.to_address);
    // startSec is Montreal midnight, so this is the Montreal hour (DST
    // shift days drift an hour at worst — dayparts absorb that).
    byHour.set(Math.floor((e.timestamp - startSec) / 3600) % 24, (byHour.get(Math.floor((e.timestamp - startSec) / 3600) % 24) ?? 0) + 1);
  }
  const hottest = Array.from(byRoom.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  const salePrices = evs
    .filter((e) => e.type === 'XFER' && e.price_eth != null && Number(e.price_eth) > 0)
    .map((e) => Number(e.price_eth))
    .sort((a, b) => a - b);

  const t = alm.tallies;
  const topEth = salePrices.length ? salePrices[salePrices.length - 1] : null;
  const entriesToday = t.mints + t.sales + t.listings + t.offers;
  const quietDay = entriesToday === 0 && t.uploads === 0;

  // Handles for persons of interest (top buyer + top seller only).
  const topBuyer = Array.from(byBuyer.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  const topSeller = Array.from(bySeller.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  const poiAddrs = [topBuyer?.[0], topSeller?.[0]].filter((a): a is string => !!a);
  const handleByAddr = new Map<string, string | null>();
  if (poiAddrs.length) {
    const hs = await db.from('users').select('address, handle').in('address', poiAddrs);
    for (const u of (hs.data ?? []) as { address: string; handle: string | null }[]) {
      handleByAddr.set(u.address, u.handle);
    }
  }
  const who = (a: string) => {
    const h = handleByAddr.get(a);
    return h ? `@${h}` : `${a.slice(0, 6)}…${a.slice(-4)}`;
  };

  /* ── records + streaks against the archive ── */
  // Biggest sale in N days?
  let recordSale: { gap: number; sinceDay: number } | null = null;
  if (topEth != null && archive.length >= 14) {
    const beat = archive.find((a) => a.topEth != null && a.topEth >= topEth);
    if (!beat) recordSale = { gap: archive.length, sinceDay: archive[archive.length - 1].day };
    else if (day - beat.day >= 14) recordSale = { gap: day - beat.day, sinceDay: beat.day };
  }
  // Busiest ledger since?
  let recordBusy: { sinceDay: number } | null = null;
  if (entriesToday > 0 && archive.length >= 14) {
    const busier = archive.find((a) => a.entries >= entriesToday);
    if (busier && day - busier.day >= 14) recordBusy = { sinceDay: busier.day };
    else if (!busier) recordBusy = { sinceDay: archive[archive.length - 1].day };
  }
  // Sales streak (consecutive covered days with a sale, ending yesterday).
  let streak = t.sales > 0 ? 1 : 0;
  if (streak) {
    for (let d = day - 1; ; d--) {
      const a = archByDay.get(d);
      if (!a || a.sales <= 0) break;
      streak++;
      if (streak > 365) break;
    }
  }
  const prevDay = archByDay.get(day - 1) ?? null;

  /* ── YESTERDAY'S LEAD ── */
  let head: string;
  let body: string;
  const color = () => say(weekend ? 'WEEKEND_COLOR' : 'LEAD_COLOR');
  if (alm.biggestSale) {
    head = say('HEAD_SALE', { PIECE: alm.biggestSale.label.toUpperCase(), PRICE: alm.biggestSale.value.toUpperCase() });
    const facts = `${alm.biggestSale.label} changed hands for ${alm.biggestSale.value} — the day's headline number. ` +
      `${t.sales} ${plural(t.sales, 'sale')} cleared in total for ${eth(t.volume_eth)}, against ${t.mints} ${plural(t.mints, 'mint')} and ${t.listings} fresh ${plural(t.listings, 'listing')}.`;
    const rec = recordSale ? ' ' + say('RECORD_SALE', { N: recordSale.gap, DAY: recordSale.sinceDay }) : '';
    body = `${facts}${rec} ${color()}`;
  } else if (t.mints > 1) {
    head = say('HEAD_MINT', { N: t.mints });
    body = `No headline sale, but the supply grew: ${t.mints} ${plural(t.mints, 'mint')} across the platform${hottest ? `, with ${titleOf(hottest[0])} the busiest room (${hottest[1]} entries on the ledger)` : ''}. ${color()}`;
  } else if (t.mints === 1) {
    head = say('HEAD_MINT_ONE');
    body = `One mint printed${hottest ? ` — in ${titleOf(hottest[0])}` : ''}, and the record treats it with the same respect as a stampede. ${color()}`;
  } else if (t.uploads > 0 && entriesToday === 0) {
    const uploadTitle = (alm.uploaded[0]?.label ?? 'a new project').toUpperCase();
    head = say('HEAD_UPLOAD', { TITLE: uploadTitle });
    body = `${t.uploads === 1 ? 'A new project' : `${t.uploads} new projects`} came through the filter — ${alm.uploaded.map((u) => u.label).join(', ')}. No market entries yet; the wall got longer and the arguments come later. ${color()}`;
  } else if (quietDay) {
    head = say('HEAD_QUIET');
    body = `${say('QUIET_BODY')} ${color()}`;
  } else if (t.listings > 0 && t.sales === 0 && t.listings >= t.offers) {
    head = say('HEAD_LIST', { N: t.listings });
    body = `${t.listings} ${plural(t.listings, 'listing')} went up${t.offers > 0 ? ` and ${t.offers} ${plural(t.offers, 'offer')} came back` : ' and the room kept its counsel'} — no sales printed. ${alm.flavor} ${color()}`;
  } else if (t.offers > 0 && t.sales === 0) {
    head = say('HEAD_OFFER', { N: t.offers });
    body = `${t.offers} ${plural(t.offers, 'offer')} landed${t.listings > 0 ? ` against ${t.listings} ${plural(t.listings, 'listing')}` : ''}, none of them closed. ${alm.flavor} ${color()}`;
  } else {
    head = say('HEAD_MIXED');
    body = `${alm.flavor} ${color()}`;
  }

  /* ── BY THE NUMBERS ── */
  const numbers: DispatchRow[] = [
    { label: 'Mints', value: String(t.mints) },
    { label: 'Sales', value: String(t.sales) },
    { label: 'Volume', value: eth(t.volume_eth) },
    { label: 'Listings', value: String(t.listings) },
    { label: 'Offers', value: String(t.offers) },
  ];
  if (alm.biggestSale) numbers.push({ label: 'Top sale', value: `${alm.biggestSale.label} · ${alm.biggestSale.value}`, href: alm.biggestSale.href });
  if (t.uploads > 0) numbers.push({ label: 'New projects', value: String(t.uploads) });

  /* ── FROM THE SALON ── */
  let salon: string;
  if (newUsers > 0) {
    salon = say('SALON_ARRIVALS', {
      N: newUsers,
      ACCOUNT_WORD: plural(newUsers, 'account'),
      PEOPLE_WORD: newUsers === 1 ? 'person' : 'people',
    });
  } else if (t.offers > t.sales && t.offers > 0) {
    salon = say('SALON_BIDS');
  } else if (t.listings > 0 && t.sales === 0) {
    salon = say('SALON_ASKS');
  } else if (t.volume_eth > 0 && t.sales >= 2) {
    salon = say('SALON_TRADE', { SALES_N: t.sales });
  } else {
    salon = say('SALON_APHORISM');
  }

  /* ── THE DESKS (each prints only when it has something real) ── */
  const desks: DispatchDesk[] = [];

  // THE MARKET DESK — deltas, streaks, records.
  {
    const prose: string[] = [];
    if (prevDay && t.volume_eth + prevDay.volume > 0) {
      const ratio = prevDay.volume > 0 ? t.volume_eth / prevDay.volume : Infinity;
      const pool = ratio > 1.15 ? 'DELTA_UP' : ratio < 0.87 ? 'DELTA_DOWN' : 'DELTA_FLAT';
      prose.push(say(pool, { VOL: eth(t.volume_eth), PREV: eth(prevDay.volume) }));
    }
    if (streak >= 3) prose.push(say('STREAK_SALES', { N: streak }));
    if (recordBusy) prose.push(say('RECORD_BUSY', { DAY: recordBusy.sinceDay }));
    if (prose.length) desks.push({ head: 'THE MARKET DESK', prose });
  }

  // PERSONS OF INTEREST — the day's busiest hands (weekdays; the weekend
  // paper leaves people alone).
  if (!weekend) {
    const prose: string[] = [];
    if (topBuyer && topBuyer[1] >= 3) {
      prose.push(say('POI_COLLECTOR', { WHO: who(topBuyer[0]), N: topBuyer[1] }));
    }
    if (topSeller && topSeller[1] >= 2 && topSeller[0] !== topBuyer?.[0]) {
      prose.push(say('POI_SELLER', { WHO: who(topSeller[0]), N: topSeller[1], PIECE_WORD: plural(topSeller[1], 'piece') }));
    }
    if (prose.length) desks.push({ head: 'PERSONS OF INTEREST', prose });
  }

  // NUMBER OF THE DAY — a rotating stable of calculated curiosities; the
  // first recipe (in day-rotated order) with real data prints.
  if (!weekend && entriesToday >= 3) {
    const recipes: (() => string | null)[] = [
      () => {
        if (salePrices.length < 4) return null;
        const mid = salePrices[Math.floor(salePrices.length / 2)];
        return `The median sale printed at ${eth(mid)} — half the day cleared beneath it, half above.`;
      },
      () => {
        if (salePrices.length < 2) return null;
        const lo = salePrices[0], hi = salePrices[salePrices.length - 1];
        if (hi / lo < 3) return null;
        return `The day's cheapest sale went for ${eth(lo)}; the dearest for ${eth(hi)} — a ${Math.round(hi / lo)}× spread inside one market.`;
      },
      () => {
        if (!hottest || entriesToday < 6) return null;
        const pct = Math.round((hottest[1] / entriesToday) * 100);
        if (pct < 50) return null;
        return `${pct}% of the day's ledger belonged to one room: ${titleOf(hottest[0])}.`;
      },
      () => {
        if (wallets.size < 3) return null;
        return `${wallets.size} distinct wallets touched the ledger yesterday.`;
      },
      () => {
        if (entriesToday < 6) return null;
        const peak = Array.from(byHour.entries()).sort((a, b) => b[1] - a[1])[0];
        if (!peak || peak[1] < 3) return null;
        return `The day's rush came ${daypart(peak[0])}: ${peak[1]} entries inside a single hour.`;
      },
      () => {
        if (t.sales === 0 || t.offers < t.sales * 2) return null;
        return `The room filed ${t.offers} ${plural(t.offers, 'offer')} for ${t.sales} ${plural(t.sales, 'close', 'closes')} — roughly ${Math.round(t.offers / t.sales)} bids per handshake.`;
      },
    ];
    let notd: string | null = null;
    for (let i = 0; i < recipes.length && !notd; i++) {
      notd = recipes[(day + i) % recipes.length]();
    }
    if (notd) desks.push({ head: 'NUMBER OF THE DAY', prose: [`${notd} ${say('NOTD_CLOSER')}`] });
  }

  // ON THIS DAY — the paper quotes its own archive.
  {
    const rows: DispatchRow[] = [];
    for (const back of [30, 100, 365]) {
      const a = archByDay.get(day - back);
      if (a?.head) rows.push({ label: `${back} days ago`, value: `PD ${a.day}: “${a.head}”`, href: `/dispatch/${a.cal_date}` });
    }
    if (rows.length) desks.push({ head: 'ON THIS DAY', rows });
  }

  // THE WEEK, BRIEFLY — Sunday's long view over the last seven covered days.
  if (isSunday(day)) {
    const week: ArchDay[] = [];
    for (let d = day - 1; d >= day - 6; d--) {
      const a = archByDay.get(d);
      if (a) week.push(a);
    }
    const wm = t.mints + week.reduce((s, a) => s + a.mints, 0);
    const ws = t.sales + week.reduce((s, a) => s + a.sales, 0);
    const wv = t.volume_eth + week.reduce((s, a) => s + a.volume, 0);
    if (wm + ws > 0) {
      desks.push({
        head: 'THE WEEK, BRIEFLY',
        prose: [`Seven days, counted: ${wm} ${plural(wm, 'mint')} · ${ws} ${plural(ws, 'sale')} · ${eth(wv)} moved. The week is filed; the next one is already loitering outside.`],
      });
    }
  }

  /* ── NOTED ── */
  const noted: string[] = [];
  // Platform milestones — lifetime counters crossing round numbers.
  const lifeMints = lifeMintRes.count ?? 0;
  const lifeSales = lifeSaleRes.count ?? 0;
  const crossed = (after: number, during: number, steps: number[]): number | null => {
    const before = after - during;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (Math.floor(before / steps[i]) < Math.floor(after / steps[i])) {
        const m = Math.floor(after / steps[i]) * steps[i];
        // Worthiness guard: a step only celebrates its first ~10 multiples
        // (100 carries to 1,000; 1,000 to 10,000; …) — at scale the paper
        // marks round numbers, not every odometer tick.
        return m / steps[i] <= 10 ? m : null;
      }
    }
    return null;
  };
  const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const mMint = t.mints > 0 ? crossed(lifeMints, t.mints, MILESTONES) : null;
  const mSale = t.sales > 0 ? crossed(lifeSales, t.sales, MILESTONES) : null;
  if (mMint) noted.push(`The platform's ${ordinal(mMint)} mint printed yesterday. The desk notes the odometer and moves on.`);
  if (mSale) noted.push(`Sale number ${mSale.toLocaleString('en-US')}, lifetime, settled yesterday.`);
  for (const g of grads.slice(0, 2)) noted.push(`${titleOf(g.id, g.title)} graduated into Now Minting.`);
  for (const s2 of solds.slice(0, 2)) noted.push(`${titleOf(s2.id, s2.title)} SOLD OUT.`);
  if (hottest && t.sales + t.mints > 0) noted.push(`Busiest room: ${titleOf(hottest[0])} (${hottest[1]} ledger entries).`);
  for (const u of alm.uploaded.slice(0, 2)) noted.push(`New on the wall: ${u.label}, by ${u.value}.`);
  if (noted.length === 0) noted.push(voice.pickFresh('NOTED_EMPTY', [
    'Nothing to note is itself worth noting.',
    'The desk kept its pencil down.',
    'No footnotes today. The margins rest.',
    'The noted column reports: nothing to report, faithfully.',
    'This space intentionally left factual.',
  ]));

  /* ── TOMORROW'S HORIZON ── */
  const horizon: string[] = [];
  const cools = (coolRes.data ?? []) as { id: string; title: string | null; cooldown_until: string | null }[];
  for (const c of cools.slice(0, 3)) {
    if (!c.cooldown_until) continue;
    const days = Math.max(1, Math.ceil((Date.parse(c.cooldown_until) - endSec * 1000) / DAY_MS));
    horizon.push(`${titleOf(c.id, c.title)}'s artist exits cooldown in ${days} ${plural(days, 'day')} — a new upload window opens.`);
  }
  const near = ((nearRes.data ?? []) as { id: string; title: string | null; minted_count: number; max_supply: number }[])
    .filter((p) => p.max_supply > 0 && p.minted_count / p.max_supply >= 0.9)
    .sort((a, b) => b.minted_count / b.max_supply - a.minted_count / a.max_supply);
  for (const p of near.slice(0, 2)) {
    horizon.push(`${titleOf(p.id, p.title)} sits at ${p.minted_count}/${p.max_supply} — ${p.max_supply - p.minted_count} from selling out.`);
  }
  if ((day + 1) % 100 === 0) {
    horizon.push(`Tomorrow's paper is Edition ${day + 1} — a round number. The desk will allow itself one small flourish.`);
  }
  if (horizon.length === 0) horizon.push(say('HORIZON_OPEN'));

  return {
    edition: day,
    date: formatPriceDate(new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS + DAY_MS / 2)),
    cal_date: calDateISO(day),
    weekend,
    lead: { head, body },
    numbers,
    salon,
    noted: noted.slice(0, 6),
    horizon: horizon.slice(0, 4),
    desks: desks.length ? desks : undefined,
    tallies: { ...t, top_eth: topEth },
    voice: { used: voice.out },
  };
}
