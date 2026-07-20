'use client';

/*
 * FriendInspectorPreview — the Friend Inspector+ reserved strip, now alive
 * (Brendon, 2026-07-06). Two modes behind a toggle (persisted per device):
 *
 *   WIRE — the Circle Wire: your circle's live story as counter-scrolling
 *     rows riding the news banner's EXACT rail mechanics — same LOCKED
 *     speed (desktop 45 / mobile 28 px/sec), same doubled-run + -50%
 *     compositor animation, middle row running the other way. Items are
 *     the real feed (mints / sales / lists by people in your circle),
 *     padded with relationship moments (mutuals, cartel) so the wire is
 *     never dead air.
 *
 *   MAP — the Constellation: the circle as a starfield. You are the
 *     center; friends sit at hash-stable angles, pulled closer by shared
 *     holdings (the Cartel read); threads run to cartel members; each
 *     star is tinted with its owner's profile colorway. Tap a star →
 *     that friend's dossier; the inspected star rings up with a live
 *     duel verdict line.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatEth } from '../lib/format/eth';
import type { CircleStat } from '../app/api/social/circle-stats/route';

const VS15 = '︎';

/* Same LOCKED speed as the home news banner (NewsCarousel — Brendon's
   approved recovery values). One loop = half the doubled rail's width. */
const WIRE_SPEED = { desktop: 45, mobile: 28 } as const;

const MODE_KEY = 'pd_fi_preview';
type PreviewMode = 'wire' | 'map';

export interface PreviewPerson {
    handle: string;
    addr: string | null;
    stat: CircleStat | undefined;
    mutual: boolean;
    /** Shared-holdings count (the Cartel read) — null while loading. */
    shared: number | null;
}

interface WireItem { glyph: string; text: string; meta?: string }

const FEED_GLYPH: Record<string, string> = { MINT: '✶', SALE: '✶', LIST: '✹', XFER: '✸' };
const FEED_VERB: Record<string, string> = { MINT: 'collected', SALE: 'sold', LIST: 'listed', XFER: 'transferred' };

function readMode(): PreviewMode {
    try {
        return localStorage.getItem(MODE_KEY) === 'map' ? 'map' : 'wire';
    } catch { return 'wire'; }
}

export default function FriendInspectorPreview({
    people, inspected, onInspect, myStat, myHandle,
}: {
    people: PreviewPerson[];
    inspected: string | null;
    onInspect: (handle: string) => void;
    myStat: CircleStat | undefined;
    myHandle: string | null;
}) {
    const [mode, setMode] = useState<PreviewMode>('wire');
    useEffect(() => { setMode(readMode()); }, []);
    const pick = useCallback((m: PreviewMode) => {
        setMode(m);
        try { localStorage.setItem(MODE_KEY, m); } catch { /* device-local nicety */ }
    }, []);

    return (
        <div className="fi-preview">
            <div className="fi-preview-toggle" role="group" aria-label="Preview mode">
                <button type="button" className={`ambient-chip fi-preview-chip${mode === 'wire' ? ' on' : ''}`} onClick={() => pick('wire')}>WIRE</button>
                <button type="button" className={`ambient-chip fi-preview-chip${mode === 'map' ? ' on' : ''}`} onClick={() => pick('map')}>MAP</button>
            </div>
            {mode === 'wire'
                ? <CircleWire people={people} />
                : <Constellation people={people} inspected={inspected} onInspect={onInspect} myStat={myStat} myHandle={myHandle} />}
        </div>
    );
}

/* ── THE CIRCLE WIRE ─────────────────────────────────────────────────── */

