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
 * THE ROAD SHOWS ITS DEPTH (Brendon, 2026-07-10; deepened 2026-07-16):
 * the blocker's LOOK changes as the run goes deeper — same mechanics, new
 * scenery, so what you're dodging tells you how far in you are:
 *   0+    city streets   — traffic CONES
 *   18+   roadwork       — striped BARRIERS (you GRADUATED)
 *   50+   night shift    — reflective road BARRELS (the dark was already here)
 *   100+  century road   — MILE MARKERS (stone country)
 *   111+  hothurt strip  — pink FLAMINGOS (lawn-ornament country)
 *   777+  the halo road  — floating HALOS ⬭ (nothing up here can hurt you,
 *         except that it can)
 *   1000+ the velvet road — STANCHIONS (per-mille country, members only)
 *   1200+ archetype fields — BLOOMS ✻ (the flowers are also solid)
 *
 * The road keeps secrets of its own (PD milestone numbers, GLYPHS.md §8):
 *   18   — GRADUATED ⟢⟢
 *   22   — LUCKY 22 ♧
 *   50   — NIGHT SHIFT: the road goes dark, your headlights come on
 *   100  — CENTURY CLUB Ⅽ
 *   111  — HOTHURT: the car runs hot-pink from here
 *   777  — HALO ⬭ (if you ever get there, screenshot it)
 *   1000 — PER MILLE CLUB
 *   1200 — ARCHETYPE ✻
 *
 * How you get HERE is deliberately not written down anywhere in this file.
 * The word is checked as an FNV-1a hash upstream (GlobalSearchBar), so
 * bundle-grepping finds nothing. If you found this: you earned it.
 *
 * Controls: no buttons — tap the side of the road you want to move TOWARD;
 * the car changes ONE lane per tap (LED-handheld rules — Brendon,
 * 2026-07-16: no lane-jumping). ← → also work on desktop. Exits with the
 * search input (clear / Escape), like any other result.
 *
 * Pace + depth (2026-07-16 revamp — "night mode should be a real
 * achievement"): the odometer counts every OTHER row, the speed ramp is
 * gentler but the road gets DENSER with depth, so the run is longer and
 * the late stages are earned. The tick pauses while the tab is hidden —
 * no background deaths. The frame NEVER resizes mid-run: the status and
 * hint areas are fixed two-line blocks.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const LANES = 3;
const ROWS = 6;
/** Human-calibrated, stretched 2026-07-16: 520ms/row start → 215ms/row
    floor, -2.5ms per point. With the odometer counting every other row,
    the ramp lands the floor around the 200s — a long, earnable run. */
const TICK_START_MS = 520;
const TICK_MIN_MS = 215;

/** Hazard kinds per cell. 0 = clear road. */
type Cell = 0 | 1 | 2 | 3; // 1 oil · 2 cone · 3 pothole
const OIL = 1 as const;
const CONE = 2 as const;
const POTHOLE = 3 as const;

const VS15 = '︎';
/** PD milestone moments (home-feed glyphs, GLYPHS.md §8). */
const MOMENTS: Array<{ at: number; label: string }> = [
    { at: 18, label: `GRADUATED ⟢⟢${VS15}` },
    { at: 22, label: `LUCKY 22 ♧${VS15}` },
    { at: 50, label: 'NIGHT SHIFT' },
    { at: 100, label: `CENTURY CLUB Ⅽ${VS15}` },
    { at: 111, label: 'HOTHURT' },
    { at: 777, label: `HALO ⬭${VS15}` },
    { at: 1000, label: 'PER MILLE CLUB' },
    { at: 1200, label: `ARCHETYPE ✻${VS15}` },
];

/* Y2K arcade launch logo — a road edge, the block wordmark, then lane dashes.
   Scales down to fit any width via CSS (clamp font-size). 2026-07-16: the
   L rebuilt with a full-height double column + wide foot, and a breather
   line under the road edge — the old thin `█` under the solid bar read as
   a T ("Tane Runner", Brendon). */
const LOGO = [
    '▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
    '',
    '██    ▄▀▄  █▄ █  █▀▀',
    '██    █▀█  █ ▀█  █▀ ',
    '██▄▄▄ ▀ ▀  ▀  ▀  ▀▀▀',
    '',
    '█▀▄ █ █ █▄ █ █▄ █ █▀▀ █▀▄',
    '█▀▄ █ █ █ ▀█ █ ▀█ █▀  █▀▄',
    '▀ ▀ ▀▀▀ ▀  ▀ ▀  ▀ ▀▀▀ ▀ ▀',
    ' ╎    ╎    ╎    ╎    ╎   ',
].join('\n');

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

/** Mile marker — a stone post with the century arc carved in. Depth 100+. */
function MileMarker() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            {/* the post — rounded stone slab */}
            <path d="M7 10 C7 7.6 17 7.6 17 10 L17.6 32 L6.4 32 Z" fill="currentColor" opacity="0.72" />
            {/* the carved Ⅽ — an open arc facing right */}
            <path d="M15 15.5 C10.5 13.5 8 16.5 8 20 C8 23.5 10.5 26.5 15 24.5" stroke="var(--text-color, #111)" strokeWidth="2.2" fill="none" opacity="0.72" strokeLinecap="round" />
            {/* plinth */}
            <rect x="4.5" y="31.5" width="15" height="3" rx="1.2" fill="currentColor" opacity="0.75" />
        </svg>
    );
}

