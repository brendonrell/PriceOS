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
import {
    encodeAmbientCode,
    decodeAmbientCode,
    clampDim,
    type Palette,
    type Pattern,
    type Speed,
    type AmbientOpts,
} from '../../lib/state/AmbientCode';

/* The secret palettes the long-press cycles through, then back to Aurora. */
const SECRET_CYCLE: { id: Palette; toast: string }[] = [
    { id: 'prism', toast: 'Ambient: PRISM ✦' },
    { id: 'petey', toast: 'Ambient: PETEY ✦' },
    { id: 'aurora', toast: 'Ambient: AURORA' },
];

type Opts = AmbientOpts;
const DEFAULTS: Opts = { palette: 'aurora', pattern: 'wave', speed: 'med', dim: 46 };
const STORAGE = 'pd_ambient_opts';

/* Legacy string dim → percentage, so options saved before the slider (dim was
   'off' | 'low' | … | 'pitch') migrate cleanly to the numeric model. */
const LEGACY_DIM: Record<string, number> = { off: 0, low: 28, soft: 46, med: 60, deep: 74, pitch: 90 };
/** Coerce a possibly-legacy options blob into the current numeric-dim shape. */
function normalizeOpts(raw: unknown): Partial<Opts> {
    if (!raw || typeof raw !== 'object') return {};
    const o = { ...(raw as Record<string, unknown>) };
    if (typeof o.dim === 'string') o.dim = LEGACY_DIM[o.dim] ?? DEFAULTS.dim;
    if (typeof o.dim === 'number') o.dim = clampDim(o.dim);
    return o as Partial<Opts>;
}

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
/* Dim presets — quick stops on the 0–100 slider. Tapping a chip snaps the
   slider to its value; dragging the slider sets anything in between. */
const DIM_PRESETS: { label: string; val: number }[] = [
    { label: 'Off', val: 0 }, { label: 'Low', val: 28 }, { label: 'Soft', val: 46 },
    { label: 'Med', val: 60 }, { label: 'Deep', val: 74 }, { label: 'Pitch', val: 90 },
];

/* Curated Scenes — one-tap full looks (palette + pattern + speed + dim). The
   "basket of surprises": each is a hand-tuned mood you'd never stumble into by
   poking single options. Fine controls below still let you tweak from here. */
interface Scene { id: string; label: string; opts: Opts }
const SCENES: Scene[] = [
    { id: 'campfire', label: 'Campfire', opts: { palette: 'lava',   pattern: 'flicker', speed: 'slow', dim: 74 } },
    { id: 'spa',      label: 'Spa',      opts: { palette: 'ice',    pattern: 'breathe', speed: 'slow', dim: 46 } },
    { id: 'rave',     label: 'Rave',     opts: { palette: 'neon',   pattern: 'strobe',  speed: 'fast', dim: 90 } },
    { id: 'sunrise',  label: 'Sunrise',  opts: { palette: 'sunset', pattern: 'wave',    speed: 'slow', dim: 28 } },
    { id: 'tide',     label: 'Tide',     opts: { palette: 'ocean',  pattern: 'ripple',  speed: 'med',  dim: 74 } },
    { id: 'grove',    label: 'Grove',    opts: { palette: 'forest', pattern: 'breathe', speed: 'med',  dim: 46 } },
];

const sameOpts = (a: Opts, b: Opts): boolean =>
    a.palette === b.palette && a.pattern === b.pattern && a.speed === b.speed && a.dim === b.dim;

const pick = <T,>(arr: ReadonlyArray<T>): T => arr[Math.floor(Math.random() * arr.length)];

