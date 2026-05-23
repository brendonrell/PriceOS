/**
 * ssrTheme — server-side theme CSS var computation.
 *
 * Reads pd_c_theme + pd_c_artist_color cookies (written by ThemeContext
 * and useArtistColor on every change) and returns an inline <style> block
 * with the correct CSS vars. Injected into <head> in layout.tsx so the
 * browser never paints the :root defaults — zero flash.
 */

const THEMES: Record<string, string> = {
    artist:  '#C488FF',
    light:   '#e0e0e0',
    dark:    '#1a1a1a',
    orange:  '#ff6600',
    blue:    '#3D9EFF',
    red:     '#FF0033',
};

const VALID_THEMES = new Set(Object.keys(THEMES));
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function parseCookies(cookieHeader: string): Record<string, string> {
    const map: Record<string, string> = {};
    for (const part of cookieHeader.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        map[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
    }
    return map;
}

function buildVars(bg: string, key: string | null): string {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.slice(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    const text = yiq >= 128 ? '#111111' : '#e0e0e0';
    const isLight = text === '#111111';

    let mintBg = '#111111', mintText = '#e0e0e0', mintBorder = '#111111';
    let pillBg = text, pillText = bg, pillBorder = text;
    let pillBgImg = 'none', pillActiveBgImg = 'none';

    if (key === 'dark') {
        mintBg = '#e0e0e0'; mintText = '#111111'; mintBorder = '#e0e0e0';
        pillBg = '#111111'; pillText = '#e0e0e0'; pillBorder = '#e0e0e0';
        pillBgImg = 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(224,224,224,0.15) 2px,rgba(224,224,224,0.15) 4px)';
        pillActiveBgImg = 'repeating-linear-gradient(45deg,transparent,transparent 1px,rgba(224,224,224,0.55) 1px,rgba(224,224,224,0.55) 2px)';
    }

    return `:root{` +
        `--bg-color:${bg};` +
        `--text-color:${text};` +
        `--accent:${text};` +
        `--border-color:${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'};` +
        `--stat-bg:${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)'};` +
        `--stat-active-bg:${isLight ? '#000000' : '#e0e0e0'};` +
        `--stat-active-text:${isLight ? '#e0e0e0' : '#000000'};` +
        `--modal-bg:rgba(${r},${g},${b},0.98);` +
        `--btn-user-hover:${isLight ? '#ffffff' : '#888888'};` +
        `--mint-bg:${mintBg};` +
        `--mint-text:${mintText};` +
        `--mint-border:${mintBorder};` +
        `--mint-bg-img:none;` +
        `--pill-l1-bg:${pillBg};` +
        `--pill-l1-text:${pillText};` +
        `--pill-l1-border:${pillBorder};` +
        `--pill-l1-bg-img:${pillBgImg};` +
        `--pill-l1-active-bg-img:${pillActiveBgImg};` +
        `}`;
}

export function getSSRThemeStyle(
    cookieHeader: string,
    pathname: string,
): string {
    const cookies = parseCookies(cookieHeader);

    const rawTheme = cookies['pd_c_theme'] ?? '';
    const themeKey = VALID_THEMES.has(rawTheme) ? rawTheme : null;

    const rawColor = cookies['pd_c_artist_color'] ?? '';
    const artistColor = HEX_RE.test(rawColor) ? rawColor.toUpperCase() : null;

    // Resolve bg — same logic as the pre-hydration script
    const firstSeg = (pathname.match(/^\/([^/]+)/)?.[1] ?? '').toLowerCase();
    const isProfilePage =
        firstSeg.length > 0 &&
        firstSeg !== 'art' &&
        firstSeg !== 'api' &&
        !/^\d+$/.test(firstSeg) &&
        /^[@a-z0-9_-]+$/i.test(firstSeg);

    let bg: string;
    let key = themeKey;

    if (key === null && isProfilePage) {
        return buildVars('#FFE600', null);
    }

    if (key === null) key = 'artist';

    if (key === 'artist') {
        bg = artistColor ?? '#C488FF';
    } else {
        bg = THEMES[key] ?? '#C488FF';
    }

    return buildVars(bg, key);
}

export const COOKIE_FLAGS = 'path=/; max-age=31536000; SameSite=Lax';
