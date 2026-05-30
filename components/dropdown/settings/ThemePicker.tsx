'use client';

/*
 * ThemePicker — DEFAULT THEME section.
 *
 * Triple-tap the header to reveal the hidden Haze Mode row in-place.
 * Triple-tap "HAZE MODE" to return to the standard picker.
 *
 * Haze row layout (mirrors the Profile Theme row in MY PD):
 *   ◩ HZ    — SettingsToggle pill (activates haze theme). Same icon/
 *              label style as PL / PD pills. ◩ icon = profile-theme icon.
 *   ◩ label — iOS-safe <label htmlFor> swatch that opens the native
 *              colour picker (sim 4610-4613 pattern — no .click() call).
 *   hex input
 *   ⧉       — copy hex (copy-hex-btn, same as profile row)
 *   ≋       — variation cycle (copy-hex-btn user-showcase-toggle-btn,
 *              bare icon — no pill border). Cycles Tint → Drift → Pulse
 *              → Pure → Tint → ... Glyph style changes per state:
 *              Tint=bold, Drift=italic, Pulse=underline, Pure=strikethrough.
 *              No OFF state — only switching to another theme stops it.
 *
 * Toasts: "Haze Mode (Tint)" / "Haze Mode (Drift)" / etc.
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

// 4-state cycle — no OFF, just wraps Tint→Drift→Pulse→Pure→Tint
const VARIATION_CYCLE: HazeVariation[] = ['tint', 'drift', 'pulse', 'pure'];

const VARIATION_LABELS: Record<HazeVariation, string> = {
    tint:  'Tint',
    drift: 'Drift',
    pulse: 'Pulse',
    pure:  'Pure',
};

// Text style per variation state — applied to the ≋ glyph
const VARIATION_GLYPH_STYLE: Record<HazeVariation, React.CSSProperties> = {
    tint:  { fontWeight: 'bold' },
    drift: { fontStyle: 'italic' },
    pulse: { textDecoration: 'underline' },
    pure:  { textDecoration: 'line-through' },
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
        if (now - s.lastTap > 600) s.count = 1;
        else s.count += 1;
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

    // Variation — read from storage on mount; null means first tap will
    // start at Tint (index 0). If a variation is already saved, the
    // next tap advances from its current position.
    const [variation, setVariationState] = useState<HazeVariation | null>(
        () => getHazeVariation()
    );

    const applyHazeHex = (hex: string) => {
        const upper = hex.toUpperCase();
        try { localStorage.setItem(HAZE_COLOR_KEY, upper); } catch { /* ignore */ }
        // setTheme('haze') re-resolves getHazeBg() and re-enables the
        // variation engine with the new base colour.
        if (theme === 'haze') setTheme('haze');
    };

    const handleVariationCycle = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Advance: if no variation active yet, start at index 0 (Tint).
        // Otherwise advance from current position.
        const currentIdx = variation !== null
            ? VARIATION_CYCLE.indexOf(variation)
            : -1;
        const nextIdx = (currentIdx + 1) % VARIATION_CYCLE.length;
        const next = VARIATION_CYCLE[nextIdx];

        setVariationState(next);
        setHazeVariation(next);

        const base = readHazeColor();
        enableHazeVariation(next, base, (hex) => applyBgHex(hex, 'haze'));

        showToast(`Haze Mode (${VARIATION_LABELS[next]})`);

        // Ensure haze is the active theme
        if (theme !== 'haze') setTheme('haze');
    };

    if (hazeMode) {
        // ≋ base style — always Courier, 16px (matches copy-hex-btn)
        const variationGlyphStyle: React.CSSProperties = {
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 16,
            lineHeight: 1,
            ...(variation ? VARIATION_GLYPH_STYLE[variation] : {}),
        };

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
                    {/* ◩ HZ — activates haze theme. Same style as PL/PD. */}
                    <SettingsToggle
                        id="st-haze"
                        active={theme === 'haze'}
                        title="Haze Mode"
                        icon={'◩\uFE0E'}
                        label="HZ"
                        onClick={() => {
                            setTheme('haze');
                            showToast('Theme: Haze Mode');
                        }}
                    />

                    {/* ◩ swatch — iOS-safe <label htmlFor>, sim 4610-4613 */}
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

                    {/* ⧉ copy — same class as profile row */}
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

                    {/* ≋ variation — bare icon, no pill border.
                        Sits right of ⧉ like the showcase toggle sits
                        right of ⧉ in the profile row. Text style changes
                        per state: bold / italic / underline / strikethrough. */}
                    <span
                        className="copy-hex-btn user-showcase-toggle-btn"
                        title={variation
                            ? `Haze Mode (${VARIATION_LABELS[variation]}) — tap to cycle`
                            : 'Tap to enable variation'}
                        role="button"
                        tabIndex={0}
                        style={variationGlyphStyle}
                        onClick={handleVariationCycle}
                    >
                        ≋{'\uFE0E'}
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
