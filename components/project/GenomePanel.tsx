'use client';

/*
 * components/project/GenomePanel.tsx — The Genome ◎ (parameter-space map).
 *
 * Replaces the static +More "Genome" placeholder. Every minted Output is a
 * point placed by its REAL trait / Fate / palette combination (lib/output/
 * genome.ts): pieces that share values cluster; genuinely unusual ones drift to
 * the edges. Colour + size encode Isolation — the loneliest pieces glow in the
 * colorway. Drag to explore (the readout tracks the piece under your finger);
 * tap a point to open it.
 *
 * Same widget family as ReplayPanel — the card, the readout, the canvas motion,
 * the colorway accent, the controls row — so it reads as native +More furniture,
 * not a new toy. Deterministic + calc-only ($0, never a canvas render of art).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { getProject, projectColorway } from '../../lib/project/registry';
import { useModal } from '../../lib/state/ModalContext';
import { getGenome, type GenomePoint } from '../../lib/output/genome';

export default function GenomePanel() {
    const project = useProject();
    const def = getProject(project.slug);
    const { open } = useModal();

    const genome = useMemo(() => getGenome(project.slug), [project.slug]);

    /* Plot the MINTED set only (the gallery's 1..totalOutputs) — no non-canonical
       pieces on the map — while isolation is still ranked across the whole
       edition set inside the engine. */
    const points = useMemo(() => {
        if (!genome) return [];
        const n = project.totalOutputs || 0;
        return genome.points.filter((p) => p.id <= n);
    }, [genome, project.totalOutputs]);

    const [selected, setSelected] = useState<number | null>(null);
    const [isolate, setIsolate] = useState(false);
    const [dims, setDims] = useState({ w: 0, h: 200 });
    const [intro, setIntro] = useState(0); // 0..1 mount reveal

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    /* Pixel positions of drawn points, for hit-testing (rebuilt each draw). */
    const laidOut = useRef<{ id: number; px: number; py: number; iso: number }[]>([]);
    const pointerStart = useRef<{ x: number; y: number } | null>(null);
    const moved = useRef(false);

    /* Track width so the canvas is crisp at any size (same as ReplayPanel). */
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0].contentRect.width;
            setDims((d) => (Math.abs(d.w - w) > 0.5 ? { ...d, w } : d));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    /* Mount reveal — points settle in over ~0.7s. Resets when the project (and
       thus the whole space) changes, so it always feels like it's arriving. */
    useEffect(() => {
        setIntro(0);
        setSelected(null);
        let raf = 0;
        let start = 0;
        const DUR = 700;
        const tick = (ts: number) => {
            if (!start) start = ts;
            const p = Math.min(1, (ts - start) / DUR);
            setIntro(p);
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [project.slug]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || dims.w <= 0 || points.length === 0) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = dims.w;
        const H = dims.h;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        const cs = getComputedStyle(canvas);
        const ink = cs.color || '#000';
        const accent = (projectColorway(project.slug) || def?.colorway || ink).trim();

        const pad = 14;
        const plotW = W - pad * 2;
        const plotH = H - pad * 2;

        // Faint frame — the "bounded parameter space" read, matching the mockup.
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = 1;
        ctx.strokeRect(pad, pad, plotW, plotH);
        ctx.globalAlpha = 1;

        const layout: { id: number; px: number; py: number; iso: number }[] = [];

        // Isolation threshold that counts as "rare" for the highlight lens.
        const RARE = 0.72;

        // Draw crowd first (low isolation), rare pieces last so they sit on top.
        const ordered = [...points].sort((a, b) => a.isolation - b.isolation);
        for (let k = 0; k < ordered.length; k++) {
            const p = ordered[k];
            const px = pad + p.x * plotW;
            const py = pad + p.y * plotH;
            layout.push({ id: p.id, px, py, iso: p.isolation });

            // Staggered reveal — the crowd lands first, the lonely ones settle
            // last, so the eye is drawn to the outliers as they arrive.
            const appear = Math.min(1, Math.max(0, intro * 1.3 - (p.isolation) * 0.3));
            if (appear <= 0) continue;

            const rare = p.isolation >= RARE;
            const dimmed = isolate && !rare;
            const r = (rare ? 3.2 : 2) * appear;

            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            if (rare) {
                ctx.fillStyle = accent;
                ctx.globalAlpha = appear * (dimmed ? 0.5 : 1);
            } else {
                ctx.fillStyle = ink;
                ctx.globalAlpha = appear * (isolate ? 0.08 : 0.32);
            }
            ctx.fill();

            // Halo on the rarest — the "none higher" glow.
            if (rare) {
                ctx.beginPath();
                ctx.arc(px, py, r + 3, 0, Math.PI * 2);
                ctx.strokeStyle = accent;
                ctx.globalAlpha = appear * 0.35;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        laidOut.current = layout;

        // Selected marker — crosshair + ring in the accent.
        if (selected != null) {
            const hit = layout.find((l) => l.id === selected);
            if (hit) {
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 1;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(hit.px, hit.py, 6.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(hit.px - 10, hit.py); ctx.lineTo(hit.px + 10, hit.py);
                ctx.moveTo(hit.px, hit.py - 10); ctx.lineTo(hit.px, hit.py + 10);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }, [dims, points, intro, isolate, selected, project.slug, def]);

    useEffect(() => { draw(); }, [draw]);

    /* Nearest point to a client position, within a tap radius. */
    const hitTest = useCallback((clientX: number, clientY: number): number | null => {
        const el = wrapRef.current;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        let best: number | null = null;
        let bestD = 18 * 18; // 18px pick radius, squared
        for (const l of laidOut.current) {
            const dx = l.px - x, dy = l.py - y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = l.id; }
        }
        return best;
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pointerStart.current = { x: e.clientX, y: e.clientY };
        moved.current = false;
        const id = hitTest(e.clientX, e.clientY);
        if (id != null) setSelected(id);
    }, [hitTest]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (pointerStart.current) {
            const dx = e.clientX - pointerStart.current.x;
            const dy = e.clientY - pointerStart.current.y;
            if (dx * dx + dy * dy > 36) moved.current = true; // >6px = a drag
        }
        // Live inspect while dragging OR hovering (desktop).
        const id = hitTest(e.clientX, e.clientY);
        if (id != null) setSelected(id);
    }, [hitTest]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        // A tap (no meaningful drag) on a point opens it — Brendon's "tap a
        // point to jump to that piece". A drag just leaves it inspected.
        if (!moved.current) {
            const id = hitTest(e.clientX, e.clientY);
            if (id != null) open('output', id, project.slug);
        }
        pointerStart.current = null;
    }, [hitTest, open, project.slug]);

    if (!genome || points.length === 0) {
        return (
            <div className="more-genome-wrap">
                <div className="genome-card genome-empty">
                    <span>THE GENOME · fills in as pieces mint</span>
                </div>
            </div>
        );
    }

    const sel = selected != null ? genome.byId.get(selected) : null;
    const selScore = sel ? Math.max(1, Math.round(sel.isolation * 100)) : null;
    const accent = projectColorway(project.slug) || def?.colorway || undefined;

    return (
        <div className="more-genome-wrap">
            <div className="genome-card">
                {/* Readout — collection summary, or the inspected piece. */}
                <div className="genome-readout">
                    <div className="gr-head">
                        <span className="gr-state">{sel ? 'INSPECTING' : 'PARAMETER SPACE'}</span>
                        <span className="gr-title">{sel ? `#${sel.id}` : 'THE GENOME'}</span>
                    </div>
                    <div className="gr-metrics">
                        {sel ? (
                            <>
                                <span className="gr-metric"><b>{selScore}</b> ISOLATION</span>
                                <span className="gr-metric"><b>#{sel.isolationRank}</b> RANK</span>
                                {sel.twins === 1 ? (
                                    <span className="gr-flag">NONE ALIKE</span>
                                ) : (
                                    <span className="gr-metric"><b>{sel.twins}</b> ALIKE</span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className="gr-metric"><b>{points.length}</b> PLOTTED</span>
                                <span className="gr-metric"><b>{genome.axes.length}</b> AXES</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Map — drag to explore, tap a point to open it. */}
                <div
                    ref={wrapRef}
                    className="genome-plot"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    role="application"
                    aria-label="Explore the Project's parameter space"
                >
                    <canvas ref={canvasRef} className="genome-canvas" style={{ width: '100%', height: dims.h }} />
                </div>

                {/* Controls — the isolate lens + an honest read of the axes. */}
                <div className="genome-controls">
                    <button
                        type="button"
                        className={`gc-lens${isolate ? ' gc-lens-on' : ''}`}
                        onClick={() => setIsolate((v) => !v)}
                        aria-pressed={isolate}
                    >
                        ISOLATE
                    </button>
                    <span className="gc-legend"><i className="gc-dot gc-dot-rare" style={accent ? { background: accent } : undefined} /> rare<i className="gc-dot gc-dot-common" /> common</span>
                    <span className="gc-axes">{genome.axes.join(' · ')}</span>
                </div>
            </div>
        </div>
    );
}
