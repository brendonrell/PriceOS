'use client';

/*
 * ExchangeModal — THE EXCHANGE ⇌, the head-to-head trade window
 * (ClickUp 86ba0apqr: RuneScape-style bilateral trading, portrait-first).
 *
 * Shell = the Cart panel, verbatim (cart-panel-wrap/box + the two-stage
 * mounted/active open/close — the MarketSheets precedent, Rule #0). Faces:
 *
 *   COMPOSE — your offer on top, what you ask beneath (the two-panel trade
 *             window stacked for portrait): square art slots + an ETH line
 *             per side, add-pieces picker per side, duration, SEND.
 *   TRADE   — one existing trade seen from the viewer's seat (YOU GIVE /
 *             YOU RECEIVE). Counterparty: ACCEPT (confirm card — money
 *             moment) / COUNTER (flips into compose, roles reversed) /
 *             DECLINE. Proposer: CANCEL. Settled trades show the stamp.
 *
 * All settlement rides lib/market/tradeClient (sim RPC or Seaport fill —
 * decided by the pieces' projects, never here).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useExchange } from '../../lib/state/ExchangeContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { getWalletClientOnDemand } from '../../lib/wallet/walletClientOnDemand';
import { getProject } from '../../lib/project/registry';
import { formatEth } from '../../lib/format/eth';
import { DURATION_CHOICES, DEFAULT_DURATION_SEC } from '../../lib/market/chain';
import {
    acceptTrade, cancelTrade, counterTrade, declineTrade, fetchTrade, fetchTrades, proposeTrade,
} from '../../lib/market/tradeClient';
import { TRADE_MAX_ITEMS_PER_SIDE, type TradeItem, type TradeRow } from '../../lib/market/tradeTypes';
import BenchArt from '../bench/BenchArt';

const VS15 = '︎';
const UNMOUNT_DELAY_MS = 240;

function shortAddr(addr: string | null | undefined): string {
    if (!addr) return '—';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function pieceName(item: TradeItem): string {
    const p = getProject(item.project_id);
    return `${p?.displayName ?? item.project_id} #${item.token_id}`;
}

function expiresIn(endTime: number | null): string {
    if (!endTime) return '';
    const s = endTime - Math.floor(Date.now() / 1000);
    if (s <= 0) return 'expired';
    if (s < 3600) return `in ${Math.max(1, Math.floor(s / 60))}m`;
    if (s < 86400) return `in ${Math.floor(s / 3600)}h`;
    return `in ${Math.floor(s / 86400)}d`;
}

/* Two-stage mounted/active — CartPanel's open/close, verbatim. */
function useTwoStage(open: boolean): { mounted: boolean; active: boolean } {
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);
    const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (open) {
            if (unmountTimer.current) { clearTimeout(unmountTimer.current); unmountTimer.current = null; }
            setMounted(true);
            const raf = requestAnimationFrame(() => setActive(true));
            return () => cancelAnimationFrame(raf);
        }
        setActive(false);
        unmountTimer.current = setTimeout(() => { setMounted(false); unmountTimer.current = null; }, UNMOUNT_DELAY_MS);
        return () => {
            if (unmountTimer.current) { clearTimeout(unmountTimer.current); unmountTimer.current = null; }
        };
    }, [open]);
    return { mounted, active };
}

