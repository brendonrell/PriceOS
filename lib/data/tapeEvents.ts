/*
 * Tape event mapping — the live feed's render shapes.
 *
 * The Tape is REAL: useTapeFeed pulls /api/feed (the global events ledger)
 * and maps rows through eventToTapeItem below; Ticker + TapeBox + PingsBox
 * all render that same stream. The sim-era mock WALLETS/EVENTS lists and
 * tapeFeedItems() that used to live here were dead code (zero callers) —
 * deleted 2026-07-06 in the tech-debt sweep.
 *
 * Row weights by type (render classes, sim parity):
 *   buy | list | anoint | mint  -> standard weight
 *   offer | ignored | cancel    -> soft (non-consummated)
 *   mint                        -> bold class
 */

import type { EventRow as DbEventRow } from '../supabase';

export type TapeEventType =
    | 'buy'
    | 'list'
    | 'anoint'
    | 'mint'
    | 'offer'
    | 'ignored'
    | 'cancel';


export interface TapeFeedItem {
    type: TapeEventType;
    name: string | null;
    sigil: string;
    verb: string;
    coll: string;
    id: number;
    price: string | null;
    /** Collect gag — render as "{PROJECT} started following {name}" instead of
     *  the normal line (Brendon, 2026-06-22). */
    follow?: boolean;
    /** Dump gag — render as "{PROJECT} unfollowed {name}" when the seller
     *  zeroed out their bag of this project (Brendon, 2026-06-22). */
    unfollow?: boolean;
    /** FACTIONS war line (enlisted viewers only) — renders as the line with a
     *  faction-coloured leading glyph instead of the who/what/which shape. */
    war?: { line: string; glyph: string; hue: string };
}

const TAPE_TYPE: Record<DbEventRow['type'], TapeEventType> = {
    MINT: 'mint', LIST: 'list', SALE: 'buy', XFER: 'buy',
};
const TAPE_VERB: Record<DbEventRow['type'], string> = {
    MINT: 'minted', LIST: 'listed', SALE: 'bought', XFER: 'transferred',
};

function tapeShortAddr(a: string | null): string {
    if (!a) return 'someone';
    return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function eventToTapeItem(e: DbEventRow): TapeFeedItem {
    /* Dump gag wins: a SALE that zeroed the seller's bag reads as the project
       unfollowing the SELLER. Otherwise a collect makes the project follow the
       buyer — ~half of mints render as that, deterministic per event id. */
    const unfollow = e.type === 'SALE' && !!e.from_zeroed;
    const follow =
        !unfollow &&
        e.type === 'MINT' &&
        Array.from(e.id).reduce((s, c) => s + c.charCodeAt(0), 0) % 2 === 0;
    /* Unfollow names the seller (from side); follow + normal lines name the
       to-side for MINT/SALE, else the from side. */
    const useFrom = unfollow || !(e.type === 'MINT' || e.type === 'SALE');
    const handle = useFrom ? e.from_handle : e.to_handle;
    const addr = useFrom ? e.from_address : e.to_address;
    const tid = e.token_id ? e.token_id.slice(e.token_id.lastIndexOf('-') + 1) : '0';
    return {
        type: TAPE_TYPE[e.type] ?? 'mint',
        name: handle ? `@${handle}` : tapeShortAddr(addr ?? null),
        sigil: '',
        verb: TAPE_VERB[e.type] ?? 'updated',
        coll: e.project_id,
        id: Number(tid) || 0,
        price: e.price_eth ? `${e.price_eth} ETH` : null,
        follow,
        unfollow,
    };
}

/** Glyph used in the expanded body list per sim 6028-6035. */
export function tapeBodyIcon(type: TapeEventType): string {
    switch (type) {
        case 'buy':     return '✦';
        case 'list':    return '❒';
        case 'mint':    return '✺';
        case 'offer':   return '◇';
        case 'anoint':  return '☆';
        case 'cancel':  return '⊘';
        case 'ignored': return '⋯';
        default:        return '⏥';
    }
}
