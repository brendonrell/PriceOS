'use client';

/*
 * PriceDayTitleStar — the "PRICEDAY #N" title inside the almanac popover,
 * with long-press-to-star (same gesture as Project/Output/Album/Vault
 * names — see useLongPressStar).
 *
 *   • Long-press the title → star/unstar this PriceDay: a ★ sits beside
 *     the number and a star floats up to confirm.
 *
 * Shows as a row in +More → Starred (PriceDays).
 *
 * THEMING (2026-09-04 redo — the first pass just borrowed
 * .project-name-star's `color: var(--accent)` verbatim without checking
 * where it'd land): .priceday-popover is an INVERTED surface
 * (`background: var(--text-color); color: var(--bg-color)`), not the
 * page's normal polarity. In the default Dot theme --accent === --text-
 * color, which is exactly the popover's own BACKGROUND — so the borrowed
 * star was rendering the same colour as the card behind it, invisible.
 * Every other row in this popover gets its colour by inheriting the
 * popover's own `color` (var(--bg-color)), which is contrast-correct
 * against the popover's background by construction in any colorway. The
 * star goes one step further: the caller passes this PriceDay's own mood
 * colour (lib/mood, same value already proven legible here as the Mood
 * Ring swatch) so a starred PriceDay reads as tied to that day
 * specifically, not just a generic accent mark. `color` is optional and
 * falls back to that inherited contrast-safe value (currentColor) if a
 * caller doesn't have a mood handy.
 */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useLongPressStar } from '../../lib/pins/useLongPressStar';
import {
    isPriceDayStarred,
    togglePriceDayStar,
    subscribePriceDayStars,
} from '../../lib/pins/priceDayStarStore';

export default function PriceDayTitleStar({ number, color }: { number: number; color?: string }) {
    const { showToast } = useToast();
    const [starred, setStarred] = React.useState(false);
    React.useEffect(() => {
        setStarred(isPriceDayStarred(number));
        return subscribePriceDayStars(() => setStarred(isPriceDayStarred(number)));
    }, [number]);

    const { floatId, floatDown, handlers } = useLongPressStar(() => {
        const r = togglePriceDayStar(number);
        showToast(r === 'starred' ? 'Added to your Starred PriceDays List (Private)' : 'Removed from your Starred PriceDays List');
        return r;
    });

    const starStyle: React.CSSProperties = color ? { color } : {};

    return (
        <div
            className="dp-title project-title-star-wrap"
            style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
            {...handlers}
        >
            PRICEDAY #{number}
            {starred && <span className="project-name-star" style={starStyle} aria-hidden="true">{'\u2605\ufe0e'}</span>}
            {floatId > 0 && <span key={floatId} className={`project-name-star-float${floatDown ? ' is-down' : ''}`} style={starStyle} aria-hidden="true">{'\u2605\ufe0e'}</span>}
        </div>
    );
}