/* ── The offer grid — square art slots + the ETH chip ────────────────────── */
function OfferGrid({
    items, eth, editable, onRemove, onAdd,
}: {
    items: TradeItem[];
    eth: string;
    editable?: boolean;
    onRemove?: (item: TradeItem) => void;
    onAdd?: () => void;
}) {
    const ethNum = Number(eth);
    return (
        <div className="exch-grid">
            {items.map((it) => (
                <div
                    key={`${it.project_id}:${it.token_id}`}
                    className={`exch-slot${editable ? ' exch-slot--editable' : ''}`}
                    role={editable ? 'button' : undefined}
                    tabIndex={editable ? 0 : undefined}
                    title={editable ? `Remove ${pieceName(it)}` : pieceName(it)}
                    onClick={editable && onRemove ? () => onRemove(it) : undefined}
                    onKeyDown={editable && onRemove ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRemove(it); } } : undefined}
                >
                    <BenchArt slug={it.project_id} id={Number(it.token_id)} className="exch-slot-art" />
                    <span className="exch-slot-id">#{it.token_id}</span>
                    {editable && <span className="exch-slot-x" aria-hidden="true">{`×${VS15}`}</span>}
                </div>
            ))}
            {Number.isFinite(ethNum) && ethNum > 0 && (
                <div className="exch-slot exch-slot--eth" title={`${formatEth(ethNum)} ETH`}>
                    <span className="exch-eth-mark">{`◊${VS15}`}</span>
                    <span className="exch-slot-id">{formatEth(ethNum)} ETH</span>
                </div>
            )}
            {editable && items.length < TRADE_MAX_ITEMS_PER_SIDE && (
                <div
                    className="exch-slot exch-slot--add"
                    role="button"
                    tabIndex={0}
                    title="Add pieces"
                    onClick={onAdd}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd?.(); } }}
                >
                    <span className="exch-add-mark">+</span>
                </div>
            )}
            {items.length === 0 && !(ethNum > 0) && !editable && (
                <div className="exch-empty">NOTHING</div>
            )}
        </div>
    );
}

/* ── Piece picker — one wallet's holdings, multi-select ──────────────────── */
interface Holding { slug: string; token_id: number }

function PickerFace({
    address, label, chosen, onToggle, onDone, onClose,
}: {
    address: string;
    label: string;
    chosen: TradeItem[];
    onToggle: (item: TradeItem) => void;
    onDone: () => void;
    onClose: () => void;
}) {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/user/${address}/outputs`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled) setHoldings(((d?.holdings ?? []) as Holding[])); })
            .catch(() => { if (!cancelled) setHoldings([]); });
        return () => { cancelled = true; };
    }, [address]);

    const chosenKeys = useMemo(() => new Set(chosen.map((c) => `${c.project_id}:${c.token_id}`)), [chosen]);

    return (
        <>
            <div className="cart-panel-header">
                <span className="cart-panel-title">{`⇌${VS15} ${label}`}</span>
                <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={onClose} title="Close">{`×${VS15}`}</span>
            </div>
            <div className="cart-items-list">
                {holdings == null ? (
                    <div className="cart-empty-state">Reading the collection…</div>
                ) : holdings.length === 0 ? (
                    <div className="cart-empty-state">Nothing collected yet.</div>
                ) : (
                    holdings.map((h) => {
                        const item: TradeItem = { project_id: h.slug, token_id: String(h.token_id) };
                        const key = `${h.slug}:${h.token_id}`;
                        const picked = chosenKeys.has(key);
                        const full = !picked && chosen.length >= TRADE_MAX_ITEMS_PER_SIDE;
                        return (
                            <div
                                key={key}
                                className={`cart-item-row exch-pick-row${picked ? ' is-picked' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => { if (!full) onToggle(item); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!full) onToggle(item); } }}
                            >
                                <div className="cart-item-thumb cart-art-thumb" aria-hidden="true">
                                    <BenchArt slug={h.slug} id={h.token_id} />
                                </div>
                                <div className="cart-item-meta">
                                    <div className="cart-item-name">{pieceName(item)}</div>
                                </div>
                                <span className="exch-pick-badge" aria-hidden="true">{picked ? `▣${VS15}` : `❐${VS15}`}</span>
                            </div>
                        );
                    })
                )}
            </div>
            <button type="button" className="cart-panel-buy-all" onClick={onDone}>
                DONE · {chosen.length} PICKED
            </button>
        </>
    );
}

