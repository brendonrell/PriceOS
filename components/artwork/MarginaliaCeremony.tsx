'use client';

/*
 * THE MARGINALIA — the art remembers. (FACTIONS spec v3.1 §3–§4.)
 *
 * Wraps the artwork page's feature stage. Press and HOLD the piece — the
 * long ceremonial hold, an order of magnitude past the Bench's ⅓s — and the
 * border pops out and binds on: a generative frame (matrix motif in the
 * project's brand colour on white, motion seeded per project so every
 * project breathes differently), the margin hands (every wallet that held
 * it — sales strike deep, passes land faint), and the four faction corners,
 * falling one at a time. Sweep all four and the piece flies one banner.
 *
 * The canonical art is NEVER touched — the wrapper scales the stage while
 * bound and the frame renders around it. Corners + banner + war status are
 * ENLISTED-ONLY (the viewer is currently flying a faction logo); neutral
 * viewers get the margins alone — hands are provenance, not war.
 *
 * The hold shows continuous motion from the first frame (edge bars sweep,
 * the frame whitens in) per the "always feel moving forward" rule. Aborting
 * early snaps back and suppresses the stage's tap-through so a failed
 * ceremony never opens the artwork modal by accident.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { projectColorway } from '../../lib/project/registry';
import { useFaction } from '../../lib/factions/useFaction';
import { factionByKey, WAR_GLYPHS } from '../../lib/factions/factions';
import type { PieceWarResponse } from '../../app/api/war/piece/route';

const HOLD_MS = 10_000; // the ceremony (spec: ~10s vs the ~⅓s Bench hold)
const DRIFT_CANCEL_PX = 24; // forgiving — this is a ritual, not a tap
const MATRIX_CHARS = ['0', '1', '▙', '▟', '▞', '·', '%'];

function fnv(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Props {
    slug: string;
    /** The piece's number part (3 / "3"); the ledger token id is `${slug}-${n}`. */
    tokenNo: string | number;
    children: React.ReactNode;
}

