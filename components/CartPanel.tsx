'use client';

/*
 * CartPanel
 *
 * Sim id #cartPanelWrap — sim.html 5075–5096. The bulk-buy slide-up
 * panel: items list with thumbnails / name / artist / price / remove ×,
 * subtotal + fees row, single BUY ALL action.
 *
 * Sim refs:
 *   markup ............. sim.html 5075–5096
 *   render logic ....... sim.html 11757–11821 (_renderCartPanel)
 *   open/close ......... sim.html 11854–11868 (mounted/active two-stage)
 *   buy all ............ sim.html 11870–11881 (mock toast + clear + close)
 *
 * State source: CartContext.useCart() — items / panelOpen / mutators all
 * consumed from the same provider that drives the navbar Cart button.
 *
 * Output meta source: useProject().outputs at the top level (one Map
 * lookup per id during the subtotal pass). Sim reads `metaCache[id]`
 * directly in _renderCartPanel for the same reason — avoids per-row
 * hook overhead. Mock thumbnails follow OutputPreview's HSL gradient
 * pattern, deterministic per id so each row reads as a distinct piece.
 *
 * Two-stage display (matches sim 11857–11859 + 11862–11867):
 *   panelOpen=false  → wrapper has neither .mounted nor .active (display:none)
 *   panelOpen=true   → wrapper gets .mounted (flex), then .active next frame
 *                      (opacity:1 + box transform:translateY(0))
 *   panelOpen→false  → .active drops (fade + slide), .mounted drops 240ms later
 *
 * The 240ms unmount delay mirrors sim 11867 so the slide-down animation
 * runs before the panel's display:none re-applies.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import {
    useCart,
    CART_GAS_PER_ITEM,
    CART_FEE_RATE,
} from '../lib/state/CartContext';
import { useProject, ProjectProvider } from '../lib/state/ProjectContext';
import { useToast } from '../lib/state/ToastContext';
import { useBench } from '../lib/state/BenchContext';
import BenchArt from './bench/BenchArt';

const VS15 = '\uFE0E';
const UNMOUNT_DELAY_MS = 240;

/* Parse "0.123 ETH" → 0.123. Returns 0 for null/unparsable. */
function parseEth(price: string | null | undefined): number {
    if (!price) return 0;
    const n = parseFloat(price);
    return Number.isFinite(n) ? n : 0;
}

/* Sim 11819 BUY label format: "BUY  ALL  ·  0.123 ETH" — double-spaces
   + middle dot. Reproduced verbatim because the typography matters. */
function formatBuyLabel(total: number): string {
    return `BUY  ALL  \u00B7  ${total.toFixed(3)} ETH`;
}

interface RowProps {
    slug: string;
    id: number;
    projectTitle: string;
    priceStr: string;
    deltaStr: string;
    onRemove: (slug: string, id: number) => void;
    onBench: (slug: string, id: number) => void;
}

function CartItemRow({ slug, id, projectTitle, priceStr, deltaStr, onRemove, onBench }: RowProps) {
    const deltaClass =
        deltaStr.startsWith('+') ? ' over' : deltaStr.startsWith('-') ? ' under' : '';
    return (
        <div className="cart-item-row" data-mint-id={id}>
            <div className="cart-item-thumb cart-art-thumb" aria-hidden="true">
                <BenchArt slug={slug} id={id} />
            </div>
            <div className="cart-item-meta">
                <div className="cart-item-name">
                    {projectTitle} #{id}
                    {deltaStr && <span className={`cart-item-delta${deltaClass}`}>{deltaStr}</span>}
                </div>
                <div className="cart-item-artist">by @claude</div>
            </div>
            <div className="cart-item-price">{priceStr}</div>
            <div className="cart-item-actions">
                <button
                    className="cart-item-bench"
                    type="button"
                    title="Move to Bench to compare"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBench(slug, id);
                    }}
                >
                    {'\u25A6'}
                </button>
                <span
                    className="cart-item-remove"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(slug, id);
                    }}
                    title="Remove"
                >
                    {`\u00D7${VS15}`}
                </span>
            </div>
        </div>
    );
}

/* One Project's cart rows, mounted under that Project's provider so each row
   reads its OWN live title + listing price + floor (the cart spans many
   Projects). Reports both its price subtotal and its floor basis up to the
   panel for the cross-Project total + savings-vs-floor readout. */
