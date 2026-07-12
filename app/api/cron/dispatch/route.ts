// app/api/cron/dispatch/route.ts
//
// The Dispatch press run. Rides the 1-min Cron Trigger; prints today's
// edition once the Montreal clock passes 9AM and no edition exists yet for
// today's PriceDay (idempotent via the day PK — a lost race inserts once).
// Editions are immutable after printing: the cron never updates a row.
// Cheap: all but one run per day exit on a single HEAD probe.

import { getSupabaseService } from '@/lib/supabase';
import { priceDayNumber } from '@/lib/priceday/priceday';
import { buildDispatch } from '@/lib/dispatch/build.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function montrealHour(): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Montreal', hour: 'numeric', hourCycle: 'h23' })
      .format(new Date()),
  );
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    if (montrealHour() < 9) return Response.json({ ok: true, waiting: true });
    const db = getSupabaseService();
    const day = priceDayNumber();

    const probe = await db.from('dispatches').select('day', { count: 'exact', head: true }).eq('day', day);
    if ((probe.count ?? 0) > 0) return Response.json({ ok: true, day, printed: false });

    const body = await buildDispatch(db, day);
    const ins = await db.from('dispatches').insert({ day, cal_date: body.cal_date, body } as never);
    // 23505 = someone else printed in the same minute — that's a win, not an error.
    if (ins.error && !String(ins.error.code).includes('23505')) throw new Error(ins.error.message);
    return Response.json({ ok: true, day, printed: !ins.error });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
