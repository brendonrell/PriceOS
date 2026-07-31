/*
 * The Rewind ◄ — as-of engine.
 *
 * Reconstructs the platform's market/collection state at END OF a chosen
 * PriceDay, straight from the permanent ledger (events / listings / projects).
 * Read-only by construction: nothing here writes, and no write route accepts
 * an as-of parameter. Spec: Atlas → Platform-Level Systems → The Rewind
 * (page 2kyd6gx6-6014), greenlit 2026-07-05.
 *
 * All day math rides the PriceDay spine (Montreal-day keyed) via
 * lib/priceday — the same dayWindow the almanac uses, so the Rewind, the
 * calendar, and PriceDay always agree on what "Day N" means.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { dayWindow } from '@/lib/priceday/almanac.server';
import { priceDayNumber, formatPriceDate, PRICEDAY_EPOCH } from '@/lib/priceday/priceday';
import { getProject } from '@/lib/project/registry';
import { MINTING_NOW_THRESHOLD } from '@/lib/home/homeData';
import { HIDDEN_PROJECTS_NOT_IN } from '../platform/hiddenProjects';

const DAY_MS = 86_400_000;

export interface RewindProjectState {
  slug: string;
  title: string;
  /** Pieces minted by end of the day. */
  minted: number;
  supply: number;
  /** Distinct holders at end of day (transfers replayed). */
  holders: number;
  /** Sales volume to date, ETH. */
  volume_eth: number;
  /** Highest sale to date, ETH (0 = none yet). */
  ath_eth: number;
  /** Whether the project existed (was uploaded) by the day. */
  born: boolean;
  /** Whether it had crossed the Now Minting threshold by the day. */
  graduated: boolean;
  sold_out: boolean;
  /** Token ids minted by end of day (caps the rewound gallery). */
  minted_ids: number[];
  /** Owner-as-of map for the day, token id → address. */
  owners: Record<string, string>;
}

export interface RewindHomeState {
  day: number;
  date: string;
  is_today: boolean;
  stats: { projects: number; volume_eth: string; minted: number };
  uploads: { slug: string; title: string; minted: number; supply: number }[];
  minting_now: { slug: string; title: string; minted: number; supply: number }[];
  /** The day's own happenings — mints / sales / uploads counts + top sale. */
  day_log: {
    mints: number;
    sales: number;
    volume_eth: number;
    uploads: number;
    top_sale: { slug: string; id: number; eth: number } | null;
  };
}

/** Clamp a requested day into the platform's real [1..today] range. */
export function clampRewindDay(raw: unknown): number {
  const today = priceDayNumber();
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return Math.max(1, today - 1);
  return Math.min(Math.max(1, n), today);
}

export function rewindDayDate(day: number): string {
  return formatPriceDate(new Date(PRICEDAY_EPOCH + (day - 1) * DAY_MS + DAY_MS / 2));
}

interface LedgerEvent {
  type: string;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: string | number | null;
  timestamp: number;
}

/** All ledger events up to end-of-day, oldest first. */
async function eventsThrough(db: SupabaseClient, endSec: number): Promise<LedgerEvent[]> {
  const { data, error } = await db
    .from('events')
    .select('type, project_id, token_id, from_address, to_address, price_eth, timestamp')
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
    .lt('timestamp', endSec)
    .order('timestamp', { ascending: true })
    .limit(20000);
  if (error) throw new Error(error.message);
  return (data ?? []) as LedgerEvent[];
}

