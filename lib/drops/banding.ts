/*
 * lib/drops/banding.ts — the standing snapshot + the bands.
 *
 * The published ladder (content/docs/fair-draw/fair-play.md): pieces you
 * hold on PD first, then lifetime spend, then tenure. Standing is computed
 * from data as it stood BEFORE the drop opened — "you enter as whoever you
 * already were" — and nothing about entry arrival time may touch it.
 *
 * THE CUTS (Brendon's call, 2026-08-03): RELATIVE, PER DROP — rank the
 * drop's own entrants by standing; top 20% = band 0, next 40% = band 1, the
 * rest = band 2. Self-calibrating at any population, and the boundaries are
 * unpublished by nature: they move with every room. The policy (the ladder)
 * is public; these numbers are not, and are not printed anywhere user-facing.
 *
 * Everything here is deterministic. Ties break on the wallet address —
 * a fixed, neutral key — NEVER on arrival order or row ids, so two entrants
 * with identical standing land identically no matter when they tapped.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Band shares, in ladder order; the remainder is the last band. */
export const BAND_SHARES = [0.2, 0.4] as const;

export interface Standing {
    wallet: `0x${string}`;
    /** Pieces collected AND still held at the snapshot instant. */
    held: number;
    /** Lifetime ETH spent on PD before the snapshot instant. */
    spent: number;
    /** Days on PD before the snapshot instant (0 for no account). */
    tenureDays: number;
}

/** Ladder order: held desc → spent desc → tenure desc → wallet asc (the
 *  neutral tie-break). Returns negative when a outranks b. */
export function compareStanding(a: Standing, b: Standing): number {
    if (a.held !== b.held) return b.held - a.held;
    if (a.spent !== b.spent) return b.spent - a.spent;
    if (a.tenureDays !== b.tenureDays) return b.tenureDays - a.tenureDays;
    return a.wallet < b.wallet ? -1 : a.wallet > b.wallet ? 1 : 0;
}

/** Standing for a set of wallets as the world stood at `asOf` (the drop's
 *  window-open instant). Reads holdings, priced buys and account age; all
 *  three reads are cut off at the snapshot instant. */
export async function snapshotStanding(
    db: SupabaseClient,
    wallets: readonly `0x${string}`[],
    asOf: Date,
): Promise<Map<string, Standing>> {
    const lower = wallets.map((w) => w.toLowerCase() as `0x${string}`);
    const asOfEpoch = Math.floor(asOf.getTime() / 1000);

    const [held, buys, accounts] = await Promise.all([
        db.from('holders')
            .select('owner_address')
            .in('owner_address', lower)
            .lt('acquired_at', asOf.toISOString()),
        db.from('events')
            .select('to_address, price_eth')
            .in('to_address', lower)
            .not('price_eth', 'is', null)
            .lt('timestamp', asOfEpoch),
        db.from('users')
            .select('address, created_at')
            .in('address', lower)
            .lt('created_at', asOf.toISOString()),
    ]);
    if (held.error) throw held.error;
    if (buys.error) throw buys.error;
    if (accounts.error) throw accounts.error;

    const out = new Map<string, Standing>();
    for (const w of lower) out.set(w, { wallet: w, held: 0, spent: 0, tenureDays: 0 });
    for (const row of held.data ?? []) {
        const s = out.get(row.owner_address);
        if (s) s.held += 1;
    }
    for (const row of buys.data ?? []) {
        const s = out.get(row.to_address);
        if (s) s.spent += Number(row.price_eth ?? 0);
    }
    for (const row of accounts.data ?? []) {
        const s = out.get(row.address);
        if (s) {
            const days = (asOf.getTime() - new Date(row.created_at).getTime()) / 86_400_000;
            s.tenureDays = Math.max(0, Math.floor(days));
        }
    }
    return out;
}

/** The relative cuts: rank the room, slice it 20 / 40 / 40. Input order
 *  carries no weight — the sort owns everything. Returns wallet → band. */
export function assignBands(standings: readonly Standing[]): Map<string, number> {
    const ranked = [...standings].sort(compareStanding);
    const n = ranked.length;
    const bands = new Map<string, number>();
    let start = 0;
    BAND_SHARES.forEach((share, i) => {
        const size = Math.ceil(n * share);
        for (let k = start; k < Math.min(start + size, n); ++k) {
            bands.set(ranked[k]!.wallet, i);
        }
        start += size;
    });
    for (let k = start; k < n; ++k) bands.set(ranked[k]!.wallet, BAND_SHARES.length);
    return bands;
}