/** Velvet-rope stanchion — per-mille country, members only. Depth 1000+. */
function Stanchion() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            {/* rope swags to the neighbours */}
            <path d="M0 15 C5 19 8 19 12 15.5 M12 15.5 C16 19 19 19 24 15" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
            {/* the ball top */}
            <circle cx="12" cy="12.6" r="2.4" fill="currentColor" opacity="0.9" />
            {/* the post */}
            <path d="M11 15 L10.4 31 L13.6 31 L13 15 Z" fill="currentColor" opacity="0.8" />
            {/* weighted base */}
            <ellipse cx="12" cy="32.4" rx="6.4" ry="1.9" fill="currentColor" opacity="0.8" />
        </svg>
    );
}

/** Archetype bloom — the six-teardrop ✻, grown roadside-size. Depth 1200+. */
function Bloom() {
    return (
        <svg viewBox="0 0 24 44" className="lr-car lr-hazard" aria-hidden="true">
            <g opacity="0.85">
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <ellipse
                        key={deg}
                        cx="12" cy="15.2" rx="2" ry="6.4"
                        fill="currentColor"
                        transform={`rotate(${deg} 12 21)`}
                    />
                ))}
            </g>
            <circle cx="12" cy="21" r="2.2" fill="var(--text-color, #111)" opacity="0.7" />
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
    Thresholds ride the MOMENTS numbers so the scenery flips on the beat.
    Eight stages deep (2026-07-16 revamp). */
function Blocker({ score }: { score: number }) {
    if (score >= 1200) return <Bloom />;
    if (score >= 1000) return <Stanchion />;
    if (score >= 777) return <HaloRing />;
    if (score >= 111) return <Flamingo />;
    if (score >= 100) return <MileMarker />;
    if (score >= 50) return <Barrel />;
    if (score >= 18) return <Barrier />;
    return <Cone />;
}

interface RowState {
    cells: Cell[];
    key: number;
    /** The score AT SPAWN — freezes each obstacle's look so a hazard already on
        screen never morphs (pylon → barrier) when a depth threshold flips. New
        rows spawned past the threshold get the new look; the ones mid-screen
        finish leaving as what they were. */
    spawnScore: number;
}

const emptyRow = (key: number): RowState => ({ cells: [0, 0, 0] as Cell[], key, spawnScore: 0 });

