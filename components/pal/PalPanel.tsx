'use client';

/*
 * PalPanel — PURCHASE PAL / PROFIT PAL, one app with two sides (Brendon,
 * 2026-07-27: "help our users make money").
 *
 * Doors (both Brendon-named): Completionism's ⌂ house opens PURCHASE PAL
 * preloaded with the goal month; the /marketplace action row opens PROFIT
 * PAL. Payload string: 'profit' | 'purchase' | 'purchase:<YYYY-MM>'.
 *
 * PURCHASE PAL — the goal-path builder. Takes a Completionism month goal
 * ("AUGUST 2026 COMPLETE"), reads the live market snapshot, and builds the
 * best path there: one listed piece per missing release. The knobs — the
 * CHEAPEST · BALANCED · RAREST presets plus the slider between them — re-pick
 * the path live (price↔rarity weighting over the real listings). The path
 * lands in the real Cart (ADD PATH TO CART), where the existing sweep buys it.
 *
 * PROFIT PAL — the collection-wide read. Portfolio tiles (pieces · spent ·
 * at-floor value · net), per-project exit paths priced with the Calc's own
 * rate card (5% royalty + gas per piece), and the HOT read — the project
 * moving most on the recent tape, with what getting in/out looks like for YOU.
 *
 * Shell = the Cart panel verbatim (house slide-up), two-stage mounted/active —
 * the CompletionismModal pattern, ModalContext-mounted in PriceOSShell.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { getProject } from '../../lib/project/registry';
import { pdRarityRank } from '../../lib/output/rarity';
import { formatEth } from '../../lib/format/eth';
import { CALC_ROYALTY_PCT, CALC_GAS_ESTIMATE_ETH } from '../CalcSheet';
import BenchArt from '../bench/BenchArt';
import SuitePane from '../suite/SuitePane';
import type { MarketplaceResponse } from '../../lib/marketplace/marketData';
import type { UserHolding } from '../../lib/profile/getUserHoldings';

const VS15 = '︎';
const UNMOUNT_DELAY_MS = 240;

type PalTab = 'purchase' | 'profit';

interface MonthRow {
    key: string;
    label: string;
    collected: number;
    total: number;
    complete: boolean;
    projects: { slug: string; title: string; collected: boolean }[];
}

interface PathPick {
    slug: string;
    title: string;
    tokenId: number | null;
    priceEth: number | null;
    rarity: { rank: number; total: number } | null;
}

/** Pick one listed piece for a missing release, weighted price↔rarity.
 *  w=0 → cheapest listing; w=1 → rarest listed piece; between → blend of the
 *  two, each axis normalized within THIS project's live listings. */
function pickForProject(
    slug: string,
    listings: { token_id: number; price_eth: number }[],
    w: number,
): { tokenId: number; priceEth: number; rarity: { rank: number; total: number } | null } | null {
    if (listings.length === 0) return null;
    const prices = listings.map((l) => l.price_eth);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const ranks = listings.map((l) => pdRarityRank(slug, l.token_id));
    const known = ranks.filter((r): r is { rank: number; total: number } => r != null);
    const minR = known.length ? Math.min(...known.map((r) => r.rank)) : 0;
    const maxR = known.length ? Math.max(...known.map((r) => r.rank)) : 0;
    let best = 0;
    let bestScore = Infinity;
    for (let i = 0; i < listings.length; i++) {
        const pn = maxP > minP ? (listings[i].price_eth - minP) / (maxP - minP) : 0;
        const r = ranks[i];
        // Unranked pieces read as the commonest of the listed set.
        const rn = r && maxR > minR ? (r.rank - minR) / (maxR - minR) : (r ? 0 : 1);
        const score = pn * (1 - w) + rn * w;
        if (score < bestScore) { bestScore = score; best = i; }
    }
    return { tokenId: listings[best].token_id, priceEth: listings[best].price_eth, rarity: ranks[best] };
}

/** Net proceeds of selling one piece at `price` — the Calc's own ladder. */
function netOf(price: number): number {
    return price - price * CALC_ROYALTY_PCT - CALC_GAS_ESTIMATE_ETH;
}

/* `inline` — the SAME Pal mounted as the Suite's ƒ PriceCalc app (Brendon,
   2026-07-28: "Profit pal is a modal; will need to be adapted to this").
   No portal, no backdrop, no slide-up, no close × — it wears the Suite's
   pane, the To-Dos box, like every other app. The house doors (Completionism
   ⌂, the marketplace row) keep opening the modal form untouched. */
