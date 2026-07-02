'use client';

/*
 * LaneRunner — a little something for the sleuths.
 *
 * The old LED-handheld three-lane driving game, living inside the Global
 * Search results box. Oncoming traffic steps down the board one tick at a
 * time (cells light up, nothing scrolls — that's the toy), you weave a
 * certain flat-six silhouette between lanes, and it only ever gets faster.
 *
 * How you get here is deliberately not written down anywhere in this file.
 * The word is checked as an FNV-1a hash upstream (GlobalSearchBar), so
 * bundle-grepping finds nothing. If you found this: you earned it.
 *
 * Controls: no buttons — tap the LANE you want to be in (the whole board
 * is the controller, RACEWAY rules). ← → also work on desktop. Exits with
 * the search input (clear / Escape), like any other result.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const LANES = 3;
const ROWS = 6;
/** Tick starts leisurely, tightens to a scramble as the score climbs. */
const TICK_START_MS = 420;
const TICK_MIN_MS = 150;

/** The hero — a certain rear-engined coupe, top view, nose up.
    Body capsule, cabin glass, round headlights, whale tail. */
function HeroCar() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-car-hero" aria-hidden="true">
            {/* body — soft wide hips, tapered nose */}
            <path
                d="M12 1 C17 1 20 4 20.5 10 L21 30 C21 38 18 43 12 43 C6 43 3 38 3 30 L3.5 10 C4 4 7 1 12 1 Z"
                fill="currentColor"
                opacity="0.9"
            />
            {/* headlights */}
            <circle cx="7.2" cy="4.6" r="1.7" fill="currentColor" opacity="0.35" />
            <circle cx="16.8" cy="4.6" r="1.7" fill="currentColor" opacity="0.35" />
            {/* bonnet crease */}
            <path d="M12 6 L12 12" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
            {/* cabin glass — fast windshield, rounded rear glass */}
            <path
                d="M7 14 C7 12.5 9 11.5 12 11.5 C15 11.5 17 12.5 17 14 L17.5 24 C17.5 27 15 28.5 12 28.5 C9 28.5 6.5 27 6.5 24 Z"
                fill="var(--text-color, #111)"
                opacity="0.55"
            />
            {/* whale tail */}
            <rect x="4" y="34.5" width="16" height="3.4" rx="1.4" fill="currentColor" />
            <rect x="6.5" y="32.8" width="11" height="2" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
    );
}

/** Oncoming traffic — anonymous boxy sedans, headlights toward you. */
function TrafficCar() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-car-traffic" aria-hidden="true">
            <rect x="4" y="2" width="16" height="40" rx="6" fill="currentColor" opacity="0.5" />
            <rect x="6.5" y="15" width="11" height="12" rx="3" fill="var(--text-color, #111)" opacity="0.5" />
            <circle cx="8" cy="39.5" r="1.6" fill="currentColor" opacity="0.8" />
            <circle cx="16" cy="39.5" r="1.6" fill="currentColor" opacity="0.8" />
        </svg>
    );
}

interface RowState {
    /** Bitmask of blocked lanes (bit 0 = left). */
    mask: number;
    key: number;
}

export default function LaneRunner() {
    const [lane, setLane] = useState(1);
    const [rows, setRows] = useState<RowState[]>(() =>
        Array.from({ length: ROWS }, (_, i) => ({ mask: 0, key: i }))
    );
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [alive, setAlive] = useState(true);
    const laneRef = useRef(1);
    const keyRef = useRef(ROWS);
    /** The guaranteed weavable channel random-walks one lane per row. */
    const channelRef = useRef(1);

    useEffect(() => {
        try {
            const b = Number(window.localStorage.getItem('pd_lr_best') ?? 0);
            if (isFinite(b)) setBest(b);
        } catch { /* private mode */ }
    }, []);

    const move = useCallback((dir: -1 | 1) => {
        setLane((l) => {
            const next = Math.max(0, Math.min(LANES - 1, l + dir));
            laneRef.current = next;
            return next;
        });
    }, []);

    const restart = useCallback(() => {
        channelRef.current = 1;
        laneRef.current = 1;
        setLane(1);
        setRows(Array.from({ length: ROWS }, () => ({ mask: 0, key: keyRef.current++ })));
        setScore(0);
        setAlive(true);
    }, []);

    // The tick — traffic steps one row toward you; the board is a grid of
    // lit cells, not a scroller (LED-handheld rules).
    useEffect(() => {
        if (!alive) return;
        const tick = Math.max(TICK_MIN_MS, TICK_START_MS - score * 6);
        const t = window.setInterval(() => {
            setRows((prev) => {
                // Channel wanders ±1; it is always open, so a path always exists.
                const drift = Math.random();
                const ch = Math.max(0, Math.min(LANES - 1,
                    channelRef.current + (drift < 0.3 ? -1 : drift < 0.6 ? 1 : 0)));
                channelRef.current = ch;
                let mask = 0;
                for (let l = 0; l < LANES; l++) {
                    if (l !== ch && Math.random() < 0.45) mask |= 1 << l;
                }
                const next = [{ mask, key: keyRef.current++ }, ...prev.slice(0, ROWS - 1)];
                const bottom = next[ROWS - 1];
                if (bottom.mask & (1 << laneRef.current)) {
                    setAlive(false);
                    setScore((s) => {
                        setBest((b) => {
                            const nb = Math.max(b, s);
                            try { window.localStorage.setItem('pd_lr_best', String(nb)); } catch { /* */ }
                            return nb;
                        });
                        return s;
                    });
                    return next;
                }
                setScore((s) => s + 1);
                return next;
            });
        }, tick);
        return () => window.clearInterval(t);
    }, [alive, score]);

    // ← → on desktop; any key restarts after a crash.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') return; // the search input owns Escape
            if (!alive) { e.preventDefault(); restart(); return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [alive, move, restart]);

    // No buttons — the board IS the controller: tap the lane you want.
    const onBoardPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!alive) { restart(); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        const l = Math.max(0, Math.min(LANES - 1,
            Math.floor(((e.clientX - rect.left) / rect.width) * LANES)));
        laneRef.current = l;
        setLane(l);
    };

    return (
        <div className="lr-wrap">
            <div className="lr-score">
                {alive
                    ? `SCORE ${score}${best > 0 ? ` · BEST ${best}` : ''}`
                    : `CRASH · SCORE ${score} · BEST ${best} — TAP TO RESTART`}
            </div>
            <div
                className={`lr-board${alive ? '' : ' lr-crashed'}`}
                onPointerDown={onBoardPointer}
                role="application"
                aria-label="lane runner"
            >
                {rows.map((row, r) => (
                    <div className="lr-row" key={row.key}>
                        {Array.from({ length: LANES }, (_, l) => {
                            const blocked = (row.mask & (1 << l)) !== 0;
                            const isHero = r === ROWS - 1 && l === lane;
                            return (
                                <div className={`lr-cell${blocked ? ' lr-lit' : ''}`} key={l}>
                                    {blocked && <TrafficCar />}
                                    {isHero && <HeroCar />}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="lr-hint">{'← → or tap · flat-six not included'}</div>
        </div>
    );
}
