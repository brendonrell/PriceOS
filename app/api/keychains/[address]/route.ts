// PD Keychains — one wallet's public charm rack (the vaults public-read
// pattern verbatim): lifts ONLY the `keychains` + `keychainEquipped` keys out
// of the private settings envelope, plus the live streak/rank the charms
// render with (THE CHAIN IS THE STREAK · THE FINISH IS THE RANK).
//
// THREE HANG, NOT ONE (Brendon, 2026-07-31). `equipped` is the whole worn
// POOL — equip as many as you like in the Depanneur — and `top` is the three
// of them that actually hang off the profile tag row. With `shuffle` on the
// three are drawn fresh from the pool on every page load instead of being the
// fixed top three. A single number stored before three-at-once reads as a pool
// of one, so nobody's worn charm disappears.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError, notFound } from '@/lib/errors';
import { getSupabaseService } from '@/lib/supabase';
import { sanitizeCharms, idList, TOP_SLOTS, type CharmRecord } from '@/lib/keychains/engine';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface KeychainsResponse {
    address: string;
    charms: CharmRecord[];
    /** The worn pool — every charm the owner has equipped. */
    equipped: number[];
    /** The ones that hang, in hang order (a subset of the pool, max three). */
    top: number[];
    /** Draw the hanging three at random from the pool on every page load. */
    shuffle: boolean;
    /** The one switch: the keeper's charms are off the profile entirely, with
     *  the whole rack left exactly as it is (Brendon, 2026-08-02). */
    hidden: boolean;
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
            .select('price_streak, price_rank, keychains:settings->keychains, equipped:settings->keychainEquipped, top:settings->keychainTop, shuffle:settings->keychainShuffle, hidden:settings->keychainHidden')
            .eq('address', address)
            .maybeSingle();
        if (error) return serverError(error.message);
        if (!row) return notFound('No account row for this address');

        const r = row as {
            price_streak: number; price_rank: number;
            keychains?: unknown; equipped?: unknown; top?: unknown; shuffle?: unknown; hidden?: unknown;
        };
        const charms = sanitizeCharms(r.keychains);
        const owned = new Set(charms.map((c) => c.id));
        const equipped = idList(r.equipped).filter((id) => owned.has(id));
        /* No top chosen yet (or a lone charm from before three-at-once) — the
           first three of the pool hang, so a wearer never lands on an empty
           row after this ships. ⛔ NEVER-CHOSEN is not the same as EMPTIED
           (Brendon, 2026-07-31): once the owner has picked, an empty list is
           their choice and stands, or taking the last one out of the top just
           puts it straight back. */
        const chosen = Array.isArray(r.top);
        const stored = idList(r.top, TOP_SLOTS).filter((id) => equipped.includes(id));
        const top = (chosen ? stored : equipped.slice(0, TOP_SLOTS)).slice(0, TOP_SLOTS);

        const body: KeychainsResponse = {
            address,
            charms,
            equipped,
            top,
            shuffle: r.shuffle === true,
            hidden: r.hidden === true,
            streak: Number(r.price_streak) || 0,
            rank: Number(r.price_rank) || 0,
        };
        return NextResponse.json(body);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
