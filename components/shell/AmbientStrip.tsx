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
    type Glow,
    type Reach,
    type AmbientOpts,
} from '../../lib/state/AmbientCode';

/* The secret palettes the long-press cycles through, then back to Aurora. */
const SECRET_CYCLE: { id: Palette; toast: string }[] = [
    { id: 'prism', toast: 'Ambient: PRISM ✦' },
    { id: 'petey', toast: 'Ambient: PETEY ✦' },
    { id: 'aurora', toast: 'Ambient: AURORA' },
];

type Opts = AmbientOpts;
const DEFAULTS: Opts = { palette: 'aurora', pattern: 'wave', speed: 'med', dim: 46, glow: 'med', reach: 'mid' };
const STORAGE = 'pd_ambient_opts';
/* Remember which swipe page was last open so reopening doesn't snap to page 1. */
const PAGE_STORAGE = 'pd_ambient_page';
/* The dim base tone — matches the page-dim overlay (rgba(3,2,10,…)). Used for
   the iOS chrome tint + safe-area fills while dimming, so the gutters read dark
   instead of the bright colorway. */
const AMBIENT_DARK = '#03020a';

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
    { id: 'drift', label: 'Drift' }, { id: 'throb', label: 'Throb' },
];
const SPEEDS: { id: Speed; label: string }[] = [
    { id: 'slow', label: 'Slow' }, { id: 'med', label: 'Med' }, { id: 'fast', label: 'Fast' }, { id: 'turbo', label: 'Turbo' },
];
/* Dim presets — quick stops on the 0–100 slider. Tapping a chip snaps the
   slider to its value; dragging the slider sets anything in between. Shadow +
   Abyss sit between Deep and Pitch for finer control in the dark end. */