/* ── Compose — build + send a proposal (also the counter editor) ─────────── */
function ComposeFace({
    me, counterparty, counterpartyHandle, seed, counterOf, prefill, onClose,
}: {
    me: string;
    counterparty: string;
    counterpartyHandle: string | null;
    seed?: TradeItem;
    /** Countering this trade id — SEND supersedes it. */
    counterOf?: string;
    prefill?: { give: TradeItem[]; get: TradeItem[]; giveEth: string; getEth: string };
    onClose: () => void;
}) {
    const { showToast } = useToast();
    const [give, setGive] = useState<TradeItem[]>(prefill?.give ?? []);
    const [get, setGet] = useState<TradeItem[]>(prefill?.get ?? (seed ? [seed] : []));
    const [giveEth, setGiveEth] = useState(prefill?.giveEth ?? '');
    const [getEth, setGetEth] = useState(prefill?.getEth ?? '');
    const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC);
    const [picking, setPicking] = useState<'give' | 'get' | null>(null);
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState<string | null>(null);

    const who = counterpartyHandle ? `@${counterpartyHandle}` : shortAddr(counterparty);

    const toggle = (side: 'give' | 'get') => (item: TradeItem) => {
        const setter = side === 'give' ? setGive : setGet;
        setter((prev) => {
            const key = `${item.project_id}:${item.token_id}`;
            const has = prev.some((p) => `${p.project_id}:${p.token_id}` === key);
            return has ? prev.filter((p) => `${p.project_id}:${p.token_id}` !== key) : [...prev, item];
        });
    };

    const yourSideEmpty = give.length === 0 && !(Number(giveEth) > 0);
    const theirSideEmpty = get.length === 0 && !(Number(getEth) > 0);
    const bothEth = Number(giveEth) > 0 && Number(getEth) > 0;
    const noPieces = give.length + get.length === 0;
    const sendable = !busy && !yourSideEmpty && !theirSideEmpty && !bothEth && !noPieces;

    const send = useCallback(async () => {
        setBusy(true);
        setStep(null);
        try {
            const wallet = await getWalletClientOnDemand().catch(() => null);
            const sides = { counterparty, give, get, giveEth, getEth, durationSec };
            if (counterOf) {
                await counterTrade(counterOf, sides, { wallet, onStep: setStep });
                showToast(`Counter: SENT to ${who}`);
            } else {
                await proposeTrade(sides, { wallet, onStep: setStep });
                showToast(`Trade: SENT to ${who}`);
            }
            onClose();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Trade: FAILED');
        } finally {
            setBusy(false);
            setStep(null);
        }
    }, [counterparty, give, get, giveEth, getEth, durationSec, counterOf, who, showToast, onClose]);

    if (picking) {
        return (
            <PickerFace
                address={picking === 'give' ? me : counterparty}
                label={picking === 'give' ? 'YOUR PIECES' : `${who.toUpperCase()}'S PIECES`}
                chosen={picking === 'give' ? give : get}
                onToggle={toggle(picking)}
                onDone={() => setPicking(null)}
                onClose={() => setPicking(null)}
            />
        );
    }

    return (
        <>
            <div className="cart-panel-header">
                <span className="cart-panel-title">{`⇌${VS15} THE EXCHANGE`}</span>
                <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={onClose} title="Close">{`×${VS15}`}</span>
            </div>
            <div className="cart-items-list exch-body">
                <div className="exch-with">{counterOf ? 'COUNTERING' : 'TRADING WITH'} <b>{who}</b></div>

                <div className="exch-panel">
                    <div className="exch-panel-head">YOU OFFER {give.length > 0 && `(${give.length})`}</div>
                    <OfferGrid items={give} eth={giveEth} editable onRemove={toggle('give')} onAdd={() => setPicking('give')} />
                    <div className="exch-eth-row">
                        <span className="exch-eth-lbl">{`◊${VS15}`} ADD ETH</span>
                        <span className="mk-price-wrap">
                            <input
                                className="mk-price-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={giveEth}
                                disabled={Number(getEth) > 0}
                                onChange={(e) => setGiveEth(e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                            <span className="mk-price-unit">ETH</span>
                        </span>
                    </div>
                </div>

                <div className="exch-swap-mark" aria-hidden="true">{`⇌${VS15}`}</div>

                <div className="exch-panel">
                    <div className="exch-panel-head">YOU ASK OF {who.toUpperCase()} {get.length > 0 && `(${get.length})`}</div>
                    <OfferGrid items={get} eth={getEth} editable onRemove={toggle('get')} onAdd={() => setPicking('get')} />
                    <div className="exch-eth-row">
                        <span className="exch-eth-lbl">{`◊${VS15}`} ASK ETH</span>
                        <span className="mk-price-wrap">
                            <input
                                className="mk-price-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={getEth}
                                disabled={Number(giveEth) > 0}
                                onChange={(e) => setGetEth(e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                            <span className="mk-price-unit">ETH</span>
                        </span>
                    </div>
                </div>

                <div className="mk-duration-row">
                    {DURATION_CHOICES.map((d) => (
                        <button
                            key={d.seconds}
                            type="button"
                            className={`mk-duration-pill${durationSec === d.seconds ? ' is-active' : ''}`}
                            onClick={() => setDurationSec(d.seconds)}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
                {bothEth && <div className="exch-note">ETH rides one side only.</div>}

                <OpenTradesStrip me={me} />
            </div>
            <button
                type="button"
                className="cart-panel-buy-all"
                disabled={!sendable}
                onClick={() => void send()}
            >
                {busy && <span className="cart-buy-sweep" aria-hidden="true" />}
                {busy ? `${step ?? 'SENDING'}…` : counterOf ? 'SEND COUNTER' : 'SEND TRADE'}
            </button>
        </>
    );
}

/* ── Open trades — the window IS the inbox (Brendon, 2026-07-20:
   "an open-trades inbox view"). Composing shows every trade you have in
   flight — either direction — one tap from its own seat. ── */
function OpenTradesStrip({ me }: { me: string }) {
    const { openTrade } = useExchange();
    const [trades, setTrades] = useState<TradeRow[] | null>(null);
    useEffect(() => {
        let alive = true;
        fetchTrades()
            .then((d) => { if (alive) setTrades(d.trades.filter((t) => t.status === 'open')); })
            .catch(() => { if (alive) setTrades([]); });
        return () => { alive = false; };
    }, []);
    if (!trades || trades.length === 0) return null;
    const now = Math.floor(Date.now() / 1000);
    const left = (end: number | null) => {
        if (end == null) return '';
        const s = end - now;
        if (s <= 0) return ' · EXPIRED';
        if (s >= 86400) return ` · ends in ${Math.round(s / 86400)}d`;
        if (s >= 3600) return ` · ends in ${Math.round(s / 3600)}h`;
        return ` · ends in ${Math.max(1, Math.round(s / 60))}m`;
    };
    const sideLabel = (t: TradeRow) => {
        const mine = t.proposer_address.toLowerCase() === me;
        const other = mine
            ? (t.counterparty_handle ? `@${t.counterparty_handle}` : shortAddr(t.counterparty_address))
            : (t.proposer_handle ? `@${t.proposer_handle}` : shortAddr(t.proposer_address));
        const giveN = t.give.length + (Number(t.give_eth) > 0 ? 1 : 0);
        const getN = t.get.length + (Number(t.get_eth) > 0 ? 1 : 0);
        return `${mine ? 'to' : 'from'} ${other} · ${mine ? giveN : getN} for ${mine ? getN : giveN}${left(t.end_time)}`;
    };
    return (
        <div className="exch-open-strip">
            <div className="exch-open-head">YOUR OPEN TRADES · {trades.length}</div>
            {trades.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    className="exch-open-row"
                    onClick={() => openTrade(t.id)}
                >
                    <span className="exch-open-glyph">{`⇌${VS15}`}</span>
                    <span className="exch-open-lbl">{sideLabel(t)}</span>
                </button>
            ))}
        </div>
    );
}

/* ── Trade — one existing trade from the viewer's seat ───────────────────── */
const STATUS_STAMP: Record<string, string> = {
    accepted: 'TRADE COMPLETE',
    declined: 'DECLINED',
    cancelled: 'CANCELLED',
    superseded: 'COUNTERED — SUPERSEDED',
};

function TradeFace({
    me, tradeId, onCounter, onClose,
}: {
    me: string;
    tradeId: string;
    onCounter: (trade: TradeRow) => void;
    onClose: () => void;
}) {
    const { showToast } = useToast();
    const [trade, setTrade] = useState<TradeRow | null | undefined>(undefined);
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState<string | null>(null);
    const [confirmAccept, setConfirmAccept] = useState(false);

    const load = useCallback(() => {
        fetchTrade(tradeId).then(setTrade).catch(() => setTrade(null));
    }, [tradeId]);
    useEffect(() => { load(); }, [load]);

    const run = useCallback(async (fn: () => Promise<void>, doneToast: string) => {
        setBusy(true);
        setStep(null);
        try {
            await fn();
            showToast(doneToast);
            load();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Trade: FAILED');
        } finally {
            setBusy(false);
            setStep(null);
        }
    }, [showToast, load]);

    if (trade === undefined) {
        return (
            <>
                <div className="cart-panel-header">
                    <span className="cart-panel-title">{`⇌${VS15} THE EXCHANGE`}</span>
                    <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={onClose} title="Close">{`×${VS15}`}</span>
                </div>
                <div className="cart-items-list"><div className="cart-empty-state">Reading the trade…</div></div>
            </>
        );
    }
    if (trade === null) {
        return (
            <>
                <div className="cart-panel-header">
                    <span className="cart-panel-title">{`⇌${VS15} THE EXCHANGE`}</span>
                    <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={onClose} title="Close">{`×${VS15}`}</span>
                </div>
                <div className="cart-items-list"><div className="cart-empty-state">Trade not found.</div></div>
            </>
        );
    }

    const iAmProposer = trade.proposer_address.toLowerCase() === me;
    const other = iAmProposer
        ? (trade.counterparty_handle ? `@${trade.counterparty_handle}` : shortAddr(trade.counterparty_address))
        : (trade.proposer_handle ? `@${trade.proposer_handle}` : shortAddr(trade.proposer_address));
    /* The window always reads from MY seat. */
    const outItems = iAmProposer ? trade.give : trade.get;
    const outEth = iAmProposer ? trade.give_eth : trade.get_eth;
    const inItems = iAmProposer ? trade.get : trade.give;
    const inEth = iAmProposer ? trade.get_eth : trade.give_eth;

    const expired = trade.end_time != null && trade.end_time <= Math.floor(Date.now() / 1000);
    const isOpen = trade.status === 'open' && !expired;
    const stamp = trade.status === 'open'
        ? (expired ? 'EXPIRED' : null)
        : STATUS_STAMP[trade.status] ?? trade.status.toUpperCase();

    const accept = () => run(async () => {
        const wallet = await getWalletClientOnDemand().catch(() => null);
        await acceptTrade(trade, { wallet, onStep: setStep });
    }, `Trade with ${other}: COMPLETE`);
    const decline = () => run(() => declineTrade(trade.id), 'Trade: DECLINED');
    const cancel = () => run(async () => {
        const wallet = await getWalletClientOnDemand().catch(() => null);
        await cancelTrade(trade, { wallet, onStep: setStep });
    }, 'Trade: CANCELLED');

    return (
        <>
            <div className="cart-panel-header">
                <span className="cart-panel-title">
                    {`⇌${VS15} THE EXCHANGE`}
                    {isOpen && trade.end_time != null && <span className="exch-expiry"> · {expiresIn(trade.end_time)}</span>}
                </span>
                <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={onClose} title="Close">{`×${VS15}`}</span>
            </div>
            <div className="cart-items-list exch-body">
                <div className="exch-with">
                    {iAmProposer ? 'YOUR PROPOSAL TO' : 'PROPOSED BY'} <b>{other}</b>
                    {stamp && <span className="exch-stamp"> · {stamp}</span>}
                </div>

                <div className="exch-panel">
                    <div className="exch-panel-head">YOU GIVE {outItems.length > 0 && `(${outItems.length})`}</div>
                    <OfferGrid items={outItems} eth={outEth} />
                </div>
                <div className="exch-swap-mark" aria-hidden="true">{`⇌${VS15}`}</div>
                <div className="exch-panel">
                    <div className="exch-panel-head">YOU RECEIVE {inItems.length > 0 && `(${inItems.length})`}</div>
                    <OfferGrid items={inItems} eth={inEth} />
                </div>

                {isOpen && !iAmProposer && (
                    <div className="exch-actions">
                        <button type="button" className="cart-panel-buy-all exch-accept" disabled={busy} onClick={() => setConfirmAccept(true)}>
                            {busy && <span className="cart-buy-sweep" aria-hidden="true" />}
                            {busy ? `${step ?? 'WORKING'}…` : 'ACCEPT TRADE'}
                        </button>
                        <div className="exch-actions-row">
                            <button type="button" className="mk-offer-btn" disabled={busy} onClick={() => onCounter(trade)}>COUNTER</button>
                            <button type="button" className="mk-offer-btn" disabled={busy} onClick={() => void decline()}>DECLINE</button>
                        </div>
                    </div>
                )}
                {isOpen && iAmProposer && (
                    <div className="exch-actions">
                        <button type="button" className="mk-offer-btn" disabled={busy} onClick={() => void cancel()}>
                            {busy ? `${step ?? 'WORKING'}…` : 'CANCEL TRADE'}
                        </button>
                    </div>
                )}
            </div>

            {confirmAccept && (
                <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmAccept(false)}>
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">Are you sure you want to make this trade?</div>
                        <div className="ms-confirm-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmAccept(false)}>Cancel</button>
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={() => { setConfirmAccept(false); void accept(); }}>Trade</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */
export default function ExchangeModal() {
    const { state, closeExchange } = useExchange();
    const { siweAddress } = useAuth();
    const open = state != null;
    const { mounted, active } = useTwoStage(open);

    /* COUNTER flips the trade face into a prefilled compose (roles reversed). */
    const [counterState, setCounterState] = useState<{
        counterOf: string;
        counterparty: string;
        counterpartyHandle: string | null;
        prefill: { give: TradeItem[]; get: TradeItem[]; giveEth: string; getEth: string };
    } | null>(null);
    useEffect(() => { if (!open) setCounterState(null); }, [open]);

    const lastRef = useRef(state);
    if (state) lastRef.current = state;
    const render = state ?? lastRef.current;

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeExchange(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, closeExchange]);

    const onBackdropClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) closeExchange();
    }, [closeExchange]);

    const startCounter = useCallback((trade: TradeRow) => {
        const me = siweAddress?.toLowerCase() ?? '';
        const iAmProposer = trade.proposer_address.toLowerCase() === me;
        setCounterState({
            counterOf: trade.id,
            counterparty: iAmProposer ? trade.counterparty_address : trade.proposer_address,
            counterpartyHandle: iAmProposer ? trade.counterparty_handle : trade.proposer_handle,
            prefill: {
                give: iAmProposer ? trade.give : trade.get,
                get: iAmProposer ? trade.get : trade.give,
                giveEth: Number(iAmProposer ? trade.give_eth : trade.get_eth) > 0 ? String(iAmProposer ? trade.give_eth : trade.get_eth) : '',
                getEth: Number(iAmProposer ? trade.get_eth : trade.give_eth) > 0 ? String(iAmProposer ? trade.get_eth : trade.give_eth) : '',
            },
        });
    }, [siweAddress]);

    if (!mounted || !render) return null;
    const me = siweAddress?.toLowerCase() ?? null;

    const wrapClass = ['cart-panel-wrap', 'mk-sheet-wrap', 'exch-wrap', mounted ? 'mounted' : '', active ? 'active' : '']
        .filter(Boolean).join(' ');

    return (
        <div className={wrapClass} onClick={onBackdropClick}>
            <div className="cart-panel-box" onClick={(e) => e.stopPropagation()}>
                {!me ? (
                    <>
                        <div className="cart-panel-header">
                            <span className="cart-panel-title">{`⇌${VS15} THE EXCHANGE`}</span>
                            <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={closeExchange} title="Close">{`×${VS15}`}</span>
                        </div>
                        <div className="cart-items-list"><div className="cart-empty-state">Connect your wallet to trade.</div></div>
                    </>
                ) : counterState ? (
                    <ComposeFace
                        key={`counter-${counterState.counterOf}`}
                        me={me}
                        counterparty={counterState.counterparty}
                        counterpartyHandle={counterState.counterpartyHandle}
                        counterOf={counterState.counterOf}
                        prefill={counterState.prefill}
                        onClose={closeExchange}
                    />
                ) : render.view === 'compose' ? (
                    <ComposeFace
                        key={`compose-${render.counterparty}`}
                        me={me}
                        counterparty={render.counterparty}
                        counterpartyHandle={render.counterpartyHandle}
                        seed={render.seed}
                        onClose={closeExchange}
                    />
                ) : (
                    <TradeFace
                        key={`trade-${render.tradeId}`}
                        me={me}
                        tradeId={render.tradeId}
                        onCounter={startCounter}
                        onClose={closeExchange}
                    />
                )}
            </div>
        </div>
    );
}