/** Replay the ledger to end of day N → per-project as-of states. */
export async function buildRewindStates(
  db: SupabaseClient,
  day: number,
): Promise<Map<string, RewindProjectState>> {
  const { endSec } = dayWindow(day);
  const endMs = endSec * 1000;

  const [events, projRes] = await Promise.all([
    eventsThrough(db, endSec),
    db.from('projects').select('id, title, max_supply, uploaded_at, cooldown_until')
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN),
  ]);
  if (projRes.error) throw new Error(projRes.error.message);
  const projRows = (projRes.data ?? []) as {
    id: string; title: string | null; max_supply: number | null;
    uploaded_at: string | null; cooldown_until: string | null;
  }[];

  const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;
  const states = new Map<string, RewindProjectState>();
  for (const p of projRows) {
    const bornAt = p.uploaded_at
      ? Date.parse(p.uploaded_at)
      : p.cooldown_until
        ? Date.parse(p.cooldown_until) - COOLDOWN_MS
        : null;
    const def = getProject(p.id);
    states.set(p.id, {
      slug: p.id,
      title: def?.displayName ?? p.title ?? p.id,
      minted: 0,
      supply: p.max_supply ?? def?.outputs ?? 0,
      holders: 0,
      volume_eth: 0,
      ath_eth: 0,
      born: bornAt != null && bornAt < endMs,
      graduated: false,
      sold_out: false,
      minted_ids: [],
      owners: {},
    });
  }

  for (const e of events) {
    const s = states.get(e.project_id);
    if (!s) continue;
    const id = e.token_id != null && e.token_id !== '' ? Number(e.token_id) : null;
    if (e.type === 'MINT') {
      s.minted += 1;
      if (id != null) {
        s.minted_ids.push(id);
        if (e.to_address) s.owners[String(id)] = e.to_address.toLowerCase();
      }
      const p = Number(e.price_eth ?? 0);
      if (p > 0) s.volume_eth += p;
      if (s.minted >= MINTING_NOW_THRESHOLD) s.graduated = true;
      if (s.supply > 0 && s.minted >= s.supply) s.sold_out = true;
    } else if (e.type === 'XFER') {
      if (id != null && e.to_address) s.owners[String(id)] = e.to_address.toLowerCase();
      const p = Number(e.price_eth ?? 0);
      if (p > 0) {
        s.volume_eth += p;
        if (p > s.ath_eth) s.ath_eth = p;
      }
    }
  }
  for (const s of states.values()) {
    s.holders = new Set(Object.values(s.owners)).size;
    s.volume_eth = Number(s.volume_eth.toFixed(4));
    s.ath_eth = Number(s.ath_eth.toFixed(4));
  }
  return states;
}

/** The home surface as it stood at end of day N. */
export async function buildRewindHome(db: SupabaseClient, day: number): Promise<RewindHomeState> {
  const today = priceDayNumber();
  const states = await buildRewindStates(db, day);
  const { startSec, endSec } = dayWindow(day);

  const born = Array.from(states.values()).filter((s) => s.born);
  const totalMinted = born.reduce((n, s) => n + s.minted, 0);
  const totalVolume = born.reduce((n, s) => n + s.volume_eth, 0);

  const minting_now = born
    .filter((s) => s.graduated && !s.sold_out)
    .map((s) => ({ slug: s.slug, title: s.title, minted: s.minted, supply: s.supply }));
  const uploads = born
    .filter((s) => !s.graduated)
    .map((s) => ({ slug: s.slug, title: s.title, minted: s.minted, supply: s.supply }));

  // The day's own log — what happened ON day N.
  const { data: dayEv } = await db
    .from('events')
    .select('type, project_id, token_id, price_eth')
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
    .gte('timestamp', startSec)
    .lt('timestamp', endSec)
    .limit(2000);
  let mints = 0, sales = 0, dayVol = 0;
  let top: { slug: string; id: number; eth: number } | null = null;
  for (const e of (dayEv ?? []) as { type: string; project_id: string; token_id: string | null; price_eth: number | string | null }[]) {
    const p = Number(e.price_eth ?? 0);
    if (e.type === 'MINT') { mints += 1; if (p > 0) dayVol += p; }
    else if (e.type === 'XFER' && p > 0) {
      sales += 1; dayVol += p;
      if (!top || p > top.eth) top = { slug: e.project_id, id: Number(e.token_id ?? 0), eth: p };
    }
  }
  const { count: dayUploads } = await db
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN)
    .gte('uploaded_at', new Date(startSec * 1000).toISOString())
    .lt('uploaded_at', new Date(endSec * 1000).toISOString());

  return {
    day,
    date: rewindDayDate(day),
    is_today: day >= today,
    stats: {
      projects: born.length,
      volume_eth: String(Number(totalVolume.toFixed(3))),
      minted: totalMinted,
    },
    uploads,
    minting_now,
    day_log: {
      mints,
      sales,
      volume_eth: Number(dayVol.toFixed(4)),
      uploads: dayUploads ?? 0,
      top_sale: top,
    },
  };
}
