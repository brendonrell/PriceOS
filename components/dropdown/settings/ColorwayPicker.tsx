'use client';

/*
 * ColorwayPicker — DEFAULT COLORWAY section.
 *
 * Triple-tap header → Haze Mode row. Triple-tap "HAZE MODE" → back.
 *
 * Haze row:
 *   HZ pill    — SettingsToggle, label only (no icon), activates haze.
 *   ◩ swatch   — iOS-safe <label htmlFor> with larger ◩ icon.
 *                Opens native colour picker (sim 4610-4613 pattern).
 *   hex input
 *   ⧉          — copy hex (copy-hex-btn)
 *   ≋/≊/≅/≃/≂ — variation cycle (haze-variation-btn class, bare icon).
 *                Pure(≋) is default/resting. No toast on pure.
 *                Cycle: pure(≋) → tint(≊) → drift(≅) → pulse(≃) → chromatic(≂) → pure(≋)
 *
 * Toasts: "Haze Mode (Tint)" / "Haze Mode (Drift)" / etc. Silent on pure.
 */

import { useRef, useState } from 'react';
import { useColorway, type ColorwayKey } from '../../../lib/state/ColorwayContext';
import {
    getHazeVariation,
    setHazeVariation,
    applyBgHex,
} from '../../../lib/state/ColorwayContext';
import {
    enableHazeVariation,
    type HazeVariation,
} from '../../../lib/engines/hazeEngine';
import { SettingsToggle } from './SettingsToggle';
import { useToast } from '../../../lib/state/ToastContext';

interface PillSpec {
    key: NonNullable<ColorwayKey>;
    cls: string;
    title: string;
    glyph: string;
    glyphStyle?: React.CSSProperties;
}

const PILLS: PillSpec[] = [
    { key: 'custom',  cls: 't-custom',  title: 'Custom Color',   glyph: '◩\uFE0E' },
    { key: 'light',   cls: 't-light',   title: 'Light Mode',      glyph: '◻\uFE0E' },
    { key: 'dark',    cls: 't-dark',    title: 'Dark Mode',       glyph: '◼\uFE0E' },
    { key: 'orange',  cls: 't-orange',  title: 'Orange Mode',     glyph: '▨\uFE0E' },
    {
        key: 'hashsyn', cls: 't-hashsyn', title: 'Hash Synesthesia', glyph: '⁂\uFE0E',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 13, fontWeight: 'normal' },
    },
    {
        key: 'blue', cls: 't-blue', title: 'Blueberry Mode', glyph: 'B',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 11, fontWeight: 'bold', letterSpacing: 0 },
    },
    {
        key: 'red', cls: 't-red', title: 'Red Cherry Mode', glyph: 'R',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 11, fontWeight: 'bold', letterSpacing: 0 },
    },
];

const THEME_NAMES: Record<NonNullable<ColorwayKey>, string> = {
    custom: 'CUSTOM COLOR', light: 'LIGHT MODE', dark: 'DARK MODE',
    orange: 'ORANGE MODE', hashsyn: 'HASH SYNESTHESIA',
    blue: 'BLUEBERRY MODE', red: 'CHERRY MODE', haze: 'HAZE MODE',
    hothurt: 'HOTHURT', attention: 'ATTENTION', bblue: '@BRENDON BLUE',
    kiki: 'KIKI', cookies: 'COOKIES', precog: 'PRECOGNITION',
};

/* PRIMARY+SECONDARY (Brendon, 2026-07-20) — the hidden long-press menu on
   the DEFAULT COLORWAY header: the brand primaries + the Kiki secondaries.
   Rendered as text pills in the Default Sort style (Brendon, 2026-07-21).
   Cookies + Precog carry the exact orange + green from the KIKI palette
   table (brendon.world/kiki). */
const PS_PILLS: { key: NonNullable<ColorwayKey>; label: string; title: string }[] = [
    { key: 'hothurt',   label: 'Hothurt',   title: 'Hothurt' },
    { key: 'attention', label: 'Attention', title: 'Attention' },
    { key: 'bblue',     label: '@brendon',  title: '@brendon blue' },
    { key: 'kiki',      label: 'Kiki',      title: 'Kiki' },
    { key: 'cookies',   label: 'Cookies',   title: 'Cookies' },
    { key: 'precog',    label: 'Precognition', title: 'Precognition' },
];

