// /api/user/[address]/artist — the Artist tab read: the case for this artist,
// told entirely through numbers that already exist. THE RECORD (volume,
// collectors, projects, sold-out count, days active), THE ARC (mint price →
// current floor, ranked by gain), SOLD OUT (time-to-sellout, fastest first),
// and a VERDICT word. All derived from `projects` + `listings` + `events` +
// `holders` — no new tables, no writes. Framing is deliberately generous:
// every verdict band reads as a compliment, just a quieter one for artists
// with less to show yet (Brendon, 2026-09-13 — "less make it flattering").
//
// Public read keyed on the address in the path, same precedent as Loyalty —
// service client since holders/events aren't anon-readable.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const MAX_ROWS = 10;

export interface ArtistArcRow {
  slug: string;
  title: string;
  mint_price_eth: number;
  floor_eth: number;
  /** (floor - mint) / mint. Can be negative. */
  gain: number;
}

export interface ArtistSelloutRow {
  slug: string;
  title: string;
  sold_out_at: string;
  days_to_sellout: number;
}

export interface ArtistVerdict {
  /** 0–100 — sellout rate (60) + price arc vs mint (40). */
  score: number;
  verdict: 'LEGENDARY' | 'IN DEMAND' | 'RISING' | 'STEADY' | 'ONE TO WATCH';
  sold_out: number;
  projects: number;
  avg_gain: number | null;
}

export interface ArtistResponse {
  address: string;
  handle: string | null;
  total_volume_eth: number;
  total_collectors: number;
  projects_count: number;
  sold_out_count: number;
  days_active: number | null;
  arc: ArtistArcRow[];
  sellout: ArtistSelloutRow[];
  verdict: ArtistVerdict | null;
}

function verdictFor(score: number): ArtistVerdict['verdict'] {
  if (score >= 80) return 'LEGENDARY';
  if (score >= 60) return 'IN DEMAND';
  if (score >= 40) return 'RISING';
  if (score >= 20) return 'STEADY';
  return 'ONE TO WATCH';
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();

    const [userRes, projRes] = await Promise.all([
      db.from('users').select('handle').eq('address', address).maybeSingle(),
      db.from('projects')
        .select('id, title, uploaded_at, sold_out_at')
        .eq('artist_address', address),
    ]);
    if (userRes.error) return serverError(userRes.error.message);
    if (projRes.error) return serverError(projRes.error.message);

    const projects = (projRes.data ?? []) as {
      id: string;
      title: string;
      uploaded_at: string | null;
      sold_out_at: string | null;
    }[];
    const ids = projects.map((p) => p.id);

    const floorByProj: Record<string, number> = {};
    let totalVolume = 0;
    const collectors = new Set<string>();

    if (ids.length > 0) {
      const [lRes, eRes, hRes] = await Promise.all([
        db.from('listings').select('project_id, price_eth').in('project_id', ids).eq('active', true),
        db.from('events').select('project_id, price_eth').in('project_id', ids).not('price_eth', 'is', null),
        db.from('holders').select('owner_address').in('project_id', ids),
      ]);
      if (lRes.error) return serverError(lRes.error.message);
      if (eRes.error) return serverError(eRes.error.message);
      if (hRes.error) return serverError(hRes.error.message);

      for (const l of (lRes.data ?? []) as { project_id: string; price_eth: number | string }[]) {
        const p = Number(l.price_eth);
        if (floorByProj[l.project_id] === undefined || p < floorByProj[l.project_id]) {
          floorByProj[l.project_id] = p;
        }
      }
      for (const e of (eRes.data ?? []) as { project_id: string; price_eth: number | string }[]) {
        totalVolume += Number(e.price_eth);
      }
      for (const h of (hRes.data ?? []) as { owner_address: string }[]) {
        collectors.add(h.owner_address.toLowerCase());
      }
    }

    // ── THE ARC — mint price → current floor, ranked by gain ────────────────
    const arc: ArtistArcRow[] = projects
      .map((p) => {
        const def = getProject(p.id);
        const floor = floorByProj[p.id];
        if (!def || floor === undefined) return null;
        const mint = def.mintPriceEth;
        if (!(mint > 0)) return null;
        return {
          slug: p.id,
          title: def.displayName ?? p.title,
          mint_price_eth: mint,
          floor_eth: floor,
          gain: (floor - mint) / mint,
        } satisfies ArtistArcRow;
      })
      .filter((r): r is ArtistArcRow => r !== null)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, MAX_ROWS);

    // ── SOLD OUT — time to sellout, fastest first ────────────────────────────
    const sellout: ArtistSelloutRow[] = projects
      .filter((p) => p.sold_out_at && p.uploaded_at)
      .map((p) => {
        const def = getProject(p.id);
        const days = Math.max(0, Math.round((Date.parse(p.sold_out_at as string) - Date.parse(p.uploaded_at as string)) / 86400_000));
        return {
          slug: p.id,
          title: def?.displayName ?? p.title,
          sold_out_at: p.sold_out_at as string,
          days_to_sellout: days,
        } satisfies ArtistSelloutRow;
      })
      .sort((a, b) => a.days_to_sellout - b.days_to_sellout)
      .slice(0, MAX_ROWS);

    // ── Days active — from the earliest upload ───────────────────────────────
    const uploadTimes = projects
      .map((p) => (p.uploaded_at ? Date.parse(p.uploaded_at) : NaN))
      .filter((t) => Number.isFinite(t));
    const daysActive = uploadTimes.length > 0
      ? Math.max(0, Math.round((Date.now() - Math.min(...uploadTimes)) / 86400_000))
      : null;

    const soldOutCount = projects.filter((p) => p.sold_out_at).length;

    // ── VERDICT — generous by construction: every band is a compliment,
    //    a quieter one when there's less to show yet (never a knock). ───────
    let verdict: ArtistVerdict | null = null;
    if (projects.length > 0) {
      const soldOutRate = soldOutCount / projects.length;
      const avgGain = arc.length > 0 ? arc.reduce((s, r) => s + r.gain, 0) / arc.length : null;
      const normalizedGain = avgGain !== null ? Math.min(1, Math.max(0, (avgGain + 1) / 2)) : 0.5;
      const score = Math.round(60 * soldOutRate + 40 * normalizedGain);
      verdict = {
        score,
        verdict: verdictFor(score),
        sold_out: soldOutCount,
        projects: projects.length,
        avg_gain: avgGain,
      };
    }

    const user = userRes.data as { handle: string | null } | null;

    const response: ArtistResponse = {
      address,
      handle: user?.handle ?? null,
      total_volume_eth: totalVolume,
      total_collectors: collectors.size,
      projects_count: projects.length,
      sold_out_count: soldOutCount,
      days_active: daysActive,
      arc,
      sellout,
      verdict,
    };
    return NextResponse.json(response, { headers: { 'cache-control': 'public, max-age=30' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
