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
 * Saturday + Sunday print the lighter Weekend Edition (shorter, more
 * reflective) — same paper, softer voice.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPriceDayAlmanac, dayWindow } from '@/lib/priceday/almanac.server';
import { formatPriceDate, PRICEDAY_EPOCH } from '@/lib/priceday/priceday';
import { getProject } from '@/lib/project/registry';

const DAY_MS = 86_400_000;

export interface DispatchRow { label: string; value: string; href?: string }

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
  return options[((seed ^ Math.imul(salt, 2654435761)) >>> 0) % options.length];
}

function calDateISO(day: number): string {
  return new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

function isWeekend(day: number): boolean {
  const dow = new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS).getUTCDay();
  return dow === 0 || dow === 6;
}

/** Build the edition published on PriceDay `day` (covering day-1). */
export async function buildDispatch(db: SupabaseClient, day: number): Promise<DispatchBody> {
  const covered = Math.max(1, day - 1);
  const seed = fnv(`dispatch:${day}`);
  const weekend = isWeekend(day);
  const alm = await buildPriceDayAlmanac(db, covered);
  const { startSec, endSec } = dayWindow(covered);

  // Extra desk work beyond the almanac: sold-outs + graduations that day,
  // new accounts, most-active room, and tomorrow's horizon.
  const [gradRes, soldRes, userRes, evRes, coolRes, nearRes] = await Promise.all([
    db.from('projects').select('id, title')
      .gte('graduated_at', new Date(startSec * 1000).toISOString())
      .lt('graduated_at', new Date(endSec * 1000).toISOString()),
    db.from('projects').select('id, title')
      .gte('sold_out_at', new Date(startSec * 1000).toISOString())
      .lt('sold_out_at', new Date(endSec * 1000).toISOString()),
    db.from('users').select('address', { count: 'exact', head: true })
      .gte('created_at', new Date(startSec * 1000).toISOString())
      .lt('created_at', new Date(endSec * 1000).toISOString()),
    db.from('events').select('project_id')
      .gte('timestamp', startSec).lt('timestamp', endSec).limit(2000),
    db.from('projects').select('id, title, cooldown_until, artist_address')
      .gt('cooldown_until', new Date(endSec * 1000).toISOString())
      .lt('cooldown_until', new Date((endSec + 7 * 86400) * 1000).toISOString())
      .limit(6),
    db.from('projects').select('id, title, minted_count, max_supply')
      .gt('minted_count', 0)
      .is('sold_out_at', null)
      .limit(200),
  ]);

  const grads = (gradRes.data ?? []) as { id: string; title: string | null }[];
  const solds = (soldRes.data ?? []) as { id: string; title: string | null }[];
  const newUsers = userRes.count ?? 0;
  const titleOf = (slug: string, dbTitle?: string | null) =>
    getProject(slug)?.displayName ?? dbTitle ?? slug;

  // most-active room
  const byRoom = new Map<string, number>();
  for (const e of (evRes.data ?? []) as { project_id: string }[]) {
    byRoom.set(e.project_id, (byRoom.get(e.project_id) ?? 0) + 1);
  }
  const hottest = Array.from(byRoom.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;

  const t = alm.tallies;
  const quietDay = t.mints === 0 && t.sales === 0 && t.uploads === 0 && t.listings === 0 && t.offers === 0;

  // ── YESTERDAY'S LEAD ──
  let head: string;
  let body: string;
  if (alm.biggestSale) {
    head = pick(seed, 1, [
      `${alm.biggestSale.label.toUpperCase()} TAKES THE DAY AT ${alm.biggestSale.value.toUpperCase()}`,
      `THE HAMMER FALLS: ${alm.biggestSale.label.toUpperCase()} AT ${alm.biggestSale.value.toUpperCase()}`,
    ]);
    body = `${alm.biggestSale.label} changed hands for ${alm.biggestSale.value} — the day's headline number. ` +
      `${t.sales} sale${t.sales === 1 ? '' : 's'} cleared in total for ${Number(t.volume_eth.toFixed(3))} ETH, against ${t.mints} mint${t.mints === 1 ? '' : 's'} and ${t.listings} fresh listing${t.listings === 1 ? '' : 's'}. ${alm.flavor}`;
  } else if (t.mints > 0) {
    head = pick(seed, 2, [
      `${t.mints} NEW PIECE${t.mints === 1 ? '' : 'S'} FOUND KEEPERS`,
      `THE MINT BUTTON EARNED ITS KEEP: ${t.mints} PRESSED`,
    ]);
    body = `No headline sale, but the supply grew: ${t.mints} mint${t.mints === 1 ? '' : 's'} across the platform${hottest ? `, with ${titleOf(hottest[0])} the busiest room (${hottest[1]} entries on the ledger)` : ''}. ${alm.flavor}`;
  } else if (quietDay) {
    head = pick(seed, 3, [
      'A QUIET DAY ON THE RECORD',
      'NOTHING MOVED. SOMEBODY WAS WATCHING, THOUGH.',
    ]);
    body = pick(seed, 4, [
      'The ledger has quiet pages too; this was one. No mints, no sales — the room held its breath and the record kept it anyway.',
      'No trades printed. Days like this are why the archive matters: the silence is part of the story.',
    ]);
  } else {
    head = 'A WORKING DAY ON THE RECORD';
    body = `${alm.flavor}`;
  }

  // ── BY THE NUMBERS ──
  const numbers: DispatchRow[] = [
    { label: 'Mints', value: String(t.mints) },
    { label: 'Sales', value: String(t.sales) },
    { label: 'Volume', value: `${Number(t.volume_eth.toFixed(3))} ETH` },
    { label: 'Listings', value: String(t.listings) },
    { label: 'Offers', value: String(t.offers) },
  ];
  if (alm.biggestSale) numbers.push({ label: 'Top sale', value: `${alm.biggestSale.label} · ${alm.biggestSale.value}`, href: alm.biggestSale.href });
  if (t.uploads > 0) numbers.push({ label: 'New projects', value: String(t.uploads) });

  // ── FROM THE SALON ──
  let salon: string;
  if (newUsers > 0) {
    salon = pick(seed, 5, [
      `${newUsers} new account${newUsers === 1 ? '' : 's'} walked in yesterday. Nobody arrives at a price platform by accident.`,
      `The room grew by ${newUsers}. Watch what they star before you watch what they buy.`,
    ]);
  } else if (t.offers > t.sales && t.offers > 0) {
    salon = pick(seed, 6, [
      'More offers than sales yesterday — the bid side is talking and the ask side is letting it.',
      'Offers outran sales. Somebody wants in cheaper than the room will allow. The standoff is the content.',
    ]);
  } else if (t.listings > 0 && t.sales === 0) {
    salon = 'Listings without sales: sellers named their numbers and the room declined to argue. Yet.';
  } else {
    salon = pick(seed, 7, [
      'The discussion continued in the only language this place respects: price.',
      'Watchers watched. Holders held. The equilibrium is doing its quiet work.',
    ]);
  }

  // ── NOTED ──
  const noted: string[] = [];
  for (const g of grads.slice(0, 2)) noted.push(`${titleOf(g.id, g.title)} graduated into Now Minting.`);
  for (const s2 of solds.slice(0, 2)) noted.push(`${titleOf(s2.id, s2.title)} SOLD OUT.`);
  if (hottest && t.sales + t.mints > 0) noted.push(`Busiest room: ${titleOf(hottest[0])} (${hottest[1]} ledger entries).`);
  for (const u of alm.uploaded.slice(0, 2)) noted.push(`New on the wall: ${u.label}, by ${u.value}.`);
  if (noted.length === 0) noted.push(pick(seed, 8, [
    'Nothing to note is itself worth noting.',
    'The desk kept its pencil down.',
  ]));

  // ── TOMORROW'S HORIZON ──
  const horizon: string[] = [];
  const cools = (coolRes.data ?? []) as { id: string; title: string | null; cooldown_until: string | null }[];
  for (const c of cools.slice(0, 3)) {
    if (!c.cooldown_until) continue;
    const days = Math.max(1, Math.ceil((Date.parse(c.cooldown_until) - endSec * 1000) / DAY_MS));
    horizon.push(`${titleOf(c.id, c.title)}'s artist exits cooldown in ${days} day${days === 1 ? '' : 's'} — a new upload window opens.`);
  }
  const near = ((nearRes.data ?? []) as { id: string; title: string | null; minted_count: number; max_supply: number }[])
    .filter((p) => p.max_supply > 0 && p.minted_count / p.max_supply >= 0.9)
    .sort((a, b) => b.minted_count / b.max_supply - a.minted_count / a.max_supply);
  for (const p of near.slice(0, 2)) {
    horizon.push(`${titleOf(p.id, p.title)} sits at ${p.minted_count}/${p.max_supply} — ${p.max_supply - p.minted_count} from selling out.`);
  }
  if (horizon.length === 0) horizon.push('An open day. The record is patient.');

  return {
    edition: day,
    date: formatPriceDate(new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS + DAY_MS / 2)),
    cal_date: calDateISO(day),
    weekend,
    lead: { head, body },
    numbers,
    salon,
    noted: noted.slice(0, 5),
    horizon: horizon.slice(0, 4),
  };
}
