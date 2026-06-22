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
import { AnimatedSticker } from './AnimatedSticker';
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
const CUT_LOGO = 196;
const CUT_PRICE = 150;

function StickerArtImpl({ sticker, size = 44, fill, diecut, className }: Props) {
    if (sticker.kind === 'output' && sticker.slug && sticker.tokenId != null) {
        return <OutputSticker slug={sticker.slug} id={sticker.tokenId} size={size} fill={fill} diecut={diecut} />;
    }
    if (sticker.kind === 'anim') {
        return <AnimatedSticker sticker={sticker} size={size} fill={fill} diecut={diecut} />;
    }

    const dims = fill ? { width: '100%' as const } : { height: size };

    if (sticker.kind === 'logo') {
        const cutout = sticker.cutout ?? '#FFFFFF';
        const holoId = `holo-${sticker.id}`;
        const color = sticker.holo ? `url(#${holoId})` : (sticker.color ?? '#FF0055');
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
                {sticker.holo && (
                    <defs>
                        <linearGradient id={holoId} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FF6EC4" />
                            <stop offset="22%" stopColor="#7873F5" />
                            <stop offset="44%" stopColor="#4ADEDE" />
                            <stop offset="66%" stopColor="#9EFF6E" />
                            <stop offset="84%" stopColor="#FFE86E" />
                            <stop offset="100%" stopColor="#FF9F6E" />
                        </linearGradient>
                    </defs>
                )}
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
        const vb = diecut ? '-40 -40 180 180' : '0 0 100 100';
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
                        <rect x={-32} y={-32} width={164} height={164} rx={48} fill={LINE} />
                        <rect x={-26} y={-26} width={152} height={152} rx={42} fill={CUT} />
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

        if (lines.length === 1) {
            // SKINNY chip (sprites / @names) — hugs the text, a little buffer on
            // the LEFT/RIGHT only. From the old version Brendon kept.
            const SIDE = 20;
            const charW = 30;
            const fontSize = 46;
            const H = 78;
            const W = maxLen * charW + SIDE * 2;
            const M = 24;   // die-cut margin
            const Ln = 8;   // kiss-cut line peek
            const vb = diecut ? `${-(M + Ln) - 2} ${-(M + Ln) - 2} ${W + 2 * (M + Ln) + 4} ${H + 2 * (M + Ln) + 4}` : `0 0 ${W} ${H}`;
            const clipId = `clip-${sticker.id}`;
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
                    {/* The sticker's own edge clips its content — nothing pokes past
                        the rounded rect (True Names overflowed; Brendon 2026-06-22). */}
                    <defs>
                        <clipPath id={clipId}><rect x={0} y={0} width={W} height={H} rx={20} /></clipPath>
                    </defs>
                    {diecut && (
                        <>
                            <rect x={-(M + Ln)} y={-(M + Ln)} width={W + 2 * (M + Ln)} height={H + 2 * (M + Ln)} rx={M + Ln + 8} fill={LINE} />
                            <rect x={-M} y={-M} width={W + 2 * M} height={H + 2 * M} rx={M + 6} fill={CUT} />
                        </>
                    )}
                    <rect x={0} y={0} width={W} height={H} rx={20} fill={color} />
                    <text x={W / 2} y={H / 2} clipPath={`url(#${clipId})`} fill={fg} fontFamily="'Courier New', Courier, monospace" fontSize={fontSize} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                        {lines[0]}
                    </text>
                </svg>
            );
        }

        // Multi-line familiars → uniform tile, text scaled to fit (unchanged).
        const W = 178;
        const H = 120;
        const innerW = W - 30;
        const innerH = H - 24;
        const fs = Math.max(8, Math.min(54, innerW / (maxLen * 0.62), innerH / (lines.length * 1.18)));
        const lineH = fs * 1.18;
        const vb = diecut ? `-44 -44 ${W + 88} ${H + 88}` : `0 0 ${W} ${H}`;
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
                        <rect x={-36} y={-36} width={W + 72} height={H + 72} rx={54} fill={LINE} />
                        <rect x={-28} y={-28} width={W + 56} height={H + 56} rx={46} fill={CUT} />
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
    const vb = diecut ? '-100 -100 717 603' : '0 0 517 403';
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
