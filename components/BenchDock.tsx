'use client';

/*
 * BenchDock — THE Bench. One bottom tab, nothing else.
 *
 * It peeks up the instant you start hold-dragging an artwork (the ghost follows
 * your finger/cursor). You drop pieces onto the tab; they live in it, side by
 * side — artwork, price, floor delta, your Note — with a Portrait↔Landscape
 * split and a one-tap image export. Dismiss (×) clears it. Listed pieces can
 * also be dropped on the small CART target that appears beside it while dragging.
 *
 * There is no button and no separate panel — this tab is the whole feature.
 */

import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { useBench, type BenchItem } from '../lib/state/BenchContext';
import { useCart } from '../lib/state/CartContext';
import {
    subscribeBenchDrag,
    getBenchDrag,
    getBenchDragServer,
} from '../lib/state/benchDragStore';
import { useProject, ProjectProvider } from '../lib/state/ProjectContext';
import { useToast } from '../lib/state/ToastContext';
import { useNotePrompt } from '../lib/state/NotePromptContext';
import { renderNoteMarkdown } from '../lib/calendar/utils';
import BenchArt from './bench/BenchArt';

const VS15 = '︎';
const RETRACT_MS = 260;
/* The open comparison paints the art crisp (the whole point is comparing); the
   drag ghost + cart thumbs stay light at the default (Brendon 2026-06-23). */
const BENCH_CARD_RES = 1200;

interface ItemInfo { listed: boolean; title: string; priceStr: string; deltaStr: string }

function parseEth(price: string | null | undefined): number {
    if (!price) return 0;
    const n = parseFloat(price);
    return Number.isFinite(n) ? n : 0;
}
function keyOf(it: BenchItem): string { return `${it.slug}:${it.id}`; }

/* Read one piece's private Note from localStorage (the existing pd_token_notes
   scheme) and re-read when a note is edited anywhere. */
function useOutputNote(id: number): string {
    const read = useCallback(() => {
        if (typeof window === 'undefined') return '';
        try {
            const raw = window.localStorage.getItem('pd_token_notes');
            if (!raw) return '';
            const map = JSON.parse(raw) as Record<string, string>;
            return map[String(id)] || '';
        } catch { return ''; }
    }, [id]);
    const [note, setNote] = useState('');
    useEffect(() => {
        setNote(read());
        const onChange = () => setNote(read());
        window.addEventListener('pd:notes-changed', onChange);
        window.addEventListener('storage', onChange);
        return () => {
            window.removeEventListener('pd:notes-changed', onChange);
            window.removeEventListener('storage', onChange);
        };
    }, [read]);
    return note;
}

const BenchCard = memo(function BenchCard({
    slug, id, title, priceStr, deltaStr, listed, onRemove, onAddToCart,
}: {
    slug: string; id: number; title: string; priceStr: string | null; deltaStr: string;
    listed: boolean;
    onRemove: (slug: string, id: number) => void;
    onAddToCart: (slug: string, id: number) => void;
}) {
    const note = useOutputNote(id);
    const { openOutputNoteEditor } = useNotePrompt();
    const deltaClass = deltaStr.startsWith('+') ? ' up' : deltaStr.startsWith('-') ? ' down' : '';
    return (
        <div className="bench-card" data-bench-card={`${slug}:${id}`}>
            <button
                className="bench-card-remove"
                type="button"
                aria-label="Remove from bench"
                title="Remove"
                onClick={() => onRemove(slug, id)}
            >
                {`×${VS15}`}
            </button>
            <div className="bench-card-art">
                <BenchArt slug={slug} id={id} res={BENCH_CARD_RES} />
            </div>
            <div className="bench-card-meta">
                <div className="bench-card-name-row">
                    <span className="bench-card-name">{title} #{id}</span>
                    {listed && (
                        <span
                            className="hi-icon hi-cart bench-card-cart"
                            role="button"
                            tabIndex={0}
                            aria-label="Add to Cart"
                            title="Add to Cart"
                            onClick={() => onAddToCart(slug, id)}
                        >
                            {`▢${VS15}`}
                        </span>
                    )}
                </div>
                <div className="bench-card-stats">
                    <span className="bench-card-price">{priceStr ?? 'Unlisted'}</span>
                    {deltaStr && <span className={`bench-card-delta${deltaClass}`}>{deltaStr}</span>}
                </div>
                <div
                    className="bench-card-note"
                    role="button"
                    tabIndex={0}
                    title={note ? 'Edit Note' : 'Add Note'}
                    onClick={() => openOutputNoteEditor(id, note || undefined, slug)}
                >
                    {note
                        ? <span dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(note) }} />
                        : <span className="bench-card-note-empty">+ note</span>}
                </div>
            </div>
        </div>
    );
});