function CartGroup({
    slug,
    ids,
    onSubtotal,
    onFloor,
    onRemove,
    onBench,
}: {
    slug: string;
    ids: number[];
    onSubtotal: (slug: string, eth: number) => void;
    onFloor: (slug: string, eth: number) => void;
    onRemove: (slug: string, id: number) => void;
    onBench: (slug: string, id: number) => void;
}) {
    const { title, outputs, floorEth } = useProject();
    const rows = ids.map((id) => {
        const meta = outputs.get(id);
        const listed = !!meta?.price;
        const eth = parseEth(meta?.price);
        let deltaStr = '';
        if (listed && floorEth > 0) {
            const pct = (eth / floorEth - 1) * 100;
            deltaStr = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
        }
        return { id, eth, listed, deltaStr, priceStr: listed ? eth.toFixed(3) : '\u2014' };
    });
    const sub = rows.reduce((a, r) => a + r.eth, 0);
    const floorBasis = rows.reduce((a, r) => a + (r.listed ? floorEth : 0), 0);
    useEffect(() => {
        onSubtotal(slug, sub);
        onFloor(slug, floorBasis);
    }, [slug, sub, floorBasis, onSubtotal, onFloor]);
    // Zero this group's contribution only when it leaves the cart (unmount /
    // slug change), not on every price update.
    useEffect(() => () => { onSubtotal(slug, 0); onFloor(slug, 0); }, [slug, onSubtotal, onFloor]);
    return (
        <>
            {rows.map((r) => (
                <CartItemRow
                    key={`${slug}:${r.id}`}
                    slug={slug}
                    id={r.id}
                    projectTitle={title}
                    priceStr={r.priceStr}
                    deltaStr={r.deltaStr}
                    onRemove={onRemove}
                    onBench={onBench}
                />
            ))}
        </>
    );
}