export default function PalPanel({ inline = false }: { inline?: boolean } = {}) {
    const { isOpen: layerOpen } = useModalLayer('pal');
    const { openModal, close } = useModal();
    /* Inline it is always live — there is no layer to open. */
    const isOpen = inline || layerOpen;
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const { add: addToCart } = useCart();

    /* Payload → landing tab + optional preloaded goal month. */
    const payload = !inline && isOpen && typeof openModal?.payload === 'string' ? openModal.payload : '';
    /* The Suite's PriceCalc lands on PROFIT — the side Brendon named. */
    const payloadTab: PalTab = inline || payload.startsWith('profit') ? 'profit' : 'purchase';
    const payloadMonth = payload.startsWith('purchase:') ? payload.slice('purchase:'.length) : null;

    const [tab, setTab] = useState<PalTab>('purchase');
    const [goalKey, setGoalKey] = useState<string | null>(null);

    /* Two-stage mounted/active — CartPanel's open/close, verbatim. */
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);
    const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (isOpen) {
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
    }, [isOpen]);

    /* Land on the door's side, fresh each open. */
    useEffect(() => {
        if (!isOpen) return;
        setTab(payloadTab);
        setGoalKey(payloadMonth);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    /* The market snapshot + the viewer's Completionism months + holdings —
       fetched on open, shared by both sides. */
    const [market, setMarket] = useState<MarketplaceResponse | null>(null);
    const [months, setMonths] = useState<MonthRow[] | null>(null);
    const [holdings, setHoldings] = useState<{ rows: UserHolding[]; total: number; spent: number } | null>(null);
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        fetch('/api/marketplace', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setMarket(d as MarketplaceResponse); })
            .catch(() => { if (!cancelled) setMarket(null); });
        if (siweAddress) {
            const addr = siweAddress.toLowerCase();
            fetch(`/api/completionism?address=${encodeURIComponent(addr)}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setMonths((d.months as MonthRow[]) ?? []); })
                .catch(() => { if (!cancelled) setMonths([]); });
            fetch(`/api/user/${addr}/outputs`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (cancelled || !d) return;
                    setHoldings({
                        rows: (d.holdings as UserHolding[]) ?? [],
                        total: Number(d.total) || 0,
                        spent: Number(d.volume_spent_eth) || 0,
                    });
                })
                .catch(() => { if (!cancelled) setHoldings(null); });
        }
        return () => { cancelled = true; };
    }, [isOpen, siweAddress]);

    useEffect(() => {
        if (!isOpen || inline) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, inline, close]);

    /* Live listings per project. */
    const listingsBySlug = useMemo(() => {
        const m = new Map<string, { token_id: number; price_eth: number }[]>();
        for (const l of market?.listings ?? []) {
            if (!getProject(l.slug)) continue;
            const arr = m.get(l.slug) ?? [];
            arr.push({ token_id: l.token_id, price_eth: l.price_eth });
            m.set(l.slug, arr);
        }
        for (const arr of m.values()) arr.sort((a, b) => a.price_eth - b.price_eth);
        return m;
    }, [market]);
    const floorOf = (slug: string): number | null => listingsBySlug.get(slug)?.[0]?.price_eth ?? null;

    /* ── PURCHASE PAL ── */

    /* Goal months a path can target — every month with releases, newest
       first (the payload can preload any of them, complete ones included). */
    const goalMonths = useMemo(() => (months ?? []).filter((m) => m.total > 0), [months]);
    /* THE CLOSE default — the incomplete month nearest its finish line. */
    const defaultGoal = useMemo(() => {
        const open = goalMonths.filter((m) => !m.complete);
        if (open.length === 0) return goalMonths[0] ?? null;
        return [...open].sort((a, b) => (a.total - a.collected) - (b.total - b.collected))[0];
    }, [goalMonths]);
    const goal = useMemo(
        () => goalMonths.find((m) => m.key === goalKey) ?? defaultGoal,
        [goalMonths, goalKey, defaultGoal],
    );
    const stepGoal = (dir: 1 | -1) => {
        if (!goal || goalMonths.length === 0) return;
        const i = goalMonths.findIndex((m) => m.key === goal.key);
        const next = goalMonths[(i + dir + goalMonths.length) % goalMonths.length];
        setGoalKey(next.key);
    };

    /* The knobs — 0 = cheapest, 100 = rarest; the presets are slider stops. */
    const [weight, setWeight] = useState(0);
    const preset =
        weight === 0 ? 'cheapest' : weight === 100 ? 'rarest' : weight === 50 ? 'balanced' : null;

    /* The path — one pick per missing release of the goal month. */
    const path = useMemo<PathPick[]>(() => {
        if (!goal) return [];
        const w = weight / 100;
        return goal.projects
            .filter((p) => !p.collected)
            .map((p) => {
                const pick = pickForProject(p.slug, listingsBySlug.get(p.slug) ?? [], w);
                return {
                    slug: p.slug,
                    title: getProject(p.slug)?.displayName ?? p.title,
                    tokenId: pick?.tokenId ?? null,
                    priceEth: pick?.priceEth ?? null,
                    rarity: pick?.rarity ?? null,
                };
            });
    }, [goal, weight, listingsBySlug]);

    const buyable = path.filter((p) => p.tokenId != null && p.priceEth != null);
    const pathTotal = buyable.reduce((a, p) => a + (p.priceEth ?? 0), 0);

    const addPathToCart = () => {
        if (buyable.length === 0) return;
        for (const p of buyable) addToCart(p.slug, p.tokenId as number);
        showToast(`Purchase Pal: PATH IN CART · ${buyable.length}`);
    };

    /* ── PROFIT PAL ── */

    /* Per-project portfolio read — held count, floor, at-floor value, and the
       exit paths priced with the Calc's rate card. */
    const portfolio = useMemo(() => {
        const bySlug = new Map<string, UserHolding[]>();
        for (const h of holdings?.rows ?? []) {
            if (!getProject(h.slug)) continue;
            const arr = bySlug.get(h.slug) ?? [];
            arr.push(h);
            bySlug.set(h.slug, arr);
        }
        const rows = [...bySlug.entries()].map(([slug, pieces]) => {
            const floor = floorOf(slug);
            const value = floor != null ? floor * pieces.length : null;
            /* TRIM = sell your commonest piece, keep the rare ones. */
            const ranked = pieces
                .map((p) => ({ p, r: pdRarityRank(slug, p.token_id) }))
                .sort((a, b) => (b.r?.rank ?? Infinity) - (a.r?.rank ?? Infinity));
            const trim = ranked[0] ?? null;
            return {
                slug,
                title: getProject(slug)?.displayName ?? slug,
                count: pieces.length,
                floor,
                value,
                exitNet: floor != null ? netOf(floor) * pieces.length : null,
                trimTokenId: trim?.p.token_id ?? null,
                trimNet: floor != null ? netOf(floor) : null,
            };
        });
        rows.sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.slug.localeCompare(b.slug));
        return rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [holdings, listingsBySlug]);

    const atFloor = portfolio.reduce((a, r) => a + (r.value ?? 0), 0);
    const net = atFloor - (holdings?.spent ?? 0);

    /* THE HOT READ — the project moving most on the recent tape, and what
       getting in (or out, when you hold it) looks like for the viewer. */
    const hot = useMemo(() => {
        const moves = new Map<string, number>();
        for (const e of market?.events ?? []) {
            if (!getProject(e.slug)) continue;
            moves.set(e.slug, (moves.get(e.slug) ?? 0) + 1);
        }
        const top = [...moves.entries()].sort((a, b) => b[1] - a[1])[0];
        if (!top) return null;
        const [slug, n] = top;
        const held = portfolio.find((r) => r.slug === slug) ?? null;
        return {
            slug,
            title: getProject(slug)?.displayName ?? slug,
            moves: n,
            floor: floorOf(slug),
            held,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [market, portfolio]);

    if (!inline && (!mounted || typeof document === 'undefined')) return null;

    const wrapClass = ['cart-panel-wrap', 'mk-sheet-wrap', mounted ? 'mounted' : '', active ? 'active' : '']
        .filter(Boolean).join(' ');

    const loadingPurchase = siweAddress != null && (months == null || market == null);
    const loadingProfit = siweAddress != null && (holdings == null || market == null);

    const body = (
        <>
                    {/* The two sides — same pill markup as the home tabs. */}
                    <div className="profile-tabs-row pal-tabs-row">
                        {(['purchase', 'profit'] as const).map((t) => (
                            <div
                                key={t}
                                className={`pill pill-l1${tab === t ? ' active' : ''}`}
                                role="button"
                                tabIndex={0}
                                title={t === 'purchase' ? 'Purchase Pal' : 'Profit Pal'}
                                onClick={() => { setTab(t); showToast(`Pal: ${t.toUpperCase()}`); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab(t); } }}
                            >
                                <span className="stat-name">{t === 'purchase' ? 'Purchase' : 'Profit'}</span>
                            </div>
                        ))}
                    </div>

                    {!siweAddress ? (
                        <div className="cart-empty-state">
                            Connect your wallet to build a path.
                        </div>
                    ) : tab === 'purchase' ? (
                        loadingPurchase ? (
                            <div className="mk-story-loading">Reading the market…</div>
                        ) : !goal ? (
                            <div className="cart-empty-state">No releases to chase yet.</div>
                        ) : (
                            <>
                                {/* The goal — steppers cycle every release month. */}
                                <div className="pal-goal-row">
                                    <button type="button" className="pal-step" aria-label="Previous month" onClick={() => stepGoal(-1)}>{`‹${VS15}`}</button>
                                    <span className="pal-goal">
                                        <span className="pal-goal-head">GOAL — {goal.label} COMPLETE</span>
                                        <span className="pal-goal-line">
                                            {goal.complete
                                                ? `COMPLETE ✓${VS15}`
                                                : `${goal.total - goal.collected} to go · ${goal.collected}/${goal.total} collected`}
                                        </span>
                                    </span>
                                    <button type="button" className="pal-step" aria-label="Next month" onClick={() => stepGoal(1)}>{`›${VS15}`}</button>
                                </div>

                                {!goal.complete && (
                                    <>
                                        {/* The knobs — presets + the slider between them. */}
                                        <div className="pal-knobs">
                                            <div className="pal-knob-row">
                                                <button type="button" className={`pal-knob-btn${preset === 'cheapest' ? ' on' : ''}`} onClick={() => setWeight(0)}>CHEAPEST</button>
                                                <button type="button" className={`pal-knob-btn${preset === 'balanced' ? ' on' : ''}`} onClick={() => setWeight(50)}>BALANCED</button>
                                                <button type="button" className={`pal-knob-btn${preset === 'rarest' ? ' on' : ''}`} onClick={() => setWeight(100)}>RAREST</button>
                                            </div>
                                            <input
                                                type="range"
                                                className="pal-slider"
                                                min={0}
                                                max={100}
                                                value={weight}
                                                aria-label="Price to rarity"
                                                onChange={(e) => setWeight(Number(e.target.value))}
                                            />
                                        </div>

                                        {/* The path — one live pick per missing release. */}
                                        {path.map((p) => (
                                            <div className="cart-item-row" key={p.slug}>
                                                {p.tokenId != null ? (
                                                    <div className="cart-item-thumb cart-art-thumb" aria-hidden="true">
                                                        <BenchArt slug={p.slug} id={p.tokenId} />
                                                    </div>
                                                ) : (
                                                    <div className="cart-item-thumb cart-art-thumb pal-thumb-none" aria-hidden="true" />
                                                )}
                                                <div className="cart-item-meta">
                                                    <div className="cart-item-name">
                                                        {p.title}{p.tokenId != null ? ` #${p.tokenId}` : ''}
                                                    </div>
                                                    <div className="cart-item-artist">
                                                        {p.tokenId == null
                                                            ? 'no live listing — watch the market'
                                                            : p.rarity
                                                                ? `rarity #${p.rarity.rank} of ${p.rarity.total}`
                                                                : 'listed now'}
                                                    </div>
                                                </div>
                                                <div className="cart-item-price">
                                                    {p.priceEth != null ? formatEth(p.priceEth) : '—'}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="cart-panel-totals">
                                            <div className="cart-panel-subtotal-row">
                                                <span className="cart-panel-subtotal-label">
                                                    Path · {buyable.length} of {path.length} listed
                                                </span>
                                                <span className="cart-panel-subtotal-val">{formatEth(pathTotal)} ETH</span>
                                            </div>
                                        </div>
                                        {/* In the Suite the total sits on the
                                            line directly above, so the button
                                            says what it DOES and stops there —
                                            an app action, not a checkout slab
                                            (Brendon, 2026-07-28). The sheet
                                            keeps its full-width call. */}
                                        <button
                                            type="button"
                                            className="cart-panel-buy-all"
                                            onClick={addPathToCart}
                                            disabled={buyable.length === 0}
                                        >
                                            {inline
                                                ? 'ADD PATH TO CART'
                                                : `ADD  PATH  TO  CART  ·  ${formatEth(pathTotal)} ETH`}
                                        </button>
                                    </>
                                )}
                            </>
                        )
                    ) : loadingProfit ? (
                        <div className="mk-story-loading">Reading your portfolio…</div>
                    ) : (
                        <>
                            {/* The portfolio tiles — the Ledger's tile chrome. */}
                            <div className="cpl-tiles">
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{`⬚${VS15}`} PIECES</span>
                                    <span className="cpl-tile-value">{holdings?.total ?? 0}</span>
                                </div>
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{`◊${VS15}`} SPENT</span>
                                    <span className="cpl-tile-value">{formatEth(holdings?.spent ?? 0)}</span>
                                </div>
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{`✹${VS15}`} AT FLOOR</span>
                                    <span className="cpl-tile-value">{formatEth(atFloor)}</span>
                                </div>
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{`ƒ${VS15}`} NET</span>
                                    <span className="cpl-tile-value">{`${net >= 0 ? '+' : '−'}${formatEth(Math.abs(net))}`}</span>
                                </div>
                            </div>

                            {/* THE HOT READ — what's moving, and what it means for you. */}
                            {hot && (
                                <div className="cpl-close pal-hot">
                                    <span className="cpl-close-head">HOT — {hot.title}</span>
                                    <span className="cpl-close-line">
                                        {hot.moves} market moves on the tape
                                        {hot.floor != null ? ` · floor ${formatEth(hot.floor)} ETH` : ' · no live floor'}
                                    </span>
                                    <span className="cpl-close-line">
                                        {hot.held && hot.held.exitNet != null
                                            ? `you hold ${hot.held.count} — exit nets ${formatEth(hot.held.exitNet)} ETH`
                                            : hot.floor != null
                                                ? `get in from ${formatEth(hot.floor)} ETH`
                                                : 'no live listing to get in on'}
                                    </span>
                                </div>
                            )}

                            {portfolio.length === 0 ? (
                                <div className="cart-empty-state">
                                    Nothing collected yet — profit paths start with a first piece.
                                </div>
                            ) : (
                                portfolio.map((r) => (
                                    <div className="pal-hold" key={r.slug}>
                                        <div className="pal-hold-head">
                                            <a className="pal-hold-name" href={`/art/${r.slug}`}>{r.title}</a>
                                            <span className="pal-hold-stat">
                                                {r.count} held{r.floor != null ? ` · floor ${formatEth(r.floor)}` : ''}
                                                {r.value != null ? ` · ${formatEth(r.value)} ETH` : ' · no live floor'}
                                            </span>
                                        </div>
                                        {r.exitNet != null && (
                                            <div className="pal-hold-paths">
                                                <span className="pal-hold-path">EXIT ALL nets {formatEth(r.exitNet)} ETH</span>
                                                {r.count > 1 && r.trimNet != null && (
                                                    <span className="pal-hold-path">
                                                        TRIM #{r.trimTokenId} nets {formatEth(r.trimNet)} ETH
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            <div className="cpl-foot">paths priced at live floors · 5% royalty + gas, the Calc&apos;s rate card</div>
                        </>
                    )}
        </>
    );

    /* The Suite's PriceCalc — the Pal in the Suite's one presentation. */
    if (inline) {
        return (
            <SuitePane
                id="Pal"
                title={tab === 'purchase' ? 'PURCHASE PAL' : 'PROFIT PAL'}
                className="suite-pal"
            >
                {body}
            </SuitePane>
        );
    }

    return createPortal(
        <div className={wrapClass} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div className="cart-panel-box" onClick={(e) => e.stopPropagation()}>
                <div className="cart-panel-header">
                    <span className="cart-panel-title">
                        {tab === 'purchase' ? 'PURCHASE PAL' : 'PROFIT PAL'}
                    </span>
                    <span className="cart-panel-close-x" role="button" tabIndex={0} onClick={close} title="Close">
                        {`×${VS15}`}
                    </span>
                </div>

                <div className="cart-items-list">
                    {body}
                </div>
            </div>
        </div>,
        document.body,
    );
}
