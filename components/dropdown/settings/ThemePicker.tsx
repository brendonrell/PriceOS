'use client';

/*
 * ThemePicker
 *
 * Settings panel section 3 — DEFAULT THEME.
 *
 * Triple-tap "DEFAULT THEME" header → Haze mode row replaces in-place.
 * Header reads "HAZE MODE". Triple-tap again to return.
 *
 * Haze row:
 *   HZ pill    — activates haze theme (solid base colour)
 *   ◩ label    — opens native colour picker (iOS-safe: <label htmlFor>
 *                wraps the hidden <input type="color">, same as sim
 *                4610-4613 — no programmatic .click() needed)
 *   hex input  — typed hex entry, live-applies on valid 6-digit input
 *   ⧉ copy     — clipboard copy, 1500ms "✓ COPIED" feedback
 *   ≋ pill     — cycles OFF → Tint → Drift → Pulse → Chromatic → OFF
 *
 * Haze is a normal ThemeKey (same as orange/blue/red). Hex + variation
 * both persist in localStorage and boot exactly like any other theme.
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
    disableHazeVariation,
    type HazeVariation,
} from '../../../lib/engines/hazeEngine';
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
        key: 'blue',  cls: 't-blue',  title: 'Blueberry Mode',  glyph: 'B',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 11, fontWeight: 'bold', letterSpacing: 0 },
    },
    {
        key: 'red',   cls: 't-red',   title: 'Red Cherry Mode', glyph: 'R',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 11, fontWeight: 'bold', letterSpacing: 0 },
    },
];

const THEME_NAMES: Record<NonNullable<ThemeKey>, string> = {
    artist:  'Artist Custom',
    light:   'Light Mode',
    dark:    'Dark Mode',
    orange:  'Orange Mode',
    hashsyn: 'Hash Synesthesia',
    blue:    'Blueberry Mode',
    red:     'Cherry Mode',
    haze:    'Haze Mode',
};

const VARIATION_CYCLE: Array<HazeVariation | null> = [
    null, 'tint', 'drift', 'pulse', 'chromatic',
];
const VARIATION_LABELS: Record<HazeVariation, string> = {
    tint:      'Tint',
    drift:     'Slow Drift',
    pulse:     'Pulse',
    chromatic: 'Chromatic',
};

const HAZE_COLOR_KEY = 'pd_haze_color';
const HAZE_DEFAULT   = '#888888';
const HEX_RE         = /^#[0-9A-F]{6}$/i;

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

    // Triple-tap to reveal/hide haze row
    const [hazeMode, setHazeMode] = useState(false);
    const tapState = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 });

    const handleHeaderTap = () => {
        const now = Date.now();
        const s = tapState.current;
        if (now - s.lastTap > 600) {
            s.count = 1;
        } else {
            s.count += 1;
        }
        s.lastTap = now;
        if (s.count >= 3) {
            s.count = 0;
            setHazeMode((v) => !v);
        }
    };

    // Haze hex state
    const [hazeHex, setHazeHex] = useState<string>(() => readHazeColor());
    const editingHexRef = useRef(false);
    const copyingHexRef = useRef(false);

    // Variation state — read from storage on mount
    const [variation, setVariationState] = useState<HazeVariation | null>(
        () => getHazeVariation()
    );

    const applyHazeHex = (hex: string) => {
        const upper = hex.toUpperCase();
        try { localStorage.setItem(HAZE_COLOR_KEY, upper); } catch { /* ignore */ }
        // Re-apply via setTheme so ThemeContext re-resolves getHazeBg()
        // and restarts the variation engine with the new base colour.
        if (theme === 'haze') setTheme('haze');
    };

    const handleVariationCycle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentIdx = VARIATION_CYCLE.indexOf(variation);
        const nextIdx = (currentIdx + 1) % VARIATION_CYCLE.length;
        const next = VARIATION_CYCLE[nextIdx];

        setVariationState(next);
        setHazeVariation(next);

        const base = readHazeColor();
        const applyFn = (hex: string) => applyBgHex(hex, 'haze');

        if (next === null) {
            disableHazeVariation(base, applyFn);
            showToast('Haze Mode: OFF');
        } else {
            enableHazeVariation(next, base, applyFn);
            showToast(`Haze Mode (${VARIATION_LABELS[next]}): ON`);
        }

        // Ensure haze is the active theme when a variation is picked
        if (next !== null && theme !== 'haze') {
            setTheme('haze');
        }
    };

    if (hazeMode) {
        const variationActive = variation !== null;
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
                    {/* HZ — activates haze theme */}
                    <button
                        type="button"
                        id="st-haze"
                        className={`pill-theme t-haze${theme === 'haze' ? ' active' : ''}`}
                        title="Haze Mode"
                        aria-pressed={theme === 'haze'}
                        style={theme !== 'haze'
                            ? { backgroundColor: hazeHex, opacity: 0.8 }
                            : { backgroundColor: hazeHex }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setTheme('haze');
                            showToast('Theme: Haze Mode');
                        }}
                    >
                        <span style={{
                            fontFamily: "'Courier New', Courier, monospace",
                            fontSize: 9,
                            fontWeight: 'bold',
                            letterSpacing: 0,
                        }}>HZ</span>
                    </button>

                    {/* ◩ — iOS-safe colour picker via <label htmlFor>.
                        Sim 4610-4613 pattern: label wraps the hidden input
                        so the tap is a trusted gesture; no .click() needed. */}
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
                            fontSize: 10,
                            fontWeight: 'bold',
                            pointerEvents: 'none',
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
                                position: 'absolute',
                                opacity: 0,
                                width: '1px',
                                height: '1px',
                                bottom: 0,
                                left: '50%',
                                pointerEvents: 'none',
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
                            if (!HEX_RE.test(hazeHex)) {
                                setHazeHex(readHazeColor());
                            } else {
                                setHazeHex(hazeHex.toUpperCase());
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                            } else if (e.key === 'Escape') {
                                setHazeHex(readHazeColor());
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                    />

                    {/* ⧉ copy hex */}
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
                    >
                        ⧉{'\uFE0E'}
                    </span>

                    {/* ≋ variation cycle */}
                    <button
                        type="button"
                        className={`pill-theme${variationActive ? ' active' : ''}`}
                        title={variationActive
                            ? `Haze Mode (${VARIATION_LABELS[variation!]}): ON — tap to cycle`
                            : 'Tap to enable variation'}
                        aria-pressed={variationActive}
                        onClick={handleVariationCycle}
                    >
                        <span style={{
                            fontFamily: "'Courier New', Courier, monospace",
                            fontSize: 13,
                            fontWeight: 'normal',
                        }}>≋{'\uFE0E'}</span>
                    </button>
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
