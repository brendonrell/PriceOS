'use client';

/*
 * LaneRunner — a little something for the sleuths.
 *
 * The old LED-handheld three-lane driving game, living inside the Global
 * Search results box. Road hazards step down the board one tick at a time
 * (cells light up, nothing scrolls — that's the toy), you weave a certain
 * flat-six silhouette between lanes, and it only ever gets faster.
 *
 * Cartoony, not morbid (Brendon): the hazards are OIL SLICKS, BLOCKERS and
 * POTHOLES — no head-on traffic. Oil doesn't end the run, it SLIDES you a
 * lane sideways (chaos, not carnage). Blockers and potholes end it: WIPEOUT.
 *
 * THE ROAD SHOWS ITS DEPTH (Brendon, 2026-07-10): the blocker's LOOK
 * changes as the run goes deeper — same mechanics, new scenery, so what
 * you're dodging tells you how far in you are:
 *   0+   city streets  — traffic CONES
 *   22+  roadwork      — striped BARRIERS
 *   50+  night shift   — reflective road BARRELS (the dark was already here)
 *   111+ hothurt strip — pink FLAMINGOS (lawn-ornament country)
 *   777+ the halo road — floating HALOS ⬭ (nothing up here can hurt you,
 *        except that it can)
 *
 * The road keeps secrets of its own (PD milestone numbers, GLYPHS.md §8):
 *   22  — LUCKY 22 ♧
 *   50  — NIGHT SHIFT: the road goes dark, your headlights come on
 *   100 — CENTURY CLUB Ⅽ
 *   111 — HOTHURT: the car runs hot-pink from here
 *   777 — HALO ⬭ (if you ever get there, screenshot it)
 *
 * How you get HERE is deliberately not written down anywhere in this file.
 * The word is checked as an FNV-1a hash upstream (GlobalSearchBar), so
 * bundle-grepping finds nothing. If you found this: you earned it.
 *
 * Controls: no buttons — tap the LANE you want to be in (the whole board
 * is the controller, RACEWAY rules). ← → also work on desktop. Exits with
 * the search input (clear / Escape), like any other result.
 *
 * Pace is tuned for HUMANS: ~2 rows/sec at the start, ramping gently to a
 * ~4 rows/sec ceiling — challenging, never strobe-impossible.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const LANES = 3;
const ROWS = 6;
/** Human-calibrated: 520ms/row start → 240ms/row floor, -3ms per point. */
const TICK_START_MS = 520;
const TICK_MIN_MS = 240;

/** Hazard kinds per cell. 0 = clear road. */
type Cell = 0 | 1 | 2 | 3; // 1 oil · 2 cone · 3 pothole
const OIL = 1 as const;
const CONE = 2 as const;
const POTHOLE = 3 as const;

const VS15 = '︎';
/** PD milestone moments (home-feed glyphs, GLYPHS.md §8). */
const MOMENTS: Array<{ at: number; label: string }> = [
    { at: 22, label: `LUCKY 22 ♧${VS15}` },
    { at: 50, label: 'NIGHT SHIFT' },
    { at: 100, label: `CENTURY CLUB Ⅽ${VS15}` },
    { at: 111, label: 'HOTHURT' },
    { at: 777, label: `HALO ⬭${VS15}` },
];

/** The hero — a certain rear-engined coupe, top view, nose up.
    Clear (bright) headlights, cabin glass, whale tail. */