const VARIATION_CYCLE: HazeVariation[] = ['pure', 'tint', 'drift', 'pulse', 'chromatic'];

const VARIATION_LABELS: Record<HazeVariation, string> = {
    pure: 'PURE', tint: 'TINT', drift: 'DRIFT', pulse: 'PULSE', chromatic: 'CHROMATIC',
};

// Each state gets its own Unicode glyph — all same font/size so baseline aligns
const VARIATION_GLYPHS: Record<HazeVariation, string> = {
    pure:      '\u224B\uFE0E', // ≋
    tint:      '\u224A\uFE0E', // ≊
    drift:     '\u2245\uFE0E', // ≅
    pulse:     '\u2243\uFE0E', // ≃
    chromatic: '\u2242\uFE0E', // ≂
};

const HAZE_COLOR_KEY = 'pd_haze_color';
const HAZE_DEFAULT   = '#25EC00';
const HEX_RE         = /^#[0-9A-F]{6}$/i;

function readHazeColor(): string {
    if (typeof window === 'undefined') return HAZE_DEFAULT;
    try {
        const saved = localStorage.getItem(HAZE_COLOR_KEY);
        if (saved && HEX_RE.test(saved)) return saved.toUpperCase();
    } catch { /* ignore */ }
    return HAZE_DEFAULT;
}

/* Normalise any CSS color string the page's --bg-color might hold (#rrggbb,
   #rgb, or rgb()/rgba()) to an uppercase 6-digit hex. Returns null if it
   can't be parsed. */
function cssColorToHex(c: string): string | null {
    c = (c || '').trim();
    if (!c) return null;
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(c)) {
        return ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toUpperCase();
    }
    const m = c.match(/rgba?\(([^)]+)\)/i);
    if (m) {
        const [r, g, b] = m[1].split(',').map((s) => parseFloat(s.trim()));
        if ([r, g, b].some((n) => Number.isNaN(n))) return null;
        const h = (n: number) => ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
        return ('#' + h(r) + h(g) + h(b)).toUpperCase();
    }
    return null;
}

