'use client';

/*
 * components/project/GenomePanel.tsx — The Genome ◎ (parameter-space map).
 *
 * Every minted Output is a point placed by its REAL trait / Fate / palette
 * combination (lib/output/genome). Beyond the base map it now:
 *   • KIN — tap a point and its nearest relatives in the space light up, lines
 *     drawn to each: "here's its family."
 *   • YOUR CONSTELLATION — your holdings wear a ring; the MINE lens dims the
 *     rest and joins your pieces, showing whether you collect tight or wide.
 *   • LIVE PULSE — pieces listed on the market breathe, so the map reads as a
 *     living surface, not a static chart.
 *
 * Same widget family as ReplayPanel (card, readout, canvas motion, colorway
 * accent, controls). Deterministic + calc-only for the space itself ($0, never
 * renders art).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { getProject, projectColorway } from '../../lib/project/registry';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { getGenome, nearestKin } from '../../lib/output/genome';
import OutputThumb from '../profile/OutputThumb';

export default function GenomePanel() {
    const project = useProject();
    const def = getProject(project.slug);
    const { open } = useModal();
    const { siweAddress } = useAuth();

    const genome = useMemo(() => getGenome(project.slug), [project.slug]);

    /* Plot the MINTED set only (1..totalOutputs) — no non-canonical pieces —
       while isolation stays ranked across the whole edition set in the engine. */
    const points = useMemo(() => {
        if (!genome) return [];
        const n = project.totalOutputs || 0;
        return genome.points.filter((p) => p.id <= n);
    }, [genome, project.totalOutputs]);

    /* Listed pieces — the live-market pulse set. Straight off the project state
       the page already holds (o.price = an active listing), so no fetch. */
    const listedIds = useMemo(() => {
        const s = new Set<number>();
        project.outputs.forEach((o, id) => { if (o.price) s.add(id); });
        return s;
    }, [project.outputs]);

    const [selected, setSelected] = useState<number | null>(null);
    const [isolate, setIsolate] = useState(false);
    const [showMine, setShowMine] = useState(false);
    const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());
    const [dims, setDims] = useState({ w: 0, h: 200 });

    /* Your holdings in THIS project → the constellation. */
    useEffect(() => {
        if (!siweAddress) { setOwnedIds(new Set()); setShowMine(false); return; }
        let cancelled = false;
        fetch(`/api/user/${siweAddress.toLowerCase()}/outputs`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d?.holdings) return;
                const mine = new Set<number>();
                for (const h of d.holdings as { slug: string; token_id: number }[]) {
                    if (h.slug === project.slug) mine.add(h.token_id);
                }
                setOwnedIds(mine);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [siweAddress, project.slug]);

    /* Kin of the selected piece — its nearest relatives among minted editions. */
    const kin = useMemo(
        () => (selected != null ? nearestKin(project.slug, selected, 4, project.totalOutputs) : null),
        [selected, project.slug, project.totalOutputs],
    );
    const kinSet = useMemo(() => new Set((kin?.kin ?? []).map((k) => k.id)), [kin]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const laidOut = useRef<{ id: number; px: number; py: number; iso: number }[]>([]);
    const posById = useRef<Map<number, { px: number; py: number }>>(new Map());
    const pointerStart = useRef<{ x: number; y: number } | null>(null);
    const moved = useRef(false);
    const mountedAt = useRef(0);

    /* Track width so the canvas is crisp at any size. */
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

    const draw = useCallback((clock: number) => {
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
        const intro = Math.min(1, clock / 700);

        // Faint frame — the bounded parameter space.
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.strokeRect(pad, pad, plotW, plotH);
        ctx.globalAlpha = 1;

        const layout: { id: number; px: number; py: number; iso: number }[] = [];
        const pos = new Map<number, { px: number; py: number }>();
        const RARE = 0.72;
        const mineActive = showMine && ownedIds.size > 0;

        const ordered = [...points].sort((a, b) => a.isolation - b.isolation);
        for (const p of ordered) {
            const px = pad + p.x * plotW;
            const py = pad + p.y * plotH;
            layout.push({ id: p.id, px, py, iso: p.isolation });
            pos.set(p.id, { px, py });

            const appear = Math.min(1, Math.max(0, intro * 1.3 - p.isolation * 0.3));
            if (appear <= 0) continue;

            const rare = p.isolation >= RARE;
            const owned = ownedIds.has(p.id);
            const dim = (isolate && !rare) || (mineActive && !owned);
            const r = (rare ? 4.2 : 3) * appear;

            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            if (rare) {
                ctx.fillStyle = accent;
                ctx.globalAlpha = appear * (dim ? 0.45 : 1);
            } else {
                ctx.fillStyle = ink;
                ctx.globalAlpha = appear * (dim ? 0.3 : 0.9);
            }
            ctx.fill();

            if (rare && !dim) {
                ctx.beginPath();
                ctx.arc(px, py, r + 3.5, 0, Math.PI * 2);
                ctx.strokeStyle = accent;
                ctx.globalAlpha = appear * 0.8;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        laidOut.current = layout;
        posById.current = pos;

        // LIVE PULSE — listed pieces breathe (a slow expanding ring). Phase is
        // offset per id so they don't beat in unison.
        if (intro >= 1) {
            for (const id of listedIds) {
                const pt = pos.get(id);
                if (!pt) continue;
                const phase = ((clock / 1600) + ((id * 0.61803) % 1)) % 1;
                const rr = 2 + phase * 9;
                ctx.beginPath();
                ctx.arc(pt.px, pt.py, rr, 0, Math.PI * 2);
                ctx.strokeStyle = accent;
                ctx.globalAlpha = (1 - phase) * 0.9;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // YOUR CONSTELLATION — your holdings ringed; MINE lens joins them.
        if (ownedIds.size > 0) {
            const mine: { px: number; py: number }[] = [];
            for (const id of ownedIds) {
                const pt = pos.get(id);
                if (pt) mine.push(pt);
            }
            if (mineActive && mine.length > 1) {
                ctx.beginPath();
                mine.forEach((m, i) => (i === 0 ? ctx.moveTo(m.px, m.py) : ctx.lineTo(m.px, m.py)));
                /* Ink, full strength — a colorway-coloured line vanishes on a
                   page painted that same colorway (Brendon, 2026-08-02). */
                ctx.strokeStyle = ink;
                ctx.globalAlpha = 1;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            for (const m of mine) {
                ctx.beginPath();
                ctx.arc(m.px, m.py, 5.5, 0, Math.PI * 2);
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 1;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // KIN — the selected piece's nearest relatives, lines drawn to each.
        if (selected != null && kinSet.size > 0) {
            const from = pos.get(selected);
            if (from) {
                for (const k of kinSet) {
                    const to = pos.get(k);
                    if (!to) continue;
                    ctx.beginPath();
                    ctx.moveTo(from.px, from.py);
                    ctx.lineTo(to.px, to.py);
                    /* Ink, full strength — same reason as the constellation
                       line above: accent on its own colorway is invisible. */
                    ctx.strokeStyle = ink;
                    ctx.globalAlpha = 1;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(to.px, to.py, 4.5, 0, Math.PI * 2);
                    ctx.fillStyle = accent;
                    ctx.globalAlpha = 1;
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        }

        // Selected marker — crosshair + ring.
        if (selected != null) {
            const hit = pos.get(selected);
            if (hit) {
                ctx.strokeStyle = accent;
                ctx.globalAlpha = 1;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(hit.px, hit.py, 7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.moveTo(hit.px - 10, hit.py); ctx.lineTo(hit.px + 10, hit.py);
                ctx.moveTo(hit.px, hit.py - 10); ctx.lineTo(hit.px, hit.py + 10);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }, [dims, points, listedIds, ownedIds, showMine, isolate, selected, kinSet, project.slug, def]);

    /* One rAF loop while mounted — drives the intro reveal AND the live pulse
       (always-moving), always drawing with the latest state via a ref. Throttled
       to ~30fps. The panel only mounts while the Genome tab is open. */
    const drawRef = useRef(draw);
    useEffect(() => { drawRef.current = draw; }, [draw]);
    useEffect(() => {
        setSelected(null);
        mountedAt.current = 0;
        let raf = 0;
        let last = 0;
        const loop = (ts: number) => {
            if (!mountedAt.current) mountedAt.current = ts;
            if (ts - last >= 32) { last = ts; drawRef.current(ts - mountedAt.current); }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [project.slug]);

    const hitTest = useCallback((clientX: number, clientY: number): number | null => {
        const el = wrapRef.current;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        let best: number | null = null;
        let bestD = 18 * 18;
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
            if (dx * dx + dy * dy > 36) moved.current = true;
        }
        const id = hitTest(e.clientX, e.clientY);
        if (id != null) setSelected(id);
    }, [hitTest]);

    /* Tap a point → the PEEK chip (tiny thumbnail + #id) pops beside it; the
       MODAL only opens from tapping the chip itself (Brendon, 2026-07-06 —
       straight-to-modal off a map tap was jarring). Selection already lands
       on pointer-down/move; up just ends the gesture. */
    const onPointerUp = useCallback(() => {
        pointerStart.current = null;
    }, []);

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
    const nearest = kin?.kin[0];

    return (
        <div className="more-genome-wrap">
            <div className="genome-card">
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
                                {nearest && kin ? (
                                    <span className="gr-metric"><b>{nearest.shared}/{kin.axes}</b> KIN</span>
                                ) : sel.twins === 1 ? (
                                    <span className="gr-flag">NONE ALIKE</span>
                                ) : null}
                            </>
                        ) : (
                            <>
                                <span className="gr-metric"><b>{points.length}</b> PLOTTED</span>
                                {ownedIds.size > 0 && <span className="gr-metric"><b>{ownedIds.size}</b> YOURS</span>}
                                <span className="gr-metric"><b>{genome.axes.length}</b> AXES</span>
                            </>
                        )}
                    </div>
                </div>

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
                    {selected != null && posById.current.has(selected) && (() => {
                        /* PEEK — the selected point's tiny thumbnail + id,
                           anchored beside the point, clamped inside the plot.
                           Tapping IT opens the artwork modal. */
                        const pt = posById.current.get(selected)!;
                        const x = Math.min(Math.max(pt.px, 40), Math.max(40, dims.w - 40));
                        const above = pt.py > 78;
                        return (
                            <button
                                type="button"
                                className={`genome-peek${above ? '' : ' below'}`}
                                style={{ left: x, top: pt.py }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => open('output', selected, project.slug)}
                                title={`Open #${selected}`}
                            >
                                <OutputThumb slug={project.slug} id={selected} size={44} />
                                <span className="genome-peek-id">#{selected}</span>
                            </button>
                        );
                    })()}
                </div>

                <div className="genome-controls">
                    <button
                        type="button"
                        className={`gc-lens${isolate ? ' gc-lens-on' : ''}`}
                        onClick={() => setIsolate((v) => !v)}
                        aria-pressed={isolate}
                    >
                        ISOLATE
                    </button>
                    {ownedIds.size > 0 && (
                        <button
                            type="button"
                            className={`gc-lens${showMine ? ' gc-lens-on' : ''}`}
                            onClick={() => setShowMine((v) => !v)}
                            aria-pressed={showMine}
                        >
                            MINE
                        </button>
                    )}
                    <span className="gc-legend"><i className="gc-dot gc-dot-rare" style={accent ? { background: accent } : undefined} /> rare<i className="gc-dot gc-dot-common" /> common</span>
                    <span className="gc-axes">{genome.axes.join(' · ')}</span>
                </div>
            </div>
        </div>
    );
}
