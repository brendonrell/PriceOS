/*
 * Home surface data — one fresh read powering the home page's live bits:
 * hero platform stats (projects / volume / minted), the New Uploads list,
 * and the Now Minting set (projects at ≥18 mints, in the order they got
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
   the Now Minting carousels (Brendon, 2026-06-11; raised 12→18 2026-06-18).
   Exported so the mint route stamps `projects.graduated_at` on the same
   threshold. NOTE: keep STATUS_LADDER's "Graduated" tier in lib/home/
   milestones.ts in lockstep with this value. */
export const MINTING_NOW_THRESHOLD = 18;

/* The 60-day artist cooldown clock fires at UPLOAD (cooldown semantics,
   2026-06-11), so cooldown_until − 60d IS the upload moment. Used until a
   dedicated uploaded_at column exists. */
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

export interface HomeUploadRow {
  slug: string;
  title: string;
  max_supply: number;
  minted_count: number;
  /** Sequential Project ID (upload order, unique) — the New Gen Art sort key
      (Brendon, 2026-07-06). Null only for rows predating the backfill. */
  project_no: number | null;
  /** Upload moment (Unix ms), or null when the row predates the cooldown
      stamp (display "—", sort last). */
  uploaded_at: number | null;
  /** Project milestones reached: { "<count>": unix-ms }. */
  milestones: Record<string, number>;
}

export interface HomeMintingRow {
  slug: string;
  title: string;
  minted_count: number;
  /** Sequential Project ID (upload order, unique). */
  project_no: number | null;
  /** Total supply — for the live mint-progress Status facet (minted / supply). */
  max_supply: number;
  /** Upload moment (Unix ms) — the project's "birth", source for its PriceDay +
      Natal + the Newest/Oldest birth-order sort. Null when unknown (sorts last). */
  uploaded_at: number | null;
  /** When the project crossed the threshold (Unix ms — graduated into Now
      Minting), or null when unknown (sorts last). */
  reached_at: number | null;
  /** When the project fully sold out (Unix ms), or null if still minting. */
  sold_out_at: number | null;
  /** Project milestones reached: { "<count>": unix-ms }. */
  milestones: Record<string, number>;
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
    db.from('projects').select('id, title, minted_count, max_supply, project_no, uploaded_at, cooldown_until, graduated_at, sold_out_at, milestones'),
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
    project_no: number | null;
    uploaded_at: string | null;
    cooldown_until: string | null;
    graduated_at: string | null;
    sold_out_at: string | null;
    milestones: Record<string, string> | null;
  }[];

  /* JSONB { "<count>": iso } -> { "<count>": unix-ms }, dropping unparseable. */
  const msMap = (raw: Record<string, string> | null): Record<string, number> => {
    const out: Record<string, number> = {};
    if (raw) {
      for (const [k, v] of Object.entries(raw)) {
        const t = new Date(v).getTime();
        if (Number.isFinite(t)) out[k] = t;
      }
    }
    return out;
  };

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
        project_no: p.project_no,
        max_supply: p.max_supply ?? 0,
        uploaded_at: p.uploaded_at
          ? new Date(p.uploaded_at).getTime()
          : p.cooldown_until
            ? new Date(p.cooldown_until).getTime() - COOLDOWN_MS
            : null,
        // Prefer the persisted graduation moment; fall back to the computed
        // 18th-mint walk so a project with an unstamped graduation never drops
        // out of the recency sort.
        reached_at: p.graduated_at
          ? new Date(p.graduated_at).getTime()
          : reachedAt[p.id] ?? null,
        sold_out_at: p.sold_out_at ? new Date(p.sold_out_at).getTime() : null,
        milestones: msMap(p.milestones),
      });
    } else {
      uploads.push({
        slug: p.id,
        title: p.title,
        max_supply: p.max_supply ?? 0,
        minted_count: minted,
        project_no: p.project_no,
        uploaded_at: p.uploaded_at
          ? new Date(p.uploaded_at).getTime()
          : p.cooldown_until
            ? new Date(p.cooldown_until).getTime() - COOLDOWN_MS
            : null,
        milestones: msMap(p.milestones),
      });
    }
  }
  uploads.sort(
    (a, b) =>
      // PROJECT ID is the New Gen Art order (Brendon, 2026-07-06) — newest
      // number first. Unique by construction, so the list can never
      // reshuffle between reads; upload time + name only back-fill rows
      // that predate the numbering.
      (b.project_no ?? -Infinity) - (a.project_no ?? -Infinity) ||
      (b.uploaded_at ?? -Infinity) - (a.uploaded_at ?? -Infinity) ||
      a.title.localeCompare(b.title) ||
      a.slug.localeCompare(b.slug),
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
