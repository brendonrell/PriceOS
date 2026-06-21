/*
 * StickerArt — renders a single sticker's artwork (logo / $PRICE / glyph),
 * recoloured. Pure SVG, no state.
 *
 * `diecut` draws a FAT cut around the artwork's outer silhouette in the SHEET's
 * colour (var(--sticker-cut)) — so on the sheet each sticker reads as cut from
 * the paper, and overlaps show a clean paper margin between shapes. No shadows.
 * `fill` makes the SVG width:100% so a % wrapper controls its size.
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
    /** Draw the fat die-cut margin in the sheet colour. */
    diecut?: boolean;
    className?: string;
}

/* The cut is the sheet's colour, set on the paper as --sticker-cut. */
const CUT = 'var(--sticker-cut, #fff)';
const CUT_LOGO = 132;
const CUT_PRICE = 104;

export function StickerArt({ sticker, size = 44, fill, diecut, className }: Props) {
    const dims = fill
        ? { width: '100%' as const }
        : { height: size };

    if (sticker.kind === 'logo') {
        const color = sticker.color ?? '#FF0055';
        const cutout = sticker.cutout ?? '#FFFFFF';
        const vb = diecut ? '-110 -110 981 875' : '0 0 761 655';
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
                    <g fill={CUT} stroke={CUT} strokeWidth={CUT_LOGO} strokeLinejoin="round">
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

    if (sticker.kind === 'glyph') {
        const color = sticker.color ?? '#1A1A1A';
        const fg = sticker.cutout ?? '#FFFFFF';
        const vb = diecut ? '-26 -26 152 152' : '0 0 100 100';
        return (
            <svg
                className={className}
                {...(fill ? { width: '100%' as const } : { width: size, height: size })}
                viewBox={vb}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={sticker.name}
                style={{ overflow: 'visible' }}
            >
                {diecut && <rect x={-17} y={-17} width={134} height={134} rx={36} fill={CUT} />}
                <rect x={0} y={0} width={100} height={100} rx={22} fill={color} />
                <text
                    x={50}
                    y={54}
                    fill={fg}
                    fontFamily="'Courier New', Courier, monospace"
                    fontSize={58}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                >
                    {sticker.glyph}
                </text>
            </svg>
        );
    }

    if (sticker.kind === 'face') {
        const color = sticker.color ?? '#1A1A1A';
        const fg = sticker.cutout ?? '#FFFFFF';
        const text = sticker.glyph ?? '( ◕ )';
        const chars = [...text].length;
        const W = Math.max(150, chars * 30);
        const H = 110;
        const vb = diecut ? `-26 -26 ${W + 52} ${H + 52}` : `0 0 ${W} ${H}`;
        return (
            <svg
                className={className}
                {...(fill ? { width: '100%' as const } : { height: size })}
                viewBox={vb}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={sticker.name}
                style={{ overflow: 'visible' }}
            >
                {diecut && <rect x={-17} y={-17} width={W + 34} height={H + 34} rx={42} fill={CUT} />}
                <rect x={0} y={0} width={W} height={H} rx={30} fill={color} />
                <text
                    x={W / 2}
                    y={H / 2 + 2}
                    fill={fg}
                    fontFamily="'Courier New', Courier, monospace"
                    fontSize={52}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                >
                    {text}
                </text>
            </svg>
        );
    }

    // $PRICE wordmark — ratio 517:403.
    const bg = sticker.bg ?? '#FF0055';
    const fg = sticker.fg ?? '#FFE600';
    const vb = diecut ? '-72 -72 661 547' : '0 0 517 403';
    return (
        <svg
            className={className}
            {...(fill ? { width: '100%' as const } : { width: (size * 517) / 403, height: size })}
            viewBox={vb}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={sticker.name}
            style={{ overflow: 'visible' }}
        >
            {diecut && (
                <path d={PRICE_LOGO_BG_PATH} fill={CUT} stroke={CUT} strokeWidth={CUT_PRICE} strokeLinejoin="round" />
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