function HeroCar({ night, hot }: { night: boolean; hot: boolean }) {
    return (
        <svg
            viewBox="0 0 24 44"
            className={`lr-car lr-car-hero${night ? ' lr-hero-night' : ''}`}
            style={hot ? { color: '#FF0055' } : undefined}
            aria-hidden="true"
        >
            {/* headlight beams — only once the road goes dark */}
            {night && (
                <g opacity="0.28">
                    <path d="M6 4 L2 -14 L11 -14 Z" fill="#fff" />
                    <path d="M18 4 L13 -14 L22 -14 Z" fill="#fff" />
                </g>
            )}
            {/* body — soft wide hips, tapered nose */}
            <path
                d="M12 1 C17 1 20 4 20.5 10 L21 30 C21 38 18 43 12 43 C6 43 3 38 3 30 L3.5 10 C4 4 7 1 12 1 Z"
                fill="currentColor"
                opacity="0.92"
            />
            {/* clear headlights — bright lenses, always on */}
            <circle cx="7.2" cy="4.8" r="1.9" fill="#ffffff" opacity="0.95" />
            <circle cx="16.8" cy="4.8" r="1.9" fill="#ffffff" opacity="0.95" />
            {/* bonnet crease */}
            <path d="M12 6.5 L12 12" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
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

/** Oil slick — a cartoon puddle blob with a drip. Slides you, never ends you. */
function OilSlick() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            <path
                d="M12 12 C18 10 21 15 20 21 C22 24 20 30 15 31 C12 34 6 33 4.5 28 C2 25 3 18 7 16 C8 13 10 12.5 12 12 Z"
                fill="currentColor"
                opacity="0.5"
            />
            <ellipse cx="10" cy="21" rx="3.4" ry="2.2" fill="var(--text-color, #111)" opacity="0.4" />
            <circle cx="17.5" cy="34.5" r="1.6" fill="currentColor" opacity="0.45" />
            <circle cx="6" cy="9.5" r="1.1" fill="currentColor" opacity="0.4" />
        </svg>
    );
}

/** Traffic cone — stripes and all. */
function Cone() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            <path d="M12 8 L18.5 34 L5.5 34 Z" fill="currentColor" opacity="0.75" />
            <path d="M9.4 18.5 L14.6 18.5 L15.9 24 L8.1 24 Z" fill="var(--text-color, #111)" opacity="0.6" />
            <rect x="2.5" y="34" width="19" height="3.6" rx="1.6" fill="currentColor" opacity="0.75" />
        </svg>
    );
}

/** Roadwork barrier — sawhorse legs, striped plank. Depth 22+. */
function Barrier() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            {/* legs */}
            <path d="M6 16 L4 34 M18 16 L20 34" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
            {/* plank */}
            <rect x="3" y="14" width="18" height="7" rx="1.2" fill="currentColor" opacity="0.8" />
            {/* diagonal stripes */}
            <path d="M7 14 L4.4 21 M13 14 L10.4 21 M19 14 L16.4 21" stroke="var(--text-color, #111)" strokeWidth="2.2" opacity="0.6" />
            {/* feet */}
            <rect x="2" y="33.4" width="5.4" height="2" rx="1" fill="currentColor" opacity="0.7" />
            <rect x="16.6" y="33.4" width="5.4" height="2" rx="1" fill="currentColor" opacity="0.7" />
        </svg>
    );
}

/** Traffic drum — the round roadwork barrel, reflective bands. Depth 50+
    (night shift), when the stripes catch your headlights. */
function Barrel() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            <path d="M6.5 12 C6.5 10.6 17.5 10.6 17.5 12 L18.5 32 C18.5 34 5.5 34 5.5 32 Z" fill="currentColor" opacity="0.7" />
            {/* reflective bands — bright, they read as catching the beams */}
            <path d="M6.1 17 L17.9 17 L18.15 21.4 L5.85 21.4 Z" fill="#ffffff" opacity="0.85" />
            <path d="M5.7 25.5 L18.3 25.5 L18.5 29.4 L5.5 29.4 Z" fill="#ffffff" opacity="0.55" />
            {/* base ring */}
            <ellipse cx="12" cy="33" rx="7.6" ry="1.7" fill="currentColor" opacity="0.75" />
        </svg>
    );
}

/** Lawn flamingo — one leg, hot-pink country. Depth 111+ (HOTHURT). */
function Flamingo() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true" style={{ color: '#FF0055' }}>
            {/* body */}
            <ellipse cx="10.5" cy="20" rx="6.2" ry="4.6" fill="currentColor" opacity="0.85" />
            {/* tail flick */}
            <path d="M5 17.5 C3 15.5 3.6 13.5 5.6 12.8 C4.8 15 5.6 16.4 7 17.2 Z" fill="currentColor" opacity="0.7" />
            {/* neck — the S curve */}
            <path d="M16 19 C20 18 20 12.5 17.5 10.5 C16 9.3 13.8 9.8 13.4 11.6" stroke="currentColor" strokeWidth="2.4" fill="none" opacity="0.85" strokeLinecap="round" />
            {/* head + beak */}
            <circle cx="13.8" cy="11.2" r="2" fill="currentColor" opacity="0.9" />
            <path d="M12.2 12 L9.8 13.4 L12.6 13.6 Z" fill="var(--text-color, #111)" opacity="0.8" />
            {/* the one leg + foot */}
            <path d="M11 24.5 L11 34" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
            <path d="M8.8 34 L13.4 34" stroke="currentColor" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
        </svg>
    );
}

