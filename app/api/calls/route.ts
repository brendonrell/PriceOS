/*
 * /api/calls — THE CONVICTION / CALL LEDGER (Brendon approved 2026-07-26).
 *
 * POST (SIWE): one tap posts a signed, server-timestamped, PUBLIC, IMMUTABLE
 * price call on a project — direction (bull/bear) + target floor + a fixed
 * window (24H / 7D / 30D). The route stamps floor_at_call; a claim that is
 * ALREADY true at post time is rejected (no free crowns). There is no edit
 * and no delete — not here, not anywhere.
 *
 * GET: the public ledger — ?project=<slug> (that project's calls) or
 * ?user=<address> (that wallet's calls + W–L record). Every GET is also a
 * RESOLVE-ON-READ pass: any open call whose target has crossed (CROWNED) or
 * whose window has expired (REKT) is settled before the response, through
 * the same pure resolveCall the cron sweep uses — the ledger is never
 * visibly stale. Settling writes status exactly once (guarded on
 * status='open'), via the service role only.
 *
 * NOT Price Targets: price_predictions is the sealed monthly crowd game and
 * stays untouched. Calls do NOT feed PriceScore (v1) — reputation here is
 * the record itself, so rank can't be farmed by spamming calls.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { resolveCall, claimMet, CALL_WINDOWS, type CallClaim, type CallStatus } from '@/lib/calls/resolve';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
/* Server hygiene: a wallet holds at most this many OPEN calls per project —
   the ledger is a record, not a spam surface. */
const MAX_OPEN_PER_PROJECT = 5;
const LIST_LIMIT = 50;

interface CallRow {
    id: number;
    user_address: string;
    project_id: string;
    claim_type: CallClaim;
    target_eth: string | number;
    window_end: string;
    floor_at_call: string | number | null;
    status: CallStatus;
    resolved_at: string | null;
    floor_at_resolve: string | number | null;
    created_at: string;
}

export interface CallOut {
    id: number;
    address: string;
    handle: string | null;
    project_id: string;
    claim_type: CallClaim;
    target_eth: number;
    window_end: string;
    floor_at_call: number | null;
    status: CallStatus;
    resolved_at: string | null;
    floor_at_resolve: number | null;
    created_at: string;
}

export interface CallsResponse {
    calls: CallOut[];
    /** Present on ?user= reads — the wallet's W–L record. */
    record?: { crowned: number; rekt: number; open: number };
}

async function floorOf(slug: string): Promise<number | null> {
    const db = getSupabaseService();
    const { data } = await db
        .from('projects')
        .select('floor_price_eth')
        .eq('id', slug)
        .maybeSingle();
    const f = (data as { floor_price_eth?: string | number | null } | null)?.floor_price_eth;
    const n = f != null ? Number(f) : 0;
    return n > 0 ? n : null;
}

/** Settle any of these open calls that resolveCall says are done. Guarded on
 *  status='open' so concurrent settles are idempotent. */
async function settleOpen(rows: CallRow[]): Promise<Map<number, CallStatus>> {
    const open = rows.filter((r) => r.status === 'open');
    if (open.length === 0) return new Map();
    const db = getSupabaseService();
    const now = Date.now();
    const floors = new Map<string, number | null>();
    for (const slug of new Set(open.map((r) => r.project_id))) {
        floors.set(slug, await floorOf(slug));
    }
    const settled = new Map<number, CallStatus>();
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
        if (!up.error) settled.set(r.id, verdict);
    }
    return settled;
}

