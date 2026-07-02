'use client';

/*
 * MarketSheets — the secondary-market sheets, rendered once in the shell
 * (next to CartPanel) and driven by MarketSheetContext.
 *
 * Shell = the Cart panel, verbatim (cart-panel-wrap/box classes + the same
 * two-stage mounted/active open/close from CartPanel — Rule #0: the batch
 * pricing sheet IS the cart shell with price inputs). Three faces:
 *
 *   LIST   — 1..n owned pieces as cart rows, a price input per row (FLOOR
 *            chip prefill), duration pills, royalty net readout, one CONFIRM.
 *            Chain projects sign the whole batch with ONE wallet signature.
 *   OFFER  — same rows for 1..n pieces (WETH on chain), or a single amount
 *            for a collection / trait criteria offer.
 *   OFFERS — the open offers on one Output: owner accepts / declines,
 *            the bidder cancels, everyone reads. Item + qualifying
 *            collection/trait offers together (scope-tagged).
 *
 * Wait states: the confirm button fills with the same sweep animation the
 * cart BUY ALL uses; step labels advance (SIGNING → POSTING → …) so the UI
 * always reads as moving forward (CLAUDE.md §9).
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useWalletClient } from 'wagmi';
import { useMarketSheet, type SheetItem, type CriteriaTarget } from '../../lib/state/MarketSheetContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useProject, ProjectProvider } from '../../lib/state/ProjectContext';
import { getProject } from '../../lib/project/registry';
import {
    acceptOffer,
    cancelOffer,
    declineOffer,
    fetchMarket,
    fetchMeta,
    listOutputs,
    makeItemOffers,
    makeOffer,
    type OutputMarketState,
} from '../../lib/market/marketClient';
import { DURATION_CHOICES, DEFAULT_DURATION_SEC } from '../../lib/market/chain';
import type { MarketOfferRow } from '../../lib/market/orderTypes';
import BenchArt from '../bench/BenchArt';

const VS15 = '︎';
const UNMOUNT_DELAY_MS = 240;

function shortAddr(addr: string | null | undefined): string {
    if (!addr) return '—';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** "in 6d" / "in 3h" — offer/listing expiry readout. */
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
            if (unmountTimer.current) {
                clearTimeout(unmountTimer.current);
                unmountTimer.current = null;
            }
            setMounted(true);
            const raf = requestAnimationFrame(() => setActive(true));
            return () => cancelAnimationFrame(raf);
        }
        setActive(false);
        unmountTimer.current = setTimeout(() => {
            setMounted(false);
            unmountTimer.current = null;
        }, UNMOUNT_DELAY_MS);
        return () => {
            if (unmountTimer.current) {
                clearTimeout(unmountTimer.current);
                unmountTimer.current = null;
            }
        };
    }, [open]);
    return { mounted, active };
}

/* One pricing row. Mounted under its project's provider so the FLOOR chip
   reads the live floor (same per-project provider trick as CartGroup). */
function PriceRow({
    item,
    value,
    onChange,
    onRemove,
}: {
    item: SheetItem;
    value: string;
    onChange: (v: string) => void;
    onRemove: () => void;
}) {
    const { title, floorEth } = useProject();
    return (
        <div className="cart-item-row" data-mint-id={item.id}>
            <div className="cart-item-thumb cart-art-thumb" aria-hidden="true">
                <BenchArt slug={item.slug} id={item.id} />
            </div>
            <div className="cart-item-meta">
                <div className="cart-item-name">
                    {title} #{item.id}
                </div>
                <div className="cart-item-artist">
                    {item.currentPriceEth ? `listed · ${item.currentPriceEth}` : floorEth > 0 ? `floor ${floorEth.toFixed(3)}` : 'unlisted'}
                </div>
            </div>
            <span className="mk-price-wrap">
                {floorEth > 0 && (
                    <button
                        type="button"
                        className="mk-floor-chip"
                        onClick={() => onChange(floorEth.toFixed(3))}
                        title="Set to floor"
                    >
                        FLOOR
                    </button>
                )}
                <input
                    className="mk-price-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.000"
                    value={value}
                    onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
                />
                <span className="mk-price-unit">ETH</span>
            </span>
            <div className="cart-item-actions">
                <span
                    className="cart-item-remove"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    title="Remove"
                >
                    {`×${VS15}`}
                </span>
            </div>
        </div>
    );
}