function CircleWire({ people }: { people: PreviewPerson[] }) {
    const [feedItems, setFeedItems] = useState<WireItem[]>([]);

    const circleHandles = useMemo(() => new Set(people.map((p) => p.handle)), [people]);
    const circleAddrs = useMemo(
        () => new Set(people.map((p) => p.addr).filter(Boolean) as string[]),
        [people],
    );

    /* The real story: circle members' feed events. Fails soft to []. */
    useEffect(() => {
        let alive = true;
        fetch('/api/feed?limit=100', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!alive || !Array.isArray(j?.events)) return;
                const items: WireItem[] = [];
                for (const e of j.events as Array<{
                    type: string; project_id: string; token_id: string | null;
                    from_address: string | null; to_address: string | null;
                    from_handle?: string | null; to_handle?: string | null; price_eth: string | null;
                    trade?: boolean;
                }>) {
                    const actorHandle =
                        (e.to_handle && circleHandles.has(e.to_handle.toLowerCase()) && e.to_handle) ||
                        (e.from_handle && circleHandles.has(e.from_handle.toLowerCase()) && e.from_handle) ||
                        null;
                    const actorAddr =
                        (e.to_address && circleAddrs.has(e.to_address.toLowerCase())) ||
                        (e.from_address && circleAddrs.has(e.from_address.toLowerCase()));
                    if (!actorHandle && !actorAddr) continue;
                    const who = actorHandle ? `@${actorHandle.toLowerCase()}` : 'a friend';
                    const piece = e.token_id ? `#${e.token_id.split('-').pop()}` : '';
                    items.push({
                        glyph: e.trade ? '⇌' : (FEED_GLYPH[e.type] ?? '✶'),
                        text: `${who} ${e.trade ? 'traded' : (FEED_VERB[e.type] ?? 'moved')} @${e.project_id} ${piece}`.trim(),
                        meta: e.price_eth ? `${formatEth(Number(e.price_eth))}` : undefined,
                    });
                    if (items.length >= 24) break;
                }
                setFeedItems(items);
            })
            .catch(() => { /* wire runs on relationship moments alone */ });
        return () => { alive = false; };
    }, [circleHandles, circleAddrs]);

    /* Relationship moments keep the wire alive pre-activity. */
    const items = useMemo<WireItem[]>(() => {
        const rel: WireItem[] = [];
        for (const p of people) {
            if (p.shared && p.shared > 0) {
                rel.push({ glyph: '⟁', text: `@${p.handle} runs in your cartel`, meta: `${p.shared} shared` });
            } else if (p.mutual) {
                rel.push({ glyph: '⚭', text: `@${p.handle} is a mutual` });
            } else {
                rel.push({ glyph: '⚬', text: `@${p.handle} is in your circle` });
            }
            if (p.stat?.isArtist) rel.push({ glyph: '✺', text: `@${p.handle} makes art here` });
        }
        return [...feedItems, ...rel];
    }, [feedItems, people]);

    /* Deal the story across the rows; 3 rows once there's enough to carry. */
    const rows = useMemo(() => {
        if (items.length === 0) return [];
        const n = items.length >= 9 ? 3 : items.length >= 4 ? 2 : 1;
        const out: WireItem[][] = Array.from({ length: n }, () => []);
        items.forEach((it, i) => out[i % n].push(it));
        return out;
    }, [items]);

    if (rows.length === 0) return <div className="fm-empty">Your circle&apos;s wire warms up as friends arrive.</div>;

    return (
        <div className="fi-wire">
            {rows.map((row, i) => (
                <WireRow key={i} items={row} reverse={i % 2 === 1} />
            ))}
        </div>
    );
}

/* One wire row — the news banner's compositor rail verbatim: doubled run,
   duration = halfWidth ÷ the LOCKED speed, odd rows play in reverse. */
function WireRow({ items, reverse }: { items: WireItem[]; reverse: boolean }) {
    const railRef = useRef<HTMLDivElement | null>(null);
    const sig = items.map((i) => i.text).join('~');

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        let cancelled = false;
        let lastHalf = 0;
        const apply = () => {
            if (cancelled || !rail.isConnected) return;
            const half = rail.scrollWidth / 2;
            if (!half || Math.abs(half - lastHalf) < 1) return;
            lastHalf = half;
            const mobile = window.matchMedia('(max-width: 600px)').matches;
            const speed = mobile ? WIRE_SPEED.mobile : WIRE_SPEED.desktop;
            rail.style.setProperty('--news-loop-s', `${(half / speed).toFixed(2)}s`);
            rail.classList.add('anim');
        };
        apply();
        try {
            document.fonts?.ready?.then(() => apply());
        } catch { /* first measure stands */ }
        window.addEventListener('resize', apply);
        return () => {
            cancelled = true;
            window.removeEventListener('resize', apply);
            rail.classList.remove('anim');
        };
         
    }, [sig]);

    return (
        <div className="fi-wire-row">
            <div className={`fi-wire-rail${reverse ? ' rev' : ''}`} ref={railRef}>
                {(['a', 'b'] as const).map((run) =>
                    items.map((it, i) => (
                        <span className="fi-wire-pill" key={`${run}-${i}`}>
                            <span className="fi-wire-glyph">{it.glyph}{VS15}</span>
                            {it.text}
                            {it.meta && <b>{it.meta}</b>}
                        </span>
                    )),
                )}
            </div>
        </div>
    );
}