const DIM_PRESETS: { label: string; val: number }[] = [
    { label: 'Off', val: 0 }, { label: 'Low', val: 28 }, { label: 'Soft', val: 46 },
    { label: 'Med', val: 60 }, { label: 'Deep', val: 74 }, { label: 'Shadow', val: 80 },
    { label: 'Abyss', val: 86 }, { label: 'Pitch', val: 90 },
];
/* Atmosphere (page 3) — the light's physical character. */
const GLOWS: { id: Glow; label: string }[] = [
    { id: 'soft', label: 'Soft' }, { id: 'med', label: 'Med' }, { id: 'bright', label: 'Bright' },
];
const REACHES: { id: Reach; label: string }[] = [
    { id: 'near', label: 'Near' }, { id: 'mid', label: 'Mid' }, { id: 'far', label: 'Far' },
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
    const pagerRef = useRef<HTMLDivElement | null>(null);
    const [page, setPage] = useState(0);
    /* Hidden egg — tap "sphere" 3× on page 3 to ball the bar up. Transient. */
    const [sphereMode, setSphereMode] = useState(false);

    /* Ambient Code — a separate, simple share code (starts AMBI, no dashes)
       that carries ONLY these four ambient options. Field tracks the live
       code unless the user is mid-edit; Enter/blur applies a pasted code. */
    const currentCode = encodeAmbientCode(opts);
    const [codeValue, setCodeValue] = useState(currentCode);
    const [codeEditing, setCodeEditing] = useState(false);
    const codeCopyingRef = useRef(false);
    const codeInputRef = useRef<HTMLInputElement | null>(null);
    const sunTaps = useRef<{ n: number; t: number }>({ n: 0, t: 0 });
    const sphereTaps = useRef<{ n: number; t: number }>({ n: 0, t: 0 });
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
       fully continuous (0 = off, 100 = blackout).

       Also darken the iOS browser chrome (status-bar + URL-bar tint) to match,
       so the bright page colorway doesn't glare in the safe-area gutters Safari
       leaves above/below the page. This only swaps the chrome TINT — the page
       colorway itself is untouched, and the live colour is restored when the
       dimming clears. */
    useEffect(() => {
        const b = document.body;
        const on = enabled && opts.dim > 0;
        b.classList.toggle('ambient-dim-on', on);
        // Max alpha 0.92 at 100% so "Pitch" reads near-black without going flat.
        b.style.setProperty('--ambient-dim', on ? String((opts.dim / 100) * 0.92) : '0');

        // Chrome-tint darkening is a BROWSER-ONLY fix (Safari shows bright
        // gutters). In the installed PWA the dim overlay already covers the
        // whole screen, so leave the chrome tint on the colorway — darkening it
        // there produced ugly black bars (Brendon, 2026-06-17).
        const meta = document.getElementById('theme-color-meta');
        if (meta) {
            if (on && !b.classList.contains('is-pwa')) {
                meta.setAttribute('content', AMBIENT_DARK);
            } else {
                const bg = getComputedStyle(b).getPropertyValue('--bg-color').trim();
                if (bg) meta.setAttribute('content', bg);
            }
        }
        return () => {
            b.classList.remove('ambient-dim-on');
            b.style.removeProperty('--ambient-dim');
        };
    }, [enabled, opts.dim]);

    /* Restore the last-open swipe page when the menu opens (so it doesn't snap
       back to page 1 every time). */
    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        let saved = 0;
        try { saved = parseInt(window.localStorage.getItem(PAGE_STORAGE) || '0', 10) || 0; } catch { /* ignore */ }
        saved = Math.max(0, Math.min(2, saved));
        setPage(saved);
        requestAnimationFrame(() => {
            const el = pagerRef.current;
            if (el) el.scrollLeft = saved * el.clientWidth;
        });
    }, [open]);

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

    /* Hidden egg — tap "sphere" 3× to ball the bar into a little orb (and tap
       again to roll it back out). */
    const onSphereTap = () => {
        const now = Date.now();
        const s = sphereTaps.current;
        s.n = now - s.t > 600 ? 1 : s.n + 1;
        s.t = now;
        if (s.n >= 3) {
            s.n = 0;
            setSphereMode((m) => {
                showToast(m ? 'Ambient: BAR' : 'Ambient: SPHERE ✦');
                return !m;
            });
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

    /* Swipe pager — two pages side by side (native horizontal scroll-snap). The
       dots track the active page; tapping one slides to it. */
    const onPagerScroll = () => {
        const el = pagerRef.current;
        if (!el) return;
        const p = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        if (p !== page) {
            setPage(p);
            try { window.localStorage.setItem(PAGE_STORAGE, String(p)); } catch { /* ignore */ }
        }
    };
    const goToPage = (i: number) => {
        const el = pagerRef.current;
        if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    };

    return (
        <div
            ref={rootRef}
            className={`ambient-strip-layer pal-${opts.palette} pat-${opts.pattern} spd-${opts.speed} glow-${opts.glow ?? 'med'} reach-${opts.reach ?? 'mid'}${sphereMode ? ' sphere-mode' : ''}${open ? ' menu-open' : ''}`}
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
                    <div className="ambient-pop-pager" ref={pagerRef} onScroll={onPagerScroll}>
                        <div className="ambient-pop-page">
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
                        </div>
                        <div className="ambient-pop-page">
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
                        </div>
                        <div className="ambient-pop-page">
                            <Row label={<span className="ambient-atmos-label">Atmo<span className="ambient-atmos-sphere" onClick={onSphereTap}>sphere</span> Glow</span>}>
                                {GLOWS.map((g) => (
                                    <Chip key={g.id} on={(opts.glow ?? 'med') === g.id} onClick={() => set('glow', g.id)}>
                                        {g.label}
                                    </Chip>
                                ))}
                            </Row>
                            <Row label={<span className="ambient-atmos-label">Atmo<span className="ambient-atmos-sphere" onClick={onSphereTap}>sphere</span> Reach</span>}>
                                {REACHES.map((r) => (
                                    <Chip key={r.id} on={(opts.reach ?? 'mid') === r.id} onClick={() => set('reach', r.id)}>
                                        {r.label}
                                    </Chip>
                                ))}
                            </Row>
                        </div>
                    </div>
                    <div className="ambient-pop-dots" role="tablist" aria-label="Menu pages">
                        {[0, 1, 2].map((i) => (
                            <button
                                key={i}
                                type="button"
                                className={`ambient-dot${page === i ? ' on' : ''}`}
                                onClick={() => goToPage(i)}
                                aria-label={`Page ${i + 1}`}
                                aria-selected={page === i}
                                role="tab"
                            />
                        ))}
                    </div>
                    <div className="ambient-code-row">
                        <span className="ambient-code-label">Setup Code</span>
                        <span className="ambient-code-field">
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
            )}
        </div>
    );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
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
