// THE VAULT v2 — one profile's public vault walls + the money facts the stats
// block runs on (Brendon, 2026-07-27: "TONS of value-add info given these are
// that person's grail pieces").
//
// Vaults live in the owner's PRIVATE settings envelope (the albums mechanics,
// reused verbatim) — this route lifts ONLY the `vaults` key out of it with the
// service client, so a visitor can see the walls without the envelope ever
// going public.
//
// Facts are returned for the wallet's WHOLE holdings set (not just vaulted
// keys), so the owner's panel can price a vault instantly while composing it —
// no refetch per edit:
//   pieces: per held piece — acquisition price (latest MINT/sale event priced
//           to this wallet; null = untraced) and the holders acquired_at.
//   floors: per held project — the live floor_price_eth.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getSupabaseService, type AlbumRecord } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/* Same shape-check as lib/pins/vaultStore.sanitizeVaults — inlined so the
   server route never imports the client store (userState and friends). */
function sanitizeVaults(parsed: unknown): AlbumRecord[] {
    if (!Array.isArray(parsed)) return [];
    const out: AlbumRecord[] = [];
    for (const a of parsed) {
        if (!a || typeof a !== 'object') continue;
        const r = a as Partial<AlbumRecord>;
        if (typeof r.id !== 'string') continue;
        out.push({
            id: r.id,
            name: typeof r.name === 'string' ? r.name : '',
            keys: Array.isArray(r.keys)
                ? r.keys.filter((k): k is string => typeof k === 'string' && k.includes(':'))
                : [],
            created_at: typeof r.created_at === 'number' ? r.created_at : 0,
            ...(typeof r.cover === 'string' && r.cover.includes(':') ? { cover: r.cover } : {}),
        });
    }
    return out;
}

export interface VaultPieceFact {
    /** ETH paid to acquire (latest priced event to this wallet), null = untraced. */
    paid_eth: number | null;
    /** holders.acquired_at (ISO) — when the current tenure started. */
    acquired_at: string | null;
}

export interface VaultsResponse {
    address: string;
    vaults: AlbumRecord[];
    /** `${slug}:${id}` → facts, for every piece the wallet holds. */
    pieces: Record<string, VaultPieceFact>;
    /** slug → live floor in ETH (null = no floor). */
    floors: Record<string, number | null>;
}

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ address: string }> },
): Promise<NextResponse> {
    const params = await props.params;
    const address = params.address.toLowerCase();
    if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

    try {
        const db = getSupabaseService();

        const [userRes, heldRes, eventsRes] = await Promise.all([
            db.from('users').select('vaults:settings->vaults').eq('address', address).maybeSingle(),
            db.from('holders').select('project_id, token_id, acquired_at').eq('owner_address', address),
            db
                .from('events')
                .select('project_id, token_id, price_eth, timestamp')
                .eq('to_address', address)
                .not('price_eth', 'is', null)
                .order('timestamp', { ascending: false })
                .limit(1000),
        ]);
        if (heldRes.error) return serverError(heldRes.error.message);

        const vaults = sanitizeVaults((userRes.data as { vaults?: unknown } | null)?.vaults);

        const held = (heldRes.data ?? []) as {
            project_id: string;
            token_id: string | number;
            acquired_at: string | null;
        }[];

        // Latest priced acquisition per piece — events arrive newest-first, so
        // the first hit per key wins.
        const paidByKey = new Map<string, number>();
        for (const e of (eventsRes.data ?? []) as {
            project_id: string;
            token_id: string | number | null;
            price_eth: string | number | null;
        }[]) {
            if (e.token_id == null || e.price_eth == null) continue;
            const k = `${e.project_id}:${Number(e.token_id)}`;
            if (!paidByKey.has(k)) paidByKey.set(k, Number(e.price_eth));
        }

        const pieces: Record<string, VaultPieceFact> = {};
        const slugs = new Set<string>();
        for (const h of held) {
            const k = `${h.project_id}:${Number(h.token_id)}`;
            slugs.add(h.project_id);
            pieces[k] = {
                paid_eth: paidByKey.get(k) ?? null,
                acquired_at: h.acquired_at ?? null,
            };
        }

        const floors: Record<string, number | null> = {};
        if (slugs.size > 0) {
            const { data: projRows } = await db
                .from('projects')
                .select('id, floor_price_eth')
                .in('id', [...slugs]);
            for (const p of (projRows ?? []) as { id: string; floor_price_eth: string | number | null }[]) {
                const f = p.floor_price_eth != null ? Number(p.floor_price_eth) : null;
                floors[p.id] = f != null && f > 0 ? f : null;
            }
        }

        const response: VaultsResponse = { address, vaults, pieces, floors };
        return NextResponse.json(response);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