/** Halo — a floating ⬭, the 777 road. Serene. Still ends you. */
function HaloRing() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            <ellipse cx="12" cy="21" rx="8" ry="4.6" fill="none" stroke="currentColor" strokeWidth="2.6" opacity="0.9" />
            <ellipse cx="12" cy="21" rx="8" ry="4.6" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.5" />
        </svg>
    );
}

/** Pothole — a jagged little crater. */
function Pothole() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            <path
                d="M5 20 L8 15.5 L12 17 L16 14.5 L19.5 19 L18.5 25 L14 28.5 L8.5 27.5 L4.5 24 Z"
                fill="var(--text-color, #111)"
                opacity="0.85"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeOpacity="0.6"
            />
            <path d="M8.5 20 L11.5 19 L14.5 21" stroke="currentColor" strokeWidth="0.8" opacity="0.35" fill="none" />
        </svg>
    );
}

/** The blocking hazard's look by depth — same mechanics, deeper scenery.
    Thresholds ride the MOMENTS numbers so the scenery flips on the beat. */
function Blocker({ score }: { score: number }) {
    if (score >= 777) return <HaloRing />;
    if (score >= 111) return <Flamingo />;
    if (score >= 50) return <Barrel />;
    if (score >= 22) return <Barrier />;
    return <Cone />;
}

interface RowState {
    cells: Cell[];
    key: number;
}

const emptyRow = (key: number): RowState => ({ cells: [0, 0, 0] as Cell[], key });

