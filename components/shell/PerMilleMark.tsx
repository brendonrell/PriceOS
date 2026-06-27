import { useId, type CSSProperties } from 'react';
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
 * the glyph is the mark, the three dots are the holes that make the o's read
 * hollow. In the logo the dots paint the bubble colour; here they're a real
 * cutout (an SVG mask: glyph white, dots black) so the holes are TRANSPARENT
 * and show whatever surface sits behind — works on the feed, the settings
 * toggle, and the trait pill alike, no per-surface colour guess.
 */
export function PerMilleMark({ className, style }: { className?: string; style?: CSSProperties }) {
    const maskId = useId();
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
            <mask id={maskId}>
                <path d={PETEY_GLYPH_PATH} fill="white" />
                <path d={PETEY_DOT_RIGHT_PATH} fill="black" />
                <path d={PETEY_DOT_LEFT_PATH} fill="black" />
                <path d={PETEY_DOT_TOP_PATH} fill="black" />
            </mask>
            <rect x="170" y="101" width="447" height="379" mask={`url(#${maskId})`} />
        </svg>
    );
}
