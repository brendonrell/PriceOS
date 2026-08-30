'use client';

/*
 * StickersModal — "STICKER EXCHANGE"
 *
 * Fable 5's bottom-sheet sticker marketplace, opened from the home action row's
 * Stickers button (open('stickers')). Slides up from the bottom with a
 * single-row, scroll-snapping carousel of sticker SHEETS.
 *
 * The store design is kept exactly as Fable 5 built it (slide-up sheet, rail,
 * ticker, buy chips, terminal vibe). Adaptations:
 *   - Only OUR sheets show — Genesis and Petey — each card a fan of its actual
 *     recoloured-logo stickers. (The old placeholder teaser sheets were removed.)
 *   - Tapping a card opens the real SHEET: a die-cut grid of every sticker
 *     inside, like a peel-off sticker sheet. Back returns to the rail.
 * Buying is still a toast this pass; real grant/ownership (ERC-1155) wires later.
 *
 * Rides ModalContext: isOpen = openModal === 'stickers'. Mounted once in
 * PriceOSShell. Mouse drag-to-scroll on the rail mirrors the home carousels.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useDragScroll, useDragScrollY } from '../lib/hooks/useDragScroll';
import {
    SHEETS as REAL_SHEETS, stickersForSheet, fanFor, type SheetMeta, type SheetId, type Sticker,
} from '../lib/stickers/catalog';
import { StickerArt } from './stickers/StickerArt';
import { BuySheetButton } from './stickers/BuySheetButton';
import StickerMarket from './stickers/StickerMarket';
import StickerAlbum from './stickers/StickerAlbum';
import { useOwnedStickerIds, ownsSheet } from '../lib/stickers/owned';
import StickerLcd from './stickers/StickerLcd';
import { buildStoreTicker, buildMarketTicker } from '../lib/stickers/ticker';
import { resolveSpriteFace } from '../lib/hooks/useSpriteFace';

const VS15 = '︎';

export default function StickersModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const { isOpen, isTopStacked } = useModalLayer('stickers');

    /* Toggle the view mode + toast it (house style: new state in CAPS). Fires
       only on this switch, never on opening the store. */
    const toggleView = () => setExpanded((v) => {
        const next = !v;
        showToast(`Sticker Store: ${next ? 'STACKED' : 'COMPACT'}`);
        return next;
    });
    const railRef = useDragScroll<HTMLDivElement>();
    const gridRef = useDragScrollY<HTMLDivElement>();

    /* Which live sheet is open in detail (peel-sheet view), if any. */
    const [openSheet, setOpenSheet] = useState<SheetId | null>(null);
    /* SECONDARY — the in-store sheet market (the only place it lives,
       besides OpenSea once on-chain). Toggled from the header. */
    const [marketOn, setMarketOn] = useState(false);
    /* MY STICKER BINDER — the completionist view (wears "Binder" everywhere
       user-facing so it never collides with the app's Albums feature —
       Brendon, 2026-07-16; internal names keep the album- prefix). */
    const [albumOn, setAlbumOn] = useState(false);

    /* THE PEEL — a sealed sheet you own peels open with a real drag (the rip
       IS the product; never a button). Client-side sealed state per sheet;
       the peel is recorded server-side (sealed-% economics). */
    const [peeled, setPeeled] = useState<Set<string>>(() => new Set());
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem('pd_sticker_peeled');
            const arr = raw ? (JSON.parse(raw) as string[]) : [];
            if (Array.isArray(arr)) setPeeled(new Set(arr));
        } catch { /* ignore */ }
    }, []);
    const [peelDrag, setPeelDrag] = useState(0);       // 0..1 progress
    const [peelGone, setPeelGone] = useState(false);   // committed, animating off
    const peelStart = useRef<{ x: number; y: number } | null>(null);
    const commitPeel = useCallback((sheetId: string, name: string) => {
        setPeelGone(true);
        setTimeout(() => {
            setPeeled((prev) => {
                const next = new Set(prev);
                next.add(sheetId);
                try { window.localStorage.setItem('pd_sticker_peeled', JSON.stringify([...next])); } catch { /* ignore */ }
                return next;
            });
            setPeelGone(false);
            setPeelDrag(0);
        }, 420);
        showToast(`${name}: PEELED`);
        fetch('/api/stickers/market', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'peel', sheet: sheetId }),
        }).catch(() => {});
    }, [showToast]);
    /* Expanded grid (two-up, scrolls down) is the DEFAULT; the icon toggles to
       the compact rail (Brendon 2026-06-22). */
    const [expanded, setExpanded] = useState(true);
    /* A fresh seed on every open → the sheet re-scatters each time you look. */
    const [seed, setSeed] = useState(1);

    /* Desktop-only: a fuller, previews-only expanded grid. Mobile is untouched
       (it keeps renderCard exactly as-is) — Brendon: "mobile CANNOT change". */
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(min-width: 601px)');
        const sync = () => setIsDesktop(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    /* Remember the carousel scroll position across opening a sheet / reopening
       the store, so it never snaps back to the start (Brendon 2026-06-21). */
    const railXRef = useRef(0);
    /* Same memory for the expanded grid's vertical scroll, so opening a sheet
       and coming back lands you where you were, not at the top (Brendon
       2026-06-23). */
    const gridYRef = useRef(0);
    useEffect(() => {
        try { railXRef.current = Number(localStorage.getItem('pd_sticker_rail_x')) || 0; } catch { /* ignore */ }
    }, []);
    const saveRailX = (x: number) => {
        railXRef.current = x;
        try { localStorage.setItem('pd_sticker_rail_x', String(x)); } catch { /* ignore */ }
    };
    // Restore the rail position whenever the rail is on screen.
    useEffect(() => {
        if (isOpen && !openSheet && railRef.current) railRef.current.scrollLeft = railXRef.current;
    }, [isOpen, openSheet, railRef]);
    // Restore the grid scroll position when returning from a sheet.
    useEffect(() => {
        if (isOpen && !openSheet && expanded && gridRef.current) gridRef.current.scrollTop = gridYRef.current;
    }, [isOpen, openSheet, expanded, gridRef]);

    // Reset to the rail whenever the modal closes so it never reopens mid-sheet.
    useEffect(() => { if (!isOpen) { setOpenSheet(null); setMarketOn(false); setAlbumOn(false); } }, [isOpen]);

    const openDetail = (id: SheetId) => { setSeed((Math.random() * 1e9) | 0); setOpenSheet(id); };

    /* Auto-generated salesman feed (content), refreshed each open — now led
       by LIVE market truth (real floors · sales · wants) when the book has
       any. */
    const [liveLines, setLiveLines] = useState<string[]>([]);
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        fetch('/api/stickers/market?summary=1', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d?.sheets) return;
                const lines: string[] = [];
                for (const sh of REAL_SHEETS) {
                    const m = (d.sheets as Record<string, { floor: number | null; sales: number; wanted_by: number; sealed_pct: number | null }>)[sh.id];
                    if (!m) continue;
                    if (m.floor != null) lines.push(`${sh.name} floor ◊ ${Number(m.floor).toFixed(3)}`);
                    if (m.sales > 0) lines.push(`${m.sales} ${sh.name} sold on the market`);
                    if (m.wanted_by > 0) lines.push(`${m.wanted_by} collector${m.wanted_by === 1 ? '' : 's'} want ${sh.name}`);
                    if (m.sealed_pct != null && m.sealed_pct < 100) lines.push(`${sh.name} · ${m.sealed_pct}% still sealed`);
                }
                setLiveLines(lines.slice(0, 8));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isOpen]);
    /* The reps' REAL faces (@brendon / @pricediscussion) — same live lookup
       AsciiId uses, not the project-hash placeholder the crawl used to draw
       on (Brendon, 2026-08-27). Fetched once per open, shared by both
       crawls. A rep with no resolved face yet just renders name-only. */
    const [repFaces, setRepFaces] = useState<Record<string, string>>({});
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        Promise.all(
            ['brendon', 'pricediscussion'].map((h) => resolveSpriteFace(h).then((f) => [h, f] as const)),
        ).then((pairs) => {
            if (cancelled) return;
            const next: Record<string, string> = {};
            pairs.forEach(([h, f]) => { if (f) next[h] = f; });
            setRepFaces(next);
        });
        return () => { cancelled = true; };
    }, [isOpen]);

    /* Two crawls, one per storefront face: the STORE onboards + sells sheets;
       the MARKET (live truth leads it) nudges listing to fund the next roll.
       Album rides the store crawl. */
    const storeTicker = useMemo(() => buildStoreTicker(repFaces), [isOpen, repFaces]);
    const marketTicker = useMemo(() => buildMarketTicker(liveLines, repFaces), [isOpen, liveLines, repFaces]);
    const tickerText = marketOn ? marketTicker : storeTicker;
    /* Match the OLD crawl pace (~3.3 chars/sec): scale the timer to the feed
       length so the longer feed doesn't fly by. */
    const tickerDur = Math.max(26, Math.round(tickerText.length / 3.3));

    const ownedIds = useOwnedStickerIds();
    /* Volume spent = sum of the prices of the sheets you own (Brendon, 2026-06-24). */
    const spent = REAL_SHEETS.reduce((sum, sh) => (ownsSheet(sh.id, ownedIds) ? sum + parseFloat(sh.price) : sum), 0);
    const totalSheets = REAL_SHEETS.length;
    const detail = openSheet ? REAL_SHEETS.find((s) => s.id === openSheet) ?? null : null;
    /* The whole sheet, shuffled by the seed (fresh order each open) and shown in
       a tidy contained grid — never overlapping, never past the sheet edge. */
    const draw = useMemo(() => {
        if (!detail) return [];
        const pool = [...stickersForSheet(detail.id)];
        let a = seed || 1;
        const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j]!, pool[i]!]; }
        return pool;
    }, [detail, seed]);

    /* One sheet card — shared by the sideways rail and the expanded grid. */
    const renderCard = (s: SheetMeta) => (
        <div
            className="ss-card ss-card-live"
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(s.id); } }}
        >
            <div className="ss-card-art">
                <span className="ss-fan">
                    {fanFor(s).map((st, i) => (
                        <span
                            key={st.id}
                            className="ss-fan-item"
                            style={{ transform: `rotate(${[-9, 0, 9][i] ?? 0}deg)` }}
                        >
                            <StickerArt sticker={st} size={52} />
                        </span>
                    ))}
                </span>
                <span className="ss-card-soon ss-card-new">LIVE</span>
                {s.restockAt && Date.parse(s.restockAt) > Date.now() && (
                    <span className="ss-card-soon ss-restock">
                        RESTOCK {Math.max(1, Math.ceil((Date.parse(s.restockAt) - Date.now()) / 86_400_000))}D
                    </span>
                )}
                {ownsSheet(s.id, ownedIds) && <span className="ss-card-owned" title="Owned">{'✓︎'}</span>}
            </div>
            <div className="ss-card-meta">
                <div className="ss-card-name">{s.name}</div>
                <div className="ss-card-line">
                    <span className="ss-card-tag">{s.tag}</span>
                    <span className="ss-card-count">{s.count}<br />stickers</span>
                </div>
                <BuySheetButton sheet={s} />
            </div>
        </div>
    );

    /* Desktop expanded grid — previews only (no name / count / buy), shorter,
       with the card filled by more of the sheet's stickers across rows. */
    const renderPreviewCard = (s: SheetMeta) => (
        <div
            className="ss-card ss-card-live ss-card-preview"
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(s.id); } }}
        >
            <div className="ss-card-art ss-card-art-fill">
                <span className="ss-preview-grid">
                    {stickersForSheet(s.id).slice(0, 18).map((st) => (
                        <span key={st.id} className="ss-preview-item">
                            <StickerArt sticker={st} size={44} />
                        </span>
                    ))}
                </span>
                <span className="ss-card-soon ss-card-new">LIVE</span>
                {ownsSheet(s.id, ownedIds) && <span className="ss-card-owned" title="Owned">{'✓︎'}</span>}
            </div>
        </div>
    );

    return (
        <div
            className={`sticker-sheet-backdrop${isOpen ? ' active' : ''}`}
            data-stack-top={isTopStacked || undefined}
            role="dialog"
            aria-modal="true"
            aria-label="Sticker Exchange"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
            <div className="sticker-sheet" onClick={(e) => e.stopPropagation()}>
                <div
                    className="ss-handle"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                />

                <div className={`ss-head${detail ? '' : ' ss-head-store'}`}>
                    {detail ? (
                        <>
                            <div
                                className="ss-back"
                                role="button"
                                tabIndex={0}
                                title="Back to sheets"
                                onClick={() => setOpenSheet(null)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSheet(null); } }}
                            >
                                {`⇠⇠${VS15}`}
                            </div>
                            <div className="ss-title">
                                <span className="ss-title-main">{detail.name}</span>
                                <span className="ss-title-sub">{`⊞${VS15} ${detail.count} Pcs`}</span>
                            </div>
                            <BuySheetButton sheet={detail} className="ss-buy-head" />
                        </>
                    ) : (
                        <>
                            <div className="ss-title">
                                <span className="ss-title-main">{albumOn ? 'STICKER BINDER' : marketOn ? 'STICKER MARKET' : 'STICKER STORE'}</span>
                                <span className="ss-title-sub">{`⊞${VS15} ${albumOn ? 'GOT / NEED' : marketOn ? 'SECONDARY' : 'BY PD'}`}</span>
                            </div>
                            {!marketOn && !albumOn && (
                            <button
                                className={`ss-expand${expanded ? ' is-on' : ''}`}
                                type="button"
                                title={expanded ? 'Sticker Store: COMPACT' : 'Expand'}
                                aria-pressed={expanded}
                                onClick={toggleView}
                            >
                                {`${expanded ? '↓' : '↑'}${VS15}`}
                            </button>
                            )}
                            <div className="ss-stats">
                                <span className="ss-stat"><b>{totalSheets}</b> SHEETS</span>
                                <span className="ss-stat"><b>{ownedIds.length}</b> OWNED</span>
                                <span className="ss-stat ss-bal"><b>{`◊${VS15}`}</b> {spent.toFixed(3)}</span>
                            </div>
                            <div
                                className="ss-close"
                                role="button"
                                tabIndex={0}
                                title="Close"
                                onClick={close}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                            >
                                {`×${VS15}`}
                            </div>
                        </>
                    )}
                </div>

                {detail ? (
                    /* ── The sticker sheet. Logos/glyphs → tidy grid. Familiars →
                         wider grid. Outputs → masonry. Sprites + @names (skinny
                         chips) → wrapping flow at a larger size, auto-fitting. ── */
                    (() => {
                        const FLOW = new Set(['artist', 'pricesprite', 'handle', 'projectname', 'rarity', 'quip', 'truename', 'animated']);
                        const mode = detail.id === 'output' ? 'masonry'
                            : detail.id === 'familiar' || detail.id === 'animfamiliar' ? 'fam'
                            : FLOW.has(detail.id) ? 'flow'
                            : 'grid';
                        const cls = mode === 'masonry' ? 'ss-masonry'
                            : mode === 'flow' ? 'ss-flow'
                            : mode === 'fam' ? 'ss-grid ss-grid-fam'
                            : 'ss-grid';
                        /* Skinny sheets: order so each ROW pairs the widest chip with the
                           narrowest (it's size-aware) — balances the rows automatically. */
                        const glyphLen = (s: Sticker) => [...(s.glyph ?? '')].length;
                        const flowOrder = (() => {
                            const sorted = [...draw].sort((a, b) => glyphLen(b) - glyphLen(a));
                            const out: Sticker[] = [];
                            let i = 0, j = sorted.length - 1;
                            while (i <= j) {
                                out.push(sorted[i]!);
                                if (i !== j) out.push(sorted[j]!);
                                i++; j--;
                            }
                            return out;
                        })();
                        const cells = mode === 'flow' ? flowOrder : draw;
                        const sealed = ownsSheet(detail.id, ownedIds) && !peeled.has(detail.id);
                        return (
                            <div className="ss-paper-wrap" style={{ position: 'relative' }}>
                                {sealed && (
                                    <div
                                        className={`ss-seal${peelGone ? ' is-gone' : ''}`}
                                        style={peelDrag > 0 && !peelGone ? {
                                            transform: `translate(${peelDrag * 70}%, ${peelDrag * 8}%) rotate(${peelDrag * 14}deg)`,
                                            transition: 'none',
                                        } : undefined}
                                        onPointerDown={(e) => {
                                            peelStart.current = { x: e.clientX, y: e.clientY };
                                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                        }}
                                        onPointerMove={(e) => {
                                            if (!peelStart.current) return;
                                            const w = (e.currentTarget as HTMLElement).clientWidth || 300;
                                            const p = Math.max(0, Math.min(1, (e.clientX - peelStart.current.x) / (w * 0.6)));
                                            setPeelDrag(p);
                                        }}
                                        onPointerUp={() => {
                                            if (!peelStart.current) return;
                                            peelStart.current = null;
                                            if (peelDrag >= 0.72) commitPeel(detail.id, detail.name);
                                            else setPeelDrag(0);
                                        }}
                                        onPointerCancel={() => { peelStart.current = null; setPeelDrag(0); }}
                                    >
                                        <span className="ss-seal-tab">{`⇢ PEEL`}</span>
                                        <span className="ss-seal-name">{detail.name}</span>
                                        <span className="ss-seal-sub">SEALED · drag to peel</span>
                                    </div>
                                )}
                                <div className={`ss-paper ${cls}`} data-sheet={detail.id}>
                                    {cells.map((s) => (
                                        <span key={s.id} className="ss-cell" title={s.name}>
                                            {mode === 'flow'
                                                ? <StickerArt sticker={s} size={detail.id === 'artist' || detail.id === 'pricesprite' ? 30 : 40} diecut />
                                                : <StickerArt sticker={s} fill diecut />}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <>
                        {/* THE MARKETPLACE LINE — the marketplace/album home: one
                            thin crawl right under the top menu (Brendon,
                            2026-07-10). Tap the crawl to cross between store ⇄
                            market; the small cap at its end holds the album. */}
                        <div className="ss-mktline">
                            <button
                                type="button"
                                className="ss-mktline-crawl"
                                aria-label={marketOn || albumOn ? 'Back to the Sticker Store' : 'Open the Sticker Marketplace'}
                                onClick={() => {
                                    if (marketOn || albumOn) { setMarketOn(false); setAlbumOn(false); showToast('Stickers: STORE'); }
                                    else { setAlbumOn(false); setMarketOn(true); showToast('Stickers: MARKETPLACE'); }
                                }}
                            >
                                <StickerLcd mode={albumOn ? 'binder' : marketOn ? 'market' : 'store'} />
                            </button>
                            <button
                                type="button"
                                className={`ss-mktline-cap${marketOn ? ' is-on' : ''}`}
                                title={marketOn ? 'Back to the Sticker Store' : 'Open the Sticker Marketplace'}
                                onClick={() => {
                                    if (marketOn) { setMarketOn(false); showToast('Stickers: STORE'); }
                                    else { setAlbumOn(false); setMarketOn(true); showToast('Stickers: MARKETPLACE'); }
                                }}
                            >
                                {/* MARKET reads << while open, since tapping
                                    it here crosses back to the store
                                    (Brendon, 2026-08-18; glyph swapped for a
                                    plain << and matched to the label's Rubik
                                    12px, 2026-08-30). Closed, it's just
                                    MARKET; short, so it never pushes MY BINDER
                                    off the right edge of an iPhone.
                                    Both states always render, one hidden, so
                                    the cap's width is always the wider of the
                                    two and never resizes on toggle (Brendon,
                                    2026-08-22). */}
                                <span className="ss-mktline-cap-stack">
                                    <span className={`ss-mktline-cap-label${marketOn ? ' is-hidden' : ''}`}>
                                        <span>MAR</span>
                                        <span>KET</span>
                                    </span>
                                    <span className={`ss-mktline-cap-back${marketOn ? '' : ' is-hidden'}`} aria-hidden="true">
                                        {'<<'}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`ss-mktline-cap${albumOn ? ' is-on' : ''}`}
                                title="My Sticker Binder — got / need"
                                onClick={() => {
                                    if (albumOn) { setAlbumOn(false); showToast('Stickers: STORE'); }
                                    else { setMarketOn(false); setAlbumOn(true); showToast('Stickers: BINDER'); }
                                }}
                            >
                                {/* MY BINDER reads << while open, same rule
                                    as MARKET (Brendon, 2026-08-18; glyph
                                    swap 2026-08-30) — tapping it here is a
                                    back action. Both states always render,
                                    one hidden — see MARKET's note above
                                    (Brendon, 2026-08-22). */}
                                <span className="ss-mktline-cap-stack">
                                    <span className={`ss-mktline-cap-label${albumOn ? ' is-hidden' : ''}`}>
                                        <span>MY</span>
                                        <span>BINDER</span>
                                    </span>
                                    <span className={`ss-mktline-cap-back${albumOn ? '' : ' is-hidden'}`} aria-hidden="true">
                                        {'<<'}
                                    </span>
                                </span>
                            </button>
                        </div>
                        <div className="ss-ticker" aria-hidden="true">
                            <div className="ss-ticker-track" style={{ animationDuration: `${tickerDur}s` }}>
                                <span>{tickerText}</span>
                                <span>{tickerText}</span>
                            </div>
                        </div>

                        {albumOn ? (
                            <StickerAlbum />
                        ) : marketOn ? (
                            <StickerMarket />
                        ) : expanded ? (
                            /* The cap + scroll ride this plain-block wrapper, never the
                               grid itself — iOS Safari won't clip a grid that is its own
                               scroll port, so all 9 rows leaked. Wrapper clips to ~6.5
                               rows and scrolls; the grid just lays out. */
                            <div
                                className="ss-grid-scroll"
                                ref={gridRef}
                                onScroll={(e) => { gridYRef.current = e.currentTarget.scrollTop; }}
                            >
                                <div
                                    className="ss-grid-view"
                                    /* Mobile/tablet: two-up columns. */
                                    style={!isDesktop ? { gridTemplateColumns: `repeat(${Math.max(2, Math.ceil(REAL_SHEETS.length / 9))}, 1fr)` } : undefined}
                                >
                                    {REAL_SHEETS.map((s) => (isDesktop ? renderPreviewCard(s) : renderCard(s)))}
                                </div>
                            </div>
                        ) : (
                            <div className="ss-rail" ref={railRef} onScroll={(e) => saveRailX(e.currentTarget.scrollLeft)}>
                                {REAL_SHEETS.map((s) => renderCard(s))}
                            </div>
                        )}

                        {!marketOn && !albumOn && (
                        <div className="ss-foot">
                            {totalSheets} sheets live · tap a sheet to peek inside · more restocking ·{' '}
                            <a className="ss-foot-link" href="https://opensea.io" target="_blank" rel="noopener noreferrer">OpenSea</a>
                        </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
