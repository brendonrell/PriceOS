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

export interface GnomeMarketResponse {
  listings: GnomeAwakening[];
}

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

    const addrs = [...new Set(rows.map((r) => r.owner_address.toLowerCase()))];
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

    return NextResponse.json({ listings } satisfies GnomeMarketResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