export default function LaneRunner() {
    const [lane, setLane] = useState(1);
    const [rows, setRows] = useState<RowState[]>(() =>
        Array.from({ length: ROWS }, (_, i) => emptyRow(i))
    );
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    /* World record — the global top score + its @name, for the glory
       (Brendon, 2026-07-10). Fetched once per game mount; a wipeout that
       beats your best submits (signed-in users only, server keeps max). */
    const [wr, setWr] = useState<{ score: number; handle: string } | null>(null);
    const [alive, setAlive] = useState(true);
    const [slid, setSlid] = useState(0); // flash counter for the oil-slide moment
    const [moment, setMoment] = useState<string | null>(null);
    const laneRef = useRef(1);
    const keyRef = useRef(ROWS);
    /** The guaranteed weavable channel random-walks one lane per row. */
    const channelRef = useRef(1);
    const momentT = useRef(0);

    const night = alive && score >= 50;
    const hot = alive && score >= 111;

    useEffect(() => {
        try {
            const b = Number(window.localStorage.getItem('pd_lr_best') ?? 0);
            if (isFinite(b)) setBest(b);
        } catch { /* private mode */ }
        fetch('/api/game-score?game=lane-runner')
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { rows?: Array<{ best: number; handle: string }> } | null) => {
                const top = j?.rows?.[0];
                if (top && top.best > 0) setWr({ score: top.best, handle: top.handle });
            })
            .catch(() => { /* offline — header just omits the WR */ });
    }, []);

    const move = useCallback((to: number) => {
        const next = Math.max(0, Math.min(LANES - 1, to));
        laneRef.current = next;
        setLane(next);
    }, []);

    const restart = useCallback(() => {
        channelRef.current = 1;
        laneRef.current = 1;
        setLane(1);
        setRows(Array.from({ length: ROWS }, () => emptyRow(keyRef.current++)));
        setScore(0);
        setMoment(null);
        setAlive(true);
    }, []);

    // The tick — hazards step one row toward you; the board is a grid of
    // lit cells, not a scroller (LED-handheld rules).
    useEffect(() => {
        if (!alive) return;
        const tick = Math.max(TICK_MIN_MS, TICK_START_MS - score * 3);
        const t = window.setInterval(() => {
            setRows((prev) => {
                // Channel wanders ±1; it is always clear, so a line always exists.
                const drift = Math.random();
                const ch = Math.max(0, Math.min(LANES - 1,
                    channelRef.current + (drift < 0.3 ? -1 : drift < 0.6 ? 1 : 0)));
                channelRef.current = ch;
                const cells: Cell[] = [0, 0, 0];
                for (let l = 0; l < LANES; l++) {
                    if (l === ch || Math.random() >= 0.45) continue;
                    // Hazard mix evolves with the run: potholes join at 40+.
                    const r = Math.random();
                    cells[l] = r < 0.4 ? OIL : r < 0.75 || score < 40 ? CONE : POTHOLE;
                }
                const next = [{ cells, key: keyRef.current++ }, ...prev.slice(0, ROWS - 1)];
                const hit = next[ROWS - 1].cells[laneRef.current];

                if (hit === CONE || hit === POTHOLE) {
                    setAlive(false);
                    setScore((s) => {
                        setBest((b) => {
                            const nb = Math.max(b, s);
                            try { window.localStorage.setItem('pd_lr_best', String(nb)); } catch { /* */ }
                            return nb;
                        });
                        if (s > 0) {
                            // Best-effort submit — signed-out just 401s quietly;
                            // a new WR repaints the header on the spot.
                            fetch('/api/game-score', {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ game: 'lane-runner', score: s }),
                            }).then((r) => {
                                if (!r.ok) return;
                                setWr((prev) => (prev && prev.score >= s ? prev : { score: s, handle: 'you' }));
                            }).catch(() => { /* */ });
                        }
                        return s;
                    });
                    return next;
                }

                if (hit === OIL) {
                    // Slide! One lane sideways, cartoon physics. Never fatal.
                    const dir = laneRef.current === 0 ? 1 : laneRef.current === 2 ? -1 : (Math.random() < 0.5 ? -1 : 1);
                    laneRef.current = Math.max(0, Math.min(LANES - 1, laneRef.current + dir));
                    setLane(laneRef.current);
                    setSlid((n) => n + 1);
                }

                setScore((s) => {
                    const ns = s + 1;
                    const m = MOMENTS.find((mm) => mm.at === ns);
                    if (m) {
                        setMoment(m.label);
                        window.clearTimeout(momentT.current);
                        momentT.current = window.setTimeout(() => setMoment(null), 2200);
                    }
                    return ns;
                });
                return next;
            });
        }, tick);
        return () => window.clearInterval(t);
    }, [alive, score]);

    useEffect(() => () => window.clearTimeout(momentT.current), []);

    // ← → on desktop; any key restarts after a wipeout.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') return; // the search input owns Escape
            if (!alive) { e.preventDefault(); restart(); return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); move(laneRef.current - 1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); move(laneRef.current + 1); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [alive, move, restart]);

    // No buttons — the board IS the controller: tap the lane you want.
    const onBoardPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!alive) { restart(); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        move(Math.floor(((e.clientX - rect.left) / rect.width) * LANES));
    };

    return (
        <div className="lr-wrap">
            <div className="lr-score">
                {!alive
                    ? `WIPEOUT · ${score} · BEST ${best}${wr ? ` · WR ${wr.score} @${wr.handle}` : ''} — TAP`
                    : moment
                        ? moment
                        : `SCORE ${score}${best > 0 ? ` · BEST ${best}` : ''}${wr ? ` · WR ${wr.score} @${wr.handle}` : ''}`}
            </div>
            <div
                className={`lr-board${alive ? '' : ' lr-crashed'}${night ? ' lr-night' : ''}`}
                onPointerDown={onBoardPointer}
                role="application"
                aria-label="lane runner"
            >
                {rows.map((row, r) => (
                    <div className="lr-row" key={row.key}>
                        {Array.from({ length: LANES }, (_, l) => {
                            const cell = row.cells[l];
                            const isHero = r === ROWS - 1 && l === lane;
                            return (
                                <div className="lr-cell" key={l}>
                                    {cell === OIL && <OilSlick />}
                                    {cell === CONE && <Blocker score={score} />}
                                    {cell === POTHOLE && <Pothole />}
                                    {isHero && (
                                        <span key={slid} className="lr-hero-slot">
                                            <HeroCar night={night} hot={hot} />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="lr-hint">{'tap a lane · oil slides you · everything else ends you'}</div>
        </div>
    );
}
