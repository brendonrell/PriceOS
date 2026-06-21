/*
 * StickerArt — renders a single sticker's artwork (Petey or $PRICE) recoloured.
 *
 * Pure SVG, no state. Used both in the store card art and on the profile hero.
 * Geometry lives in lib/stickers/logoPaths; colours come from the Sticker.
 */

import type { Sticker } from '../../lib/stickers/catalog';
import {
    PETEY_BUBBLE_PATH, PETEY_GLYPH_PATH,
    PETEY_DOT_RIGHT_PATH, PETEY_DOT_LEFT_PATH, PETEY_DOT_TOP_PATH,
    PRICE_LOGO_BG_PATH, PRICE_LOGO_P_PATH, PRICE_LOGO_R_PATH,
    PRICE_LOGO_I_PATH, PRICE_LOGO_C_PATH, PRICE_LOGO_E_PATH,
} from '../../lib/stickers/logoPaths';

interface Props {
    sticker: Sticker;
    /** Rendered height in px (width auto-scales to the artwork ratio). */
    size?: number;
    className?: string;
}

export function StickerArt({ sticker, size = 44, className }: Props) {
    if (sticker.kind === 'logo') {
        const color = sticker.color ?? '#FF0055';
        const cutout = sticker.cutout ?? '#FFFFFF';
        return (
            <svg
                className={className}
                height={size}
                width={size}
                viewBox="0 0 761 655"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={sticker.name}
                /* Petey = the regular logo rotated 90° counter-clockwise. */
                style={sticker.rotated ? { transform: 'rotate(-90deg)' } : undefined}
            >
                <path d={PETEY_BUBBLE_PATH} fill={color} />
                <path d={PETEY_GLYPH_PATH} fill={cutout} stroke={cutout} strokeWidth="1.5" />
                <path d={PETEY_DOT_RIGHT_PATH} fill={color} />
                <path d={PETEY_DOT_LEFT_PATH} fill={color} />
                <path d={PETEY_DOT_TOP_PATH} fill={color} />
            </svg>
        );
    }

    // $PRICE wordmark — ratio 517:403.
    const bg = sticker.bg ?? '#FF0055';
    const fg = sticker.fg ?? '#FFE600';
    const h = size;
    const w = (size * 517) / 403;
    return (
        <svg
            className={className}
            height={h}
            width={w}
            viewBox="0 0 517 403"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={sticker.name}
        >
            <path d={PRICE_LOGO_BG_PATH} fill={bg} />
            <path d={PRICE_LOGO_P_PATH} fill={fg} />
            <path d={PRICE_LOGO_R_PATH} fill={fg} />
            <path d={PRICE_LOGO_I_PATH} fill={fg} />
            <path d={PRICE_LOGO_C_PATH} fill={fg} />
            <path d={PRICE_LOGO_E_PATH} fill={fg} />
        </svg>
    );
}