export default function MarginaliaCeremony({ slug, tokenNo, children }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [holding, setHolding] = useState(false);
    const [bound, setBound] = useState(false);
    const [data, setData] = useState<PieceWarResponse | null>(null);
    const faction = useFaction();

    const raf = useRef(0);
    const holdT0 = useRef(0);
    const startPt = useRef<{ x: number; y: number } | null>(null);
    const suppressClick = useRef(false);
    const reduceMotion = useRef(false);

    useEffect(() => {
        try {
            reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch { /* default false */ }
    }, []);

    const setP = (p: number) => {
        wrapRef.current?.style.setProperty('--mg-p', String(p));
    };

    const stopHold = useCallback((completed: boolean) => {
        cancelAnimationFrame(raf.current);
        setHolding(false);
        if (!completed) setP(0);
    }, []);

    const tick = useCallback(() => {
        const p = Math.min(1, (performance.now() - holdT0.current) / HOLD_MS);
        setP(p);
        if (p >= 1) {
            suppressClick.current = true;
            stopHold(true);
            setBound(true);
            return;
        }
        raf.current = requestAnimationFrame(tick);
    }, [stopHold]);

    const onPointerDown = (e: React.PointerEvent) => {
        if (bound) return;
        startPt.current = { x: e.clientX, y: e.clientY };
        holdT0.current = performance.now();
        suppressClick.current = false;
        setHolding(true);
        // The ceremony's data arrives long before the bind completes.
        if (!data) {
            void fetch(`/api/war/piece?project=${encodeURIComponent(slug)}&token=${encodeURIComponent(`${slug}-${tokenNo}`)}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (d) setData(d as PieceWarResponse); })
                .catch(() => { /* margins render empty — the frame still binds */ });
        }
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(tick);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!holding || !startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > DRIFT_CANCEL_PX * DRIFT_CANCEL_PX) endPress();
    };
    const endPress = () => {
        if (!holding) return;
        const heldMs = performance.now() - holdT0.current;
        if (heldMs > 500) suppressClick.current = true; // a real attempt — not a tap
        stopHold(false);
    };
    const onClickCapture = (e: React.MouseEvent) => {
        if (suppressClick.current || bound) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
        }
    };

    const close = useCallback(() => {
        setBound(false);
        setP(0);
    }, []);
    useEffect(() => {
        if (!bound) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [bound, close]);

    /* ── the frame's seeded matrix motif (CSS-light: static chars, per-cell
       pulse delays — the breathing is one keyframe animation) ─────────────── */
    const color = projectColorway(slug) ?? '#8aa0b8';
    const cells = React.useMemo(() => {
        const rnd = rng(fnv(`marginalia:${slug}`));
        const out: { ch: string; delay: number; edge: 'top' | 'bottom'; pos: number }[] = [];
        for (let i = 0; i < 22; i++) {
            out.push({
                ch: MATRIX_CHARS[Math.floor(rnd() * MATRIX_CHARS.length)]!,
                delay: rnd() * 6,
                edge: i % 2 === 0 ? 'top' : 'bottom',
                pos: 4 + rnd() * 88,
            });
        }
        return out;
    }, [slug]);

    const margin = data?.margin ?? [];
    const slots = data?.slots ?? 12;
    const crypt = data?.crypt ?? [];
    const corners = data?.corners ?? { count: 0, faction: null, hex: null };
    const warFaction = factionByKey(corners.faction);
    const enlisted = faction != null;
    const showWar = enlisted && corners.count > 0 && warFaction != null;
    const banner = showWar && corners.count >= 4;
    const leftHands = margin.filter((_, i) => i % 2 === 0);
    const rightHands = margin.filter((_, i) => i % 2 === 1);

    const worth = data
        ? data.untouched
            ? 'UNTOUCHED'
            : data.relic
                ? 'RELIC · MARGIN FULL'
                : `${margin.length}/${slots} HANDS`
        : '';

    return (
        <div
            ref={wrapRef}
            className={`mg-wrap${holding ? ' is-holding' : ''}${bound ? ' is-bound' : ''}${reduceMotion.current ? ' mg-reduced' : ''}`}
            style={{ ['--mg-color' as string]: color, ['--mg-war' as string]: warFaction?.hex ?? color }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onClickCapture={onClickCapture}
            onContextMenu={(e) => { if (holding || bound) e.preventDefault(); }}
        >
            <div className="mg-art">{children}</div>

            {/* Hold build-up — four edge bars sweep toward the corners. */}
            {(holding || bound) && (
                <div className="mg-build" aria-hidden="true">
                    <span className="mg-bar mg-bar-t" /><span className="mg-bar mg-bar-b" />
                    <span className="mg-bar mg-bar-l" /><span className="mg-bar mg-bar-r" />
                </div>
            )}

            {bound && (
                <div className="mg-frame" role="figure" aria-label="Marginalia">
                    {/* the breathing matrix motif */}
                    {cells.map((c, i) => (
                        <span
                            key={i}
                            className={`mg-cell mg-cell-${c.edge}`}
                            style={{ left: `${c.pos}%`, animationDelay: `${c.delay}s` }}
                        >
                            {c.ch}
                        </span>
                    ))}

                    {/* margins — the hands, ordered; ink weight carries meaning */}
                    <div className="mg-rail mg-rail-l">
                        {leftHands.map((h) => (
                            <span key={h.seq} className={`mg-hand mg-${h.kind.toLowerCase()}`} title={`${h.handle ? `@${h.handle}` : h.address.slice(0, 8)} · ${h.kind}${h.seq === 1 ? " · FOUNDER'S HAND" : ''}`}>
                                <span className="mg-hand-face">{h.face}</span>
                                <span className="mg-hand-seq">{h.seq}</span>
                            </span>
                        ))}
                        {Array.from({ length: Math.max(0, Math.ceil((slots - margin.length) / 2)) }).map((_, i) => (
                            <span key={`s${i}`} className="mg-slot" aria-hidden="true">·</span>
                        ))}
                    </div>
                    <div className="mg-rail mg-rail-r">
                        {rightHands.map((h) => (
                            <span key={h.seq} className={`mg-hand mg-${h.kind.toLowerCase()}`} title={`${h.handle ? `@${h.handle}` : h.address.slice(0, 8)} · ${h.kind}`}>
                                <span className="mg-hand-face">{h.face}</span>
                                <span className="mg-hand-seq">{h.seq}</span>
                            </span>
                        ))}
                        {Array.from({ length: Math.max(0, Math.floor((slots - margin.length) / 2)) }).map((_, i) => (
                            <span key={`s${i}`} className="mg-slot" aria-hidden="true">·</span>
                        ))}
                    </div>

                    {/* the four corners — they FALL, one at a time (enlisted only) */}
                    {showWar && (
                        <>
                            {[0, 1, 2, 3].map((i) => (
                                <span
                                    key={i}
                                    className={`mg-corner mg-corner-${i}${i < corners.count ? ' is-fallen' : ''}`}
                                    style={{ animationDelay: reduceMotion.current ? '0s' : `${0.4 + i * 0.45}s` }}
                                    aria-hidden="true"
                                >
                                    {i < corners.count ? WAR_GLYPHS.corner : ''}
                                </span>
                            ))}
                            {banner && (
                                <div className="mg-banner" style={{ animationDelay: reduceMotion.current ? '0s' : '2.3s' }}>
                                    {WAR_GLYPHS.banner} {warFaction!.key}
                                </div>
                            )}
                        </>
                    )}

                    {/* the crypt — struck from the stone, permanent */}
                    {crypt.length > 0 && (
                        <div className="mg-crypt">
                            {WAR_GLYPHS.struck} THE CRYPT ·{' '}
                            {crypt.map((c) => (c.handle ? `@${c.handle}` : c.address.slice(0, 8))).join(' · ')}
                        </div>
                    )}

                    {/* worth + war status line */}
                    <div className="mg-foot">
                        <span className="mg-worth">{worth}</span>
                        {enlisted && data?.collection.leader && (
                            <span className="mg-war-line">
                                {data.collection.siege
                                    ? `${WAR_GLYPHS.siege} SIEGE · ${data.collection.siege} vs ${data.collection.leader}`
                                    : `${data.collection.status} · ${data.collection.leader}`}
                            </span>
                        )}
                    </div>

                    <span
                        className="mg-close"
                        role="button"
                        tabIndex={0}
                        title="Close"
                        onClick={close}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                    >
                        {'×︎'}
                    </span>
                </div>
            )}
        </div>
    );
}
