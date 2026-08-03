/*
 * /api/drops/[project]/transcript — the public draw record.
 *
 * GET: the latest contested drop for a project — the full transcript JSON,
 * the on-chain commitment, the beacon, the seal. This is what a stranger
 * feeds verifyDraw; it is public by design (anon read, RLS-backed) and
 * contains only the canonical entry set — never held orders, never arrival
 * order, never row ids.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { notFound, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ project: string }> },
) {
    const { project } = await ctx.params;
    const db = getSupabaseAnon();
    const res = await db
        .from('drops')
        .select('project_address, status, supply, seal_seconds, beacon_block, beacon_hash, commitment, transcript, window_close')
        .eq('project_address', project.toLowerCase())
        .in('status', ['CONTESTED', 'SETTLED'])
        .order('window_close', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (res.error) return serverError(res.error);
    const data = res.data as unknown as { transcript: unknown } | null;
    if (!data?.transcript) return notFound('no contested draw for this project');
    return NextResponse.json(data);
}
