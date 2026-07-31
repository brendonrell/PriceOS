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
import { walkPick, fill, plural, eth, ordinal } from '@/lib/dispatch/voice';
import { PRICEDAY_EPOCH } from './priceday';
import { HIDDEN_PROJECTS_NOT_IN } from '../platform/hiddenProjects';

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

/* ── THE ALMANAC VOICE (2026-07-16 wow pass) ──────────────────────────
 * Deep phrase pools picked with walkPick — the stateless anti-repeat
 * engine from the Dispatch's voice kit. Each pool is walked with a
 * coprime stride as the day number advances, so CONSECUTIVE DAYS ARE
 * GUARANTEED DIFFERENT PHRASINGS until a pool fully cycles (pool of 12 →
 * 12 days minimum before a line returns), while every day keeps its own
 * sentences forever (deterministic, never stored).
 *
 * This replaces the launch-era picker, whose index math always resolved
 * to option one — every day was wearing the same sentence. Caught and
 * fixed in this pass.
 *
 * House voice rules: facts in the slots, never in the template; every
 * line must read clean for any realistic value. */

const ALM = {
  FLAVOR_QUIET: [
    'A quiet day. The record keeps it anyway.',
    'Nothing moved. Somebody was watching, though.',
    'The room held its breath.',
    'No entries. The page still counts.',
    'The ledger rested. The watchers didn’t.',
    'Zero in every column — faithfully recorded.',
    'A still day on the tape.',
    'The market said nothing, at length.',
    'All quiet. The archive filed it without comment.',
    'A blank page, kept on purpose.',
    'The day passed unbought and unsold.',
    'Stillness, notarized.',
    'Nobody blinked today.',
    'The record notes: patience, platform-wide.',
  ],
  FLAVOR_TRADE: [
    'A trading day — {SALES} sales, {VOL} changed hands.',
    '{VOL} on the move across {SALES} sales.',
    '{SALES} deals closed; {VOL} found new homes.',
    'Money talked: {SALES} sales, {VOL} total.',
    '{SALES} handshakes worth {VOL}.',
    'The tape ran warm — {VOL} across {SALES} sales.',
    '{SALES} sales printed. {VOL} settled.',
    'A day of agreements: {SALES} of them, {VOL} deep.',
    '{VOL} moved and the room felt it.',
    'Commerce, conducted: {SALES} sales for {VOL}.',
  ],
  FLAVOR_MINT: [
    'A minting day — {N} new pieces found keepers.',
    '{N} fresh mints. The supply grew, the room with it.',
    '{N} presses of the button, {N} new keepers.',
    'The wall gained {N} pieces.',
    '{N} mints — the catalog thickened.',
    'Fresh ink: {N} pieces joined the record.',
    '{N} new pieces walked in and hung themselves properly.',
    'Keepers stepped up {N} times.',
    'Genesis in miniature, {N} times over.',
    'Supply met demand {N} times and both left happy.',
  ],
  FLAVOR_UPLOAD: [
    '{ARRIVE}. Genesis energy.',
    '{ARRIVE}. The day belonged to the artists.',
    '{ARRIVE} — the filter opened and the wall grew.',
    '{ARRIVE}. The market can wait; the work comes first.',
    '{ARRIVE}. New arguments, freshly hung.',
    '{ARRIVE} — day one of somebody’s long story.',
    '{ARRIVE}. The catalog turned a page.',
  ],
  FLAVOR_MIXED_TAIL: [
    'a working day on the record.',
    'honest bookkeeping.',
    'the machine ticked over.',
    'small moves, all kept.',
    'a day of minor history.',
    'all filed without fuss.',
    'quiet commerce, duly noted.',
    'the record took it in stride.',
  ],
  STORY_OPEN: [
    'PriceDay {N} opened like any other. It wasn’t.',
    'Day {N} on the record.',
    'The {NTH} day PD had been running.',
    'PriceDay {N}, as the ledger tells it.',
    'Page {N} of the book.',
    'Entry {N}, written in real time.',
    'PriceDay {N} — the record picks up mid-sentence, as always.',
    'Day {N}, and the room came as it was.',
    'PriceDay {N} started quietly. They all do.',
    'The book opened to day {N}.',
    'Day {N}: the platform kept its appointment.',
    'PriceDay {N}, witnessed.',
  ],
  STORY_MINT: [
    '{MINTS_CAP} — the collectors came.',
    'The mint button earned its keep: {MINTS} printed.',
    '{MINTS_CAP} found keepers before the day was out.',
    'The supply grew by {N}; nobody objected.',
    '{MINTS_CAP} printed, each one somebody’s small conviction.',
    '{MINTS_CAP} took first owners.',
    'Demand did its plain work: {MINTS}.',
    '{MINTS_CAP} entered the book.',
    'The button was pressed {N} {TIMES} and meant every one.',
  ],
  STORY_SALE: [
    'The big one: {PIECE} for {PRICE}.',
    '{WHO} paid {PRICE} for {PIECE} and made the day’s headline.',
    '{PIECE} cleared at {PRICE} — the number of the day.',
    'The gavel moment: {PIECE}, {PRICE}.',
    '{PRICE} moved for {PIECE}; the room recalibrated.',
    '{PIECE} found its number: {PRICE}.',
    '{WHO} took {PIECE} home at {PRICE}.',
    'The headline transaction: {PIECE} at {PRICE}.',
    '{PIECE} at {PRICE} — argued, agreed, archived.',
    '{PRICE} for {PIECE}. Somebody meant it.',
  ],
  STORY_BOOK: [
    '{BOOK_CAP} hit the book.',
    '{BOOK_CAP} went on the record.',
    'The order book took {BOOK}.',
    '{BOOK_CAP} — positions declared.',
    '{BOOK_CAP} joined the standing argument.',
    'Paper moved: {BOOK}.',
  ],
  STORY_QUIET: [
    'The ledger has quiet pages too.',
    'A rest day. They count the same.',
    'Nothing printed; the page holds its shape.',
    'The room watched itself watch.',
    'No entries — the day kept its own company.',
    'Stillness, filed under history.',
    'The tape stayed blank and honest.',
    'Even silence gets a line in this book.',
  ],
  STORY_CLOSE: [
    'The page turned on schedule.',
    'Filed, sealed, survived.',
    'And the book moved on.',
    'The day went into the permanent record without complaint.',
    'Tomorrow inherits the floor.',
    'The ink dried by midnight.',
    'All of it kept, none of it negotiable.',
    'The archive accepted the day as-is.',
    'One more page the platform can point to.',
    'End of entry. The record never sleeps; it paginates.',
  ],
} as const;

