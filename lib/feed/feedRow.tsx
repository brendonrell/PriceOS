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
import { useSpiteMatcher } from '../pins/spiteStore';

export interface FeedEvent {
    id: string;
    icon: string;
    time: string;
    type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
    /** The acting wallet's display name ('@handle' or short 0x…) — rendered by
     *  FeedEventRow with the Spite Book treatment when the handle is spited. */
    actorName: string;
    /** Where the actor links — their profile (`/handle`, or `/address` when no
     *  handle), or null when the acting wallet is unknown. */
    actorHref: string | null;
    /** The rest of the sentence after the actor (verb + token + price). */
    verb: ReactNode;
    timestamp: number;
    price: number;
    /* The event essentials captured for Starred Tx — long-pressing the row
       persists this so the Starred surface can re-render without the feed. */
    star: TxStar;
}

/** The standard feed sentence — actor + verb, with the Spite Book treatment
 *  on the actor (dimmed + struck when the handle is in the viewer's book).
 *  One implementation for every surface that renders a FeedEvent line. */
export function FeedActorLine({ fe }: { fe: FeedEvent }) {
    const isSpited = useSpiteMatcher();
    const cls = `f-highlight${isSpited(fe.actorName) ? ' spited' : ''}`;
    return (
        <>
            {fe.actorHref
                ? <a className={cls} href={fe.actorHref} onClick={(e) => e.stopPropagation()}>{fe.actorName}</a>
                : <span className={cls}>{fe.actorName}</span>}
            {' '}{fe.verb}
        </>
    );
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

/** Project slug out of an event's `${slug}-${id}` token_id (slugs may contain a
 *  hyphen, so split on the LAST one — mirrors feedLocalId). */
function feedSlug(tokenId: string | null): string {
    if (!tokenId) return '';
    const i = tokenId.lastIndexOf('-');
    return i >= 0 ? tokenId.slice(0, i) : tokenId;
}

export function eventToFeedEvent(e: EventRow): FeedEvent {
    const type = e.type;
    const ms = Date.parse(e.timestamp) || 0;
    const price = e.price_eth ? parseFloat(e.price_eth) : 0;
    const lid = feedLocalId(e.token_id);
    const slug = feedSlug(e.token_id);
    const toSide = type === 'MINT' || type === 'SALE';
    const handle = toSide ? e.to_handle : e.from_handle;
    const addr = toSide ? e.to_address : e.from_address;
    const actor = handle ? `@${handle}` : feedShortAddr(addr ?? null);
    const actorHref = handle ? `/${handle}` : addr ? `/${addr}` : null;
    const tokHref = slug && lid ? `/art/${slug}/${lid}` : null;
    const tok = tokHref
        ? <a className="f-highlight" href={tokHref} onClick={(e) => e.stopPropagation()}>#{lid}</a>
        : <span className="f-highlight">#{lid}</span>;
    let verb: ReactNode;
    if (type === 'MINT') verb = <>collected {tok}{price ? ` for ${e.price_eth} ETH` : ''}</>;
    else if (type === 'LIST') verb = <>listed {tok}{price ? ` for ${e.price_eth} ETH` : ''}</>;
    else if (type === 'SALE') verb = <>bought {tok}{price ? ` for ${e.price_eth} ETH` : ''}</>;
    else verb = <>transferred {tok}</>;
    return {
        id: e.id,
        icon: FEED_ICON[type] ?? '✶',
        // On-chain events carry a UTC timestamp (one base); show the time in the
        // VIEWER's local zone, like every app — no fixed Montreal clock.
        time: new Date(ms).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false,
        }),
        type,
        actorName: actor,
        actorHref,
        verb,
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