export default function CartPanel() {
    const { items, panelOpen, remove, buyAll, closePanel } = useCart();
    const { showToast } = useToast();
    const { add: benchAdd } = useBench();

    /* Two-stage mounted/active classes per sim 11854–11868. */
    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);
    const [buying, setBuying] = useState(false);
    const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (panelOpen) {
            // Cancel any pending unmount from a prior close cycle.
            if (unmountTimer.current) {
                clearTimeout(unmountTimer.current);
                unmountTimer.current = null;
            }
            setMounted(true);
            // Add .active next frame so CSS transitions on opacity/transform fire.
            const raf = requestAnimationFrame(() => setActive(true));
            return () => cancelAnimationFrame(raf);
        }
        // Closing: drop .active immediately, schedule .mounted off after
        // animation. Sim uses 240ms — keep parity.
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
    }, [panelOpen]);

    /* Group the cart by Project so each group mounts under its own provider and
       reads its own live title + listing price (the cart spans many Projects). */
    const groups = useMemo(() => {
        const m = new Map<string, number[]>();
        for (const it of items) {
            const arr = m.get(it.slug) ?? [];
            arr.push(it.id);
            m.set(it.slug, arr);
        }
        return [...m.entries()];
    }, [items]);

    /* Per-Project subtotals reported up from each group; summed for the total. */
    const [subs, setSubs] = useState<Record<string, number>>({});
    const reportSub = useCallback((slug: string, eth: number) => {
        setSubs((prev) => (prev[slug] === eth ? prev : { ...prev, [slug]: eth }));
    }, []);
    const subtotal = groups.reduce((a, [slug]) => a + (subs[slug] ?? 0), 0);

    /* Per-Project floor basis (floor × listed count) → savings-vs-floor. */
    const [floors, setFloors] = useState<Record<string, number>>({});
    const reportFloor = useCallback((slug: string, eth: number) => {
        setFloors((prev) => (prev[slug] === eth ? prev : { ...prev, [slug]: eth }));
    }, []);
    const floorBasis = groups.reduce((a, [slug]) => a + (floors[slug] ?? 0), 0);
    const savings = floorBasis - subtotal; // positive = buying under floor

    /* Fees model — sim 11815: 8% on subtotal + flat gas × N. */
    const fees = subtotal * CART_FEE_RATE + CART_GAS_PER_ITEM * items.length;
    const total = subtotal + fees;

    /* Move a queued piece onto the Bench to compare before committing. */
    const onBench = useCallback(
        (slug: string, id: number) => {
            const r = benchAdd(slug, id);
            if (r === 'present') showToast('Bench: ALREADY ON IT');
            else if (r === 'full') showToast('Bench: FULL · 8 max');
            else showToast('Bench: ADDED');
        },
        [benchAdd, showToast],
    );

    /* Backdrop click — close iff target is the wrapper itself, not the box. */
    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) closePanel();
        },
        [closePanel]
    );

    /* Continuous-motion sweep while the (mock) buy resolves \u2014 the UI must
       always read as moving forward (CLAUDE.md \u00A79), never a frozen tap. */
    const onBuyAll = useCallback(() => {
        if (items.length === 0 || buying) return;
        setBuying(true);
        setTimeout(() => {
            setBuying(false);
            const n = buyAll();
            if (n > 0) {
                showToast(`Sweep complete \u00B7 ${n} token${n === 1 ? '' : 's'} acquired`);
            }
        }, 900);
    }, [items.length, buying, buyAll, showToast]);

    const isEmpty = items.length === 0;

    /* sim's two-stage classes: .cart-panel-wrap → .mounted (flex) →
       .active (opacity:1 + slide). */
    const wrapClass = [
        'cart-panel-wrap',
        mounted ? 'mounted' : '',
        active ? 'active' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={wrapClass}
            id="cartPanelWrap"
            onClick={onBackdropClick}
        >
            <div
                className="cart-panel-box"
                id="cartPanelBox"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="cart-panel-header">
                    <span className="cart-panel-title">
                        CART
                        <span
                            className="cart-panel-title-count"
                            id="cartPanelCount"
                        >
                            ({items.length})
                        </span>
                    </span>
                    <span
                        className="cart-panel-close-x"
                        role="button"
                        tabIndex={0}
                        onClick={closePanel}
                        title="Close"
                    >
                        {`\u00D7${VS15}`}
                    </span>
                </div>

                <div className="cart-items-list" id="cartItemsList">
                    {isEmpty ? (
                        <div className="cart-empty-state">
                            Your cart is empty.
                            <span className="cart-empty-feeders">
                                Add listed pieces from the gallery, the Bench, or your Wishlist.
                            </span>
                        </div>
                    ) : (
                        groups.map(([slug, ids]) => (
                            <ProjectProvider key={slug} slug={slug}>
                                <CartGroup
                                    slug={slug}
                                    ids={ids}
                                    onSubtotal={reportSub}
                                    onFloor={reportFloor}
                                    onRemove={remove}
                                    onBench={onBench}
                                />
                            </ProjectProvider>
                        ))
                    )}
                </div>

                <div className="cart-panel-totals" id="cartPanelTotals">
                    <div className="cart-panel-subtotal-row">
                        <span className="cart-panel-subtotal-label">
                            Subtotal
                        </span>
                        <span
                            className="cart-panel-subtotal-val"
                            id="cartPanelSubtotal"
                        >
                            {subtotal.toFixed(3)} ETH
                        </span>
                    </div>
                    <div className="cart-panel-fees-row">
                        <span>{`+ fees \u00B7 gas est`}</span>
                        <span id="cartPanelFees">
                            ~{fees.toFixed(3)} ETH
                        </span>
                    </div>
                    {subtotal > 0 && Math.abs(savings) >= 0.0005 && (
                        <div className="cart-panel-savings-row">
                            <span>{savings >= 0 ? 'vs floor' : 'over floor'}</span>
                            <span className={savings >= 0 ? 'save-good' : 'save-over'}>
                                {savings >= 0 ? '\u2212' : '+'}{Math.abs(savings).toFixed(3)} ETH
                            </span>
                        </div>
                    )}
                </div>

                <button
                    className="cart-panel-buy-all"
                    id="cartPanelBuyAll"
                    type="button"
                    onClick={onBuyAll}
                    disabled={isEmpty || buying}
                >
                    {buying && <span className="cart-buy-sweep" aria-hidden="true" />}
                    {buying ? 'SWEEPING\u2026' : formatBuyLabel(total)}
                </button>
            </div>
        </div>
    );
}
