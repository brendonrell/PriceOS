/*
 * StickerArt — renders a single sticker's artwork (logo / $PRICE / glyph / face
 * / output), recoloured. Pure SVG (output uses a small live canvas).
 *
 * `diecut` draws a FAT margin in the sheet colour (--sticker-cut) plus a thin
 * kiss-cut LINE (--sticker-line, a soft off-white score) tracing the edge, so
 * each sticker reads as cut from the paper. No shadows.
 * `fill` makes the SVG width:100% so a % wrapper controls its size.
 */

import { memo } from 'react';
import type { Sticker } from '../../lib/stickers/catalog';
import { OutputSticker } from './OutputSticker';
import {
    PETEY_BUBBLE_PATH, PETEY_GLYPH_PATH,
    PETEY_DOT_RIGHT_PATH, PETEY_DOT_LEFT_PATH, PETEY_DOT_TOP_PATH,
    PRICE_LOGO_BG_PATH, PRICE_LOGO_P_PATH, PRICE_LOGO_R_PATH,
    PRICE_LOGO_I_PATH, PRICE_LOGO_C_PATH, PRICE_LOGO_E_PATH,
} from '../../lib/stickers/logoPaths';

interface Props {
    sticker: Sticker;
    size?: number;
    fill?: boolean;
    diecut?: boolean;
    className?: string;
}

const CUT = 'var(--sticker-cut, #fff)';
const LINE = 'var(--sticker-line, #d6d6d6)';
const CUT_LOGO = 132;
const CUT_PRICE = 104;

function StickerArtImpl({ sticker, size = 44, fill, diecut, className }: Props) {
    if (sticker.kind === 'output' && sticker.slug && sticker.tokenId != null) {
        return <OutputSticker slug={sticker.slug} id={sticker.tokenId} size={size} fill={fill} diecut={diecut} />;
    }

    const dims = fill ? { width: '100%' as const } : { height: size };

    if (sticker.kind === 'logo') {
        const color = sticker.color ?? '#FF0055';
        const cutout = sticker.cutout ?? '#FFFFFF';
        const sil = [PETEY_BUBBLE_PATH, PETEY_DOT_RIGHT_PATH, PETEY_DOT_LEFT_PATH, PETEY_DOT_TOP_PATH];
        const vb = diecut ? '-120 -120 1001 895' : '0 0 761 655';
        return (
            <svg
                className={className}
                {...dims}
                viewBox={vb}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={sticker.name}
                style={{ overflow: 'visible', ...(sticker.rotated ? { transform: 'rotate(-90deg)' } : {}) }}
            >
                {diecut && (
                    <>
                        <g fill={LINE} stroke={LINE} strokeWidth={CUT_LOGO + 18} strokeLinejoin="round">
                            {sil.map((d, i) => <path key={i} d={d} />)}
                        </g>
                        <g fill={CUT} stroke={CUT} strokeWidth={CUT_LOGO} strokeLinejoin="round">
                            {sil.map((d, i) => <path key={i} d={d} />)}
                        </g>
                    </>
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
        const vb = diecut ? '-28 -28 156 156' : '0 0 100 100';
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
                {diecut && (
                    <>
                        <rect x={-20} y={-20} width={140} height={140} rx={40} fill={LINE} />
                        <rect x={-15} y={-15} width={130} height={130} rx={34} fill={CUT} />
                    </>
                )}
                <rect x={0} y={0} width={100} height={100} rx={22} fill={color} />
                <text x={50} y={54} fill={fg} fontFamily="'Courier New', Courier, monospace" fontSize={58} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                    {sticker.glyph}
                </text>
            </svg>
        );
    }

    if (sticker.kind === 'face') {
        const color = sticker.color ?? '#1A1A1A';
        const fg = sticker.cutout ?? '#FFFFFF';
        const lines = (sticker.glyph ?? '( ◕ )').split('\n');
        const maxLen = Math.max(1, ...lines.map((l) => [...l].length));
        // UNIFORM tile — every face the same shape; the text scales to fit, so
        // sprites/familiars tile tidily regardless of how long their art is.
        const W = 178;
        const H = 120;
        const innerW = W - 30;   // side buffer
        const innerH = H - 24;
        const fs = Math.max(8, Math.min(54, innerW / (maxLen * 0.62), innerH / (lines.length * 1.18)));
        const lineH = fs * 1.18;
        const vb = diecut ? `-30 -30 ${W + 60} ${H + 60}` : `0 0 ${W} ${H}`;
        const y0 = H / 2 - ((lines.length - 1) * lineH) / 2;
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
                {diecut && (
                    <>
                        <rect x={-22} y={-22} width={W + 44} height={H + 44} rx={44} fill={LINE} />
                        <rect x={-16} y={-16} width={W + 32} height={H + 32} rx={38} fill={CUT} />
                    </>
                )}
                <rect x={0} y={0} width={W} height={H} rx={26} fill={color} />
                <text fill={fg} fontFamily="'Courier New', Courier, monospace" fontSize={fs} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                    {lines.map((ln, i) => (
                        <tspan key={i} x={W / 2} y={y0 + i * lineH}>{ln || ' '}</tspan>
                    ))}
                </text>
            </svg>
        );
    }

    // $PRICE wordmark — ratio 517:403.
    const bg = sticker.bg ?? '#FF0055';
    const fg = sticker.fg ?? '#FFE600';
    const vb = diecut ? '-80 -80 677 563' : '0 0 517 403';
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
                <>
                    <path d={PRICE_LOGO_BG_PATH} fill={LINE} stroke={LINE} strokeWidth={CUT_PRICE + 16} strokeLinejoin="round" />
                    <path d={PRICE_LOGO_BG_PATH} fill={CUT} stroke={CUT} strokeWidth={CUT_PRICE} strokeLinejoin="round" />
                </>
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

/* Memoised so toggling active stickers never repaints the unchanged ones. */
export const StickerArt = memo(StickerArtImpl);
