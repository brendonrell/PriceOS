// /api/gnomes/market — the Mushroom Market read (Brendon, 2026-07-19).
//
// Every gnome whose keeper has hung a sign on the door (ask_eth set), with
// the keeper's handle, priciest first. Public anon read — the market hall
// is open to anyone who found the mushroom.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { serverError } from '@/lib/errors';
import type { GnomeAwakening } from '@/lib/project/gnomeWorld';

export const dynamic = 'force-dynamic';

/** One settled deal, as the hall's ledger tells it — newest first. */
export interface GnomeDealEntry {
  project_id: string;
  seller_address: string;
  seller_handle: string | null;
  buyer_address: string;
  buyer_handle: string | null;
  ask_eth: number;
  settled_at: string;
}

export interface GnomeMarketResponse {
  listings: GnomeAwakening[];
  /** The ledger — recent settled deals (the counting house's public page). */
  deals: GnomeDealEntry[];
}

/** How far back the public ledger page reads. */
const LEDGER_LIMIT = 12;

export async function GET() {
  try {
    const db = getSupabaseService();
    const res = await db
      .from('gnomes')
      .select('project_id, awakened_at, owner_address, token_id, rarity, ask_eth, listed_at')
      .not('ask_eth', 'is', null)
      .order('ask_eth', { ascending: false });
    if (res.error) return serverError(res.error.message);

    type Row = {
      project_id: string; awakened_at: string; owner_address: string;
      token_id: number | string; rarity: string;
      ask_eth: number | string | null; listed_at: string | null;
    };
    const rows = (res.data ?? []) as Row[];

    /* The ledger — recent settled deals, newest first. */
    const led = await db
      .from('gnome_deals')
      .select('project_id, seller_address, buyer_address, ask_eth, settled_at')
      .eq('status', 'settled')
      .order('settled_at', { ascending: false })
      .limit(LEDGER_LIMIT);
    type LedRow = {
      project_id: string; seller_address: string; buyer_address: string;
      ask_eth: number | string; settled_at: string;
    };
    const ledRows = (led.error ? [] : (led.data ?? [])) as LedRow[];

    const addrs = [...new Set([
      ...rows.map((r) => r.owner_address.toLowerCase()),
      ...ledRows.flatMap((d) => [d.seller_address.toLowerCase(), d.buyer_address.toLowerCase()]),
    ])];
    const handleByAddr: Record<string, string | null> = {};
    if (addrs.length > 0) {
      const hs = await db.from('users').select('address, handle').in('address', addrs);
      for (const u of (hs.data ?? []) as { address: string; handle: string | null }[]) {
        handleByAddr[u.address.toLowerCase()] = u.handle;
      }
    }

    const listings: GnomeAwakening[] = rows.map((r) => ({
      project_id: r.project_id,
      awakened_at: r.awakened_at,
      owner_address: r.owner_address,
      owner_handle: handleByAddr[r.owner_address.toLowerCase()] ?? null,
      token_id: Number(r.token_id),
      rarity: r.rarity as GnomeAwakening['rarity'],
      ask_eth: r.ask_eth == null ? null : Number(r.ask_eth),
      listed_at: r.listed_at ?? null,
    }));

    const deals: GnomeDealEntry[] = ledRows.map((d) => ({
      project_id: d.project_id,
      seller_address: d.seller_address,
      seller_handle: handleByAddr[d.seller_address.toLowerCase()] ?? null,
      buyer_address: d.buyer_address,
      buyer_handle: handleByAddr[d.buyer_address.toLowerCase()] ?? null,
      ask_eth: Number(d.ask_eth),
      settled_at: d.settled_at,
    }));

    return NextResponse.json({ listings, deals } satisfies GnomeMarketResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
