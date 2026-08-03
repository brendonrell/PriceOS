// app/api/cron/drops-close/route.ts
//
// FAIR DRAW close sweep: any drop whose entry window has ended runs the
// full close choreography (lib/drops/settlement.ts) — quiet close and
// broadcast, or snapshot → bands → beacon → draw → seats on-chain →
// winners' orders → finishSettlement. Runs every minute (a window is the
// opening minute; the close must fire promptly — no KV gate on purpose).
// Same fail-closed CRON_SECRET gate as every sweep. Idempotent: closeDrop
// only touches status='WINDOW' rows, so a re-run finds nothing.
//
// The contract's ≤4h fail-open outranks this sweep by design — if it never
// runs, minting opens by itself. Nothing here is load-bearing for the mint
// existing (the brief's hard lock).

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { closeDrop, liveSettlementChain } from '@/lib/drops/settlement';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const db = getSupabaseService();
    const res = await db
        .from('drops')
        .select('id')
        .eq('status', 'WINDOW')
        .lte('window_close', new Date().toISOString());
    if (res.error) {
        return NextResponse.json({ error: String(res.error.message) }, { status: 500 });
    }
    const due = (res.data ?? []) as unknown as { id: number }[];
    if (due.length === 0) return NextResponse.json({ closed: 0 });

    const chain = liveSettlementChain();
    const closed: { id: number; contested: boolean }[] = [];
    const failed: { id: number; error: string }[] = [];
    for (const d of due) {
        try {
            const out = await closeDrop(db, chain, d.id);
            closed.push({ id: d.id, contested: out.contested });
        } catch (err) {
            // A failed close stays WINDOW and retries next minute; the
            // contract's fail-open bounds the worst case at ≤4h regardless.
            failed.push({ id: d.id, error: (err as Error).message });
        }
    }
    return NextResponse.json({ closed: closed.length, contested: closed, failed });
}
