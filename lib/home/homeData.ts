/*
 * Home surface data — one fresh read powering the home page's live bits:
 * hero platform stats (projects / volume / minted), the New Uploads list,
 * and the Now Minting set (projects at ≥12 mints, in the order they got
 * there). Computed straight off the chainless ledger (projects / events),
 * same source the mint + market routes write.
 *
 * Consumed from BOTH sides (Brendon, 2026-06-12 — "it can't just be
 * there?" It can): the home page server-renders with this as its seed so
 * carousels paint in the very first frame, and /api/home serves the same
 * payload for the client's live re-pulls (Realtime push + poll).
 */

import { getSupabaseService } from '@/lib/supabase';

/* Mints a project needs before it graduates from the New Uploads list into
   the Now Minting carousels (Brendon, 2026-06-11). */
const MINTING_NOW_THRESHOLD = 12;

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
  /** When the project crossed the threshold (Unix ms — its 12th MINT event),
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

/** Compute the live home payload. Throws on DB error — callers decide
 *  whether that's a 500 (the API route) or a null seed (the page). */
export async function buildHomeResponse(): Promise<HomeResponse> {
  const db = getSupabaseService();
  const [projRes, mintsRes, pricedRes] = await Promise.all([
    db.from('projects').select('id, title, minted_count, max_supply, uploaded_at, cooldown_until'),
    db
      .from('events')
      .select('project_id, timestamp')
      .eq('type', 'MINT')
      .order('timestamp', { ascending: true }),
    db.from('events').select('price_eth').not('price_eth', 'is', null),
  ]);
  if (projRes.error) throw new Error(projRes.error.message);
  if (mintsRes.error) throw new Error(mintsRes.error.message);

  const projects = (projRes.data ?? []) as {
    id: string;
    title: string;
    minted_count: number | null;
    max_supply: number | null;
    uploaded_at: string | null;
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
        uploaded_at: p.uploaded_at
          ? new Date(p.uploaded_at).getTime()
          : p.cooldown_until
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

  return {
    stats: {
      projects: projects.length,
      volume_eth: String(Number(volume.toFixed(4))),
      minted: totalMinted,
    },
    uploads,
    minting_now: minting,
  };
}