function BenchGroup({
    slug, ids, onRemove, onAddToCart, reportInfo,
}: {
    slug: string; ids: number[];
    onRemove: (slug: string, id: number) => void;
    onAddToCart: (slug: string, id: number) => void;
    reportInfo: (key: string, info: ItemInfo | null) => void;
}) {
    const { title, outputs, floorEth } = useProject();
    const rows = ids.map((id) => {
        const meta = outputs.get(id);
        const priceStr = meta?.price ?? null;
        const eth = parseEth(meta?.price);
        const listed = !!meta?.price;
        let deltaStr = '';
        if (listed && floorEth > 0) {
            const pct = (eth / floorEth - 1) * 100;
            deltaStr = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '% floor';
        }
        return { id, priceStr, deltaStr, listed };
    });
    useEffect(() => {
        for (const r of rows) {
            reportInfo(`${slug}:${r.id}`, {
                listed: r.listed, title, priceStr: r.priceStr ?? 'Unlisted', deltaStr: r.deltaStr,
            });
        }
        return () => { for (const r of rows) reportInfo(`${slug}:${r.id}`, null); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, title, floorEth, JSON.stringify(rows)]);
    return (
        <>
            {rows.map((r) => (
                <BenchCard
                    key={`${slug}:${r.id}`}
                    slug={slug}
                    id={r.id}
                    title={title}
                    priceStr={r.priceStr}
                    deltaStr={r.deltaStr}
                    listed={r.listed}
                    onRemove={onRemove}
                    onAddToCart={onAddToCart}
                />
            ))}
        </>
    );
}

export default function BenchDock() {
    const { items, orientation, fit, expanded, remove, clear, toggleOrientation, toggleFit, expand, collapse } = useBench();
    const { add: cartAdd, has: cartHas } = useCart();
    const drag = useSyncExternalStore(subscribeBenchDrag, getBenchDrag, getBenchDragServer);
    const { showToast } = useToast();

    /* Bench → Cart feeder: each listed piece carries the add-to-cart icon. */
    const onAddToCart = useCallback(
        (slug: string, id: number) => {
            if (cartHas(slug, id)) { showToast('Cart: ALREADY IN'); return; }
            cartAdd(slug, id);
            showToast('Cart: ADDED');
        },
        [cartAdd, cartHas, showToast],
    );

    const engaged = !!drag?.engaged;
    const listed = !!drag?.listed;
    const hasItems = items.length > 0;
    const visible = engaged || hasItems;

    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);
    const [exporting, setExporting] = useState(false);
    const retractTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tabRef = useRef<HTMLDivElement | null>(null);
    const infoRef = useRef<Record<string, ItemInfo>>({});

    useEffect(() => {
        if (visible) {
            if (retractTimer.current) { clearTimeout(retractTimer.current); retractTimer.current = null; }
            setMounted(true);
            const raf = requestAnimationFrame(() => setActive(true));
            return () => cancelAnimationFrame(raf);
        }
        setActive(false);
        retractTimer.current = setTimeout(() => { setMounted(false); retractTimer.current = null; }, RETRACT_MS);
        return () => { if (retractTimer.current) { clearTimeout(retractTimer.current); retractTimer.current = null; } };
    }, [visible]);

    const groups = useMemo(() => {
        const m = new Map<string, number[]>();
        for (const it of items) {
            const arr = m.get(it.slug) ?? [];
            arr.push(it.id);
            m.set(it.slug, arr);
        }
        return [...m.entries()];
    }, [items]);

    const reportInfo = useCallback((key: string, info: ItemInfo | null) => {
        if (info) infoRef.current[key] = info;
        else delete infoRef.current[key];
    }, []);

    const onToggleOrientation = useCallback(() => {
        toggleOrientation();
        showToast(orientation === 'portrait' ? 'Bench: LANDSCAPE' : 'Bench: PORTRAIT');
    }, [toggleOrientation, orientation, showToast]);

    const onToggleFit = useCallback(() => {
        toggleFit();
        showToast(fit ? 'Bench: SCROLL' : 'Bench: FIT BOTH');
    }, [toggleFit, fit, showToast]);

    const onDismiss = useCallback(() => {
        clear();
        showToast('Bench: CLEARED');
    }, [clear, showToast]);

    /* Compose the whole comparison into one PNG → native share sheet (iOS) or
       a download. Reads the live card canvases so the export is what's on screen. */
    const onExport = useCallback(async () => {
        const root = tabRef.current;
        if (!root || items.length === 0 || exporting) return;
        setExporting(true);
        try {
            const tiles = items
                .map((it) => {
                    const card = root.querySelector(`[data-bench-card="${it.slug}:${it.id}"]`);
                    const canvas = card?.querySelector('canvas') as HTMLCanvasElement | null;
                    return canvas ? { it, canvas, info: infoRef.current[keyOf(it)] } : null;
                })
                .filter((t): t is { it: BenchItem; canvas: HTMLCanvasElement; info: ItemInfo } => !!t);
            if (!tiles.length) { showToast('Export: NOTHING TO SHARE'); return; }

            const css = getComputedStyle(document.body);
            const bg = css.getPropertyValue('--bg-color').trim() || '#111';
            const fg = css.getPropertyValue('--text-color').trim() || '#e0e0e0';
            const TILE = 460, GAP = 28, PAD = 40, HEADER = 64, LABEL = 96;
            const isRow = orientation === 'portrait';
            const artH = (c: HTMLCanvasElement) => Math.round(TILE * (c.height / Math.max(1, c.width)));
            const maxArtH = Math.max(...tiles.map((t) => artH(t.canvas)));
            let W: number, H: number;
            if (isRow) {
                W = PAD * 2 + tiles.length * TILE + (tiles.length - 1) * GAP;
                H = PAD * 2 + HEADER + maxArtH + LABEL;
            } else {
                W = PAD * 2 + TILE;
                H = PAD * 2 + HEADER + tiles.reduce((a, t) => a + artH(t.canvas) + LABEL + GAP, 0) - GAP;
            }
            const out = document.createElement('canvas');
            out.width = W; out.height = H;
            const ctx = out.getContext('2d');
            if (!ctx) { showToast('Export: FAILED'); return; }
            ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = fg; ctx.textBaseline = 'top';
            ctx.font = '700 30px "Courier New", monospace';
            ctx.fillText('THE BENCH', PAD, PAD);
            ctx.font = '400 18px "Courier New", monospace';
            ctx.globalAlpha = 0.6; ctx.fillText('pricediscussion', PAD, PAD + 34); ctx.globalAlpha = 1;
            const drawLabel = (x: number, y: number, info: ItemInfo, it: BenchItem) => {
                ctx.fillStyle = fg;
                ctx.font = '700 22px "Courier New", monospace';
                ctx.fillText(`${info?.title ?? it.slug.toUpperCase()} #${it.id}`, x, y);
                ctx.font = '400 20px "Courier New", monospace';
                ctx.fillText(info?.priceStr ?? 'Unlisted', x, y + 30);
                if (info?.deltaStr) { ctx.globalAlpha = 0.6; ctx.fillText(info.deltaStr, x, y + 56); ctx.globalAlpha = 1; }
            };
            if (isRow) {
                tiles.forEach((t, i) => {
                    const x = PAD + i * (TILE + GAP), y = PAD + HEADER, h = artH(t.canvas);
                    ctx.drawImage(t.canvas, x, y, TILE, h);
                    drawLabel(x, y + h + 16, t.info, t.it);
                });
            } else {
                let y = PAD + HEADER;
                tiles.forEach((t) => {
                    const h = artH(t.canvas);
                    ctx.drawImage(t.canvas, PAD, y, TILE, h);
                    drawLabel(PAD, y + h + 16, t.info, t.it);
                    y += h + LABEL + GAP;
                });
            }
            const blob: Blob | null = await new Promise((res) => out.toBlob(res, 'image/png'));
            if (!blob) { showToast('Export: FAILED'); return; }
            const file = new File([blob], 'the-bench.png', { type: 'image/png' });
            const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
            if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
                try { await nav.share({ files: [file], title: 'The Bench' } as ShareData); showToast('Bench: SHARED'); }
                catch (err) { if ((err as Error)?.name !== 'AbortError') showToast('Share: CANCELLED'); }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'the-bench.png'; a.click();
                URL.revokeObjectURL(url);
                showToast('Bench: IMAGE SAVED');
            }
        } finally {
            setExporting(false);
        }
    }, [items, orientation, exporting, showToast]);

    const showFull = expanded && hasItems;
    /* Fit/Wide = two triangles pointing along the split's axis: toward each other
       = fit both on screen, apart = wide/full-size. Vertical glyphs in the
       stacked split, horizontal in side-by-side (Brendon, 2026-06-16). */
    const fitGlyph = orientation === 'landscape'
        ? (fit ? '▾▴' : '▴▾')
        : (fit ? '▸◂' : '◂▸');
    const tabClass = [
        'bench-tab',
        mounted ? 'mounted' : '',
        active ? 'active' : '',
        orientation,
        engaged ? 'dragging' : '',
        drag?.armed === 'bench' ? 'armed' : '',
        showFull ? 'expanded' : 'collapsed',
    ].filter(Boolean).join(' ');

    /* Tap the peek bar to pull the comparison up; tap again (or the chevron) to
       recede. Never while dragging — adding art keeps the viewport clear. */
    const onTitleTap = useCallback(() => {
        if (!hasItems || engaged) return;
        if (showFull) collapse(); else expand();
    }, [hasItems, engaged, showFull, collapse, expand]);

    return (
        <div className="bench-dock-layer" aria-hidden={!visible}>
            {/* The lifted piece following the pointer. */}
            {drag && engaged && (
                <div
                    className="bench-ghost"
                    style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0) translate(-50%, -50%)` }}
                >
                    <div className="bench-ghost-art-wrap">
                        <BenchArt slug={drag.slug} id={drag.id} className="bench-ghost-art" />
                    </div>
                    <span className="bench-ghost-tag">#{drag.id}</span>
                </div>
            )}

            {/* The CART drop target — only while dragging a listed piece. */}
            {engaged && listed && (
                <div
                    className={`bench-cart-target${drag?.armed === 'cart' ? ' armed' : ''}`}
                    data-bench-drop="cart"
                >
                    <span className="bench-cart-target-icon">{'▢'}</span>
                    <span className="bench-cart-target-label">
                        {drag?.armed === 'cart' ? 'DROP TO BUY' : 'CART'}
                    </span>
                </div>
            )}

            {/* THE BENCH — the one tab. Peek bar by default; the drop target
                while dragging; the full comparison only when tapped open. */}
            {mounted && showFull && (
                <div className="bench-backdrop" onClick={collapse} aria-hidden="true" />
            )}
            {mounted && (
                <div className={tabClass} ref={tabRef} data-bench-drop="bench">
                    <div className="bench-tab-grip" aria-hidden="true" />
                    <div className="bench-tab-header">
                        <button
                            className="bench-tab-titlebtn"
                            type="button"
                            onClick={onTitleTap}
                            disabled={!hasItems || engaged}
                            aria-expanded={showFull}
                        >
                            <span className="bench-tab-title">THE BENCH</span>
                            {hasItems && <span className="bench-tab-count">({items.length})</span>}
                            {hasItems && !showFull && !engaged && (
                                <span className="bench-tab-hint">· tap to compare</span>
                            )}
                            {engaged && (
                                <span className="bench-tab-hint">
                                    {drag?.armed === 'bench' ? '· drop to add' : '· drag here'}
                                </span>
                            )}
                            {showFull && <span className="bench-tab-chevron" aria-hidden="true">▾</span>}
                        </button>
                        {showFull && (
                            <div className="bench-tab-actions">
                                <button
                                    className="bench-tab-btn"
                                    type="button"
                                    onClick={onToggleOrientation}
                                    title={orientation === 'portrait' ? 'Switch to Landscape split' : 'Switch to Portrait split'}
                                >
                                    {orientation === 'portrait' ? '◫' : '⬒'}
                                </button>
                                <button
                                    className="bench-tab-btn"
                                    type="button"
                                    onClick={onToggleFit}
                                    aria-pressed={fit}
                                    title={fit ? 'Wide view (full size)' : 'Fit both on screen'}
                                >
                                    {fitGlyph}
                                </button>
                                <button
                                    className="bench-tab-btn"
                                    type="button"
                                    onClick={onExport}
                                    disabled={exporting}
                                    title="Export as image"
                                >
                                    {exporting ? '…' : `⍈${VS15}`}
                                </button>
                                <button
                                    className="bench-tab-btn dismiss"
                                    type="button"
                                    onClick={onDismiss}
                                    title="Clear the bench"
                                >
                                    {`×${VS15}`}
                                </button>
                            </div>
                        )}
                    </div>

                    {showFull && (
                        <div className={`bench-grid ${orientation} ${fit ? 'fit' : 'wide'}`}>
                            {groups.map(([slug, ids]) => (
                                <ProjectProvider key={slug} slug={slug}>
                                    <BenchGroup slug={slug} ids={ids} onRemove={remove} onAddToCart={onAddToCart} reportInfo={reportInfo} />
                                </ProjectProvider>
                            ))}
                        </div>
                    )}
                    {engaged && !hasItems && (
                        <div className="bench-drop-hint">Drop the piece here to compare outputs</div>
                    )}
                </div>
            )}
        </div>
    );
}