function toOut(r: CallRow, handles: Map<string, string | null>, settled: Map<number, CallStatus>): CallOut {
    const status = settled.get(r.id) ?? r.status;
    return {
        id: r.id,
        address: r.user_address,
        handle: handles.get(r.user_address) ?? null,
        project_id: r.project_id,
        claim_type: r.claim_type,
        target_eth: Number(r.target_eth),
        window_end: r.window_end,
        floor_at_call: r.floor_at_call != null ? Number(r.floor_at_call) : null,
        status,
        resolved_at: r.resolved_at,
        floor_at_resolve: r.floor_at_resolve != null ? Number(r.floor_at_resolve) : null,
        created_at: r.created_at,
    };
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const project = url.searchParams.get('project')?.toLowerCase() ?? null;
    const user = url.searchParams.get('user')?.toLowerCase() ?? null;
    if (!project && !user) return badRequest('Pass ?project= or ?user=');
    if (project && !getProject(project)) return badRequest('Unknown project');
    if (user && !ADDRESS_RE.test(user)) return badRequest('Bad address');
    try {
        const db = getSupabaseService();
        let q = db.from('calls').select('*').order('created_at', { ascending: false }).limit(LIST_LIMIT);
        if (project) q = q.eq('project_id', project);
        if (user) q = q.eq('user_address', user);
        const res = await q;
        if (res.error) return serverError(res.error.message);
        const rows = (res.data ?? []) as CallRow[];

        // Resolve-on-read — the ledger is never visibly stale.
        const settled = await settleOpen(rows);

        // Handles for display.
        const addrs = [...new Set(rows.map((r) => r.user_address))];
        const handles = new Map<string, string | null>();
        if (addrs.length) {
            const hr = await db.from('users').select('address, handle').in('address', addrs);
            for (const u of (hr.data ?? []) as { address: string; handle: string | null }[]) {
                handles.set(u.address.toLowerCase(), u.handle);
            }
        }

        const out: CallsResponse = { calls: rows.map((r) => toOut(r, handles, settled)) };
        if (user) {
            const rec = await db
                .from('calls')
                .select('status')
                .eq('user_address', user);
            /* This read runs AFTER settleOpen wrote, so statuses are current. */
            const all = (rec.data ?? []) as { status: CallStatus }[];
            out.record = {
                crowned: all.filter((r) => r.status === 'crowned').length,
                rekt: all.filter((r) => r.status === 'rekt').length,
                open: all.filter((r) => r.status === 'open').length,
            };
        }
        return NextResponse.json(out);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}

export const POST = requireAuth(async (req, _ctx, address) => {
    let body: { project?: string; claim_type?: string; target_eth?: number; window?: string };
    try {
        body = (await req.json()) as typeof body;
    } catch {
        return badRequest('Bad body');
    }
    const slug = body.project?.toLowerCase() ?? '';
    if (!getProject(slug)) return badRequest('Unknown project');
    const claim = body.claim_type as CallClaim;
    if (claim !== 'floor_gte' && claim !== 'floor_lte') return badRequest('Bad claim');
    const target = Number(body.target_eth);
    if (!Number.isFinite(target) || target <= 0 || target > 100000) return badRequest('Target out of range');
    const win = CALL_WINDOWS.find((w) => w.key === body.window);
    if (!win) return badRequest('Bad window');

    try {
        const db = getSupabaseService();
        const wallet = address.toLowerCase();

        // No free crowns: a claim that's already true can't be posted.
        const floorNow = await floorOf(slug);
        if (claimMet(claim, target, floorNow)) {
            return badRequest('Already true — call something that has to happen');
        }

        // Spam bound: max open calls per wallet per project.
        const openCount = await db
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_address', wallet)
            .eq('project_id', slug)
            .eq('status', 'open');
        if ((openCount.count ?? 0) >= MAX_OPEN_PER_PROJECT) {
            return badRequest(`Open-call limit: ${MAX_OPEN_PER_PROJECT} per project`);
        }

        const nowIso = new Date().toISOString();
        const ins = await db
            .from('calls')
            .insert({
                user_address: wallet,
                project_id: slug,
                claim_type: claim,
                target_eth: target,
                window_end: new Date(Date.now() + win.ms).toISOString(),
                floor_at_call: floorNow,
                status: 'open',
                created_at: nowIso,
            } as never)
            .select('id')
            .single();
        if (ins.error) return serverError(ins.error.message);
        return NextResponse.json({ ok: true, id: (ins.data as { id: number }).id });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