const say = (n: number, pool: keyof typeof ALM, vars: Record<string, string | number> = {}) =>
  fill(walkPick(n, `alm:${pool}`, ALM[pool]), vars);

const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export async function buildPriceDayAlmanac(db: SupabaseClient, n: number): Promise<PriceDayAlmanac> {
  const { startSec, endSec, calDay } = dayWindow(n);
  const startMs = startSec * 1000;
  const endMs = endSec * 1000;

  const [mintRes, saleRes, listRes, offerRes, projRes] = await Promise.all([
    db.from('events').select('project_id, token_id, to_address, timestamp')
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .eq('type', 'MINT').gte('timestamp', startSec).lt('timestamp', endSec)
      .order('timestamp', { ascending: true }).limit(500),
    db.from('events').select('project_id, token_id, price_eth, to_address')
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .eq('type', 'XFER').not('price_eth', 'is', null)
      .gte('timestamp', startSec).lt('timestamp', endSec)
      .order('price_eth', { ascending: false }).limit(200),
    db.from('events').select('project_id', { count: 'exact', head: true })
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .eq('type', 'LIST').gte('timestamp', startSec).lt('timestamp', endSec),
    db.from('events').select('project_id', { count: 'exact', head: true })
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .eq('type', 'OFFER').gte('timestamp', startSec).lt('timestamp', endSec),
    db.from('projects').select('id, title, artist_address, uploaded_at')
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN)
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

  // THE DAY — the one-liner the modals + calendar wear. Deep pools via the
  // day-walking picker: consecutive days are guaranteed different lines.
  let flavor: string;
  if (mints.length === 0 && sales.length === 0 && uploads.length === 0 && listsN === 0 && offersN === 0) {
    flavor = say(n, 'FLAVOR_QUIET');
  } else if (volume > 0 && sales.length >= 3) {
    flavor = say(n, 'FLAVOR_TRADE', { SALES: sales.length, VOL: eth(volume) });
  } else if (mints.length >= 5) {
    flavor = say(n, 'FLAVOR_MINT', { N: mints.length });
  } else if (uploads.length > 0) {
    flavor = say(n, 'FLAVOR_UPLOAD', {
      ARRIVE: uploads.length === 1 ? 'A new project arrived' : `${uploads.length} new projects arrived`,
    });
  } else {
    const bits: string[] = [];
    if (mints.length > 0) bits.push(`${mints.length} ${plural(mints.length, 'mint')}`);
    if (sales.length > 0) bits.push(`${sales.length} ${plural(sales.length, 'sale')}`);
    if (listsN > 0) bits.push(`${listsN} ${plural(listsN, 'listing')}`);
    if (offersN > 0) bits.push(`${offersN} ${plural(offersN, 'offer')}`);
    flavor = `${bits.join(' · ')} — ${say(n, 'FLAVOR_MIXED_TAIL')}`;
  }

  // THE DAY'S PRICE STORY — a scene in beats (distinct voice from an
  // output's biography): opener → market beats → closer. Every beat pulls
  // from its own walked pool, so the scene's shape AND wording both move
  // day to day.
  const story: string[] = [];
  story.push(say(n, 'STORY_OPEN', { N: n, NTH: ordinal(n) }));
  if (mints.length > 0) {
    const mintsPhrase = mints.length === 1 ? 'one mint' : `${mints.length} mints`;
    story.push(say(n, 'STORY_MINT', {
      N: mints.length,
      MINTS: mintsPhrase,
      MINTS_CAP: capFirst(mintsPhrase),
      TIMES: mints.length === 1 ? 'time' : 'times',
    }));
  }
  if (top) {
    story.push(say(n, 'STORY_SALE', {
      PIECE: `${titleOf(top.project_id)} #${top.token_id}`,
      PRICE: eth(Number(top.price_eth)),
      WHO: who(top.to_address),
    }));
  }
  if (offersN > 0 || listsN > 0) {
    const book = `${listsN > 0 ? `${listsN} ${plural(listsN, 'listing')}` : ''}${listsN > 0 && offersN > 0 ? ' and ' : ''}${offersN > 0 ? `${offersN} ${plural(offersN, 'offer')}` : ''}`;
    story.push(say(n, 'STORY_BOOK', { BOOK: book, BOOK_CAP: capFirst(book) }));
  }
  if (story.length === 1) {
    story.push(say(n, 'STORY_QUIET'));
  } else {
    story.push(say(n, 'STORY_CLOSE'));
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
