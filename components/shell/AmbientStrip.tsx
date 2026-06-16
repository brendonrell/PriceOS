'use client';

/*
 * AmbientStrip — the LED light bar that lives just BELOW the Tape and washes a
 * real, colour-shifting glow down onto the page (the page itself dims so the
 * ambient light does the work). Off by default — turned on from MY PD
 * (Settings → the ☼ pill). Tapping the bar opens a popup of LED options:
 * colour palette, pattern, speed, and how far the page dims.
 *
 * Visibility is driven by pdNotifs.ambientStrip; the look is driven by the
 * options here (persisted per device). When off, nothing renders.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

type Palette = 'aurora' | 'sunset' | 'ocean' | 'lava' | 'forest' | 'mono';
type Pattern = 'wave' | 'pulse' | 'breathe' | 'solid';
type Speed = 'slow' | 'med' | 'fast';
type Dim = 'off' | 'soft' | 'deep';

interface Opts { palette: Palette; pattern: Pattern; speed: Speed; dim: Dim }
const DEFAULTS: Opts = { palette: 'aurora', pattern: 'wave', speed: 'med', dim: 'soft' };
const STORAGE = 'pd_ambient_opts';

const PALETTES: { id: Palette; label: string }[] = [
    { id: 'aurora', label: 'Aurora' }, { id: 'sunset', label: 'Sunset' },
    { id: 'ocean', label: 'Ocean' }, { id: 'lava', label: 'Lava' },
    { id: 'forest', label: 'Forest' }, { id: 'mono', label: 'Mono' },
];
const PATTERNS: { id: Pattern; label: string }[] = [
    { id: 'wave', label: 'Wave' }, { id: 'pulse', label: 'Pulse' },
    { id: 'breathe', label: 'Breathe' }, { id: 'solid', label: 'Solid' },
];
const SPEEDS: { id: Speed; label: string }[] = [
    { id: 'slow', label: 'Slow' }, { id: 'med', label: 'Med' }, { id: 'fast', label: 'Fast' },
];
const DIMS: { id: Dim; label: string }[] = [
    { id: 'off', label: 'Off' }, { id: 'soft', label: 'Soft' }, { id: 'deep', label: 'Deep' },
];

export default function AmbientStrip() {
    const { notifs } = usePdNotifs();
    const enabled = notifs.ambientStrip;

    const [opts, setOpts] = useState<Opts>(DEFAULTS);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    /* Hydrate saved options. */
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE);
            if (raw) setOpts({ ...DEFAULTS, ...JSON.parse(raw) });
        } catch { /* ignore */ }
    }, []);

    /* Persist options. */
    useEffect(() => {
        try { window.localStorage.setItem(STORAGE, JSON.stringify(opts)); } catch { /* ignore */ }
    }, [opts]);

    /* Dim the page via <body> classes — only while the strip is on. */
    useEffect(() => {
        const b = document.body.classList;
        b.toggle('ambient-dim-soft', enabled && opts.dim === 'soft');
        b.toggle('ambient-dim-deep', enabled && opts.dim === 'deep');
        return () => b.remove('ambient-dim-soft', 'ambient-dim-deep');
    }, [enabled, opts.dim]);

    /* Close the popup on Escape or a tap outside. */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const onDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerdown', onDown, true);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerdown', onDown, true);
        };
    }, [open]);

    if (!enabled) return null;

    const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setOpts((o) => ({ ...o, [k]: v }));

    return (
        <div
            ref={rootRef}
            className={`ambient-strip-layer pal-${opts.palette} pat-${opts.pattern} spd-${opts.speed}${open ? ' menu-open' : ''}`}
        >
            <div className="ambient-glow" aria-hidden="true" />
            <button
                type="button"
                className="ambient-pill"
                title="Ambient light — tap for options"
                aria-label="Ambient light options"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <span className="ambient-pill-led" />
            </button>

            {open && (
                <div className="ambient-pop" role="dialog" aria-label="Ambient light options">
                    <Row label="Color">
                        {PALETTES.map((p) => (
                            <Chip key={p.id} on={opts.palette === p.id} onClick={() => set('palette', p.id)}>
                                {p.label}
                            </Chip>
                        ))}
                    </Row>
                    <Row label="Pattern">
                        {PATTERNS.map((p) => (
                            <Chip key={p.id} on={opts.pattern === p.id} onClick={() => set('pattern', p.id)}>
                                {p.label}
                            </Chip>
                        ))}
                    </Row>
                    <Row label="Speed">
                        {SPEEDS.map((p) => (
                            <Chip key={p.id} on={opts.speed === p.id} onClick={() => set('speed', p.id)}>
                                {p.label}
                            </Chip>
                        ))}
                    </Row>
                    <Row label="Dim">
                        {DIMS.map((p) => (
                            <Chip key={p.id} on={opts.dim === p.id} onClick={() => set('dim', p.id)}>
                                {p.label}
                            </Chip>
                        ))}
                    </Row>
                </div>
            )}
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="ambient-pop-row">
            <span className="ambient-pop-label">{label}</span>
            <div className="ambient-pop-chips">{children}</div>
        </div>
    );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" className={`ambient-chip${on ? ' on' : ''}`} onClick={onClick}>
            {children}
        </button>
    );
}
