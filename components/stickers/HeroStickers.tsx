'use client';

/*
 * HeroStickers — the profile owner's stickers on their hero.
 *
 * TWO STATES:
 *   • GENERATIVE (default) — stickers auto-arrange from the manager's settings
 *     (layout style + rows + align + tilt + width + shuffle). This is the
 *     starting canvas; Shuffle re-rolls it. The sticker AREA is left-aligned
 *     with the rest of the hero and ends at the +More edge.
 *   • LOCKED — the moment the owner drags a sticker, the WHOLE current picture
 *     freezes into a saved composition (every sticker + its exact spot, layer,
 *     rotation, scale). From then the profile is that fixed picture — what the
 *     owner sees is exactly what every visitor sees. Dragging moves a sticker,
 *     the ✕ prunes one, last-touched sits on top. Shuffle / picking a Layout in
 *     the manager clears the lock back to generative.
 *
 * Editing (long-press → lift → drag → drop → tap-away settles, ✕ prunes) is
 * own-profile only; visitors render the saved composition read-only.
 *
 * Renders nothing unless there's a composition (locked) or the owner holds
 * (active) stickers (generative). A short tap on the owner's stickers opens the
 * manager.
 */

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useOwnedFor, useStickerPrefs, isActive } from '../../lib/stickers/owned';
import { useHeroPrefs, arrangeShape, tiltDeg, rngFrom, buildCollage, buildPile, stickerHue, shouldFlip } from '../../lib/stickers/heroPrefs';
import { usePlacements, setComposition, moveSticker, raiseSticker, rotateSticker, removeFromComposition, type PlacementMap } from '../../lib/stickers/placements';
import { StickerArt } from './StickerArt';
import { StickerManagerModal } from './StickerManagerModal';
import { stickerById, type Sticker } from '../../lib/stickers/catalog';

interface Props {
    ownerHandle: string | null | undefined;
    isOwn?: boolean;
    /** The owner's saved composition (from their public profile) — used to render
     *  the locked picture for VISITORS. On your own profile the live local store
     *  drives it instead. */
    savedLayout?: PlacementMap | null;
    savedAspect?: number | null;
    /** Read-only mirror — renders the owner's live arrangement with NO gestures
     *  (no lift/drag/✕, no manager). Used as the live preview inside Manager Plus. */
    preview?: boolean;
}

/* Output stickers each paint a full generative artwork to a canvas — heavy.
   Never let the hero mount more than a handful at once (that's the crash). */
const MAX_HERO_OUTPUTS = 4;

/* Boundary so a single bad sticker can never take down the whole profile — the
   feature just renders nothing instead of crashing the page. */
class StickerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    constructor(props: { children: ReactNode }) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { /* swallow — stickers are decorative */ }
    render() { return this.state.failed ? null : this.props.children; }
}

export function HeroStickers(props: Props) {
    return (
        <StickerBoundary>
            <HeroStickersInner {...props} />
        </StickerBoundary>
    );
}

/* A press in progress on a sticker (own profile). Long-press promotes it to a
   grab; movement past a small threshold marks it a drag (so a long-press never
   eats a scroll). */
interface Press { id: string; startX: number; startY: number; moved: boolean; grabbed: boolean; baseX: number; baseY: number; rotate?: { cx: number; cy: number; startAngle: number; startR: number }; }

/* Snap a free rotation to the nearest tidy angle (every 15°) when it's within a
   few degrees, so stickers land clean but free angles still work. */
function snapAngle(deg: number): number {
    const step = 15;
    const nearest = Math.round(deg / step) * step;
    return Math.abs(deg - nearest) <= 5 ? nearest : Math.round(deg);
}

