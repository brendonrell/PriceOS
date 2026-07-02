// /api/priceday/[n] — the REAL PriceDay almanac. Day #1 anchors to
// PRICEDAY_EPOCH (re-anchors to the genesis mint at launch — one line);
// day N's window is that Montreal calendar day. Contents come whole from
// the ledger: who minted what, what arrived, the day's biggest sale — plus
// THE DAY, a deterministic seeded line written from the day's real numbers,
// so every PriceDay reads alive forever, past days included, no upkeep.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { PRICEDAY_EPOCH } from '@/lib/priceday/priceday';

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;

/* UTC instant of Montreal midnight for a UTC-midnight calendar index —
   probe the zone's offset on that date (DST-correct). */
function montrealMidnightUtcMs(calUtcMidnight: number): number {
  const probe = new Date(calUtcMidnight + 6 * 3_600_000); // 6:00 UTC that date
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Montreal', hour: 'numeric', hourCycle: 'h23' })
      .format(probe),
  );
  const offsetH = (6 - hour + 24) % 24; // 4 (EDT) or 5 (EST)
  return calUtcMidnight + offsetH * 3_600_000;
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

export async function GET(_req: NextRequest, { params }: { params: { n: string } }) {
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1 || n > 100_000) return badRequest('Bad day');
  try {
    const db = getSupabaseService();
    const calDay = PRICEDAY_EPOCH + (n - 1) * DAY_MS;
    const startMs = montrealMidnightUtcMs(calDay);
    const endMs = montrealMidnightUtcMs(calDay + DAY_MS);
    const startSec = Math.floor(startMs / 1000);
    const endSec = Math.floor(endMs / 1000);
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
    if (mintRes.error) return serverError(mintRes.error.message);

    const mints = (mintRes.data ?? []) as { project_id: string; token_id: string; to_address: string | null }[];
    const sales = (saleRes.data ?? []) as { project_id: string; token_id: string; price_eth: number; to_address: string | null }[];
    const uploads = (projRes.data ?? []) as { id: string; title: string; artist_address: string | null }[];

    // Handles, one batched read.
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
    const minted = mints.slice(0, MAX_ROWS).map((m) => ({
      label: `${titleOf(m.project_id)} #${m.token_id}`,
      value: who(m.to_address),
    }));
    if (mints.length > MAX_ROWS) {
      minted.push({ label: `+ ${mints.length - MAX_ROWS} more`, value: '' });
    }
    const uploaded = uploads.slice(0, MAX_ROWS).map((u) => ({
      label: u.title,
      value: who(u.artist_address),
    }));
    const top = sales[0] ?? null;
    const biggestSale = top
      ? { label: `${titleOf(top.project_id)} #${top.token_id}`, value: `${Number(Number(top.price_eth).toFixed(3))} ETH` }
      : null;

    // THE DAY — one seeded line written from the real numbers. Every day
    // keeps its own sentence forever.
    const volume = sales.reduce((s, e) => s + Number(e.price_eth), 0);
    const listsN = listRes.count ?? 0;
    const offersN = offerRes.count ?? 0;
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

    return NextResponse.json({
      number: n,
      minted,
      uploaded,
      biggestSale,
      flavor,
      tallies: {
        mints: mints.length,
        sales: sales.length,
        volume_eth: Number(volume.toFixed(4)),
        listings: listsN,
        offers: offersN,
        uploads: uploads.length,
      },
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
