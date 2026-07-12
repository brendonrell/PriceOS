// app/api/cron/takeover-sweep/route.ts
//
// Resolves expired HOSTILE TAKEOVERS. Rides the 1-min Cron Trigger; every
// run is one indexed probe unless a window actually closed. At expiry:
//   all pieces yielded → COMPLETED · some → PARTIAL · none → WITHSTOOD
// (WITHSTOOD wears its profile mark for 180 days — the read route handles
// display windows). Closing also expires the takeover's still-open offers
// so the book never shows a dead blanket.

import { getSupabaseService } from '@/lib/supabase';
import { createPing } from '@/lib/pings/createPing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const db = getSupabaseService();
    const nowIso = new Date().toISOString();
    const { data, error } = await db
      .from('takeovers')
      .select('id, caster_address, target_address, project_id, token_count, accepted_count')
      .eq('status', 'active')
      .lt('expires_at', nowIso)
      .limit(20);
    if (error) throw new Error(error.message);
    const due = (data ?? []) as {
      id: string; caster_address: string; target_address: string;
      project_id: string; token_count: number; accepted_count: number;
    }[];
    if (due.length === 0) return Response.json({ ok: true, resolved: 0 });

    for (const t of due) {
      const status =
        t.accepted_count >= t.token_count ? 'completed'
        : t.accepted_count > 0 ? 'partial'
        : 'withstood';
      await db.from('takeovers')
        .update({ status, resolved_at: nowIso } as never)
        .eq('id', t.id)
        .eq('status', 'active');
      await db.from('offers')
        .update({ status: 'expired', resolved_at: nowIso } as never)
        .eq('takeover_id', t.id)
        .eq('status', 'open');
      // Both parties learn how it ended (house casing: the outcome screams).
      const outcome =
        status === 'completed' ? `Takeover: COMPLETED · ${t.accepted_count}/${t.token_count} yielded`
        : status === 'partial' ? `Takeover: PARTIAL · ${t.accepted_count}/${t.token_count} yielded`
        : 'Takeover: WITHSTOOD · 0 yielded';
      await createPing({
        recipientAddress: t.caster_address,
        kind: 'PING',
        projectId: t.project_id,
        data: { takeover: true, takeoverId: t.id, result: status, role: 'caster', message: outcome },
      });
      await createPing({
        recipientAddress: t.target_address,
        kind: 'PING',
        projectId: t.project_id,
        data: { takeover: true, takeoverId: t.id, result: status, role: 'target', message: outcome },
      });
    }
    return Response.json({ ok: true, resolved: due.length });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
