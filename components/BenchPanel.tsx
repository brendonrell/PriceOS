'use client';

/*
 * BenchPanel — The Bench comparison tray (OS Tool / Comparison, ClickUp 86b9jfjc3).
 *
 * Pieces hold-dragged onto the bench line up here side by side: artwork, price,
 * floor delta, and YOUR Note, all visible together. One button flips the split
 * between Portrait (columns) and Landscape (stacked rows) — Brendon's ask. One
 * button exports the whole comparison as a single shareable image (native share
 * sheet on iOS, download elsewhere). And, because the bench is a feeder for the
 * Cart the same way Wishlist is, listed pieces drop straight into the Cart from
 * here — per-row and "ADD LISTED → CART" in one tap.
 *
 * Grouped by Project under ProjectProvider (like CartPanel) so every row reads
 * its own live title / price / floor. Ephemeral: closing keeps the set for the
 * session; CLEAR empties it; nothing is persisted.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useBench, type BenchItem } from '../lib/state/BenchContext';
import { useCart } from '../lib/state/CartContext';
import { useProject, ProjectProvider } from '../lib/state/ProjectContext';
import { useToast } from '../lib/state/ToastContext';
import { useNotePrompt } from '../lib/state/NotePromptContext';
import { renderNoteMarkdown } from '../lib/calendar/utils';
import BenchArt from './bench/BenchArt';

const VS15 = '︎';
const UNMOUNT_DELAY_MS = 240;

/** Live per-piece info lifted from each Project group → feeds the cart
 *  feeder button + the image export labels. */
interface ItemInfo {
    listed: boolean;
    title: string;
    priceStr: string;
    deltaStr: string;
}

function parseEth(price: string | null | undefined): number {
    if (!price) return 0;
    const n = parseFloat(price);
    return Number.isFinite(n) ? n : 0;
}

function keyOf(it: BenchItem): string {
    return `${it.slug}:${it.id}`;
}

/* Read one piece's private Note from localStorage (keyed by id, the existing
   pd_token_notes scheme) and re-read when a note is edited anywhere. */
function useOutputNote(id: number): string {
    const read = useCallback(() => {
        if (typeof window === 'undefined') return '';
        try {
            const raw = window.localStorage.getItem('pd_token_notes');
            if (!raw) return '';
            const map = JSON.parse(raw) as Record<string, string>;
            return map[String(id)] || '';
        } catch {
            return '';
        }
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

interface CardProps {
    slug: string;
    id: number;
    title: string;
    priceStr: string | null;
    deltaStr: string;
    listed: boolean;
    onRemove: (slug: string, id: number) => void;
    onToCart: (slug: string, id: number) => void;
}

function BenchCard({ slug, id, title, priceStr, deltaStr, listed, onRemove, onToCart }: CardProps) {
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
                <BenchArt slug={slug} id={id} />
            </div>
            <div className="bench-card-meta">
                <div className="bench-card-name">{title} #{id}</div>
                <div className="bench-card-stats">
                    <span className="bench-card-price">{priceStr ?? 'Unlisted'}</span>
                    {deltaStr && <span className={`bench-card-delta${deltaClass}`}>{deltaStr}</span>}
                </div>
                <div
                    className="bench-card-note"
                    role="button"
                    tabIndex={0}
                    title={note ? 'Edit Note' : 'Add Note'}
                    onClick={() => openOutputNoteEditor(id, note || undefined)}
                >
                    {note ? (
                        <span dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(note) }} />
                    ) : (
                        <span className="bench-card-note-empty">+ note</span>
                    )}
                </div>
                {listed && (
                    <button
                        className="bench-card-cart"
                        type="button"
                        onClick={() => onToCart(slug, id)}
                    >
                        {`→ CART`}
                    </button>
                )}
            </div>
        </div>
    );
}

function BenchGroup({
    slug,
    ids,
    onRemove,
    onToCart,
    reportInfo,
}: {
    slug: string;
    ids: number[];
    onRemove: (slug: string, id: number) => void;
    onToCart: (slug: string, id: number) => void;
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

    /* Lift each piece's live info up for the cart feeder + export labels. */
    useEffect(() => {
        for (const r of rows) {
            reportInfo(`${slug}:${r.id}`, {
                listed: r.listed,
                title,
                priceStr: r.priceStr ?? 'Unlisted',
                deltaStr: r.deltaStr,
            });
        }
        return () => {
            for (const r of rows) reportInfo(`${slug}:${r.id}`, null);
        };
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
                    onToCart={onToCart}
                />
            ))}
        </>
    );
}