function HeroStickersInner({ ownerHandle, isOwn, savedLayout, savedAspect, preview }: Props) {
    const { notifs } = usePdNotifs();
    const owned = useOwnedFor(ownerHandle, !!isOwn);
    const { offSheets, offIds } = useStickerPrefs();
    const { arrange, tilt, seed, expand, rows: rowsPref, align, flip, density } = useHeroPrefs();
    const ownPlace = usePlacements();
    const [mgrOpen, setMgrOpen] = useState(false);
    const [clampW, setClampW] = useState<number | null>(null);
    /* The currently lifted sticker (floating + ✕), own profile only. */
    const [lifted, setLifted] = useState<string | null>(null);

    // Track the tab row's width so the stickers stop at the +More edge. Skipped
    // in preview (Manager Plus): the post-mount measurement would re-lay-out the
    // panel and momentarily collapse the control labels. The preview just fills
    // its container (CSS caps it to 100%).
    useEffect(() => {
        if (preview) return;
        const measure = () => {
            const el = document.getElementById('profileTabsRow');
            if (el) setClampW(el.getBoundingClientRect().width || null);
        };
        measure();
        const el = document.getElementById('profileTabsRow');
        const ro = el && 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
        if (ro && el) ro.observe(el);
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
    }, [preview]);

    /* The saved composition that drives the LOCKED picture: the owner's live
       local store on their own profile, the public snapshot for visitors. */
    const layoutMap = isOwn ? ownPlace.placements : (savedLayout ?? {});
    const aspect = isOwn ? ownPlace.aspect : (savedAspect ?? null);
    const locked = Object.keys(layoutMap).length > 0;

    /* Locked composition, resolved + layered (z asc, last-touched on top). */
    const lockedItems = useMemo(() => {
        return Object.entries(layoutMap)
            .map(([id, p]) => {
                const st = stickerById(id);
                return st ? { st, x: p.x, y: p.y, z: p.z, r: p.r ?? 0, sc: p.sc ?? 1 } : null;
            })
            .filter((v): v is { st: Sticker; x: number; y: number; z: number; r: number; sc: number } => !!v)
            .sort((a, b) => a.z - b.z);
    }, [layoutMap]);

    const active = useMemo(
        () => owned.filter((s) => isActive(s, offSheets, offIds)),
        [owned, offSheets, offIds],
    );

    const { rows, cap, scatter } = arrangeShape(arrange, rowsPref);
    const effCap = expand ? Math.min(active.length, Math.max(cap, 18)) : cap;

    const picked = useMemo(() => {
        const rnd = scatter ? rngFrom(seed) : null;
        const shuffle = <T,>(a: T[]): T[] => {
            if (!rnd) return a;
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(rnd() * (i + 1));
                [a[i], a[j]] = [a[j]!, a[i]!];
            }
            return a;
        };
        // Group the active set by sheet so a multi-sheet selection is balanced.
        const bySheet = new Map<string, Sticker[]>();
        const sheetOrder: string[] = [];
        for (const s of active) {
            if (!bySheet.has(s.sheet)) { bySheet.set(s.sheet, []); sheetOrder.push(s.sheet); }
            bySheet.get(s.sheet)!.push(s);
        }
        const queues = (rnd ? shuffle(sheetOrder.slice()) : sheetOrder).map((k) => shuffle(bySheet.get(k)!.slice()));

        // SELECT by round-robin across sheets (one each, in turn) up to the
        // arrangement's room — even spread, never all from one sheet. Only a few
        // heavy painted-art stickers are taken (each paints a generative canvas).
        // The chosen set is exactly what gets placed.
        const chosen: Sticker[] = [];
        let outs = 0;
        let progressed = true;
        while (chosen.length < effCap && progressed) {
            progressed = false;
            for (const q of queues) {
                if (chosen.length >= effCap) break;
                while (q.length) {
                    const s = q.shift()!;
                    if (s.kind === 'output' && outs >= MAX_HERO_OUTPUTS) continue;
                    if (s.kind === 'output') outs++;
                    chosen.push(s);
                    progressed = true;
                    break;
                }
            }
        }
        return chosen;
    }, [active, scatter, effCap, seed]);

    /* ── Placement gesture (own profile) ──────────────────────────────────────
       Pointer move/up live on the window so a drag survives the sticker hopping
       DOM trees (generative flow → locked overlay) the instant it's locked. */
    const canvasRef = useRef<HTMLDivElement>(null);
    const press = useRef<Press | null>(null);
    const lpTimer = useRef<number | null>(null);
    const liftedRef = useRef<string | null>(null);
    const lockedRef = useRef<boolean>(locked);
    const placeRef = useRef<PlacementMap>(layoutMap);
    useEffect(() => { liftedRef.current = lifted; }, [lifted]);
    useEffect(() => { lockedRef.current = locked; }, [locked]);
    useEffect(() => { placeRef.current = layoutMap; }, [layoutMap]);
    const clearLp = useCallback(() => {
        if (lpTimer.current != null) { window.clearTimeout(lpTimer.current); lpTimer.current = null; }
    }, []);

    /* Freeze the whole generative picture as it sits on screen — the first-drag
       lock. Reads each rendered sticker's centre + rotation + scale so the locked
       composition is pixel-faithful to what was generated. */
    const lockComposition = useCallback((pressedId: string) => {
        const el = canvasRef.current;
        if (!el) return;
        const cr = el.getBoundingClientRect();
        if (!cr.width || !cr.height) return;
        const map: PlacementMap = {};
        let z = 1;
        el.querySelectorAll<HTMLElement>('[data-sid]').forEach((node) => {
            const id = node.getAttribute('data-sid');
            if (!id) return;
            const r = node.getBoundingClientRect();
            let rot = 0, scl = 1;
            try {
                const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
                rot = Math.atan2(m.b, m.a) * (180 / Math.PI);
                scl = Math.hypot(m.a, m.b) || 1;
            } catch { /* identity */ }
            map[id] = {
                x: ((r.left + r.width / 2 - cr.left) / cr.width) * 100,
                y: ((r.top + r.height / 2 - cr.top) / cr.height) * 100,
                z: z++,
                r: Math.round(rot * 10) / 10,
                sc: Math.round(scl * 1000) / 1000,
            };
        });
        if (map[pressedId]) map[pressedId]!.z = z; // the grabbed one rides on top
        setComposition(map, cr.width / cr.height);
    }, []);

    useEffect(() => {
        if (!isOwn || preview) return;
        const clamp = (v: number) => Math.max(2, Math.min(98, v));
        const onMove = (e: PointerEvent) => {
            const p = press.current;
            if (!p) return;
            // Rotation drag — spin the sticker around its centre by the angle the
            // finger has swept since grabbing the handle.
            if (p.rotate) {
                const ang = Math.atan2(e.clientY - p.rotate.cy, e.clientX - p.rotate.cx) * (180 / Math.PI);
                rotateSticker(p.id, snapAngle(p.rotate.startR + (ang - p.rotate.startAngle)));
                return;
            }
            const dx = e.clientX - p.startX;
            const dy = e.clientY - p.startY;
            if (!p.moved && dx * dx + dy * dy > 64) p.moved = true;
            if (p.grabbed) {
                const el = canvasRef.current;
                if (!el) return;
                const cr = el.getBoundingClientRect();
                if (cr.width && cr.height) {
                    moveSticker(p.id, clamp(p.baseX + (dx / cr.width) * 100), clamp(p.baseY + (dy / cr.height) * 100));
                }
            } else if (p.moved) {
                // Finger travelled before the long-press fired → a scroll, not a
                // lift. Abort the pending lift; let the page scroll.
                clearLp();
            }
        };
        const onUp = () => {
            clearLp();
            const p = press.current;
            press.current = null;
            if (!p) return;
            if (p.grabbed) return; // dropped — stays lifted/selected
            if (!p.moved) {
                // A clean tap: settle whatever's lifted, otherwise open the manager.
                if (liftedRef.current) setLifted(null);
                else setMgrOpen(true);
            }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [isOwn, preview, clearLp]);

    const manager = isOwn && !preview ? (
        <StickerManagerModal
            open={mgrOpen}
            onClose={() => setMgrOpen(false)}
            handle={(ownerHandle ?? '').replace(/^@/, '')}
            previewNode={<HeroStickers ownerHandle={ownerHandle} isOwn preview />}
        />
    ) : null;

    if (notifs.sticker) return manager;
    if (locked ? lockedItems.length === 0 : active.length === 0) return manager;

    const baseTilt = tiltDeg(tilt);
    const jrnd = rngFrom(seed + 7);
    const sz = (k: string) => (k === 'face' || k === 'output' ? 50 : 40);
    const areaStyle = { maxWidth: expand ? undefined : (clampW ?? undefined) };
    const alignClass = align === 'center' ? 'al-center' : align === 'right' ? 'al-right' : 'al-left';
    const flipOf = (id: string) => (flip && shouldFlip(id, seed) ? 180 : 0);

    /* Begin a press on a sticker (own profile). Records where the sticker sits
       now (so a lift doesn't jump it), arms the long-press, and — if it's already
       the lifted one — grabs it straight away for a re-drag. */
    const onStickerDown = (e: React.PointerEvent, s: Sticker) => {
        if (!isOwn) return;
        e.stopPropagation();
        const el = canvasRef.current;
        if (!el) return;
        const cr = el.getBoundingClientRect();
        const ex = placeRef.current[s.id];
        let baseX: number, baseY: number;
        if (ex) {
            baseX = ex.x; baseY = ex.y;
        } else {
            const sr = (e.currentTarget as HTMLElement).getBoundingClientRect();
            baseX = cr.width ? ((sr.left + sr.width / 2 - cr.left) / cr.width) * 100 : 50;
            baseY = cr.height ? ((sr.top + sr.height / 2 - cr.top) / cr.height) * 100 : 50;
        }
        press.current = { id: s.id, startX: e.clientX, startY: e.clientY, moved: false, grabbed: false, baseX, baseY };
        if (liftedRef.current === s.id) {
            press.current.grabbed = true;
            raiseSticker(s.id);
            return;
        }
        clearLp();
        lpTimer.current = window.setTimeout(() => {
            lpTimer.current = null;
            const p = press.current;
            if (!p || p.id !== s.id) return;
            p.grabbed = true;
            if (lockedRef.current) raiseSticker(s.id); // already locked → re-grab
            else lockComposition(s.id);                // first drag → freeze the picture
            setLifted(s.id);
        }, 340);
    };
    const ownDown = (s: Sticker) => (isOwn && !preview ? { onPointerDown: (e: React.PointerEvent) => onStickerDown(e, s) } : {});

    /* Grab the rotate handle (on a lifted sticker) → spin it around its centre. */
    const onRotateDown = (e: React.PointerEvent, s: Sticker) => {
        e.stopPropagation();
        const span = (e.currentTarget as HTMLElement).parentElement;
        if (!span) return;
        const r = span.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        press.current = {
            id: s.id, startX: e.clientX, startY: e.clientY, moved: true, grabbed: true, baseX: 0, baseY: 0,
            rotate: { cx, cy, startAngle, startR: placeRef.current[s.id]?.r ?? 0 },
        };
    };

    // Wrap the body in the placement canvas (own) or render it plainly (visitor).
    // On own, a pointer-down that reaches the canvas (i.e. NOT on a sticker, which
    // stops propagation) settles the lifted sticker.
    const wrap = (body: ReactNode) => (
        <div className="hero-stickers" aria-label="Stickers">
            {isOwn ? (
                <>
                    <div
                        ref={canvasRef}
                        className={`hero-stickers-canvas${preview ? ' is-preview' : ''}`}
                        style={{
                            maxWidth: expand ? undefined : (clampW ?? undefined),
                            ...(locked ? (aspect ? { aspectRatio: String(aspect) } : { minHeight: 96 }) : {}),
                        }}
                        onPointerDown={preview ? undefined : () => { if (liftedRef.current) setLifted(null); }}
                    >
                        {body}
                    </div>
                    {manager}
                </>
            ) : (
                <div
                    className="hero-stickers-canvas"
                    style={{ maxWidth: expand ? undefined : (clampW ?? undefined), ...(aspect ? { aspectRatio: String(aspect) } : { minHeight: 96 }) }}
                >
                    {body}
                </div>
            )}
        </div>
    );

    // ── LOCKED — the saved composition (owner + every visitor see this) ──────
    if (locked) {
        return wrap(
            <>
                {lockedItems.map(({ st, x, y, z, r, sc }) => (
                    <span
                        key={st.id}
                        data-sid={st.id}
                        className={`hero-sticker hero-placed-item${isOwn && lifted === st.id ? ' is-lifted' : ''}`}
                        style={{ left: `${x}%`, top: `${y}%`, zIndex: (isOwn && lifted === st.id) ? 100000 : 1000 + z, ['--r' as string]: `${r}deg`, ['--s' as string]: `${sc}` } as React.CSSProperties}
                        title={st.name}
                        {...ownDown(st)}
                    >
                        <StickerArt sticker={st} size={sz(st.kind)} />
                        {isOwn && lifted === st.id && (
                            <>
                                <button
                                    type="button"
                                    className="hero-sticker-x"
                                    aria-label="Remove from this arrangement"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); removeFromComposition(st.id); setLifted(null); }}
                                >
                                    ×
                                </button>
                                <button
                                    type="button"
                                    className="hero-sticker-rotate"
                                    aria-label="Rotate"
                                    title="Rotate"
                                    onPointerDown={(e) => onRotateDown(e, st)}
                                >
                                    {'⟳︎'}
                                </button>
                            </>
                        )}
                    </span>
                ))}
            </>,
        );
    }

    // ── GENERATIVE — the auto-arranged starting canvas (Shuffle re-rolls) ────

    // COLLAGE — one large composed area: overlapping, mixed sizes, balanced.
    if (arrange === 'collage') {
        const comp = buildCollage(picked.length, seed);
        return wrap(
            <div className="hero-collage" style={{ ...areaStyle, aspectRatio: `${comp.cols} / ${comp.rows}` }}>
                {picked.map((s, i) => {
                    const p = comp.items[i]!;
                    return (
                        <span
                            key={s.id}
                            data-sid={s.id}
                            className="hero-sticker hero-collage-item"
                            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: p.z, transform: `translate(-50%, -50%) rotate(${p.rot + flipOf(s.id)}deg) scale(${p.scale})` }}
                            title={s.name}
                            {...ownDown(s)}
                        >
                            <StickerArt sticker={s} size={sz(s.kind)} />
                        </span>
                    );
                })}
            </div>,
        );
    }

    // STACK — a PILE (stickered laptop / skateboard): piled + overlapping, placed
    // generatively for compositional colour balance (buildPile). Shuffle re-rolls
    // the composition.
    if (arrange === 'stack') {
        const pile = buildPile(picked.map(stickerHue), seed, density, rowsPref);
        const shown = picked.slice(0, pile.items.length);
        return wrap(
            <div className={`hero-pile ${alignClass}`} style={{ ...areaStyle, aspectRatio: String(pile.aspect) }}>
                {shown.map((s, i) => {
                    const p = pile.items[i]!;
                    return (
                        <span
                            key={s.id}
                            data-sid={s.id}
                            className="hero-sticker hero-pile-item"
                            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: p.z, transform: `translate(-50%, -50%) rotate(${p.rot + flipOf(s.id)}deg) scale(${p.scale})` }}
                            title={s.name}
                            {...ownDown(s)}
                        >
                            <StickerArt sticker={s} size={sz(s.kind)} />
                        </span>
                    );
                })}
            </div>,
        );
    }

    // Flex rows (spread / row / scatter / fill).
    const perRow = Math.ceil(picked.length / rows);
    const rowChunks = Array.from({ length: rows }, (_, r) => picked.slice(r * perRow, (r + 1) * perRow));

    return wrap(
        <div className={`hero-stickers-rows arr-${arrange} ${alignClass}`} style={areaStyle}>
            {rowChunks.map((chunk, ri) => (
                <div className="hero-stickers-row" key={ri}>
                    {chunk.map((s, i) => {
                        const t = baseTilt === 0 ? 0 : ((i + ri) % 2 === 0 ? -baseTilt : baseTilt);
                        const jy = scatter ? Math.round((jrnd() - 0.5) * 14) : 0;
                        return (
                            <span
                                key={s.id}
                                data-sid={s.id}
                                className="hero-sticker"
                                style={{ transform: `translateY(${jy}px) rotate(${t + flipOf(s.id)}deg)` }}
                                title={s.name}
                                {...ownDown(s)}
                            >
                                <StickerArt sticker={s} size={sz(s.kind)} />
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>,
    );
}
