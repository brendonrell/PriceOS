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
import { usePdNotifs } from '../state/PdNotifsContext';
import { getProject } from '../project/registry';
import { GossipLine } from './gossip';

export interface FeedEvent {
    id: string;
    icon: string;
    time: string;
    type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
    /** THE EXCHANGE ⇌ — this XFER settled a head-to-head trade. */
    trade?: boolean;
    /** The acting wallet's display name ('@handle' or short 0x…) — rendered by
     *  FeedEventRow with the Spite Book treatment when the handle is spited. */
    actorName: string;
    /** Where the actor links — their profile (`/handle`, or `/address` when no
     *  handle), or null when the acting wallet is unknown. */
    actorHref: string | null;
    /** The rest of the sentence after the actor (verb + token + price). */
    verb: ReactNode;
    /** Optional badge rendered right after the actor's name (the social feed's
     *  ⚭ mutual / ⚯ following relationship mark — same canon glyphs as the
     *  Starred rows). Travels with the actor into the gossip line too. */
    badge?: ReactNode;
    timestamp: number;
    price: number;
    /* The event essentials captured for Starred Tx — long-pressing the row
       persists this so the Starred surface can re-render without the feed. */
    star: TxStar;
}

/** The standard feed sentence — actor + verb, with the Spite Book treatment
 *  on the actor (dimmed + struck when the handle is in the viewer's book).
 *  One implementation for every surface that renders a FeedEvent line.
 *  GOSSIP PROTOCOL reads here too: when the spell is on, the same event —
 *  same actor link, same token link, same price — is told as a rumor. */
export function FeedActorLine({ fe }: { fe: FeedEvent }) {
    const isSpited = useSpiteMatcher();
    const { notifs } = usePdNotifs();
    const cls = `f-highlight${isSpited(fe.actorName) ? ' spited' : ''}`;
    const actorLink = fe.actorHref
        ? <a className={cls} href={fe.actorHref} onClick={(e) => e.stopPropagation()}>{fe.actorName}</a>
        : <span className={cls}>{fe.actorName}</span>;
    const actor = fe.badge ? <>{actorLink}{fe.badge}</> : actorLink;
    if (notifs.spell_gossip) return <GossipLine fe={fe} actor={actor} />;
    return <>{actor}{' '}{fe.verb}</>;
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

/** Standard mapping — bare #id token links (the per-project + per-profile
 *  feeds, where context names the project). Unary so `.map(eventToFeedEvent)`
 *  keeps working point-free. */
export function eventToFeedEvent(e: EventRow): FeedEvent {
    return buildFeedEvent(e, false, false);
}

/** Cross-project mapping — the token link names the project ("Prisms #12"),
 *  for feeds that span every project (the social feed ☻), where a bare #id
 *  is ambiguous. The price leaves the sentence too — the social feed carries
 *  it in the type column (◊ rail), so sentences stay short and wrap less. */
export function eventToNamedFeedEvent(e: EventRow): FeedEvent {
    return buildFeedEvent(e, true, true);
}

/** Profile-feed mapping (Brendon, 2026-07-26) — a profile's feed spans every
 *  project, so a bare "collected #7" doesn't say WHICH project. This names it
 *  ("collected Prisms #7") but KEEPS the price in the sentence: the profile
 *  feed has no type column to carry it, unlike the social feed. */
export function eventToProjectNamedFeedEvent(e: EventRow): FeedEvent {
    return buildFeedEvent(e, true, false);
}

function buildFeedEvent(e: EventRow, withProject: boolean, dropPrice: boolean): FeedEvent {
    /* withProject = name the project in the token link. dropPrice = the social
       feed's presentation, where the price rides the type column (◊ rail)
       instead of the verb. */
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
    const projName = withProject && slug ? (getProject(slug)?.displayName ?? null) : null;
    const tokLabel = projName ? `${projName} #${lid}` : `#${lid}`;
    const tok = tokHref
        ? <a className="f-highlight" href={tokHref} onClick={(e) => e.stopPropagation()}>{tokLabel}</a>
        : <span className="f-highlight">{tokLabel}</span>;
    const tail = dropPrice ? '' : price ? ` for ${e.price_eth} ETH` : '';
    let verb: ReactNode;
    if (type === 'MINT') verb = <>collected {tok}{tail}</>;
    else if (type === 'LIST') verb = <>listed {tok}{tail}</>;
    else if (type === 'SALE') verb = <>bought {tok}{tail}</>;
    else if (e.trade) verb = <>traded {tok}{!dropPrice && price ? ` (◊${e.price_eth} kicker)` : ''}</>;
    else verb = <>transferred {tok}</>;
    return {
        id: e.id,
        icon: e.trade ? '⇌' : (FEED_ICON[type] ?? '✶'),
        trade: e.trade === true || undefined,
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
