/*
 * PriceMark — the $PRICE wordmark logo (red rounded-rect + yellow PRICE), the
 * exact navbar/.logo-price art, drawn small as the $PRICE holder tag's glyph
 * (Brendon, 2026-07-23 — "try the $PRICE logo svg as the glyph"). Fixed brand
 * colours; the caller sets the height.
 */

import {
    PRICE_LOGO_BG_PATH,
    PRICE_LOGO_P_PATH,
    PRICE_LOGO_R_PATH,
    PRICE_LOGO_I_PATH,
    PRICE_LOGO_C_PATH,
    PRICE_LOGO_E_PATH,
} from '../../lib/brand/priceLogoPaths';

export function PriceMark({ className, height = 15 }: { className?: string; height?: number }) {
    return (
        <svg
            className={className}
            viewBox="0 0 517 403"
            height={height}
            width={(517 / 403) * height}
            fill="none"
            role="img"
            aria-label="$PRICE"
            style={{ display: 'block', flex: '0 0 auto' }}
        >
            <path d={PRICE_LOGO_BG_PATH} fill="#FF0055" />
            <path d={PRICE_LOGO_P_PATH} fill="#FFE600" />
            <path d={PRICE_LOGO_R_PATH} fill="#FFE600" />
            <path d={PRICE_LOGO_I_PATH} fill="#FFE600" />
            <path d={PRICE_LOGO_C_PATH} fill="#FFE600" />
            <path d={PRICE_LOGO_E_PATH} fill="#FFE600" />
        </svg>
    );
}
