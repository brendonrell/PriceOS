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
import { priceDayNumber } from '@/lib/priceday/priceday';
import { dayWindow } from '@/lib/priceday/almanac.server';
import { tagById } from '@/lib/tags/catalog';

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

/** One priced secondary sale (a transfer that moved money). */
export interface HomeSaleRow {
  slug: string;
  token_id: string;
  price_eth: number;
  /** Unix ms. */
  ts: number;
}

/* The extra live signals the home NEWS RAIL needs and the carousels don't
   (Brendon, 2026-07-29 — "the marquee shows mostly graduating, let's show
   more"). Everything derivable from the payload above (mint progress,
   platform round numbers, milestones, birthdays, new-artist) is computed
   client-side in lib/home/news.ts and is NOT duplicated here — this block
   carries ONLY what needs a database read: sales + accounts. Two capped
   queries; null/empty when there's nothing yet. */
export interface HomeNewsSignals {
  /** Biggest priced secondary inside TODAY's PriceDay window. */
  top_sale: HomeSaleRow | null;
  /** The most recent project to get its FIRST-EVER resale. */
  first_resale: HomeSaleRow | null;
  /** #1 on the PriceScore leaderboard. */
  top_collector: { handle: string; score: number } | null;
  /** Newest named accounts, newest first. */
  new_faces: { handle: string; ts: number }[];
  /** A platform head-count for ONE profile tag, rotating daily — "N people
      wear Collector". Null until anyone wears a tag. */
  tag_stat: { id: string; label: string; count: number } | null;
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
  /** Extra signals for the home news rail. Optional so an older cached
      payload (or a partial failure) simply renders the rail without them. */
  news?: HomeNewsSignals;
}

/* How far back a "first resale" still counts as news. Older than this and the
   pill is history, not a moment — it drops off the rail. */
const FIRST_RESALE_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/* Ceiling on the priced-transfer scan behind the sale pills. Launch-scale
   volumes sit far under it; if it's ever hit, the oldest resales fall out of
   the "first resale" detection first (the top-sale-today pill is unaffected —
   today's rows are always inside the newest slice). */
const SALE_SCAN_LIMIT = 2000;

/* Ceiling on the account scan behind the tag head-count. Past this the figure
   would under-report, so raise it (or move to a SQL tally) before the user
   base gets there. */
const TAG_SCAN_LIMIT = 5000;

/* The news-rail signals that genuinely need a database read. Never throws:
   the rail is decoration, so a failure here quietly renders the rail without
   these pills rather than taking the home page down with it. */
async function buildNewsSignals(
  db: ReturnType<typeof getSupabaseService>,
): Promise<HomeNewsSignals> {
  const empty: HomeNewsSignals = {
    top_sale: null, first_resale: null, top_collector: null, new_faces: [], tag_stat: null,
  };
  try {
    const day = priceDayNumber();
    const { startSec, endSec } = dayWindow(day);
    const [saleRes, topRes, newRes, tagRes] = await Promise.all([
      // A priced XFER is a secondary sale (the almanac's own definition).
      db.from('events').select('project_id, token_id, price_eth, timestamp')
        .eq('type', 'XFER').not('price_eth', 'is', null)
        .order('timestamp', { ascending: false }).limit(SALE_SCAN_LIMIT),
      db.from('users').select('handle, price_score')
        .not('handle', 'is', null).gt('price_score', 0)
        .order('price_score', { ascending: false })
        .order('created_at', { ascending: true }).limit(1),
      db.from('users').select('handle, created_at')
        .not('handle', 'is', null)
        .order('created_at', { ascending: false }).limit(3),
      db.from('users').select('profile_tags, granted_tags').limit(TAG_SCAN_LIMIT),
    ]);

    const rows = (saleRes.data ?? []) as {
      project_id: string; token_id: string; price_eth: number | string; timestamp: number;
    }[];

    // Today's biggest, and each project's earliest — one pass over the scan.
    let topSale: HomeSaleRow | null = null;
    const firstByProject = new Map<string, HomeSaleRow>();
    for (const r of rows) {
      const sale: HomeSaleRow = {
        slug: r.project_id,
        token_id: r.token_id,
        price_eth: Number(r.price_eth),
        ts: r.timestamp * 1000,
      };
      if (!Number.isFinite(sale.price_eth)) continue;
      if (r.timestamp >= startSec && r.timestamp < endSec) {
        if (!topSale || sale.price_eth > topSale.price_eth) topSale = sale;
      }
      const prev = firstByProject.get(sale.slug);
      // Scan runs newest-first, so a later row is always the earlier sale.
      if (!prev || sale.ts < prev.ts) firstByProject.set(sale.slug, sale);
    }

    // The freshest debut resale across all projects, while it's still news.
    let firstResale: HomeSaleRow | null = null;
    const cutoff = Date.now() - FIRST_RESALE_FRESH_MS;
    for (const s of firstByProject.values()) {
      if (s.ts < cutoff) continue;
      if (!firstResale || s.ts > firstResale.ts) firstResale = s;
    }

    const top = ((topRes.data ?? []) as { handle: string | null; price_score: number | null }[])[0];
    const faces = ((newRes.data ?? []) as { handle: string | null; created_at: string | null }[])
      .filter((u) => !!u.handle)
      .map((u) => ({ handle: u.handle as string, ts: new Date(u.created_at ?? 0).getTime() }))
      .filter((u) => Number.isFinite(u.ts));

    /* Head-count every worn tag, then show ONE — indexed by PriceDay so the
       rail turns over a different stat each day instead of always naming the
       biggest crowd. Self-applied personas and admin-granted tags both count;
       derived tags aren't stored, so they're not countable here. */
    const tally = new Map<string, number>();
    for (const u of (tagRes.data ?? []) as { profile_tags: string[] | null; granted_tags: string[] | null }[]) {
      for (const id of new Set([...(u.profile_tags ?? []), ...(u.granted_tags ?? [])])) {
        tally.set(id, (tally.get(id) ?? 0) + 1);
      }
    }
    const worn = [...tally.entries()]
      .map(([id, count]) => ({ id, label: tagById(id)?.label ?? null, count }))
      .filter((t): t is { id: string; label: string; count: number } => !!t.label)
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
    const tagStat = worn.length > 0 ? worn[(day - 1) % worn.length] : null;

    return {
      top_sale: topSale,
      first_resale: firstResale,
      top_collector: top?.handle ? { handle: top.handle, score: top.price_score ?? 0 } : null,
      new_faces: faces,
      tag_stat: tagStat,
    };
  } catch {
    return empty;
  }
}

/** Compute the live home payload. Throws on DB error — callers decide
 *  whether that's a 500 (the API route) or a null seed (the page). */
export async function buildHomeResponse(): Promise<HomeResponse> {
  const db = getSupabaseService();
  const [projRes, mintsRes, pricedRes, news] = await Promise.all([
    db.from('projects').select('id, title, minted_count, max_supply, project_no, uploaded_at, cooldown_until, graduated_at, sold_out_at, milestones'),
    db
      .from('events')
      .select('project_id, timestamp')
      .eq('type', 'MINT')
      .order('timestamp', { ascending: true }),
    db.from('events').select('price_eth').not('price_eth', 'is', null),
    buildNewsSignals(db),
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
    news,
  };
}
