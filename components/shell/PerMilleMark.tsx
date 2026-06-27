import type { CSSProperties } from 'react';
import {
    PETEY_GLYPH_PATH, PETEY_DOT_RIGHT_PATH, PETEY_DOT_LEFT_PATH, PETEY_DOT_TOP_PATH,
} from '../../lib/stickers/logoPaths';

/*
 * PerMilleMark — the REAL per-mille from the corner logo (slash + three rings,
 * no bubble), cropped tight to the mark and rendered as a small inline SVG.
 * Used anywhere the ‰ logo mark shows as UI: the output timeline's PriceOS row,
 * the My PD "Price Logo" toggle, and the New-to-PD trait pill. Size it per-site
 * via className/style (CSS sets the height).
 *
 * Same four paths and same two-tone structure as the corner logo (PeteyLogo):
 * the glyph is the mark, the three dots are knocked out to the surface colour
 * so the o's read hollow. In the logo the dots paint the bubble colour; here
 * they paint the page background. Pass a `hole` colour to match a tinted
 * surface (defaults to the page background).
 */
export function PerMilleMark({
    className, style, hole = 'var(--bg-color)',
}: { className?: string; style?: CSSProperties; hole?: string }) {
    return (
        <svg
            className={className}
            style={style}
            viewBox="170 101 447 379"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="PriceOS"
        >
            <path d={PETEY_GLYPH_PATH} />
            <path d={PETEY_DOT_RIGHT_PATH} fill={hole} />
            <path d={PETEY_DOT_LEFT_PATH} fill={hole} />
            <path d={PETEY_DOT_TOP_PATH} fill={hole} />
        </svg>
    );
}
