// Home surface data — one fresh read powering the home page's live bits:
// hero platform stats (projects / volume / minted), the New Uploads list,
// and the Minting Now set (projects at ≥6 mints, in the order they got
// there). Computed straight off the chainless ledger (projects / events),
// same source the mint + market routes write. No cache — the home page
// re-pulls this on Supabase Realtime pushes, so it must always be current.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

/* Mints a project needs before it graduates from the New Uploads list into
   the Minting Now carousels (Brendon, 2026-06-11). */
const MINTING_NOW_THRESHOLD = 6;

/* The 60-day artist cooldown clock fires at UPLOAD (cooldown semantics,
   2026-06-11), so cooldown_until − 60d IS the upload moment. Used until a
   dedicated uploaded_at column exists. */
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

export interface HomeUploadRow {
  slug: string;
  title: string;
  max_supply: number;
  minted_count: number;
  /** Upload moment (Unix ms), or null when the row predates the cooldown
      stamp (display "—", sort last). */
  uploaded_at: number | null;
}

export interface HomeMintingRow {
  slug: string;
  title: string;
  minted_count: number;
  /** When the project crossed the threshold (Unix ms — its 6th MINT event),
      or null when mint events predate event logging (sorts last). */
  reached_at: number | null;
}

export interface HomeResponse {
  stats: {
    projects: number;
    /** All priced events summed (primary + secondary), ETH string. */
    volume_eth: string;
    /** Outputs minted platform-wide. */
    minted: number;
  };
  /** Projects not yet at the threshold, newest upload first. */
  uploads: HomeUploadRow[];
  /** Projects at ≥ threshold mints, in the order they reached it. */
  minting_now: HomeMintingRow[];
}

export async function GET(): Promise<NextResponse> {
  try {
    const db = getSupabaseService();
    const [projRes, mintsRes, pricedRes] = await Promise.all([
      db.from('projects').select('id, title, minted_count, max_supply, cooldown_until'),
      db
        .from('events')
        .select('project_id, timestamp')
        .eq('type', 'MINT')
        .order('timestamp', { ascending: true }),
      db.from('events').select('price_eth').not('price_eth', 'is', null),
    ]);
    if (projRes.error) return serverError(projRes.error.message);
    if (mintsRes.error) return serverError(mintsRes.error.message);

    const projects = (projRes.data ?? []) as {
      id: string;
      title: string;
      minted_count: number | null;
      max_supply: number | null;
      cooldown_until: string | null;
    }[];

    // The moment each project crossed the threshold = the timestamp of its
    // Nth mint event (events.timestamp is Unix seconds). Counted in
    // chronological order; tiny test-phase volumes make this a cheap walk.
    const mintCount: Record<string, number> = {};
    const reachedAt: Record<string, number> = {};
    for (const e of (mintsRes.data ?? []) as { project_id: string; timestamp: number }[]) {
      const n = (mintCount[e.project_id] = (mintCount[e.project_id] ?? 0) + 1);
      if (n === MINTING_NOW_THRESHOLD) reachedAt[e.project_id] = e.timestamp * 1000;
    }

    let volume = 0;
    for (const e of (pricedRes.data ?? []) as { price_eth: number | string | null }[]) {
      volume += Number(e.price_eth ?? 0);
    }

    const uploads: HomeUploadRow[] = [];
    const minting: HomeMintingRow[] = [];
    let totalMinted = 0;
    for (const p of projects) {
      const minted = p.minted_count ?? 0;
      totalMinted += minted;
      if (minted >= MINTING_NOW_THRESHOLD) {
        minting.push({
          slug: p.id,
          title: p.title,
          minted_count: minted,
          reached_at: reachedAt[p.id] ?? null,
        });
      } else {
        uploads.push({
          slug: p.id,
          title: p.title,
          max_supply: p.max_supply ?? 0,
          minted_count: minted,
          uploaded_at: p.cooldown_until
            ? new Date(p.cooldown_until).getTime() - COOLDOWN_MS
            : null,
        });
      }
    }
    uploads.sort(
      (a, b) => (b.uploaded_at ?? -Infinity) - (a.uploaded_at ?? -Infinity),
    );
    minting.sort(
      (a, b) => (a.reached_at ?? Infinity) - (b.reached_at ?? Infinity),
    );

    const response: HomeResponse = {
      stats: {
        projects: projects.length,
        volume_eth: String(Number(volume.toFixed(4))),
        minted: totalMinted,
      },
      uploads,
      minting_now: minting,
    };
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
