/*
 * feedRow — shared mapping from a stored ledger event (Supabase `events`,
 * surfaced as EventRow) to one rendered activity-feed row. Used by both the
 * project activity feed (per-project) and the profile activity feed
 * (per-wallet) so the two read identically. Lifted out of ProjectPageBody so
 * the profile feed isn't a second, drifting copy.
 *
 * MINT / SALE credit the recipient; LIST / XFER credit the sender. Handles
 * resolve server-side; a bare address falls back to a short 0x form.
 */

import type { ReactNode } from 'react';
import type { EventRow } from '../supabase';
import type { TxStar } from '../pins/txStarStore';

export interface FeedEvent {
    id: string;
    icon: string;
    time: string;
    type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
    detail: ReactNode;
    timestamp: number;
    price: number;
    /* The event essentials captured for Starred Tx — long-pressing the row
       persists this so the Starred surface can re-render without the feed. */
    star: TxStar;
}

export const FEED_ICON: Record<FeedEvent['type'], string> = {
    MINT: '✶', LIST: '✹', SALE: '✦', XFER: '✸',
};

function feedShortAddr(a: string | null): string {
    if (!a) return 'someone';
    return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/** Token number out of an event's `${slug}-${id}` token_id. */
function feedLocalId(tokenId: string | null): string {
    if (!tokenId) return '';
    const i = tokenId.lastIndexOf('-');
    return i >= 0 ? tokenId.slice(i + 1) : tokenId;
}

export function eventToFeedEvent(e: EventRow): FeedEvent {
    const type = e.type;
    const ms = Date.parse(e.timestamp) || 0;
    const price = e.price_eth ? parseFloat(e.price_eth) : 0;
    const lid = feedLocalId(e.token_id);
    const toSide = type === 'MINT' || type === 'SALE';
    const handle = toSide ? e.to_handle : e.from_handle;
    const addr = toSide ? e.to_address : e.from_address;
    const actor = handle ? `@${handle}` : feedShortAddr(addr ?? null);
    const tok = <span className="f-highlight">#{lid}</span>;
    let verb: ReactNode;
    if (type === 'MINT') verb = <>collected {tok}</>;
    else if (type === 'LIST') verb = <>listed {tok}{price ? ` for ${e.price_eth} ETH` : ''}</>;
    else if (type === 'SALE') verb = <>bought {tok}{price ? ` for ${e.price_eth} ETH` : ''}</>;
    else verb = <>transferred {tok}</>;
    return {
        id: e.id,
        icon: FEED_ICON[type] ?? '✶',
        time: new Date(ms).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Montreal',
        }),
        type,
        detail: <><span className="f-highlight">{actor}</span> {verb}</>,
        timestamp: ms,
        price,
        star: {
            id: e.id,
            type,
            tokenId: e.token_id,
            fromAddress: e.from_address,
            toAddress: e.to_address,
            fromHandle: e.from_handle ?? null,
            toHandle: e.to_handle ?? null,
            priceEth: e.price_eth,
            timestamp: e.timestamp,
        },
    };
}

/** Rebuild a feed event from a persisted Starred-Tx blob (the reverse of
 *  `star` above) so the Starred surface renders it identically to the feed. */
export function txStarToFeedEvent(s: TxStar): FeedEvent {
    return eventToFeedEvent({
        id: s.id,
        type: s.type,
        project_id: '',
        token_id: s.tokenId,
        from_address: s.fromAddress,
        to_address: s.toAddress,
        price_eth: s.priceEth,
        timestamp: s.timestamp,
        from_handle: s.fromHandle,
        to_handle: s.toHandle,
    } as EventRow);
}
