/*
 * StickerArt — renders a single sticker's artwork (Petey or $PRICE) recoloured.
 *
 * Pure SVG, no state. Used in the store card art, the generative sheet, and the
 * profile hero. Geometry lives in lib/stickers/logoPaths; colours come from the
 * Sticker.
 *
 * `diecut` draws a fat white outline hugging the artwork's outer silhouette —
 * the real peel-sticker look. It pads the viewBox so the border isn't clipped.
 * `fill` makes the SVG width:100% (height auto) so a % wrapper controls its size.
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
    /** Rendered height in px (width auto-scales). Ignored when `fill`. */
    size?: number;
    /** width:100% / height:auto — let a wrapper size it. */
    fill?: boolean;
    /** Draw the white die-cut border around the silhouette. */
    diecut?: boolean;
    className?: string;
}

const CUT = '#FFFFFF';
const CUT_W = 54; // outline width in viewBox units

export function StickerArt({ sticker, size = 44, fill, diecut, className }: Props) {
    const dims = fill
        ? { width: '100%' as const, height: undefined }
        : { width: undefined, height: size };

    if (sticker.kind === 'logo') {
        const color = sticker.color ?? '#FF0055';
        const cutout = sticker.cutout ?? '#FFFFFF';
        const vb = diecut ? '-80 -80 921 815' : '0 0 761 655';
        return (
            <svg
                className={className}
                {...dims}
                viewBox={vb}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={sticker.name}
                style={{
                    overflow: 'visible',
                    ...(sticker.rotated ? { transform: 'rotate(-90deg)' } : {}),
                }}
            >
                {diecut && (
                    <g fill={CUT} stroke={CUT} strokeWidth={CUT_W} strokeLinejoin="round">
                        <path d={PETEY_BUBBLE_PATH} />
                        <path d={PETEY_DOT_RIGHT_PATH} />
                        <path d={PETEY_DOT_LEFT_PATH} />
                        <path d={PETEY_DOT_TOP_PATH} />
                    </g>
                )}
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
    const vb = diecut ? '-46 -46 609 495' : '0 0 517 403';
    const fixed = fill ? {} : { width: (size * 517) / 403, height: size };
    return (
        <svg
            className={className}
            {...(fill ? { width: '100%' as const } : fixed)}
            viewBox={vb}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={sticker.name}
            style={{ overflow: 'visible' }}
        >
            {diecut && (
                <path d={PRICE_LOGO_BG_PATH} fill={CUT} stroke={CUT} strokeWidth={CUT_W} strokeLinejoin="round" />
            )}
            <path d={PRICE_LOGO_BG_PATH} fill={bg} />
            <path d={PRICE_LOGO_P_PATH} fill={fg} />
            <path d={PRICE_LOGO_R_PATH} fill={fg} />
            <path d={PRICE_LOGO_I_PATH} fill={fg} />
            <path d={PRICE_LOGO_C_PATH} fill={fg} />
            <path d={PRICE_LOGO_E_PATH} fill={fg} />
        </svg>
    );
}