export default function BenchPanel() {
    const { items, panelOpen, orientation, closePanel, clear, remove, toggleOrientation } = useBench();
    const { add: cartAdd, has: cartHas } = useCart();
    const { showToast } = useToast();

    const [mounted, setMounted] = useState(false);
    const [active, setActive] = useState(false);
    const [exporting, setExporting] = useState(false);
    const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const boxRef = useRef<HTMLDivElement | null>(null);
    const infoRef = useRef<Record<string, ItemInfo>>({});

    useEffect(() => {
        if (panelOpen) {
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
    }, [panelOpen]);

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

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) closePanel();
        },
        [closePanel],
    );

    const onToCart = useCallback(
        (slug: string, id: number) => {
            if (cartHas(slug, id)) {
                showToast(`Cart: ALREADY IN`);
                return;
            }
            cartAdd(slug, id);
            showToast(`Cart: ADDED`);
        },
        [cartAdd, cartHas, showToast],
    );

    const addListedToCart = useCallback(() => {
        let added = 0;
        for (const it of items) {
            const info = infoRef.current[keyOf(it)];
            if (info?.listed && !cartHas(it.slug, it.id)) {
                cartAdd(it.slug, it.id);
                added++;
            }
        }
        showToast(added > 0 ? `Cart: ADDED · ${added}` : `Cart: NOTHING LISTED`);
    }, [items, cartAdd, cartHas, showToast]);

    const onToggleOrientation = useCallback(() => {
        toggleOrientation();
        showToast(orientation === 'portrait' ? 'Bench: LANDSCAPE' : 'Bench: PORTRAIT');
    }, [toggleOrientation, orientation, showToast]);

    const onClear = useCallback(() => {
        clear();
        showToast('Bench: CLEARED');
    }, [clear, showToast]);

    /* Compose the whole comparison into one PNG and hand it to the native
       share sheet (iOS) or a download. Reads the live card canvases so the
       export is exactly what's on screen. */
    const onExport = useCallback(async () => {
        const root = boxRef.current;
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

            if (!tiles.length) {
                showToast('Export: NOTHING TO SHARE');
                return;
            }

            const css = getComputedStyle(document.body);
            const bg = css.getPropertyValue('--bg-color').trim() || '#111';
            const fg = css.getPropertyValue('--text-color').trim() || '#e0e0e0';

            const TILE = 460;
            const GAP = 28;
            const PAD = 40;
            const HEADER = 64;
            const LABEL = 96;
            const isRow = orientation === 'portrait';

            const artH = (c: HTMLCanvasElement) =>
                Math.round(TILE * (c.height / Math.max(1, c.width)));
            const maxArtH = Math.max(...tiles.map((t) => artH(t.canvas)));

            let W: number;
            let H: number;
            if (isRow) {
                W = PAD * 2 + tiles.length * TILE + (tiles.length - 1) * GAP;
                H = PAD * 2 + HEADER + maxArtH + LABEL;
            } else {
                W = PAD * 2 + TILE;
                H = PAD * 2 + HEADER + tiles.reduce((a, t) => a + artH(t.canvas) + LABEL + GAP, 0) - GAP;
            }

            const out = document.createElement('canvas');
            out.width = W;
            out.height = H;
            const ctx = out.getContext('2d');
            if (!ctx) {
                showToast('Export: FAILED');
                return;
            }
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = fg;
            ctx.textBaseline = 'top';
            ctx.font = '700 30px "Courier New", monospace';
            ctx.fillText('THE BENCH', PAD, PAD);
            ctx.font = '400 18px "Courier New", monospace';
            ctx.globalAlpha = 0.6;
            ctx.fillText('pricediscussion', PAD, PAD + 34);
            ctx.globalAlpha = 1;

            const drawLabel = (x: number, y: number, w: number, info: ItemInfo, it: BenchItem) => {
                ctx.fillStyle = fg;
                ctx.font = '700 22px "Courier New", monospace';
                ctx.fillText(`${info?.title ?? it.slug.toUpperCase()} #${it.id}`, x, y);
                ctx.font = '400 20px "Courier New", monospace';
                ctx.fillText(info?.priceStr ?? 'Unlisted', x, y + 30);
                if (info?.deltaStr) {
                    ctx.globalAlpha = 0.6;
                    ctx.fillText(info.deltaStr, x, y + 56);
                    ctx.globalAlpha = 1;
                }
            };

            if (isRow) {
                tiles.forEach((t, i) => {
                    const x = PAD + i * (TILE + GAP);
                    const y = PAD + HEADER;
                    const h = artH(t.canvas);
                    ctx.drawImage(t.canvas, x, y, TILE, h);
                    drawLabel(x, y + h + 16, TILE, t.info, t.it);
                });
            } else {
                let y = PAD + HEADER;
                tiles.forEach((t) => {
                    const h = artH(t.canvas);
                    ctx.drawImage(t.canvas, PAD, y, TILE, h);
                    drawLabel(PAD, y + h + 16, TILE, t.info, t.it);
                    y += h + LABEL + GAP;
                });
            }

            const blob: Blob | null = await new Promise((res) => out.toBlob(res, 'image/png'));
            if (!blob) {
                showToast('Export: FAILED');
                return;
            }
            const file = new File([blob], 'the-bench.png', { type: 'image/png' });
            const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
            if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
                try {
                    await nav.share({ files: [file], title: 'The Bench' } as ShareData);
                    showToast('Bench: SHARED');
                } catch (err) {
                    if ((err as Error)?.name !== 'AbortError') showToast('Share: CANCELLED');
                }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'the-bench.png';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Bench: IMAGE SAVED');
            }
        } finally {
            setExporting(false);
        }
    }, [items, orientation, exporting, showToast]);

    const isEmpty = items.length === 0;
    const wrapClass = ['bench-panel-wrap', mounted ? 'mounted' : '', active ? 'active' : '']
        .filter(Boolean)
        .join(' ');

    return (
        <div className={wrapClass} id="benchPanelWrap" onClick={onBackdropClick}>
            <div className="bench-panel-box" ref={boxRef} onClick={(e) => e.stopPropagation()}>
                <div className="bench-panel-header">
                    <span className="bench-panel-title">
                        THE BENCH
                        <span className="bench-panel-title-count">({items.length})</span>
                    </span>
                    <div className="bench-panel-header-actions">
                        <button
                            className="bench-tool-btn"
                            type="button"
                            onClick={onToggleOrientation}
                            title={orientation === 'portrait' ? 'Switch to Landscape split' : 'Switch to Portrait split'}
                            disabled={isEmpty}
                        >
                            {orientation === 'portrait' ? `◫ Portrait` : `⬒ Landscape`}
                        </button>
                        <span
                            className="bench-panel-close-x"
                            role="button"
                            tabIndex={0}
                            onClick={closePanel}
                            title="Close"
                        >
                            {`×${VS15}`}
                        </span>
                    </div>
                </div>

                <div className={`bench-grid ${orientation}`} id="benchGrid">
                    {isEmpty ? (
                        <div className="bench-empty-state">
                            <div className="bench-empty-title">The bench is clear.</div>
                            <div className="bench-empty-hint">
                                Press and hold any piece, then drag it onto the bench to compare.
                            </div>
                        </div>
                    ) : (
                        groups.map(([slug, ids]) => (
                            <ProjectProvider key={slug} slug={slug}>
                                <BenchGroup
                                    slug={slug}
                                    ids={ids}
                                    onRemove={remove}
                                    onToCart={onToCart}
                                    reportInfo={reportInfo}
                                />
                            </ProjectProvider>
                        ))
                    )}
                </div>

                <div className="bench-panel-footer">
                    <button
                        className="bench-foot-btn cart-feed"
                        type="button"
                        onClick={addListedToCart}
                        disabled={isEmpty}
                    >
                        {`→ ADD LISTED TO CART`}
                    </button>
                    <button
                        className="bench-foot-btn"
                        type="button"
                        onClick={onExport}
                        disabled={isEmpty || exporting}
                    >
                        {exporting ? 'EXPORTING…' : `⧉ EXPORT IMAGE`}
                    </button>
                    <button
                        className="bench-foot-btn ghost"
                        type="button"
                        onClick={onClear}
                        disabled={isEmpty}
                    >
                        CLEAR
                    </button>
                </div>
            </div>
        </div>
    );
}