export default function LaneRunner() {
    const [lane, setLane] = useState(1);
    const [rows, setRows] = useState<RowState[]>(() =>
        Array.from({ length: ROWS }, (_, i) => emptyRow(i))
    );
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    /* The global top 10 with real @handles (Brendon, 2026-07-11 — no more
       "@you": standings refresh from the server after a submit, so the line
       always names the actual account). WR = the top row. Tapping the score
       line opens the board. */
    const [lb, setLb] = useState<Array<{ best: number; handle: string }>>([]);
    const [lbOpen, setLbOpen] = useState(false);
    const wr = lb.length > 0 && lb[0].best > 0 ? { score: lb[0].best, handle: lb[0].handle } : null;
    const [alive, setAlive] = useState(true);
    /* The game opens on a launch screen; TAP TO START begins the run. */
    const [started, setStarted] = useState(false);
    const [slid, setSlid] = useState(0); // flash counter for the oil-slide moment
    const [moment, setMoment] = useState<string | null>(null);
    const laneRef = useRef(1);
    const keyRef = useRef(ROWS);
    /** The guaranteed weavable channel random-walks one lane per row. */
    const channelRef = useRef(1);
    const momentT = useRef(0);
    /** Rows survived this run — the odometer ticks every OTHER row
        (2026-07-16: the run is the length; the score is the depth). */
    const rowsRunRef = useRef(0);

    const night = alive && score >= 50;
    const hot = alive && score >= 111;

    const loadBoard = useCallback(() => {
        fetch('/api/game-score?game=lane-runner')
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { rows?: Array<{ best: number; handle: string }> } | null) => {
                if (j?.rows) setLb(j.rows.filter((row) => row.best > 0));
            })
            .catch(() => { /* offline — header just omits the WR */ });
    }, []);

    useEffect(() => {
        try {
            const b = Number(window.localStorage.getItem('pd_lr_best') ?? 0);
            if (isFinite(b)) setBest(b);
        } catch { /* private mode */ }
        loadBoard();
    }, [loadBoard]);

    const move = useCallback((to: number) => {
        const next = Math.max(0, Math.min(LANES - 1, to));
        laneRef.current = next;
        setLane(next);
    }, []);

    const restart = useCallback(() => {
        channelRef.current = 1;
        laneRef.current = 1;
        rowsRunRef.current = 0;
        setLane(1);
        setRows(Array.from({ length: ROWS }, () => emptyRow(keyRef.current++)));
        setScore(0);
        setMoment(null);
        setAlive(true);
    }, []);

    /* Launch → play: clear the board list and start a fresh run. */
    const startGame = useCallback(() => {
        setLbOpen(false);
        setStarted(true);
        restart();
    }, [restart]);

    // The tick — hazards step one row toward you; the board is a grid of
    // lit cells, not a scroller (LED-handheld rules).
    useEffect(() => {
        if (!started || !alive) return;
        const tick = Math.max(TICK_MIN_MS, TICK_START_MS - score * 2.5);
        const t = window.setInterval(() => {
            // No background deaths — the road waits while the tab is hidden.
            if (typeof document !== 'undefined' && document.hidden) return;
            setRows((prev) => {
                // Channel wanders ±1; it is always clear, so a line always exists.
                const drift = Math.random();
                const ch = Math.max(0, Math.min(LANES - 1,
                    channelRef.current + (drift < 0.3 ? -1 : drift < 0.6 ? 1 : 0)));
                channelRef.current = ch;
                /* Depth = density (2026-07-16): the road starts sparse and
                   CROWDS as the run deepens — spawn chance per off-channel
                   lane climbs 45% → 82%, and oil (the survivable hazard)
                   thins out in favour of the enders. Speed alone no longer
                   carries the difficulty, so the deep stages are earned. */
                const spawnChance = Math.min(0.82, 0.45 + score * 0.002);
                const oilShare = Math.max(0.18, 0.4 - score * 0.001);
                const cells: Cell[] = [0, 0, 0];
                for (let l = 0; l < LANES; l++) {
                    if (l === ch || Math.random() >= spawnChance) continue;
                    // Hazard mix evolves with the run: potholes join at 40+.
                    const r = Math.random();
                    cells[l] = r < oilShare ? OIL : r < 0.75 || score < 40 ? CONE : POTHOLE;
                }
                const next = [{ cells, key: keyRef.current++, spawnScore: score }, ...prev.slice(0, ROWS - 1)];
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
                            // Best-effort submit — signed-out just 401s quietly.
                            // A landed score refetches the standings, so the
                            // header names the REAL account, never "@you".
                            fetch('/api/game-score', {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ game: 'lane-runner', score: s }),
                            }).then((r) => {
                                if (r.ok) loadBoard();
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

                // The odometer ticks every OTHER row survived — the run is
                // twice the road it used to be, so 50 (night) is a feat and
                // 777 is legend (2026-07-16 depth pass).
                rowsRunRef.current += 1;
                if (rowsRunRef.current % 2 === 0) {
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
                }
                return next;
            });
        }, tick);
        return () => window.clearInterval(t);
    }, [started, alive, score]);

    useEffect(() => () => window.clearTimeout(momentT.current), []);

    // ← → on desktop; any key restarts after a wipeout.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') return; // the search input owns Escape
            if (!started) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); } return; }
            if (!alive) { e.preventDefault(); restart(); return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); move(laneRef.current - 1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); move(laneRef.current + 1); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [started, alive, move, restart, startGame]);

    // No buttons — the board IS the controller. One lane per tap (Brendon,
    // 2026-07-16): the car steps TOWARD the side you touch, never jumps.
    const onBoardPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!alive) { restart(); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        const target = Math.floor(((e.clientX - rect.left) / rect.width) * LANES);
        if (target === laneRef.current) return;
        move(laneRef.current + (target > laneRef.current ? 1 : -1));
    };

    /* LED odometer read — zero-padded four digits, handheld rules. */
    const odo = String(score).padStart(4, '0');

    const lbList = lbOpen && (
        <div className="lr-lb" aria-label="Lane Runner top 10">
            {lb.length === 0 && <div className="lr-lb-row">No records yet — set one.</div>}
            {lb.map((row, i) => (
                <div className="lr-lb-row" key={`${row.handle}-${i}`}>
                    <span className="lr-lb-rank">{i < 3 ? `${'❶❷❸'[i]}︎` : i + 1}</span>
                    <span className="lr-lb-handle">@{row.handle}</span>
                    <span className="lr-lb-score">{row.best}</span>
                </div>
            ))}
        </div>
    );

    /* The launch screen — Y2K ASCII logo + the two options. TAP TO START
       begins the run; LEADERBOARD unfolds the top 10 right here. */
    if (!started) {
        return (
            <div className="lr-wrap lr-launch">
                <pre className="lr-logo" aria-label="LANE RUNNER">{LOGO}</pre>
                <div className="lr-launch-tag">
                    {best > 0 ? `BEST ${best}` : 'the sleuth’s road'}
                    {wr ? ` · WR ${wr.score} @${wr.handle}` : ''}
                </div>
                <div className="lr-launch-opts">
                    <button
                        type="button"
                        className="lr-launch-btn lr-launch-go"
                        onPointerDown={(e) => { e.stopPropagation(); startGame(); }}
                    >
                        {'» TAP TO START «'}
                    </button>
                    <button
                        type="button"
                        className="lr-launch-btn"
                        onPointerDown={(e) => { e.stopPropagation(); setLbOpen((v) => { if (!v) loadBoard(); return !v; }); }}
                    >
                        LEADERBOARD
                    </button>
                </div>
                {lbList}
            </div>
        );
    }

    return (
        <div className="lr-wrap">
            {/* The status line IS the leaderboard toggle — tap where the WR
                shows and the top 10 unfolds (Brendon, 2026-07-11). */}
            <div
                className="lr-score"
                role="button"
                tabIndex={0}
                title="Top 10"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    setLbOpen((v) => { if (!v) loadBoard(); return !v; });
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLbOpen((v) => { if (!v) loadBoard(); return !v; });
                    }
                }}
            >
                {/* Fixed TWO-LINE block — the frame must never resize
                    mid-run (Brendon, 2026-07-16). Line 1 carries the state
                    (odometer / moment / wipeout); line 2 carries the WR or
                    holds its space. */}
                <div className="lr-score-line">
                    {!alive
                        ? `WIPEOUT ${odo} · BEST ${best}`
                        : moment ?? `SCORE ${odo}${best > 0 ? ` · BEST ${best}` : ''}`}
                </div>
                <div className="lr-score-line lr-score-sub">
                    {wr ? `WR ${wr.score} @${wr.handle}` : ' '}
                </div>
            </div>
            {lbList}
            <div
                className={`lr-board${alive ? '' : ' lr-crashed'}${night ? ' lr-night' : ''}${hot ? ' lr-hot' : ''}${score >= 777 ? ' lr-halo-road' : ''}`}
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
                                    {cell === CONE && <Blocker score={row.spawnScore} />}
                                    {cell === POTHOLE && <Pothole />}
                                    {isHero && (
                                        <span key={slid} className={`lr-hero-slot${alive ? '' : ' lr-spinout'}`}>
                                            <HeroCar night={night} hot={hot} />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {/* Fixed two lines here too — swaps content, never height. */}
            <div className="lr-hint">
                {alive
                    ? <>{'tap a side · one lane at a time'}<br />{'oil slides you · the rest ends you'}</>
                    : <>{'TAP TO RETRY'}<br />{'(any key works too)'}</>}
            </div>
        </div>
    );
}
