'use client';

/*
 * ThemePicker — DEFAULT THEME section.
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
import { useTheme, type ThemeKey } from '../../../lib/state/ThemeContext';
import {
    getHazeVariation,
    setHazeVariation,
    applyBgHex,
} from '../../../lib/state/ThemeContext';
import {
    enableHazeVariation,
    type HazeVariation,
} from '../../../lib/engines/hazeEngine';
import { SettingsToggle } from './SettingsToggle';
import { useToast } from '../../../lib/state/ToastContext';

interface PillSpec {
    key: NonNullable<ThemeKey>;
    cls: string;
    title: string;
    glyph: string;
    glyphStyle?: React.CSSProperties;
}

const PILLS: PillSpec[] = [
    { key: 'artist',  cls: 't-artist',  title: 'Custom Colour',   glyph: '◩\uFE0E' },
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

const THEME_NAMES: Record<NonNullable<ThemeKey>, string> = {
    artist: 'Artist Custom', light: 'Light Mode', dark: 'Dark Mode',
    orange: 'Orange Mode', hashsyn: 'Hash Synesthesia',
    blue: 'Blueberry Mode', red: 'Cherry Mode', haze: 'Haze Mode',
};

const VARIATION_CYCLE: HazeVariation[] = ['pure', 'tint', 'drift', 'pulse', 'chromatic'];

const VARIATION_LABELS: Record<HazeVariation, string> = {
    pure: 'Pure', tint: 'Tint', drift: 'Drift', pulse: 'Pulse', chromatic: 'Chromatic',
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
const HAZE_DEFAULT   = '#888888';
const HEX_RE         = /^#[0-9A-F]{6}$/i;

// TXT texture overlay — independent of variation, persists same as theme prefs
const HAZE_TXT_KEY = 'pd_haze_txt';
type HazeTxt = 'grain' | 'lines' | 'dots';
const TXT_CYCLE: Array<HazeTxt | null> = [null, 'grain', 'lines', 'dots'];
const TXT_LABELS: Record<HazeTxt, string> = { grain: 'Grain', lines: 'Lines', dots: 'Dots' };

function readHazeTxt(): HazeTxt | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(HAZE_TXT_KEY);
        if (saved === 'grain' || saved === 'lines' || saved === 'dots') return saved;
    } catch { /* ignore */ }
    return null;
}

function applyHazeTxt(txt: HazeTxt | null): void {
    if (typeof document === 'undefined') return;
    if (txt === null) {
        delete document.documentElement.dataset.hazeTxt;
    } else {
        document.documentElement.dataset.hazeTxt = txt;
    }
    try {
        if (txt === null) localStorage.removeItem(HAZE_TXT_KEY);
        else localStorage.setItem(HAZE_TXT_KEY, txt);
    } catch { /* ignore */ }
}

function readHazeColor(): string {
    if (typeof window === 'undefined') return HAZE_DEFAULT;
    try {
        const saved = localStorage.getItem(HAZE_COLOR_KEY);
        if (saved && HEX_RE.test(saved)) return saved.toUpperCase();
    } catch { /* ignore */ }
    return HAZE_DEFAULT;
}

export function ThemePicker() {
    const { theme, setTheme } = useTheme();
    const { showToast } = useToast();

    const [hazeMode, setHazeMode] = useState(false);
    const tapState = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 });

    const handleHeaderTap = () => {
        const now = Date.now();
        const s = tapState.current;
        if (now - s.lastTap > 600) s.count = 1;
        else s.count += 1;
        s.lastTap = now;
        if (s.count >= 3) { s.count = 0; setHazeMode((v) => !v); }
    };

    const [hazeHex, setHazeHex] = useState<string>(() => readHazeColor());
    const editingHexRef = useRef(false);
    const copyingHexRef = useRef(false);

    // Default to 'pure' if nothing stored
    const [variation, setVariationState] = useState<HazeVariation>(
        () => getHazeVariation() ?? 'pure'
    );

    // TXT texture — independent overlay, co-exists with any variation
    const [txt, setTxtState] = useState<HazeTxt | null>(() => {
        const saved = readHazeTxt();
        // Boot: apply stored texture to DOM immediately
        if (typeof document !== 'undefined' && saved) {
            document.documentElement.dataset.hazeTxt = saved;
        }
        return saved;
    });

    const handleTxtCycle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentIdx = TXT_CYCLE.indexOf(txt);
        const next = TXT_CYCLE[(currentIdx + 1) % TXT_CYCLE.length];
        setTxtState(next);
        applyHazeTxt(next);
        if (next !== null) showToast(`Haze Mode (${TXT_LABELS[next]})`);
        if (theme !== 'haze') setTheme('haze');
    };

    const applyHazeHex = (hex: string) => {
        try { localStorage.setItem(HAZE_COLOR_KEY, hex.toUpperCase()); } catch { /* ignore */ }
        if (theme === 'haze') setTheme('haze');
    };

    const handleVariationCycle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = VARIATION_CYCLE[(VARIATION_CYCLE.indexOf(variation) + 1) % VARIATION_CYCLE.length];
        setVariationState(next);
        setHazeVariation(next);
        enableHazeVariation(next, readHazeColor(), (hex) => applyBgHex(hex, 'haze'));
        if (next !== 'pure') showToast(`Haze Mode (${VARIATION_LABELS[next]})`);
        if (theme !== 'haze') setTheme('haze');
    };

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

                    {/* HZ — label only, no icon */}
                    <SettingsToggle
                        id="st-haze"
                        active={theme === 'haze'}
                        title="Haze Mode"
                        icon=""
                        label="HZ"
                        onClick={() => { setTheme('haze'); showToast('Theme: Haze Mode'); }}
                    />

                    {/* TXT — texture overlay, independent of variation */}
                    <SettingsToggle
                        id="st-haze-txt"
                        active={txt !== null}
                        title={txt ? `Texture: ${TXT_LABELS[txt]} — tap to cycle` : 'Tap to enable texture'}
                        label="TXT"
                        onClick={handleTxtCycle}
                    />

                    {/* ◩ swatch — iOS-safe <label htmlFor>, sim 4610-4613 pattern.
                        Larger ◩ icon (14px) placed on the swatch where it belongs. */}
                    <label
                        htmlFor="hazeColorPicker"
                        className="pill-theme"
                        title="Pick colour"
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
                            setHazeHex('✓ COPIED');
                            window.setTimeout(() => {
                                copyingHexRef.current = false;
                                setHazeHex(readHazeColor());
                            }, 1500);
                        }}
                    >⧉{'\uFE0E'}</span>

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
                </div>
            </>
        );
    }

    return (
        <>
            <div
                className="settings-header"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Triple-tap for Haze mode"
                onClick={handleHeaderTap}
            >
                DEFAULT THEME
            </div>
            <div className="settings-pill-row theme-pills">
                {PILLS.map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        id={`st-${p.key}`}
                        className={`pill-theme ${p.cls}${theme === p.key ? ' active' : ''}`}
                        title={p.title}
                        aria-pressed={theme === p.key}
                        onClick={(e) => {
                            e.stopPropagation();
                            setTheme(p.key);
                            showToast('Theme: ' + THEME_NAMES[p.key]);
                        }}
                    >
                        <span style={p.glyphStyle}>{p.glyph}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
