'use client';

/*
 * ProfileOffersPanel — the profile +More ▸ Offers tab (Brendon, 2026-09-08:
 * "offers tab under user profile doesn't work, I have offers out there and
 * it shows nothing"). The tab previously always rendered a fixed "No offers
 * yet" prompt — the wallet-level view was never built (see the removed
 * comment in ProfilePageBody, dated 2026-08-01). This is that view.
 *
 * Two lists, same OffersInline row grammar (Attributes-box card, cart-item
 * rows) adapted for CROSS-PROJECT rows — each row also carries its project
 * name since, unlike OffersInline, this isn't scoped to one project's book:
 *   • Made     — open offers this wallet placed, any project.
 *   • Received — open offers targeting a piece this wallet actually holds
 *     (item-scope on a held token; collection/trait resolved server-side).
 */

import { useEffect, useState } from 'react';
import type { MarketOfferRow } from '../../lib/market/orderTypes';
import { getProject } from '../../lib/project/registry';

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

function OfferRow({ o, mode }: { o: MarketOfferRow; mode: 'made' | 'received' }) {
    const proj = getProject(o.project_id);
    const projName = proj?.displayName ?? `@${o.project_id}`;
    const target = o.scope === 'collection'
        ? 'ANY PIECE'
        : o.scope === 'trait'
            ? `TRAIT · ${o.criteria?.category ?? ''}: ${o.criteria?.value ?? ''}`
            : `#${o.token_id}`;
    const href = o.scope === 'item' && o.token_id != null
        ? `/art/${o.project_id}/${o.token_id}?offers=1`
        : `/art/${o.project_id}`;
    const row = (
        <>
            <div className="cart-item-meta">
                <div className="cart-item-name">
                    {`✶${VS15}`} {projName}
                    <span className="mk-scope-tag">{target}</span>
                    {o.takeover_id && <span className="mk-takeover-tag">{`⚑${VS15}`} TAKEOVER</span>}
                </div>
                <div className="cart-item-artist">
                    {mode === 'made'
                        ? `expires ${expiresIn(o.end_time)}`
                        : `from ${o.bidder_handle ? `@${o.bidder_handle}` : shortAddr(o.bidder_address)} · expires ${expiresIn(o.end_time)}`}
                </div>
            </div>
            <div className="cart-item-price">
                {Number(o.price_eth).toFixed(3)} {o.currency === 'WETH' ? 'WETH' : 'ETH'}
            </div>
        </>
    );
    return (
        <a className="cart-item-row mk-picker-row" href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
            {row}
        </a>
    );
}

export default function ProfileOffersPanel({ address }: { address: string }) {
    const [made, setMade] = useState<MarketOfferRow[] | null>(null);
    const [received, setReceived] = useState<MarketOfferRow[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch(`/api/market/orders?wallet=${encodeURIComponent(address)}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (cancelled || !d) return;
                    setMade((d.made as MarketOfferRow[]) ?? []);
                    setReceived((d.received as MarketOfferRow[]) ?? []);
                })
                .catch(() => { if (!cancelled) { setMade([]); setReceived([]); } });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [address]);

    const loading = made == null || received == null;

    return (
        <section className="starred-list" aria-label="Offers">
            <div className="more-box-wrap">
                <div className="ach-summary-stat" style={{ marginBottom: 6 }}>
                    <span className="ach-summary-label">OFFERS YOU MADE</span>
                </div>
                <div className="more-box-card">
                    {loading ? (
                        <div className="mk-story-loading">Reading the book…</div>
                    ) : made!.length === 0 ? (
                        <div className="mk-story-loading">No open offers.</div>
                    ) : (
                        made!.map((o) => <OfferRow key={o.id} o={o} mode="made" />)
                    )}
                </div>
            </div>
            <div className="more-box-wrap" style={{ marginTop: 14 }}>
                <div className="ach-summary-stat" style={{ marginBottom: 6 }}>
                    <span className="ach-summary-label">OFFERS ON YOUR PIECES</span>
                </div>
                <div className="more-box-card">
                    {loading ? (
                        <div className="mk-story-loading">Reading the book…</div>
                    ) : received!.length === 0 ? (
                        <div className="mk-story-loading">No open offers.</div>
                    ) : (
                        received!.map((o) => <OfferRow key={o.id} o={o} mode="received" />)
                    )}
                </div>
            </div>
        </section>
    );
}
