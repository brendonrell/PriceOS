// /api/project/[slug]/activity — ACTIVITY HEATMAP data feed (2026-08-21).
// Two granularities off one `events` read:
//   ?level=day            → daily buckets across the project's whole life,
//                            mint count + trade count per calendar day
//                            (calendar-level zoom, the default view).
//   ?level=hour&day=YYYY-MM-DD → 24 hourly buckets for one specific day
//                            (drill-down zoom, tap a day to open it).
// Same two `type`s the rest of the site reads off `events`: MINT and XFER
// (XFER with a price is a trade). Viewer-local day/hour bucketing is done
// client-side against UTC timestamps — this route just returns raw counts
// per UTC day/hour and the client re-buckets to the viewer's zone.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

interface DayBucket {
  date: string; // YYYY-MM-DD (UTC)
  mints: number;
  trades: number;
}

interface HourBucket {
  hour: number; // 0-23 UTC
  mints: number;
  trades: number;
}

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  const project = getProject(slug);
  if (!project) return badRequest('Unknown project');

  const level = req.nextUrl.searchParams.get('level') === 'hour' ? 'hour' : 'day';
  const dayParam = req.nextUrl.searchParams.get('day');

  try {
    const db = getSupabaseService();

    if (level === 'hour') {
      if (!dayParam || !/^\d{4}-\d{2}-\d{2}$/.test(dayParam)) {
        return badRequest('level=hour requires ?day=YYYY-MM-DD');
      }
      const dayStart = Math.floor(Date.UTC(
        Number(dayParam.slice(0, 4)),
        Number(dayParam.slice(5, 7)) - 1,
        Number(dayParam.slice(8, 10))
      ) / 1000);
      const dayEnd = dayStart + 86400;

      const evRes = await db.from('events')
        .select('type, price_eth, timestamp')
        .eq('project_id', slug)
        .gte('timestamp', dayStart)
        .lt('timestamp', dayEnd)
        .limit(20000);
      if (evRes.error) return serverError(evRes.error.message);

      const events = (evRes.data ?? []) as { type: string; price_eth: string | number | null; timestamp: number }[];
      const hours: HourBucket[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, mints: 0, trades: 0 }));
      for (const e of events) {
        const h = Math.floor(((e.timestamp - dayStart) / 3600));
        if (h < 0 || h > 23) continue;
        if (e.type === 'MINT') hours[h].mints++;
        else if (e.type === 'XFER' && e.price_eth != null && Number(e.price_eth) > 0) hours[h].trades++;
      }

      return NextResponse.json({ level: 'hour', day: dayParam, hours });
    }

    // level === 'day' — the project's whole life, one row per UTC day.
    const evRes = await db.from('events')
      .select('type, price_eth, timestamp')
      .eq('project_id', slug)
      .order('timestamp', { ascending: true })
      .limit(50000);
    if (evRes.error) return serverError(evRes.error.message);

    const events = (evRes.data ?? []) as { type: string; price_eth: string | number | null; timestamp: number }[];
    if (events.length === 0) {
      return NextResponse.json({ level: 'day', days: [] });
    }

    const dayMap = new Map<string, DayBucket>();
    const toDateKey = (ts: number): string => new Date(ts * 1000).toISOString().slice(0, 10);

    for (const e of events) {
      const key = toDateKey(e.timestamp);
      let bucket = dayMap.get(key);
      if (!bucket) {
        bucket = { date: key, mints: 0, trades: 0 };
        dayMap.set(key, bucket);
      }
      if (e.type === 'MINT') bucket.mints++;
      else if (e.type === 'XFER' && e.price_eth != null && Number(e.price_eth) > 0) bucket.trades++;
    }

    const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ level: 'day', days });
  } catch (err) {
    return serverError(err);
  }
}
