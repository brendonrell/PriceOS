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
import { useToast } from '../../lib/state/ToastContext';
import { pushSettings, USERSTATE_HYDRATED_EVENT } from '../../lib/state/userState';

type Palette =
    | 'aurora' | 'sunset' | 'ocean' | 'lava' | 'forest' | 'mono'
    | 'neon' | 'gold' | 'ice' | 'ultra' | 'candy' | 'rose'
    /* Hidden — never shown as chips; only reached via the secret long-press. */
    | 'prism' | 'petey';
type Pattern = 'wave' | 'pulse' | 'breathe' | 'solid' | 'sweep' | 'ripple' | 'flicker' | 'strobe';
type Speed = 'slow' | 'med' | 'fast';
type Dim = 'off' | 'low' | 'soft' | 'med' | 'deep' | 'pitch';

/* The secret palettes the long-press cycles through, then back to Aurora. */
const SECRET_CYCLE: { id: Palette; toast: string }[] = [
    { id: 'prism', toast: 'Ambient: PRISM ✦' },
    { id: 'petey', toast: 'Ambient: PETEY ✦' },
    { id: 'aurora', toast: 'Ambient: AURORA' },
];

interface Opts { palette: Palette; pattern: Pattern; speed: Speed; dim: Dim }
const DEFAULTS: Opts = { palette: 'aurora', pattern: 'wave', speed: 'med', dim: 'soft' };
const STORAGE = 'pd_ambient_opts';

const PALETTES: { id: Palette; label: string }[] = [
    { id: 'aurora', label: 'Aurora' }, { id: 'sunset', label: 'Sunset' },
    { id: 'ocean', label: 'Ocean' }, { id: 'lava', label: 'Lava' },
    { id: 'forest', label: 'Forest' }, { id: 'mono', label: 'Mono' },
    { id: 'neon', label: 'Neon' }, { id: 'gold', label: 'Gold' },
    { id: 'ice', label: 'Ice' }, { id: 'ultra', label: 'Ultra' },
    { id: 'candy', label: 'Candy' }, { id: 'rose', label: 'Rosé' },
];
const PATTERNS: { id: Pattern; label: string }[] = [
    { id: 'wave', label: 'Wave' }, { id: 'pulse', label: 'Pulse' },
    { id: 'breathe', label: 'Breathe' }, { id: 'solid', label: 'Solid' },
    { id: 'sweep', label: 'Sweep' }, { id: 'ripple', label: 'Ripple' },
    { id: 'flicker', label: 'Flicker' }, { id: 'strobe', label: 'Strobe' },
];
const SPEEDS: { id: Speed; label: string }[] = [
    { id: 'slow', label: 'Slow' }, { id: 'med', label: 'Med' }, { id: 'fast', label: 'Fast' },
];
const DIMS: { id: Dim; label: string }[] = [
    { id: 'off', label: 'Off' }, { id: 'low', label: 'Low' }, { id: 'soft', label: 'Soft' },
    { id: 'med', label: 'Med' }, { id: 'deep', label: 'Deep' }, { id: 'pitch', label: 'Pitch' },
];
const DIM_CLASSES = ['ambient-dim-low', 'ambient-dim-soft', 'ambient-dim-med', 'ambient-dim-deep', 'ambient-dim-pitch'];

export default function AmbientStrip() {
    const { notifs } = usePdNotifs();
    const { showToast } = useToast();
    const enabled = notifs.ambientStrip;

    const [opts, setOpts] = useState<Opts>(DEFAULTS);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    /* ✦ Secret — hold the light for ~0.6s to cycle the two hidden palettes
       (Prism, Petey) and back. Not advertised anywhere; just here for whoever
       presses and waits. The press timer also suppresses the tap-to-open so a
       long-press never also flips the menu. */
    const holdTimer = useRef<number | null>(null);
    const heldFired = useRef(false);
    const beginHold = () => {
        heldFired.current = false;
        holdTimer.current = window.setTimeout(() => {
            heldFired.current = true;
            setOpts((o) => {
                const i = SECRET_CYCLE.findIndex((s) => s.id === o.palette);
                const next = SECRET_CYCLE[(i + 1) % SECRET_CYCLE.length] ?? SECRET_CYCLE[0];
                showToast(next.toast);
                return { ...o, palette: next.id };
            });
        }, 600);
    };
    const endHold = () => {
        if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    };

    /* Hydrate saved options. */
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE);
            if (raw) setOpts({ ...DEFAULTS, ...JSON.parse(raw) });
        } catch { /* ignore */ }
    }, []);

    /* Persist options — device cache + account (so the bar restores on any
       device). pushSettings is a no-op until the account snapshot has hydrated,
       so boot defaults can't clobber the saved row. */
    useEffect(() => {
        try { window.localStorage.setItem(STORAGE, JSON.stringify(opts)); } catch { /* ignore */ }
        pushSettings({ ambient: opts });
    }, [opts]);

    /* Account hydrate: when the server snapshot lands (fresh-device login),
       userState rewrites the ambient cache; re-read so the bar reflects it. */
    useEffect(() => {
        const onHydrated = () => {
            try {
                const raw = window.localStorage.getItem(STORAGE);
                if (raw) setOpts({ ...DEFAULTS, ...JSON.parse(raw) });
            } catch { /* ignore */ }
        };
        window.addEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
        return () => window.removeEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
    }, []);

    /* Dim the page via <body> classes — only while the strip is on. One class
       per level (off = none); graduated darkness in the CSS. */
    useEffect(() => {
        const b = document.body.classList;
        b.remove(...DIM_CLASSES);
        if (enabled && opts.dim !== 'off') b.add(`ambient-dim-${opts.dim}`);
        return () => b.remove(...DIM_CLASSES);
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
            {/* Second, reaching glow — a diffuse spotlight in the same colour and
                shape that extends further down so the light actually falls on the
                art scrolling past, like it's held close to the canvas. */}
            <div className="ambient-glow ambient-spot" aria-hidden="true" />
            <button
                type="button"
                className="ambient-pill"
                title="Ambient light — tap for options"
                aria-label="Ambient light options"
                aria-expanded={open}
                onPointerDown={beginHold}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onClick={() => { if (heldFired.current) { heldFired.current = false; return; } setOpen((o) => !o); }}
            >
                <span className="ambient-pill-led" />
            </button>

            {open && (
                <div className="ambient-pop" role="dialog" aria-label="Ambient light options">
                    <div className="ambient-pop-title">
                        <span className="ambient-pop-title-led" />
                        <span className="ambient-pop-title-icon" aria-hidden="true">{'☼︎'}</span>
                        Ambient Light
                    </div>
                    <Row label="Color">
                        {PALETTES.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                className={`ambient-chip ambient-chip-pal pal-${p.id}${opts.palette === p.id ? ' on' : ''}`}
                                onClick={() => set('palette', p.id)}
                            >
                                <span className="ambient-swatch" aria-hidden="true" />
                                {p.label}
                            </button>
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
