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
import { HIDDEN_PROJECTS_NOT_IN } from '@/lib/platform/hiddenProjects';

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
  /** Unix seconds of the FIRST deal — how far back the tie goes. */
  first_ts: number;
  /** The largest single priced leg between the two, in ETH. */
  biggest_eth: number;
  /** The profile wallet's follow relationship with this counterparty. */
  rel: 'mutual' | 'following' | 'follower' | null;
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
  totals: {
    counterparties: number;
    deals: number;
    volume_eth: number;
    /** The record single deal across every counterparty (null = never priced). */
    biggest_deal: { address: string; handle: string | null; eth: number } | null;
    /** The longest-standing tie — the counterparty first dealt with. */
    oldest_tie: { address: string; handle: string | null; first_ts: number } | null;
  };
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
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
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
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
        .eq('type', 'XFER')
        .or(`from_address.eq.${address},to_address.eq.${address}`)
        .order('timestamp', { ascending: false })
        .limit(1000),
      db.from('users')
        .select('nemesis_address, handle')
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
        address: other, handle: null, deals: 0, bought: 0, sold: 0, trades: 0, volume_eth: 0, last_ts: 0, first_ts: 0, biggest_eth: 0, rel: null,
      };
      row.deals += 1;
      if (to === address) row.bought += 1; else row.sold += 1;
      if (e.sale_direction === 'TRADE') row.trades += 1;
      if (e.price_eth != null) {
        const p = Number(e.price_eth);
        row.volume_eth += p;
        if (p > row.biggest_eth) row.biggest_eth = p;
      }
      if (Number(e.timestamp) > row.last_ts) row.last_ts = Number(e.timestamp);
      if (row.first_ts === 0 || Number(e.timestamp) < row.first_ts) row.first_ts = Number(e.timestamp);
      agg.set(other, row);
    }

    const rows = Array.from(agg.values())
      .sort((a, b) => (b.deals - a.deals) || (b.volume_eth - a.volume_eth) || (b.last_ts - a.last_ts))
      .slice(0, MAX_ROWS);
    for (const r of rows) {
      r.volume_eth = Number(r.volume_eth.toPrecision(4));
      r.biggest_eth = Number(r.biggest_eth.toPrecision(4));
    }

    // The record deal + the oldest tie — read over the FULL table, not the
    // sliced rows, so the records stand even past the row cap.
    let biggestDeal: CounterpartiesResponse['totals']['biggest_deal'] = null;
    let oldestTie: CounterpartiesResponse['totals']['oldest_tie'] = null;
    for (const r of agg.values()) {
      if (r.biggest_eth > 0 && (!biggestDeal || r.biggest_eth > biggestDeal.eth)) {
        biggestDeal = { address: r.address, handle: null, eth: Number(r.biggest_eth.toPrecision(4)) };
      }
      if (r.first_ts > 0 && (!oldestTie || r.first_ts < oldestTie.first_ts)) {
        oldestTie = { address: r.address, handle: null, first_ts: r.first_ts };
      }
    }


    // The declared rival — resolve + price both sides.
    const nemAddr = ((meRes.data as { nemesis_address?: string | null } | null)?.nemesis_address ?? '').toLowerCase();
    let nemesis: NemesisRead | null = null;

    // One users query resolves the counterparty handles, the record-holders',
    // AND the nemesis'.
    const wantHandles = new Set(rows.map((r) => r.address));
    if (biggestDeal) wantHandles.add(biggestDeal.address);
    if (oldestTie) wantHandles.add(oldestTie.address);
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
      if (biggestDeal) biggestDeal.handle = handleBy.get(biggestDeal.address) ?? null;
      if (oldestTie) oldestTie.handle = handleBy.get(oldestTie.address) ?? null;

      // The profile wallet's follow graph over the listed counterparties — the
      // §12 relationship glyphs ride the rows (⚭ mutual · ⚯ following · ⚬
      // follower), the same marks the Starred/Wishlist name rows wear.
      // Keyed on @name, not address: every other follows read in the app does
      // (the Nomenclature Sweep), and pre-claim/indexer rows can carry a null
      // address pair. A counterparty with no @name simply has no edge.
      const myHandle = (meRes.data as { handle?: string | null } | null)?.handle ?? null;
      const namesWanted = rows.map((r) => r.handle).filter((h): h is string => !!h);
      if (myHandle && namesWanted.length > 0) {
        const [outRes, inRes] = await Promise.all([
          db.from('follows')
            .select('following_name')
            .eq('follower_name', myHandle)
            .in('following_name', namesWanted),
          db.from('follows')
            .select('follower_name')
            .eq('following_name', myHandle)
            .in('follower_name', namesWanted),
        ]);
        const iFollow = new Set(((outRes.data ?? []) as { following_name: string }[]).map((f) => f.following_name));
        const followsMe = new Set(((inRes.data ?? []) as { follower_name: string }[]).map((f) => f.follower_name));
        for (const r of rows) {
          if (!r.handle) continue;
          const out = iFollow.has(r.handle);
          const inn = followsMe.has(r.handle);
          r.rel = out && inn ? 'mutual' : out ? 'following' : inn ? 'follower' : null;
        }
      }

      if (nemAddr && ADDRESS_RE.test(nemAddr)) {
        const { data: projRows } = await db
          .from('projects')
          .select('id, floor_price_eth')
    .not('id', 'in', HIDDEN_PROJECTS_NOT_IN)
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
      biggest_deal: biggestDeal,
      oldest_tie: oldestTie,
    };

    return NextResponse.json({ address, rows, totals, nemesis } satisfies CounterpartiesResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
