import type { CSSProperties } from 'react';
import {
    PETEY_GLYPH_PATH, PETEY_DOT_RIGHT_PATH, PETEY_DOT_LEFT_PATH, PETEY_DOT_TOP_PATH,
} from '../../lib/stickers/logoPaths';

/*
 * PerMilleMark — the REAL per-mille from the corner logo (the glyph-only
 * variant: slash + three dots, no bubble), cropped tight to the mark and
 * rendered as a small inline SVG. Paints in currentColor so it tracks whatever
 * text colour it sits in. Used anywhere the ‰ logo mark shows as UI: the output
 * timeline's PriceOS row, the My PD "Price Logo" toggle, and the New-to-PD
 * trait pill. Size it per-site via className/style (CSS sets the height).
 */
export function PerMilleMark({ className, style }: { className?: string; style?: CSSProperties }) {
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
            <path d={PETEY_GLYPH_PATH} stroke="currentColor" strokeWidth={1.5} />
            <path d={PETEY_DOT_RIGHT_PATH} />
            <path d={PETEY_DOT_LEFT_PATH} />
            <path d={PETEY_DOT_TOP_PATH} />
        </svg>
    );
}
