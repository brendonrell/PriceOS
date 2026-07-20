// /api/user/[address]/counterparties — the wallets this wallet has ACTUALLY
// dealt with, straight from the ledger: every transfer/sale where the two
// stood across the table from each other (mints excluded — a mint has no
// counterparty). Ranked by deals, then volume. Carries the profile owner's
// declared NEMESIS (one pinned rival, users.nemesis_address) with both sides'
// honest floor-value read so the delta is real, not vibes.
//
// Public read keyed on the address in the path (the profile Counterparties
// tab shows for everyone). Service client — events/holders aren't anon-readable.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const ZERO = '0x0000000000000000000000000000000000000000';
const MAX_ROWS = 50;

export interface CounterpartyRow {
  address: string;
  handle: string | null;
  /** Total deals between the two wallets (sales + transfers + trades). */
  deals: number;
  /** Deals where the profile wallet RECEIVED the piece. */
  bought: number;
  /** Deals where the profile wallet SENT the piece. */
  sold: number;
  /** How many of the deals settled through The Exchange ⇌. */
  trades: number;
  /** Sum of the priced legs between the two, in ETH. */
  volume_eth: number;
  /** Unix seconds of the most recent deal. */
  last_ts: number;
}

export interface NemesisRead {
  address: string;
  handle: string | null;
  mine: { held: number; floor_value_eth: number };
  theirs: { held: number; floor_value_eth: number };
}

export interface CounterpartiesResponse {
  address: string;
  rows: CounterpartyRow[];
  totals: { counterparties: number; deals: number; volume_eth: number };
  nemesis: NemesisRead | null;
}

type Db = ReturnType<typeof getSupabaseService>;

/** A wallet's held-pieces count + floor-priced value (Σ pieces × project floor).
 *  Floors come from projects.floor_price_eth; unfloored projects count pieces
 *  but add nothing — an honest under-read, never an invented number. */
async function floorRead(db: Db, address: string, floors: Map<string, number>): Promise<{ held: number; floor_value_eth: number }> {
  const { data } = await db
    .from('holders')
    .select('project_id')
    .eq('owner_address', address)
    .limit(1000);
  let held = 0;
  let value = 0;
  for (const h of (data ?? []) as { project_id: string }[]) {
    held += 1;
    value += floors.get(h.project_id) ?? 0;
  }
  return { held, floor_value_eth: Number(value.toPrecision(4)) };
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }) {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();

    const [evRes, meRes] = await Promise.all([
      db.from('events')
        .select('type, sale_direction, from_address, to_address, price_eth, timestamp')
        .eq('type', 'XFER')
        .or(`from_address.eq.${address},to_address.eq.${address}`)
        .order('timestamp', { ascending: false })
        .limit(1000),
      db.from('users')
        .select('nemesis_address')
        .eq('address', address)
        .maybeSingle(),
    ]);

    const agg = new Map<string, CounterpartyRow>();
    for (const e of (evRes.data ?? []) as {
      sale_direction: string | null;
      from_address: string | null; to_address: string | null;
      price_eth: number | string | null; timestamp: number;
    }[]) {
      const from = (e.from_address ?? '').toLowerCase();
      const to = (e.to_address ?? '').toLowerCase();
      const other = from === address ? to : from;
      if (!other || other === ZERO || other === address) continue;
      const row = agg.get(other) ?? {
        address: other, handle: null, deals: 0, bought: 0, sold: 0, trades: 0, volume_eth: 0, last_ts: 0,
      };
      row.deals += 1;
      if (to === address) row.bought += 1; else row.sold += 1;
      if (e.sale_direction === 'TRADE') row.trades += 1;
      if (e.price_eth != null) row.volume_eth += Number(e.price_eth);
      if (Number(e.timestamp) > row.last_ts) row.last_ts = Number(e.timestamp);
      agg.set(other, row);
    }

    const rows = Array.from(agg.values())
      .sort((a, b) => (b.deals - a.deals) || (b.volume_eth - a.volume_eth) || (b.last_ts - a.last_ts))
      .slice(0, MAX_ROWS);
    for (const r of rows) r.volume_eth = Number(r.volume_eth.toPrecision(4));

    // The declared rival — resolve + price both sides.
    const nemAddr = ((meRes.data as { nemesis_address?: string | null } | null)?.nemesis_address ?? '').toLowerCase();
    let nemesis: NemesisRead | null = null;

    // One users query resolves the counterparty handles AND the nemesis'.
    const wantHandles = new Set(rows.map((r) => r.address));
    if (nemAddr) wantHandles.add(nemAddr);
    if (wantHandles.size > 0) {
      const { data: users } = await db
        .from('users')
        .select('address, handle')
        .in('address', Array.from(wantHandles));
      const handleBy = new Map<string, string | null>();
      for (const u of (users ?? []) as { address: string; handle: string | null }[]) {
        handleBy.set(u.address.toLowerCase(), u.handle);
      }
      for (const r of rows) r.handle = handleBy.get(r.address) ?? null;

      if (nemAddr && ADDRESS_RE.test(nemAddr)) {
        const { data: projRows } = await db
          .from('projects')
          .select('id, floor_price_eth')
          .limit(1000);
        const floors = new Map<string, number>();
        for (const p of (projRows ?? []) as { id: string; floor_price_eth: number | string | null }[]) {
          const f = p.floor_price_eth != null ? Number(p.floor_price_eth) : 0;
          if (f > 0) floors.set(p.id, f);
        }
        const [mine, theirs] = await Promise.all([
          floorRead(db, address, floors),
          floorRead(db, nemAddr, floors),
        ]);
        nemesis = { address: nemAddr, handle: handleBy.get(nemAddr) ?? null, mine, theirs };
      }
    }

    const totals = {
      counterparties: agg.size,
      deals: Array.from(agg.values()).reduce((n, r) => n + r.deals, 0),
      volume_eth: Number(Array.from(agg.values()).reduce((n, r) => n + r.volume_eth, 0).toPrecision(4)),
    };

    return NextResponse.json({ address, rows, totals, nemesis } satisfies CounterpartiesResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
