// app/api/cron/calls-resolve/route.ts
//
// THE CALL LEDGER resolution sweep (2026-07-26). Settles every open
// Conviction call whose target has crossed (CROWNED) or whose window has
// expired (REKT), against projects.floor_price_eth, through the SAME pure
// resolveCall the /api/calls resolve-on-read path uses — the two can never
// disagree. Writes are guarded on status='open' so re-runs are idempotent.
//
// KV-gated to ~15 min on the every-minute Cron Trigger (probe-and-exit
// otherwise — the economy-audit pattern); ?force=1 (still behind the secret)
// runs it on demand. Same fail-closed CRON_SECRET gate as every sweep.

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSupabaseService } from '@/lib/supabase';
import { resolveCall, type CallClaim } from '@/lib/calls/resolve';

export const dynamic = 'force-dynamic';

const GATE_KEY = 'pd:calls-resolve-at';
const GATE_MS = 15 * 60 * 1000;

interface OpenRow {
    id: number;
    project_id: string;
    claim_type: CallClaim;
    target_eth: string | number;
    window_end: string;
}

export async function GET(req: Request): Promise<NextResponse> {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const force = new URL(req.url).searchParams.get('force') === '1';
    interface KVLike {
        get(k: string): Promise<string | null>;
        put(k: string, v: string): Promise<void>;
    }
    let kv: KVLike | null = null;
    try {
        const { env } = getCloudflareContext() as unknown as {
            env: { NEXT_INC_CACHE_KV?: KVLike };
        };
        kv = env.NEXT_INC_CACHE_KV ?? null;
    } catch {
        /* non-CF runtime */
    }
    const now = Date.now();
    if (!force && kv) {
        const prev = await kv.get(GATE_KEY);
        if (prev && now - Number(prev) < GATE_MS) {
            return NextResponse.json({ ok: true, skipped: 'ran recently' });
        }
    }

    try {
        const db = getSupabaseService();
        const openRes = await db
            .from('calls')
            .select('id, project_id, claim_type, target_eth, window_end')
            .eq('status', 'open')
            .limit(500);
        if (openRes.error) throw new Error(openRes.error.message);
        const open = (openRes.data ?? []) as OpenRow[];
        if (open.length === 0) {
            if (kv) await kv.put(GATE_KEY, String(now));
            return NextResponse.json({ ok: true, open: 0, settled: 0 });
        }

        // One floor read per involved project.
        const slugs = [...new Set(open.map((r) => r.project_id))];
        const fr = await db.from('projects').select('id, floor_price_eth').in('id', slugs);
        const floors = new Map<string, number | null>();
        for (const p of (fr.data ?? []) as { id: string; floor_price_eth: string | number | null }[]) {
            const n = p.floor_price_eth != null ? Number(p.floor_price_eth) : 0;
            floors.set(p.id, n > 0 ? n : null);
        }

        let settled = 0;
        for (const r of open) {
            const floorNow = floors.get(r.project_id) ?? null;
            const verdict = resolveCall(
                { claim_type: r.claim_type, target_eth: Number(r.target_eth), window_end: r.window_end },
                floorNow,
                now,
            );
            if (!verdict || verdict === 'open') continue;
            const up = await db
                .from('calls')
                .update({
                    status: verdict,
                    resolved_at: new Date(now).toISOString(),
                    floor_at_resolve: floorNow,
                } as never)
                .eq('id', r.id)
                .eq('status', 'open');
            if (!up.error) settled += 1;
        }

        if (kv) await kv.put(GATE_KEY, String(now));
        return NextResponse.json({ ok: true, open: open.length, settled });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'unknown' },
            { status: 500 },
        );
    }
}
