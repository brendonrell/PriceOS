// PD Keychains — one wallet's public charm rack (the vaults public-read
// pattern verbatim): lifts ONLY the `keychains` + `keychainEquipped` keys out
// of the private settings envelope, plus the live streak/rank the charms
// render with (THE CHAIN IS THE STREAK · THE FINISH IS THE RANK).

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError, notFound } from '@/lib/errors';
import { getSupabaseService } from '@/lib/supabase';
import { sanitizeCharms, type CharmRecord } from '@/lib/keychains/engine';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface KeychainsResponse {
    address: string;
    charms: CharmRecord[];
    /** Equipped charm id (worn at the end of the profile tags) — null = none. */
    equipped: number | null;
    streak: number;
    rank: number;
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
        const { data: row, error } = await db
            .from('users')
            .select('price_streak, price_rank, keychains:settings->keychains, equipped:settings->keychainEquipped')
            .eq('address', address)
            .maybeSingle();
        if (error) return serverError(error.message);
        if (!row) return notFound('No account row for this address');

        const r = row as { price_streak: number; price_rank: number; keychains?: unknown; equipped?: unknown };
        const body: KeychainsResponse = {
            address,
            charms: sanitizeCharms(r.keychains),
            equipped: typeof r.equipped === 'number' ? r.equipped : null,
            streak: Number(r.price_streak) || 0,
            rank: Number(r.price_rank) || 0,
        };
        return NextResponse.json(body);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
