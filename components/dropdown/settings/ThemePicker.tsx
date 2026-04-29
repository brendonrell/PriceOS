'use client';

/*
 * ThemePicker
 *
 * Settings panel section 3 — DEFAULT THEME.
 *
 * Seven theme pills, each backed by ThemeContext. Click switches the
 * site theme (--bg-color and --text-color flip with YIQ contrast).
 *
 * Picker layout matches the sim verbatim, including the per-pill icon
 * styling tweaks for the textual ones (B, R) and the Hash-Synesthesia
 * three-dot glyph. The active state is rendered by the .pill-theme.active
 * CSS rule when the current theme matches the pill's key.
 */

import { useTheme, type ThemeKey } from '../../../lib/state/ThemeContext';

interface PillSpec {
    key: NonNullable<ThemeKey>;
    cls: string;
    title: string;
    glyph: string;
    glyphStyle?: React.CSSProperties;
}

const PILLS: PillSpec[] = [
    { key: 'artist',  cls: 't-artist',  title: 'Artist Custom',     glyph: '◩\uFE0E' },
    { key: 'light',   cls: 't-light',   title: 'Light Mode',        glyph: '◻\uFE0E' },
    { key: 'dark',    cls: 't-dark',    title: 'Dark Mode',         glyph: '◼\uFE0E' },
    { key: 'orange',  cls: 't-orange',  title: 'Orange Mode',       glyph: '▨\uFE0E' },
    {
        key: 'hashsyn', cls: 't-hashsyn', title: 'Hash Synesthesia', glyph: '⁂\uFE0E',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 13, fontWeight: 'normal' },
    },
    {
        key: 'blue',    cls: 't-blue',    title: 'Blueberry Mode',    glyph: 'B',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 11, fontWeight: 'bold', letterSpacing: 0 },
    },
    {
        key: 'red',     cls: 't-red',     title: 'Cherry Mode',       glyph: 'R',
        glyphStyle: { fontFamily: "'Courier New', Courier, monospace", fontSize: 11, fontWeight: 'bold', letterSpacing: 0 },
    },
];

export function ThemePicker() {
    const { theme, setTheme } = useTheme();

    return (
        <>
            <div className="settings-header">DEFAULT THEME</div>
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
                        }}
                    >
                        <span style={p.glyphStyle}>{p.glyph}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
