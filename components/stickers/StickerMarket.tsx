'use client';

/*
 * StickerMarket — the SECONDARY inside the Sticker Exchange. The only place
 * sheet trading lives (besides OpenSea once PDStickers is on-chain).
 *
 * Two faces inside the store shell:
 *   SUMMARY — one row per sheet: cover + name + floor · best offer · listed ·
 *             last. Tap → the sheet's book.
 *   BOOK    — asks (price-ascending) with BUY (qty stepper + confirm card),
 *             bids (price-descending) with SELL-into (holders, confirm card)
 *             and CANCEL (own bids), plus SELL and OFFER composers (per-sheet
 *             price × qty × duration). Partial fills native.
 *
 * Sim rail today (server-side balances + the same sim ETH the art market
 * moves); the same rows carry signed 1155 orders at the PDStickers cutover.
 * Row grammar = cart rows; confirm = the centered card; progress = in-button
 * fill — all house patterns.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../lib/state/ToastContext';
import { useAuth } from '../../lib/state/AuthContext';
import { SHEETS, type SheetId, type SheetMeta } from '../../lib/stickers/catalog';
import { getOwnedIds, ownsSheet } from '../../lib/stickers/owned';
import { StickerArt } from './StickerArt';
import { DURATION_CHOICES, DEFAULT_DURATION_SEC } from '../../lib/market/chain';

const VS15 = '︎';

interface SheetSummary {
    floor: number | null;
    listed: number;
    best_offer: number | null;
    bid_qty: number;
    last: number | null;
    volume: number;
    sales: number;
}

interface BookListing {
    id: string;
    seller_address: string;
    handle: string | null;
    price_eth: number;
    qty: number;
    end_time: number | null;
}
interface BookOffer {
    id: string;
    bidder_address: string;
    handle: string | null;
    price_eth: number;
    qty: number;
    end_time: number | null;
}
interface Book {
    listings: BookListing[];
    offers: BookOffer[];
    last_sale: number | null;
    viewer: { address: string; holding: number } | null;
}

function who(handle: string | null, addr: string): string {
    return handle ? `@${handle}` : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function expiresIn(endTime: number | null): string {
    if (!endTime) return '';
    const s = endTime - Math.floor(Date.now() / 1000);
    if (s <= 0) return 'expired';
    if (s < 3600) return `in ${Math.max(1, Math.floor(s / 60))}m`;
    if (s < 86400) return `in ${Math.floor(s / 3600)}h`;
    return `in ${Math.floor(s / 86400)}d`;
}

async function post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const r = await fetch('/api/stickers/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) throw new Error(j?.error ? String(j.error) : 'Action: FAILED');
    return j;
}

/* One-time device migration: sheets bought before the market existed become
   server holdings, so they're sellable. */
function useClaimSync(signedIn: boolean) {
    useEffect(() => {
        if (!signedIn || typeof window === 'undefined') return;
        try {
            if (window.localStorage.getItem('pd_sticker_claim_sync') === '1') return;
        } catch { /* ignore */ }
        const ownedSheets = SHEETS.filter((s) => ownsSheet(s.id, getOwnedIds())).map((s) => s.id);
        if (ownedSheets.length === 0) {
            try { window.localStorage.setItem('pd_sticker_claim_sync', '1'); } catch { /* ignore */ }
            return;
        }
        post({ action: 'claim_sync', sheets: ownedSheets })
            .then(() => { try { window.localStorage.setItem('pd_sticker_claim_sync', '1'); } catch { /* ignore */ } })
            .catch(() => {});
    }, [signedIn]);
}

/* Qty stepper — the mint chooser's − n + segment, sized for market rows. */
function QtyStep({ qty, max, setQty }: { qty: number; max: number; setQty: (n: number) => void }) {
    return (
        <span className="skm-qty" role="group" aria-label="Quantity">
            <button type="button" className="skm-step" disabled={qty <= 1} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="skm-qty-val">{qty}</span>
            <button type="button" className="skm-step" disabled={qty >= max} onClick={() => setQty(Math.min(max, qty + 1))}>+</button>
        </span>
    );
}

