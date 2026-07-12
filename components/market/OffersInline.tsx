'use client';

/*
 * OffersInline — the read-only offers ledger for the +More ▸ Offers tabs
 * (Output page and Project page). Attributes-box presentation (dotted
 * more-box-card), the same row grammar as the OffersPanel sheet. Browsing
 * lives here; ACTING (accept / decline / counter / cancel) lives in the
 * offers panel the ✦ pill opens — one place for money buttons.
 */

import { useEffect, useState } from 'react';
import type { MarketOfferRow } from '../../lib/market/orderTypes';

const VS15 = '︎';

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function expiresIn(endTime: number | null): string {
    if (!endTime) return '';
    const s = endTime - Math.floor(Date.now() / 1000);
    if (s <= 0) return 'expired';
    if (s < 3600) return `in ${Math.max(1, Math.floor(s / 60))}m`;
    if (s < 86400) return `in ${Math.floor(s / 3600)}h`;
    return `in ${Math.floor(s / 86400)}d`;
}

export default function OffersInline({ slug, id, query }: { slug: string; id?: number; query?: string }) {
    const [offers, setOffers] = useState<MarketOfferRow[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            const url = id != null
                ? `/api/output/${slug}-${id}/market`
                : `/api/market/orders?project=${encodeURIComponent(slug)}&all=1`;
            fetch(url, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setOffers((d.offers as MarketOfferRow[]) ?? []); })
                .catch(() => { if (!cancelled) setOffers([]); });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [slug, id]);

    // Filter by the beside-pills search — bidder, token, scope, trait, price.
    const q = (query ?? '').trim().toLowerCase();
    const shown = offers && q
        ? offers.filter((o) => {
            const hay = `${o.bidder_handle ?? ''} ${o.bidder_address} ${o.token_id ?? ''} ${o.scope} ${o.criteria?.category ?? ''} ${o.criteria?.value ?? ''} ${o.price_eth}`.toLowerCase();
            return hay.includes(q);
        })
        : offers;

    return (
        <div className="more-box-wrap">
            <div className="more-box-card">
                {offers == null ? (
                    <div className="mk-story-loading">Reading the book…</div>
                ) : offers.length === 0 ? (
                    <div className="mk-story-loading">No open offers.</div>
                ) : shown!.length === 0 ? (
                    <div className="mk-story-loading">No offers match your search.</div>
                ) : (
                    shown!.map((o) => {
                        const target = o.scope === 'collection'
                            ? 'ANY PIECE'
                            : o.scope === 'trait'
                                ? `TRAIT · ${o.criteria?.category ?? ''}: ${o.criteria?.value ?? ''}`
                                : `#${o.token_id}`;
                        const href = o.scope === 'item' && o.token_id != null
                            ? `/art/${slug}/${o.token_id}?offers=1`
                            : undefined;
                        const row = (
                            <>
                                <div className="cart-item-meta">
                                    <div className="cart-item-name">
                                        {`✦${VS15}`} {o.bidder_handle ? `@${o.bidder_handle}` : shortAddr(o.bidder_address)}
                                        <span className="mk-scope-tag">{target}</span>
                                        {o.takeover_id && <span className="mk-takeover-tag">{`⚑${VS15}`} TAKEOVER</span>}
                                    </div>
                                    <div className="cart-item-artist">expires {expiresIn(o.end_time)}</div>
                                </div>
                                <div className="cart-item-price">
                                    {Number(o.price_eth).toFixed(3)} {o.currency === 'WETH' ? 'WETH' : 'ETH'}
                                </div>
                            </>
                        );
                        return href ? (
                            <a className="cart-item-row mk-picker-row" key={o.id} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                                {row}
                            </a>
                        ) : (
                            <div className="cart-item-row" key={o.id}>{row}</div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
