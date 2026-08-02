// /api/stone/trend — the Command Stone's Courier sparkline (stage 5).
//   GET ?slug=prisms&days=30 → the project's SALE-price series, one point
//   per Montreal day (the platform's day spine): median sale price that
//   day, null on quiet days. Plus the live floor for the widget's footer.
// Real ledger only: the same `events` SALE rows the search's sold lane
// reads — nothing synthesized, quiet days stay honestly empty.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const MIN_DAYS = 7;
const MAX_DAYS = 90;

export interface StoneTrendResponse {
  slug: string;
  days: number;
  /** Oldest → newest, one entry per Montreal day. Null = no sales. */
  series: (number | null)[];
  /** Total sales inside the window. */
  sales: number;
  floor_eth: number | null;
}

function montrealDayKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms));
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug')?.toLowerCase() ?? '';
  const daysRaw = Number(url.searchParams.get('days'));
  if (!slug || !getProject(slug)) return badRequest('Unknown project');
  const days = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Number.isFinite(daysRaw) ? Math.round(daysRaw) : 30));

  try {
    const db = getSupabaseAnon();
    const sinceSec = Math.floor(Date.now() / 1000) - days * 86_400;
    const [salesRes, projRes] = await Promise.all([
      /* A sale is an XFER carrying a price — 'SALE' is a derived label, never
         a stored type (the old filter matched zero rows, so the trend always
         read as zero sales). Barter trades store price null, so the price
         filter excludes them. Fixed 2026-08-02 (data audit). */
      db.from('events')
        .select('price_eth, timestamp')
        .eq('type', 'XFER')
        .not('price_eth', 'is', null)
        .eq('project_id', slug)
        .gte('timestamp', sinceSec)
        .order('timestamp', { ascending: true })
        .limit(2000),
      db.from('projects').select('floor_price_eth').eq('id', slug).maybeSingle(),
    ]);
    if (salesRes.error) return serverError(salesRes.error.message);

    const byDay = new Map<string, number[]>();
    let sales = 0;
    for (const row of (salesRes.data ?? []) as Array<{ price_eth: string | number | null; timestamp: number }>) {
      const price = Number(row.price_eth);
      if (!Number.isFinite(price) || price <= 0) continue;
      const key = montrealDayKey(row.timestamp * 1000);
      const arr = byDay.get(key) ?? [];
      arr.push(price);
      byDay.set(key, arr);
      sales++;
    }

    const series: (number | null)[] = [];
    const nowMs = Date.now();
    for (let i = days - 1; i >= 0; i--) {
      const key = montrealDayKey(nowMs - i * 86_400_000);
      const vals = byDay.get(key);
      series.push(vals && vals.length ? Math.round(median(vals) * 10000) / 10000 : null);
    }

    const floorNum = Number((projRes.data as { floor_price_eth?: string | null } | null)?.floor_price_eth);
    const body: StoneTrendResponse = {
      slug,
      days,
      series,
      sales,
      floor_eth: Number.isFinite(floorNum) && floorNum > 0 ? floorNum : null,
    };
    return NextResponse.json(body, { headers: { 'cache-control': 'public, max-age=120' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