export function ColorwayPicker() {
    const { colorway, setColorway } = useColorway();
    const { showToast } = useToast();

    const [hazeMode, setHazeMode] = useState(false);
    /* PRIMARY+SECONDARY — long-press the header (the triple-tap slot is
       Haze's). Press-and-hold 500ms, drift cancels. */
    const [psMode, setPsMode] = useState(false);
    const tapState = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 });
    const pressTimer = useRef<number | null>(null);
    const pressFired = useRef(false);
    const pressStart = useRef<{ x: number; y: number } | null>(null);

    const clearPress = () => {
        if (pressTimer.current != null) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
        pressStart.current = null;
    };
    const onHeaderPointerDown = (e: React.PointerEvent) => {
        pressFired.current = false;
        pressStart.current = { x: e.clientX, y: e.clientY };
        clearPress();
        pressStart.current = { x: e.clientX, y: e.clientY };
        pressTimer.current = window.setTimeout(() => {
            pressTimer.current = null;
            pressFired.current = true;
            setPsMode((v) => !v);
            setHazeMode(false);
        }, 500);
    };
    const onHeaderPointerMove = (e: React.PointerEvent) => {
        const s = pressStart.current;
        if (!s || pressTimer.current == null) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (dx * dx + dy * dy > 100) clearPress();
    };

    const handleHeaderTap = () => {
        /* The long-press swallows its trailing click. */
        if (pressFired.current) { pressFired.current = false; return; }
        const now = Date.now();
        const s = tapState.current;
        if (now - s.lastTap > 600) s.count = 1;
        else s.count += 1;
        s.lastTap = now;
        if (s.count >= 3) { s.count = 0; setHazeMode((v) => !v); setPsMode(false); }
    };

    const [hazeHex, setHazeHex] = useState<string>(() => readHazeColor());
    const editingHexRef = useRef(false);
    const copyingHexRef = useRef(false);

    // Default to 'pure' if nothing stored
    const [variation, setVariationState] = useState<HazeVariation>(
        () => getHazeVariation() ?? 'pure'
    );

    const applyHazeHex = (hex: string) => {
        try { localStorage.setItem(HAZE_COLOR_KEY, hex.toUpperCase()); } catch { /* ignore */ }
        if (colorway === 'haze') setColorway('haze');
    };

    /* Dropper — grab the CURRENT page's background color (the live --bg-color
       var, whatever colorway/page the user is on) and load it into the Haze
       slot. Brendon 2026-06-13. Mirrors the swatch's apply path; doesn't
       force-activate haze (the HZ pill does that). */
    const samplePageBg = (e: React.MouseEvent) => {
        e.stopPropagation();
        let raw = '';
        try {
            raw = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
            if (!raw) raw = getComputedStyle(document.body).backgroundColor;
        } catch { /* ignore */ }
        const hex = cssColorToHex(raw);
        if (!hex) { showToast('Haze Color: NO READ'); return; }
        setHazeHex(hex);
        applyHazeHex(hex);
        showToast(`Haze Color: ${hex}`);
    };

    const handleVariationCycle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = VARIATION_CYCLE[(VARIATION_CYCLE.indexOf(variation) + 1) % VARIATION_CYCLE.length];
        setVariationState(next);
        setHazeVariation(next);
        enableHazeVariation(next, readHazeColor(), (hex) => applyBgHex(hex, 'haze'));
        showToast(`Haze Mode: ${VARIATION_LABELS[next]}`);
        if (colorway !== 'haze') setColorway('haze');
    };

    if (psMode) {
        return (
            <>
                <div
                    className="settings-header"
                    style={{ cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    title="Long-press to go back"
                    onClick={handleHeaderTap}
                    onPointerDown={onHeaderPointerDown}
                    onPointerMove={onHeaderPointerMove}
                    onPointerUp={clearPress}
                    onPointerLeave={clearPress}
                    onPointerCancel={clearPress}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    PRIMARY + SECONDARY
                </div>
                <div className="settings-pill-row">
                    {PS_PILLS.map((p) => (
                        <SettingsToggle
                            key={p.key}
                            id={`st-${p.key}`}
                            active={colorway === p.key}
                            title={p.title}
                            label={p.label}
                            bareLabel
                            onClick={() => {
                                setColorway(p.key);
                                showToast('Default Colorway: ' + THEME_NAMES[p.key]);
                            }}
                        />
                    ))}
                </div>
            </>
        );
    }

    if (hazeMode) {
        return (
            <>
                <div
                    className="settings-header"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Triple-tap to go back"
                    onClick={handleHeaderTap}
                >
                    HAZE MODE
                </div>
                <div className="settings-pill-row">

                    {/* HZ — label only, bareLabel so no st-label wrapper,
                        no icon prop so no st-icon span with margin-right */}
                    <SettingsToggle
                        id="st-haze"
                        active={colorway === 'haze'}
                        title="Haze Mode"
                        label="HZ"
                        bareLabel
                        onClick={() => { setColorway('haze'); showToast('Default Colorway: HAZE MODE'); }}
                    />

                    {/* ◩ swatch — iOS-safe <label htmlFor>, sim 4610-4613 pattern.
                        Larger ◩ icon (14px) placed on the swatch where it belongs. */}
                    <label
                        htmlFor="hazeColorPicker"
                        className="pill-colorway"
                        title="Pick color"
                        style={{
                            backgroundColor: hazeHex,
                            border: '1px solid currentColor',
                            opacity: 0.9,
                            width: 32,
                            height: 28,
                            position: 'relative',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span style={{
                            fontFamily: "'Courier New', Courier, monospace",
                            fontSize: 14,
                            fontWeight: 'bold',
                            pointerEvents: 'none',
                            lineHeight: 1,
                            position: 'relative',
                            top: '1px',
                        }}>◩{'\uFE0E'}</span>
                        <input
                            type="color"
                            id="hazeColorPicker"
                            value={hazeHex}
                            onChange={(e) => {
                                const hex = e.target.value.toUpperCase();
                                setHazeHex(hex);
                                applyHazeHex(hex);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            tabIndex={-1}
                            aria-hidden="true"
                            style={{
                                position: 'absolute', opacity: 0,
                                width: '1px', height: '1px',
                                bottom: 0, left: '50%', pointerEvents: 'none',
                            }}
                        />
                    </label>

                    {/* Hex text input */}
                    <input
                        type="text"
                        id="hazeHexInput"
                        value={hazeHex}
                        className="hex-input"
                        maxLength={7}
                        spellCheck={false}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={() => { editingHexRef.current = true; }}
                        onChange={(e) => {
                            const v = e.target.value;
                            setHazeHex(v);
                            if (HEX_RE.test(v)) applyHazeHex(v);
                        }}
                        onBlur={() => {
                            editingHexRef.current = false;
                            if (!HEX_RE.test(hazeHex)) setHazeHex(readHazeColor());
                            else setHazeHex(hazeHex.toUpperCase());
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                            else if (e.key === 'Escape') {
                                setHazeHex(readHazeColor());
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                    />

                    {/* ⧉ copy */}
                    <span
                        className="copy-hex-btn"
                        title="Copy Hex"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            try { navigator.clipboard?.writeText(hazeHex); } catch { /* ignore */ }
                            copyingHexRef.current = true;
                            setHazeHex('COPIED!');
                            window.setTimeout(() => {
                                copyingHexRef.current = false;
                                setHazeHex(readHazeColor());
                            }, 1500);
                        }}
                    >⧉{'\uFE0E'}</span>

                    {/* ◉ dropper — grab the current page's background color into
                        the Haze slot (Brendon 2026-06-13). */}
                    <span
                        className="haze-variation-btn"
                        title="Grab this page's background color"
                        role="button"
                        tabIndex={0}
                        onClick={samplePageBg}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                samplePageBg(e as unknown as React.MouseEvent);
                            }
                        }}
                    >◉{'︎'}</span>

                    {/* Variation glyph — bare icon, haze-variation-btn class.
                        Pure=≋ Tint=≊ Drift=≅ Pulse=≃ Chromatic=≂
                        All Courier, same size — consistent vertical alignment. */}
                    <span
                        className="haze-variation-btn"
                        title={variation !== 'pure'
                            ? `Haze Mode (${VARIATION_LABELS[variation]}) — tap to cycle`
                            : 'Tap to enable variation'}
                        role="button"
                        tabIndex={0}
                        onClick={handleVariationCycle}
                    >
                        {VARIATION_GLYPHS[variation]}
                    </span>

                    {/* ⩇/⩆ — reset to default green. ⩇ when default is active, ⩆ otherwise. */}
                    <span
                        className="haze-variation-btn"
                        title={hazeHex === HAZE_DEFAULT ? 'Default Haze active' : 'Reset to Default Haze'}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            setHazeHex(HAZE_DEFAULT);
                            applyHazeHex(HAZE_DEFAULT);
                        }}
                    >
                        {hazeHex === HAZE_DEFAULT ? '\u2A47\uFE0E' : '\u2A46\uFE0E'}
                    </span>
                </div>
            </>
        );
    }

    return (
        <>
            <div
                className="settings-header"
                style={{ cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                title="Triple-tap for Haze mode"
                onClick={handleHeaderTap}
                onPointerDown={onHeaderPointerDown}
                onPointerMove={onHeaderPointerMove}
                onPointerUp={clearPress}
                onPointerLeave={clearPress}
                onPointerCancel={clearPress}
                onContextMenu={(e) => e.preventDefault()}
            >
                DEFAULT COLORWAY
            </div>
            {/* One pill is ALWAYS visually selected. A null colorway (no
                saved preference / logged out) IS the custom-colorway
                default, so the custom pill shows active for it. */}
            <div className="settings-pill-row colorway-pills">
                {PILLS.map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        id={`st-${p.key}`}
                        className={`pill-colorway ${p.cls}${(colorway ?? 'custom') === p.key ? ' active' : ''}`}
                        title={p.title}
                        aria-pressed={(colorway ?? 'custom') === p.key}
                        onClick={(e) => {
                            e.stopPropagation();
                            setColorway(p.key);
                            showToast('Default Colorway: ' + THEME_NAMES[p.key]);
                        }}
                    >
                        <span style={p.glyphStyle}>{p.glyph}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