/* ── The pricing sheet (LIST + OFFER faces) ──────────────────────────────── */
function PricingSheet({
    mode,
    items: initialItems,
    criteria,
    onClose,
}: {
    mode: 'list' | 'offer';
    items: SheetItem[];
    criteria: CriteriaTarget | null;
    onClose: () => void;
}) {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const { data: walletClient } = useWalletClient();

    const [items, setItems] = useState<SheetItem[]>(initialItems);
    const [prices, setPrices] = useState<Record<string, string>>(() => {
        const seed: Record<string, string> = {};
        for (const it of initialItems) {
            if (it.currentPriceEth) seed[`${it.slug}:${it.id}`] = it.currentPriceEth;
        }
        return seed;
    });
    const [criteriaPrice, setCriteriaPrice] = useState('');
    const [matchCount, setMatchCount] = useState<number | null>(null);
    const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC);
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState<string | null>(null);
    const [wethNote, setWethNote] = useState(false);

    /* Trait offers show what they cover — the live count of minted pieces
       matching the trait, so the bidder knows exactly what they're bidding on. */
    useEffect(() => {
        if (criteria?.kind !== 'trait') return;
        let cancelled = false;
        fetch(
            `/api/market/orders?trait_ids=${encodeURIComponent(criteria.slug)}&category=${encodeURIComponent(criteria.category ?? '')}&value=${encodeURIComponent(criteria.value ?? '')}`,
            { cache: 'no-store' },
        )
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setMatchCount(((d.identifiers as string[]) ?? []).length); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [criteria]);

    /* Offers on a chain project settle in WETH — say so once, in the sheet. */
    useEffect(() => {
        if (mode !== 'offer' && !criteria) return;
        const slug = criteria?.slug ?? items[0]?.slug;
        if (!slug) return;
        let cancelled = false;
        fetchMeta(slug)
            .then((m) => { if (!cancelled) setWethNote(m.onChain); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [mode, criteria, items]);

    const setPrice = (it: SheetItem, v: string) =>
        setPrices((prev) => ({ ...prev, [`${it.slug}:${it.id}`]: v }));
    const removeItem = (it: SheetItem) => {
        setItems((prev) => {
            const next = prev.filter((x) => !(x.slug === it.slug && x.id === it.id));
            if (next.length === 0) queueMicrotask(onClose);
            return next;
        });
    };

    const groups = useMemo(() => {
        const m = new Map<string, SheetItem[]>();
        for (const it of items) {
            const arr = m.get(it.slug) ?? [];
            arr.push(it);
            m.set(it.slug, arr);
        }
        return [...m.entries()];
    }, [items]);

    const priced = items.map((it) => ({ it, price: parseFloat(prices[`${it.slug}:${it.id}`] ?? '') }));
    const allPriced = criteria
        ? parseFloat(criteriaPrice) > 0
        : priced.length > 0 && priced.every((p) => Number.isFinite(p.price) && p.price > 0);
    const total = criteria
        ? (parseFloat(criteriaPrice) || 0)
        : priced.reduce((s, p) => s + (Number.isFinite(p.price) ? p.price : 0), 0);
    const royalty = total * 0.05;

    const title = criteria
        ? criteria.kind === 'collection' ? 'COLLECTION OFFER' : 'TRAIT OFFER'
        : mode === 'list'
            ? items.some((i) => i.currentPriceEth) ? 'RE-LIST' : 'LIST'
            : 'MAKE OFFER';

    const confirmLabel = busy
        ? `${step ?? 'WORKING'}…`
        : criteria
            ? `OFFER  ·  ${total.toFixed(3)} ETH`
            : mode === 'list'
                ? `LIST  ${items.length > 1 ? `${items.length}  ` : ''}·  ${total.toFixed(3)} ETH`
                : `OFFER  ${items.length > 1 ? `${items.length}  ` : ''}·  ${total.toFixed(3)} ETH`;

    const onConfirm = useCallback(async () => {
        if (busy || !allPriced) return;
        if (!siweAddress) { showToast('Wallet: CONNECT TO TRADE'); return; }
        setBusy(true);
        setStep('SIGNING');
        try {
            if (criteria) {
                await makeOffer(
                    {
                        kind: criteria.kind,
                        slug: criteria.slug,
                        category: criteria.category,
                        value: criteria.value,
                    },
                    criteriaPrice,
                    { durationSec, wallet: walletClient, onStep: setStep },
                );
                const tag = criteria.kind === 'collection'
                    ? `@${criteria.slug} collection`
                    : `@${criteria.slug} ${criteria.category}: ${criteria.value}`;
                showToast(`Offer: PLACED · ${total.toFixed(3)} on ${tag}`);
                onClose();
                return;
            }
            const inputs = priced.map((p) => ({
                slug: p.it.slug,
                id: p.it.id,
                priceEth: String(p.price),
            }));
            const result = mode === 'list'
                ? await listOutputs(inputs, { durationSec, wallet: walletClient, onStep: setStep })
                : await makeItemOffers(inputs, { durationSec, wallet: walletClient, onStep: setStep });
            if (result.failed.length > 0 && result.listed === 0) {
                showToast(result.failed[0].error);
            } else if (result.failed.length > 0) {
                showToast(
                    mode === 'list'
                        ? `List: LIVE · ${result.listed} · ${result.failed.length} failed`
                        : `Offer: PLACED · ${result.listed} · ${result.failed.length} failed`,
                );
                onClose();
            } else {
                const what = result.listed === 1
                    ? `${total.toFixed(3)} ETH`
                    : `${result.listed} outputs`;
                showToast(mode === 'list' ? `List: LIVE · ${what}` : `Offer: PLACED · ${what}`);
                onClose();
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Action: FAILED');
        } finally {
            setBusy(false);
            setStep(null);
        }
    }, [busy, allPriced, siweAddress, criteria, criteriaPrice, durationSec, walletClient, priced, mode, total, onClose, showToast]);

    const criteriaLabel = criteria
        ? criteria.kind === 'collection'
            ? `@${criteria.slug} · any piece`
            : `@${criteria.slug} · ${criteria.category}: ${criteria.value}`
        : '';

    return (
        <>
            <div className="cart-panel-header">
                <span className="cart-panel-title">
                    {title}
                    {!criteria && (
                        <span className="cart-panel-title-count">({items.length})</span>
                    )}
                </span>
                <span
                    className="cart-panel-close-x"
                    role="button"
                    tabIndex={0}
                    onClick={onClose}
                    title="Close"
                >
                    {`×${VS15}`}
                </span>
            </div>

            <div className="cart-items-list">
                {criteria ? (
                    <div className="mk-criteria-block">
                        <div className="mk-criteria-target">{criteriaLabel}</div>
                        {criteria.kind === 'trait' && matchCount != null && (
                            <div className="mk-criteria-count">
                                {matchCount} piece{matchCount === 1 ? '' : 's'} match{matchCount === 1 ? 'es' : ''}
                            </div>
                        )}
                        <span className="mk-price-wrap mk-price-wrap--solo">
                            <input
                                className="mk-price-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.000"
                                value={criteriaPrice}
                                onChange={(e) => setCriteriaPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                                autoFocus
                            />
                            <span className="mk-price-unit">{wethNote ? 'WETH' : 'ETH'}</span>
                        </span>
                    </div>
                ) : (
                    groups.map(([slug, ids]) => (
                        <ProjectProvider key={slug} slug={slug}>
                            {ids.map((it) => (
                                <PriceRow
                                    key={`${it.slug}:${it.id}`}
                                    item={it}
                                    value={prices[`${it.slug}:${it.id}`] ?? ''}
                                    onChange={(v) => setPrice(it, v)}
                                    onRemove={() => removeItem(it)}
                                />
                            ))}
                        </ProjectProvider>
                    ))
                )}
            </div>

            <div className="cart-panel-totals">
                <div className="mk-duration-row">
                    {DURATION_CHOICES.map((d) => (
                        <button
                            key={d.label}
                            type="button"
                            className={`mk-duration-pill${durationSec === d.seconds ? ' is-active' : ''}`}
                            onClick={() => setDurationSec(d.seconds)}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
                {mode === 'list' && !criteria && (
                    <>
                        <div className="cart-panel-subtotal-row">
                            <span className="cart-panel-subtotal-label">Total</span>
                            <span className="cart-panel-subtotal-val">{total.toFixed(3)} ETH</span>
                        </div>
                        <div className="cart-panel-fees-row">
                            <span>{`− 5% royalty · you receive`}</span>
                            <span>{(total - royalty).toFixed(3)} ETH</span>
                        </div>
                    </>
                )}
                {(mode === 'offer' || !!criteria) && wethNote && (
                    <div className="cart-panel-fees-row">
                        <span>offers escrow in WETH</span>
                        <span>auto-wrapped</span>
                    </div>
                )}
            </div>

            <button
                className="cart-panel-buy-all"
                type="button"
                onClick={() => void onConfirm()}
                disabled={!allPriced || busy}
            >
                {busy && <span className="cart-buy-sweep" aria-hidden="true" />}
                {confirmLabel}
            </button>
        </>
    );
}

/* ── The offers panel for one Output ─────────────────────────────────────── */
function OffersPanel({
    slug,
    id,
    onClose,
}: {
    slug: string;
    id: number;
    onClose: () => void;
}) {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const { data: walletClient } = useWalletClient();
    const [market, setMarket] = useState<OutputMarketState | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [step, setStep] = useState<string | null>(null);
    const [confirmOffer, setConfirmOffer] = useState<MarketOfferRow | null>(null);

    const load = useCallback(() => {
        fetchMarket(slug, id).then(setMarket).catch(() => {});
    }, [slug, id]);
    useEffect(() => { load(); }, [load]);

    const projectName = getProject(slug)?.displayName ?? slug;
    const isOwner = market?.viewer?.isOwner ?? false;
    const offers = market?.offers ?? [];

    const runAccept = useCallback(async (offer: MarketOfferRow) => {
        setBusyId(offer.id);
        setStep('ACCEPTING');
        try {
            await acceptOffer(slug, id, offer, { wallet: walletClient, onStep: setStep });
            showToast(`Offer: ACCEPTED · ${Number(offer.price_eth).toFixed(3)} ${offer.currency}`);
            load();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Accept: FAILED');
        } finally {
            setBusyId(null);
            setStep(null);
        }
    }, [slug, id, walletClient, showToast, load]);

    const runDecline = useCallback(async (offer: MarketOfferRow) => {
        setBusyId(offer.id);
        try {
            await declineOffer(offer.id);
            showToast('Offer: DECLINED');
            load();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Decline: FAILED');
        } finally {
            setBusyId(null);
        }
    }, [showToast, load]);

    const runCancel = useCallback(async (offer: MarketOfferRow) => {
        setBusyId(offer.id);
        setStep('CANCELLING');
        try {
            await cancelOffer(offer, { wallet: walletClient, onStep: setStep });
            showToast('Offer: CANCELLED');
            load();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Cancel: FAILED');
        } finally {
            setBusyId(null);
            setStep(null);
        }
    }, [walletClient, showToast, load]);

    return (
        <>
            <div className="cart-panel-header">
                <span className="cart-panel-title">
                    {`✦${VS15} OFFERS`}
                    <span className="cart-panel-title-count">({offers.length})</span>
                </span>
                <span
                    className="cart-panel-close-x"
                    role="button"
                    tabIndex={0}
                    onClick={onClose}
                    title="Close"
                >
                    {`×${VS15}`}
                </span>
            </div>

            <div className="cart-items-list">
                {offers.length === 0 ? (
                    <div className="cart-empty-state">
                        No open offers on {projectName} #{id}.
                    </div>
                ) : (
                    offers.map((o) => {
                        const mine = !!siweAddress && o.bidder_address.toLowerCase() === siweAddress.toLowerCase();
                        const busy = busyId === o.id;
                        const scopeTag = o.scope === 'collection'
                            ? 'COLLECTION'
                            : o.scope === 'trait'
                                ? `TRAIT · ${o.criteria?.category ?? ''}`.trim()
                                : null;
                        return (
                            <div className="cart-item-row" key={o.id}>
                                <div className="cart-item-meta">
                                    <div className="cart-item-name">
                                        {o.bidder_handle ? `@${o.bidder_handle}` : shortAddr(o.bidder_address)}
                                        {scopeTag && <span className="mk-scope-tag">{scopeTag}</span>}
                                    </div>
                                    <div className="cart-item-artist">
                                        expires {expiresIn(o.end_time)}
                                    </div>
                                </div>
                                <div className="cart-item-price">
                                    {Number(o.price_eth).toFixed(3)} {o.currency === 'WETH' ? 'WETH' : 'ETH'}
                                </div>
                                <div className="cart-item-actions mk-offer-actions">
                                    {isOwner && !mine && (
                                        <>
                                            <button
                                                type="button"
                                                className="mk-offer-btn mk-offer-btn--accept"
                                                disabled={busy}
                                                onClick={() => setConfirmOffer(o)}
                                            >
                                                {busy ? `${step ?? 'WORKING'}…` : 'ACCEPT'}
                                            </button>
                                            {o.scope === 'item' && (
                                                <button
                                                    type="button"
                                                    className="mk-offer-btn"
                                                    disabled={busy}
                                                    onClick={() => void runDecline(o)}
                                                >
                                                    {`×${VS15}`}
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {mine && (
                                        <button
                                            type="button"
                                            className="mk-offer-btn"
                                            disabled={busy}
                                            onClick={() => void runCancel(o)}
                                        >
                                            {busy ? `${step ?? 'WORKING'}…` : 'CANCEL'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Accept = money moves — the same centered confirm card the mint
                chooser uses. */}
            {confirmOffer && (
                <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmOffer(null)}>
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">
                            Sell {projectName} #{id} for {Number(confirmOffer.price_eth).toFixed(3)} {confirmOffer.currency === 'WETH' ? 'WETH' : 'ETH'}?
                        </div>
                        <div className="ms-confirm-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmOffer(null)}>Cancel</button>
                            <button
                                type="button"
                                className="ms-confirm-btn ms-confirm-btn--ok"
                                onClick={() => { const o = confirmOffer; setConfirmOffer(null); void runAccept(o); }}
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Trait picker — the general-purpose trait-offer tool ─────────────────── */
/* Multi-select with exactly ONE output selected → this face: the piece's full
   trait sheet (server-computed, natal included), tap a trait → offer sheet.
   (Brendon, 2026-07-02 — trait offers are the community's #1 feature.) */
function TraitPickerFace({
    slug,
    id,
    onPick,
    onClose,
}: {
    slug: string;
    id: number;
    onPick: (category: string, value: string) => void;
    onClose: () => void;
}) {
    const [traits, setTraits] = useState<Record<string, string> | null>(null);
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/output/${slug}-${id}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled) setTraits((d?.traits as Record<string, string>) ?? {}); })
            .catch(() => { if (!cancelled) setTraits({}); });
        return () => { cancelled = true; };
    }, [slug, id]);

    const projectName = getProject(slug)?.displayName ?? slug;
    const rows = traits ? Object.entries(traits) : null;

    return (
        <>
            <div className="cart-panel-header">
                <span className="cart-panel-title">
                    {`✦${VS15} TRAIT OFFER`}
                </span>
                <span
                    className="cart-panel-close-x"
                    role="button"
                    tabIndex={0}
                    onClick={onClose}
                    title="Close"
                >
                    {`×${VS15}`}
                </span>
            </div>
            <div className="cart-items-list">
                <div className="mk-picker-lead">
                    {projectName} #{id} — pick the trait to bid on
                </div>
                {rows == null ? (
                    <div className="cart-empty-state">Reading traits…</div>
                ) : rows.length === 0 ? (
                    <div className="cart-empty-state">No traits found.</div>
                ) : (
                    rows.map(([category, value]) => (
                        <div
                            key={category}
                            className="cart-item-row mk-picker-row"
                            role="button"
                            tabIndex={0}
                            onClick={() => onPick(category, value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(category, value); } }}
                        >
                            <div className="cart-item-meta">
                                <div className="cart-item-name">{category}</div>
                                <div className="cart-item-artist">{value}</div>
                            </div>
                            <div className="cart-item-price">{`✦${VS15}`}</div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */
export default function MarketSheets() {
    const { state, closeSheet, openCriteriaOfferSheet } = useMarketSheet();
    const open = state != null;
    const { mounted, active } = useTwoStage(open);

    /* Cache the last non-null state so the close fade renders prior content
       (same trick as CalcSheet's lastConfigRef). */
    const lastRef = useRef(state);
    if (state) lastRef.current = state;
    const render = state ?? lastRef.current;

    /* Escape closes — parity with CartPanel. */
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeSheet();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, closeSheet]);

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) closeSheet();
        },
        [closeSheet],
    );

    if (!mounted || !render) return null;

    const wrapClass = [
        'cart-panel-wrap',
        'mk-sheet-wrap',
        mounted ? 'mounted' : '',
        active ? 'active' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={wrapClass} onClick={onBackdropClick}>
            <div className="cart-panel-box" onClick={(e) => e.stopPropagation()}>
                {render.sheet === 'list' && (
                    <PricingSheet key="list" mode="list" items={render.items} criteria={null} onClose={closeSheet} />
                )}
                {render.sheet === 'offer' && (
                    <PricingSheet key="offer" mode="offer" items={render.items} criteria={null} onClose={closeSheet} />
                )}
                {render.sheet === 'offer-criteria' && (
                    <PricingSheet key="criteria" mode="offer" items={[]} criteria={render.target} onClose={closeSheet} />
                )}
                {render.sheet === 'offers-panel' && (
                    <OffersPanel key={`offers-${render.slug}-${render.id}`} slug={render.slug} id={render.id} onClose={closeSheet} />
                )}
                {render.sheet === 'trait-picker' && (
                    <TraitPickerFace
                        key={`pick-${render.slug}-${render.id}`}
                        slug={render.slug}
                        id={render.id}
                        onPick={(category, value) =>
                            openCriteriaOfferSheet({ kind: 'trait', slug: render.slug, category, value })
                        }
                        onClose={closeSheet}
                    />
                )}
            </div>
        </div>
    );
}
