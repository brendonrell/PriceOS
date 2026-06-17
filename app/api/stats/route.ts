// Platform-wide totals — live read over the chainless ledger.
// Projects, mints, holders, and volume are computed from the real rows the
// mint + market routes write (projects / holders / events). No indexer needed:
// the no-chain phase writes straight to these tables. Sparse until activity
// accrues; fills as the platform is used.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const revalidate = 60; // Platform stats: 60s

export interface PlatformStatsResponse {
  total_projects: number;
  total_minted: number;
  total_holders: number;
  total_volume_eth: string;
  primary_volume_eth: string;
  secondary_volume_eth: string;
  active_artists: number;
  artists_in_cooldown: number;
}

const fmt = (n: number) => String(Number(n.toFixed(4)));

export async function GET(): Promise<NextResponse> {
  try {
    const db = getSupabaseService();
    const [projRes, holdersRes, eventsRes] = await Promise.all([
      db.from('projects').select('artist_address, minted_count, cooldown_until'),
      db.from('holders').select('owner_address'),
      db.from('events').select('type, price_eth'),
    ]);

    if (projRes.error) return serverError(projRes.error.message);
    if (holdersRes.error) return serverError(holdersRes.error.message);
    if (eventsRes.error) return serverError(eventsRes.error.message);

    const projects = (projRes.data ?? []) as {
      artist_address: string | null;
      minted_count: number | null;
      cooldown_until: string | null;
    }[];
    const holders = (holdersRes.data ?? []) as { owner_address: string }[];
    const events = (eventsRes.data ?? []) as { type: string; price_eth: number | string | null }[];

    const now = Date.now();

    // Primary volume = MINT events; secondary = priced transfers (sales).
    let primary = 0;
    let secondary = 0;
    for (const e of events) {
      const p = Number(e.price_eth ?? 0);
      if (!p) continue;
      if (e.type === 'MINT') primary += p;
      else if (e.type === 'XFER') secondary += p;
    }

    const artists = new Set(
      projects.map((p) => p.artist_address?.toLowerCase()).filter((a): a is string => !!a),
    );
    const inCooldown = new Set(
      projects
        .filter((p) => p.cooldown_until && new Date(p.cooldown_until).getTime() > now)
        .map((p) => p.artist_address?.toLowerCase())
        .filter((a): a is string => !!a),
    );

    const response: PlatformStatsResponse = {
      total_projects: projects.length,
      total_minted: projects.reduce((s, p) => s + (p.minted_count ?? 0), 0),
      total_holders: new Set(holders.map((h) => h.owner_address.toLowerCase())).size,
      total_volume_eth: fmt(primary + secondary),
      primary_volume_eth: fmt(primary),
      secondary_volume_eth: fmt(secondary),
      active_artists: artists.size,
      artists_in_cooldown: inCooldown.size,
    };
    // Browser-side cache hint matching the 60s edge window — repeat reads
    // within the window skip the network without serving anything staler
    // than the edge cache already would.
    return NextResponse.json(response, {
      headers: {
        'Cache-Control':
          'public, max-age=60, s-maxage=60, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