/* ── THE CONSTELLATION ───────────────────────────────────────────────── */

/* FNV-1a — stable per-handle angles so the sky never reshuffles. */
function hash32(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function Constellation({
    people, inspected, onInspect, myStat, myHandle,
}: {
    people: PreviewPerson[]; inspected: string | null; onInspect: (handle: string) => void;
    myStat: CircleStat | undefined; myHandle: string | null;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const dotsRef = useRef<Array<{ handle: string; x: number; y: number }>>([]);
    /* The sky's viewport — pinch/drag/wheel zoomable like any map (Brendon,
       2026-07-16). scale 1 = the whole circle in frame; pan in CSS px. */
    const viewRef = useRef({ scale: 1, ox: 0, oy: 0 });
    const pointersRef = useRef(new Map<number, { x: number; y: number }>());
    const gestureRef = useRef<{ dist: number; scale: number } | null>(null);
    const draggedRef = useRef(false);

    /* One rAF loop while mounted — stars breathe, threads shimmer. */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let raf = 0;
        let alive = true;

        const draw = (t: number) => {
            if (!alive) return;
            const holder = canvas.parentElement;
            if (!holder) return;
            const dpr = window.devicePixelRatio || 1;
            const w = holder.clientWidth;
            const h = holder.clientHeight;
            if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
                canvas.width = w * dpr;
                canvas.height = h * dpr;
                canvas.style.width = `${w}px`;
                canvas.style.height = `${h}px`;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            const base = getComputedStyle(canvas).color;
            const view = viewRef.current;
            const cx = w / 2 + view.ox;
            const cy = h / 2 + view.oy;
            const maxR = Math.min(w / 2 - 24, h / 2 - 10);
            const maxShared = Math.max(1, ...people.map((p) => p.shared ?? 0));
            /* Zoomed in, every star earns its name back. */
            const labelAll = view.scale >= 1.6;

            const dots: Array<{ handle: string; x: number; y: number }> = [];
            for (const p of people) {
                const hsh = hash32(p.handle);
                const angle = ((hsh % 3600) / 3600) * Math.PI * 2;
                // Cartel gravity — shared holdings pull a star toward you.
                const pull = (p.shared ?? 0) / maxShared;
                // Radius floor keeps even the tightest cartel star off YOU.
                const r = Math.max(20, maxR * (1 - 0.55 * pull) * (0.55 + ((hsh >>> 12) % 100) / 220)) * view.scale;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r * 0.82;
                dots.push({ handle: p.handle, x, y });

                // Cartel thread.
                if ((p.shared ?? 0) > 0) {
                    ctx.strokeStyle = base;
                    ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t / 900 + hsh);
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }

                // The star — tinted with its owner's profile colorway. Size
                // rides the zoom gently so close-ups feel closer.
                const breathe = 1 + 0.22 * Math.sin(t / 700 + (hsh % 7));
                const zoomGain = Math.sqrt(view.scale);
                const isInspected = inspected === p.handle;
                ctx.globalAlpha = 1;
                ctx.fillStyle = p.stat?.profileHex || base;
                ctx.beginPath();
                ctx.arc(x, y, (p.mutual ? 4.2 : 3.2) * breathe * zoomGain, 0, Math.PI * 2);
                ctx.fill();
                if (isInspected) {
                    ctx.strokeStyle = p.stat?.profileHex || base;
                    ctx.beginPath();
                    ctx.arc(x, y, (9 + 1.6 * Math.sin(t / 300)) * zoomGain, 0, Math.PI * 2);
                    ctx.stroke();
                }
                // Labels stay readable: past a dozen stars only mutuals + the
                // inspected star keep their names — until you zoom in, when
                // every star earns its name back.
                if (labelAll || people.length <= 12 || p.mutual || isInspected) {
                    ctx.font = "bold 11px 'Courier New', Courier, monospace";
                    ctx.fillStyle = base;
                    ctx.textAlign = 'center';
                    ctx.fillText(`@${p.handle}`, x, y + 17 * zoomGain);
                }
            }
            dotsRef.current = dots;

            // You — the center of the sky.
            ctx.globalAlpha = 1;
            ctx.fillStyle = base;
            ctx.beginPath();
            ctx.arc(cx, cy, 5 + 0.5 * Math.sin(t / 500), 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "bold 11px 'Courier New', Courier, monospace";
            ctx.textAlign = 'center';
            ctx.fillText('YOU', cx, cy + 17);

            // The duel readout for the inspected star.
            const target = people.find((p) => p.handle === inspected);
            if (target?.stat && myStat) {
                let you = 0, them = 0;
                (['collected', 'spentEth', 'followers'] as const).forEach((k) => {
                    if (myStat[k] > target.stat![k]) you++;
                    else if (myStat[k] < target.stat![k]) them++;
                });
                ctx.textAlign = 'left';
                ctx.font = "bold 12px 'Courier New', Courier, monospace";
                ctx.fillText(
                    `DUEL ${you}–${them} ${myHandle ? `@${myHandle}` : 'YOU'} vs @${target.handle}`,
                    8, h - 8,
                );
            }
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => { alive = false; cancelAnimationFrame(raf); };
    }, [people, inspected, myStat, myHandle]);

    const onTap = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (draggedRef.current) { draggedRef.current = false; return; }
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let best: { handle: string; d: number } | null = null;
        for (const d of dotsRef.current) {
            const dist = Math.hypot(d.x - x, d.y - y);
            if (dist < 16 && (!best || dist < best.d)) best = { handle: d.handle, d: dist };
        }
        if (best) onInspect(best.handle);
    }, [onInspect]);

    /* ── The map gestures — pinch to zoom, drag to pan, wheel to zoom,
       double-tap to reset. Pan is clamped so the sky can't be lost. ── */
    const clampView = useCallback(() => {
        const v = viewRef.current;
        v.scale = Math.min(4, Math.max(1, v.scale));
        const canvas = canvasRef.current;
        const limX = (canvas?.clientWidth ?? 300) * 0.6 * v.scale;
        const limY = (canvas?.clientHeight ?? 150) * 0.6 * v.scale;
        v.ox = Math.min(limX, Math.max(-limX, v.ox));
        v.oy = Math.min(limY, Math.max(-limY, v.oy));
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointersRef.current.size === 2) {
            const [a, b] = [...pointersRef.current.values()];
            gestureRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: viewRef.current.scale };
        }
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const p = pointersRef.current.get(e.pointerId);
        if (!p) return;
        const prev = { ...p };
        p.x = e.clientX;
        p.y = e.clientY;
        if (pointersRef.current.size === 2 && gestureRef.current) {
            const [a, b] = [...pointersRef.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (gestureRef.current.dist > 0) {
                viewRef.current.scale = gestureRef.current.scale * (dist / gestureRef.current.dist);
                clampView();
            }
            draggedRef.current = true;
        } else if (pointersRef.current.size === 1) {
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            if (Math.abs(dx) + Math.abs(dy) > 0) {
                viewRef.current.ox += dx;
                viewRef.current.oy += dy;
                clampView();
                if (Math.abs(dx) + Math.abs(dy) > 2) draggedRef.current = true;
            }
        }
    }, [clampView]);

    const onPointerEnd = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        pointersRef.current.delete(e.pointerId);
        if (pointersRef.current.size < 2) gestureRef.current = null;
    }, []);

    const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        viewRef.current.scale *= e.deltaY < 0 ? 1.12 : 0.9;
        clampView();
    }, [clampView]);

    const onDouble = useCallback(() => {
        viewRef.current = { scale: 1, ox: 0, oy: 0 };
        draggedRef.current = false;
    }, []);

    if (people.length === 0) return <div className="fm-empty">Your sky fills as friends arrive.</div>;
    return (
        <canvas
            ref={canvasRef}
            className="fi-map"
            onClick={onTap}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onWheel={onWheel}
            onDoubleClick={onDouble}
            aria-label="Your circle as a constellation — pinch to zoom, drag to pan"
        />
    );
}