export default function AmbientStrip() {
    const { notifs } = usePdNotifs();
    const { showToast } = useToast();
    const enabled = notifs.ambientStrip;

    const [opts, setOpts] = useState<Opts>(DEFAULTS);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const popRef = useRef<HTMLDivElement | null>(null);

    /* Ambient Code — a separate, simple share code (starts AMBI, no dashes)
       that carries ONLY these four ambient options. Field tracks the live
       code unless the user is mid-edit; Enter/blur applies a pasted code. */
    const currentCode = encodeAmbientCode(opts);
    const [codeValue, setCodeValue] = useState(currentCode);
    const [codeEditing, setCodeEditing] = useState(false);
    const codeCopyingRef = useRef(false);
    const codeInputRef = useRef<HTMLInputElement | null>(null);
    const sunTaps = useRef<{ n: number; t: number }>({ n: 0, t: 0 });
    const surpriseHold = useRef<number | null>(null);
    const surpriseHeld = useRef(false);

    /* ✦ Secret — hold the light for a full ~1s to cycle the two hidden palettes
       (Prism, Petey) and back. The long threshold keeps it deliberate: a normal
       tap (even a slow one) just toggles the menu and never trips the secret or
       eats the close. The fired flag suppresses the tap-toggle on a real hold. */
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
        }, 1000);
    };
    const endHold = () => {
        if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    };

    /* Hydrate saved options. */
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE);
            if (raw) setOpts({ ...DEFAULTS, ...normalizeOpts(JSON.parse(raw)) });
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
                if (raw) setOpts({ ...DEFAULTS, ...normalizeOpts(JSON.parse(raw)) });
            } catch { /* ignore */ }
        };
        window.addEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
        return () => window.removeEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
    }, []);

    /* Dim the page — only while the strip is on. A single class switches the
       overlay on; the exact darkness rides on a CSS variable so the slider is
       fully continuous (0 = off, 100 = blackout). */
    useEffect(() => {
        const b = document.body;
        const on = enabled && opts.dim > 0;
        b.classList.toggle('ambient-dim-on', on);
        // Max alpha 0.92 at 100% so "Pitch" reads near-black without going flat.
        b.style.setProperty('--ambient-dim', on ? String((opts.dim / 100) * 0.92) : '0');
        return () => {
            b.classList.remove('ambient-dim-on');
            b.style.removeProperty('--ambient-dim');
        };
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

    /* Scroll-height sync — same mechanism the connect menu uses. The CSS
       fallback is a static approximation; this writes a pixel-exact cap from
       the live visual viewport so the menu fits whatever iOS Safari's URL bar
       is doing (top bar / bottom collapsed / bottom expanded), and re-measures
       as that bar transitions. Listens to viewport resize/scroll + orientation. */
    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        const sync = () => {
            const pop = popRef.current;
            if (!pop) return;
            const vv = window.visualViewport;
            const vpHeight = vv ? vv.height : window.innerHeight;
            const vpOffsetTop = vv ? vv.offsetTop : 0;
            const rect = pop.getBoundingClientRect();
            const topInVV = rect.top - vpOffsetTop;
            const availableBelow = vpHeight - topInVV;
            const maxH = Math.max(200, Math.floor(availableBelow - 20));
            pop.style.setProperty('--ambient-pop-max-h', `${maxH}px`);
        };
        const r1 = requestAnimationFrame(() => requestAnimationFrame(sync));
        const vv = window.visualViewport;
        if (vv) { vv.addEventListener('resize', sync); vv.addEventListener('scroll', sync); }
        window.addEventListener('resize', sync);
        window.addEventListener('orientationchange', sync);
        return () => {
            cancelAnimationFrame(r1);
            if (vv) { vv.removeEventListener('resize', sync); vv.removeEventListener('scroll', sync); }
            window.removeEventListener('resize', sync);
            window.removeEventListener('orientationchange', sync);
        };
    }, [open]);

    /* Keep the code field in sync with live options when not mid-edit/copy. */
    useEffect(() => {
        if (codeEditing || codeCopyingRef.current) return;
        setCodeValue(currentCode);
    }, [currentCode, codeEditing]);

    const applyCode = () => {
        const trimmed = codeValue.trim();
        if (!trimmed || trimmed.toUpperCase() === currentCode) {
            setCodeValue(currentCode);
            setCodeEditing(false);
            return;
        }
        // Secret word-codes: typing a hidden palette's NAME (AMBIPRISM,
        // AMBIPETEY, AMBISPECTRUM, AMBINOVA) summons that palette alone,
        // keeping the rest of the look. Undocumented — only someone who knows
        // a hidden palette exists would ever spell it out.
        const word = trimmed.toUpperCase().replace(/[^A-Z]/g, '');
        const secret: Record<string, Palette> = {
            AMBIPRISM: 'prism', AMBIPETEY: 'petey', AMBISPECTRUM: 'spectrum', AMBINOVA: 'nova',
        };
        if (secret[word]) {
            setOpts((o) => ({ ...o, palette: secret[word] }));
            setCodeEditing(false);
            showToast(`Ambient: ${word.slice(4)} ✦`);
            return;
        }
        const parsed = decodeAmbientCode(trimmed);
        setCodeEditing(false);
        if (!parsed.ok || !parsed.opts) {
            setCodeValue(currentCode);
            showToast('Ambient Code: INVALID');
            return;
        }
        setOpts({ ...DEFAULTS, ...parsed.opts });
        showToast('Ambient: APPLIED');
    };

    const copyCode = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        try { navigator.clipboard?.writeText(currentCode); } catch { /* ignore */ }
        codeCopyingRef.current = true;
        setCodeValue('COPIED!');
        showToast('Ambient Code: COPIED');
        window.setTimeout(() => {
            codeCopyingRef.current = false;
            setCodeValue(currentCode);
        }, 1500);
    };

    if (!enabled) return null;

    const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setOpts((o) => ({ ...o, [k]: v }));

    const applyScene = (s: Scene) => {
        setOpts({ ...DEFAULTS, ...s.opts });
        showToast(`Ambient: ${s.label.toUpperCase()}`);
    };

    /* Surprise — roll a random look from the VISIBLE options (the two secret
       palettes stay secret; PALETTES already omits them). */
    const surprise = () => {
        setOpts({
            palette: pick(PALETTES).id,
            pattern: pick(PATTERNS).id,
            speed: pick(SPEEDS).id,
            dim: pick(DIM_PRESETS).val,
        });
        showToast('Ambient: SURPRISE');
    };

    const onSunTap = () => {
        const now = Date.now();
        const s = sunTaps.current;
        s.n = now - s.t > 600 ? 1 : s.n + 1;
        s.t = now;
        if (s.n >= 5) {
            s.n = 0;
            setOpts((o) => ({ ...o, palette: 'spectrum' }));
            showToast('Ambient: SPECTRUM ✦');
        }
    };

    /* Deep secret — HOLD the Surprise pill (~0.8s) instead of tapping. A tap
       rolls a random visible look; the long-press summons NOVA, a hidden
       cosmic palette with a slow drift. The hold suppresses the tap. */
    const beginSurpriseHold = () => {
        surpriseHeld.current = false;
        surpriseHold.current = window.setTimeout(() => {
            surpriseHeld.current = true;
            setOpts((o) => ({ ...o, palette: 'nova', pattern: 'ripple', speed: 'slow' }));
            showToast('Ambient: NOVA ✦');
        }, 800);
    };
    const endSurpriseHold = () => {
        if (surpriseHold.current) { clearTimeout(surpriseHold.current); surpriseHold.current = null; }
    };

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
                <div ref={popRef} className="ambient-pop" role="dialog" aria-label="Ambient light options">
                    <span
                        className="ambient-pop-close"
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpen(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(false); } }}
                        title="Close"
                        aria-label="Close ambient light options"
                    >
                        {'×︎'}
                    </span>
                    <div className="ambient-pop-title">
                        <span className="ambient-pop-title-led" />
                        <span className="ambient-pop-title-icon" aria-hidden="true" onClick={onSunTap}>{'☼︎'}</span>
                        <span className="ambient-pop-title-text">Ambient Light</span>
                    </div>
                    <div className="ambient-pop-body">
                    <Row label="Scenes">
                        {SCENES.map((s) => (
                            <Chip key={s.id} on={sameOpts(opts, s.opts)} onClick={() => applyScene(s)}>
                                {s.label}
                            </Chip>
                        ))}
                    </Row>
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
                        {DIM_PRESETS.map((p) => (
                            <Chip key={p.label} on={opts.dim === p.val} onClick={() => set('dim', p.val)}>
                                {p.label}
                            </Chip>
                        ))}
                    </Row>
                    <div className="ambient-pop-row ambient-dim-slider-row">
                        <span className="ambient-pop-label">Level</span>
                        <input
                            type="range"
                            className="ambient-dim-slider"
                            min={0}
                            max={100}
                            step={1}
                            value={opts.dim}
                            onChange={(e) => set('dim', clampDim(Number(e.target.value)))}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Dim level"
                            title="Dim level — drag for any darkness"
                        />
                        <span className="ambient-dim-readout">{opts.dim}%</span>
                    </div>
                    <div className="ambient-code-row">
                        <span className="ambient-code-label">Setup Code</span>
                        <input
                            ref={codeInputRef}
                            type="text"
                            className="ambient-code-input"
                            value={codeValue}
                            onChange={(e) => { setCodeEditing(true); setCodeValue(e.target.value); }}
                            onFocus={() => {
                                setCodeEditing(true);
                                const el = codeInputRef.current;
                                if (el) window.setTimeout(() => { try { el.select(); } catch { /* ignore */ } }, 0);
                            }}
                            onBlur={applyCode}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); codeInputRef.current?.blur(); }
                                else if (e.key === 'Escape') { e.preventDefault(); setCodeValue(currentCode); setCodeEditing(false); codeInputRef.current?.blur(); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            spellCheck={false}
                            autoCapitalize="characters"
                            autoCorrect="off"
                            title="Ambient Code — shares just your ambient light look. Paste a code + Enter to apply."
                        />
                        <span
                            className="ambient-code-copy"
                            onClick={copyCode}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyCode(e); } }}
                            title="Copy Ambient Code"
                            role="button"
                            tabIndex={0}
                        >
                            ⧉{'︎'}
                        </span>
                        <button
                            type="button"
                            className="ambient-chip ambient-surprise"
                            onClick={() => { if (surpriseHeld.current) { surpriseHeld.current = false; return; } surprise(); }}
                            onPointerDown={beginSurpriseHold}
                            onPointerUp={endSurpriseHold}
                            onPointerLeave={endSurpriseHold}
                            title="Surprise me — a random look"
                        >
                            Surprise
                        </button>
                    </div>
                    </div>
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