export default function StickerMarket() {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    useClaimSync(!!siweAddress);

    const [summary, setSummary] = useState<Record<string, SheetSummary> | null>(null);
    const [openSheet, setOpenSheet] = useState<SheetId | null>(null);
    const [book, setBook] = useState<Book | null>(null);
    const [busy, setBusy] = useState(false);

    /* Composers */
    const [sellPrice, setSellPrice] = useState('');
    const [sellQty, setSellQty] = useState(1);
    const [offerPrice, setOfferPrice] = useState('');
    const [offerQty, setOfferQty] = useState(1);
    const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC);

    /* Confirm cards (money moves → confirm; Brendon 2026-07-02). */
    const [confirmBuy, setConfirmBuy] = useState<{ l: BookListing; qty: number } | null>(null);
    const [confirmSellInto, setConfirmSellInto] = useState<{ o: BookOffer; qty: number } | null>(null);

    const loadSummary = useCallback(() => {
        fetch('/api/stickers/market?summary=1', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d) setSummary((d.sheets as Record<string, SheetSummary>) ?? {}); })
            .catch(() => {});
    }, []);
    const loadBook = useCallback((sheet: SheetId) => {
        fetch(`/api/stickers/market?sheet=${encodeURIComponent(sheet)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d) setBook(d as Book); })
            .catch(() => {});
    }, []);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => {
        if (!openSheet) { setBook(null); return; }
        setBook(null);
        loadBook(openSheet);
    }, [openSheet, loadBook]);

    const refresh = useCallback(() => {
        loadSummary();
        if (openSheet) loadBook(openSheet);
    }, [loadSummary, loadBook, openSheet]);

    const run = useCallback(async (label: string, body: Record<string, unknown>) => {
        if (busy) return;
        if (!siweAddress) { showToast('Wallet: CONNECT TO TRADE'); return; }
        setBusy(true);
        try {
            await post(body);
            showToast(label);
            refresh();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Action: FAILED');
        } finally {
            setBusy(false);
        }
    }, [busy, siweAddress, showToast, refresh]);

    const meta: SheetMeta | null = openSheet ? SHEETS.find((s) => s.id === openSheet) ?? null : null;
    const holding = book?.viewer?.holding ?? 0;
    const myAddr = siweAddress?.toLowerCase() ?? null;

    /* ── SUMMARY ─────────────────────────────────────────────────────────── */
    if (!openSheet) {
        return (
            <div className="skm-wrap">
                {SHEETS.map((s) => {
                    const sum = summary?.[s.id];
                    return (
                        <div
                            className="cart-item-row skm-row"
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setOpenSheet(s.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSheet(s.id); } }}
                        >
                            <div className="cart-item-thumb skm-thumb" aria-hidden="true">
                                <StickerArt sticker={s.cover} size={30} />
                            </div>
                            <div className="cart-item-meta">
                                <div className="cart-item-name">{s.name}</div>
                                <div className="cart-item-artist">
                                    {sum?.listed ? `${sum.listed} listed` : 'none listed'}
                                    {sum?.bid_qty ? ` · ${sum.bid_qty} wanted` : ''}
                                    {sum?.sales ? ` · ${sum.sales} sold` : ''}
                                </div>
                            </div>
                            <div className="cart-item-price skm-prices">
                                <span>{sum?.floor != null ? `${sum.floor.toFixed(3)}` : '—'}</span>
                                <span className="skm-sub">{sum?.best_offer != null ? `✦${VS15}${sum.best_offer.toFixed(3)}` : `✦${VS15}—`}</span>
                            </div>
                        </div>
                    );
                })}
                <div className="ss-foot">
                    floor · {`✦${VS15}`} best offer — tap a sheet for its book · settles in sim ETH
                </div>
            </div>
        );
    }

    /* ── BOOK ────────────────────────────────────────────────────────────── */
    return (
        <div className="skm-wrap">
            <div
                className="skm-back"
                role="button"
                tabIndex={0}
                onClick={() => setOpenSheet(null)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSheet(null); } }}
            >
                {`⇠⇠${VS15}`} ALL SHEETS
            </div>
            <div className="skm-book-head">
                <span className="skm-book-title">{meta?.name ?? openSheet}</span>
                <span className="skm-book-pos">
                    {holding > 0 ? `you hold ${holding}` : 'you hold none'}
                    {book?.last_sale != null ? ` · last ${Number(book.last_sale).toFixed(3)}` : ''}
                </span>
            </div>

            {/* Asks */}
            <div className="skm-side-label">{`✹${VS15} FOR SALE`}</div>
            {book == null ? (
                <div className="mk-story-loading">Reading the book…</div>
            ) : book.listings.length === 0 ? (
                <div className="mk-story-loading">No sheets listed.</div>
            ) : (
                book.listings.map((l) => {
                    const mine = myAddr != null && l.seller_address.toLowerCase() === myAddr;
                    return (
                        <div className="cart-item-row" key={l.id}>
                            <div className="cart-item-meta">
                                <div className="cart-item-name">{who(l.handle, l.seller_address)}{mine ? ' (you)' : ''}</div>
                                <div className="cart-item-artist">×{l.qty} · expires {expiresIn(l.end_time)}</div>
                            </div>
                            <div className="cart-item-price">{Number(l.price_eth).toFixed(3)} ea</div>
                            <div className="cart-item-actions mk-offer-actions">
                                {mine ? (
                                    <button type="button" className="mk-offer-btn" disabled={busy}
                                        onClick={() => void run('Listing: CANCELLED', { action: 'cancel', listingId: l.id })}>
                                        CANCEL
                                    </button>
                                ) : (
                                    <button type="button" className="mk-offer-btn mk-offer-btn--accept" disabled={busy}
                                        onClick={() => setConfirmBuy({ l, qty: 1 })}>
                                        BUY
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Bids */}
            <div className="skm-side-label">{`✦${VS15} WANTED`}</div>
            {book == null ? null : book.offers.length === 0 ? (
                <div className="mk-story-loading">No open offers.</div>
            ) : (
                book.offers.map((o) => {
                    const mine = myAddr != null && o.bidder_address.toLowerCase() === myAddr;
                    return (
                        <div className="cart-item-row" key={o.id}>
                            <div className="cart-item-meta">
                                <div className="cart-item-name">{who(o.handle, o.bidder_address)}{mine ? ' (you)' : ''}</div>
                                <div className="cart-item-artist">wants ×{o.qty} · expires {expiresIn(o.end_time)}</div>
                            </div>
                            <div className="cart-item-price">{Number(o.price_eth).toFixed(3)} ea</div>
                            <div className="cart-item-actions mk-offer-actions">
                                {mine ? (
                                    <button type="button" className="mk-offer-btn" disabled={busy}
                                        onClick={() => void run('Offer: CANCELLED', { action: 'cancel_offer', offerId: o.id })}>
                                        CANCEL
                                    </button>
                                ) : holding > 0 ? (
                                    <button type="button" className="mk-offer-btn mk-offer-btn--accept" disabled={busy}
                                        onClick={() => setConfirmSellInto({ o, qty: 1 })}>
                                        SELL
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Composers — SELL (needs holding) + OFFER, per-sheet price × qty. */}
            <div className="skm-composers">
                {holding > 0 && (
                    <div className="skm-compose">
                        <span className="skm-compose-label">{`✹${VS15} SELL`}</span>
                        <QtyStep qty={Math.min(sellQty, holding)} max={holding} setQty={setSellQty} />
                        <span className="mk-price-wrap">
                            <input className="mk-price-input" type="text" inputMode="decimal" placeholder="0.000"
                                value={sellPrice} onChange={(e) => setSellPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                            <span className="mk-price-unit">ETH ea</span>
                        </span>
                        <button type="button" className="mk-offer-btn mk-offer-btn--accept" disabled={busy || !(parseFloat(sellPrice) > 0)}
                            onClick={() => void run(`List: LIVE · ${Math.min(sellQty, holding)} × ${parseFloat(sellPrice).toFixed(3)}`, {
                                action: 'list', sheet: openSheet, price: parseFloat(sellPrice), qty: Math.min(sellQty, holding), durationSec,
                            })}>
                            {busy ? 'WORKING…' : 'LIST'}
                        </button>
                    </div>
                )}
                <div className="skm-compose">
                    <span className="skm-compose-label">{`✦${VS15} OFFER`}</span>
                    <QtyStep qty={offerQty} max={22} setQty={setOfferQty} />
                    <span className="mk-price-wrap">
                        <input className="mk-price-input" type="text" inputMode="decimal" placeholder="0.000"
                            value={offerPrice} onChange={(e) => setOfferPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                        <span className="mk-price-unit">ETH ea</span>
                    </span>
                    <button type="button" className="mk-offer-btn mk-offer-btn--accept" disabled={busy || !(parseFloat(offerPrice) > 0)}
                        onClick={() => void run(`Offer: PLACED · ${offerQty} × ${parseFloat(offerPrice).toFixed(3)}`, {
                            action: 'offer', sheet: openSheet, price: parseFloat(offerPrice), qty: offerQty, durationSec,
                        })}>
                        {busy ? 'WORKING…' : 'OFFER'}
                    </button>
                </div>
                <div className="mk-duration-row skm-durations">
                    {DURATION_CHOICES.map((d) => (
                        <button key={d.label} type="button"
                            className={`mk-duration-pill${durationSec === d.seconds ? ' is-active' : ''}`}
                            onClick={() => setDurationSec(d.seconds)}>
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Confirm cards — the centered house card, money only. */}
            {confirmBuy && typeof document !== 'undefined' && createPortal(
                <div className="starred-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1400 }} onClick={() => setConfirmBuy(null)}>
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">
                            Buy {meta?.name ?? openSheet} sheet{confirmBuy.qty > 1 ? `s ×${confirmBuy.qty}` : ''} · {(Number(confirmBuy.l.price_eth) * confirmBuy.qty).toFixed(3)} ETH?
                        </div>
                        {confirmBuy.l.qty > 1 && (
                            <div className="skm-confirm-qty">
                                <QtyStep qty={confirmBuy.qty} max={confirmBuy.l.qty}
                                    setQty={(n) => setConfirmBuy((c) => (c ? { ...c, qty: n } : c))} />
                            </div>
                        )}
                        <div className="ms-confirm-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmBuy(null)}>Cancel</button>
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--ok"
                                onClick={() => {
                                    const c = confirmBuy;
                                    setConfirmBuy(null);
                                    if (c) void run(`Bought: ${c.qty} × ${Number(c.l.price_eth).toFixed(3)} ETH`, { action: 'buy', listingId: c.l.id, qty: c.qty });
                                }}>
                                Buy
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
            {confirmSellInto && typeof document !== 'undefined' && createPortal(
                <div className="starred-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1400 }} onClick={() => setConfirmSellInto(null)}>
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">
                            Sell {confirmSellInto.qty > 1 ? `×${confirmSellInto.qty} ` : ''}{meta?.name ?? openSheet} into the offer · {(Number(confirmSellInto.o.price_eth) * confirmSellInto.qty).toFixed(3)} ETH?
                        </div>
                        {Math.min(confirmSellInto.o.qty, holding) > 1 && (
                            <div className="skm-confirm-qty">
                                <QtyStep qty={confirmSellInto.qty} max={Math.min(confirmSellInto.o.qty, holding)}
                                    setQty={(n) => setConfirmSellInto((c) => (c ? { ...c, qty: n } : c))} />
                            </div>
                        )}
                        <div className="ms-confirm-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmSellInto(null)}>Cancel</button>
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--ok"
                                onClick={() => {
                                    const c = confirmSellInto;
                                    setConfirmSellInto(null);
                                    if (c) void run(`Sold: ${c.qty} × ${Number(c.o.price_eth).toFixed(3)} ETH`, { action: 'accept', offerId: c.o.id, qty: c.qty });
                                }}>
                                Sell
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
