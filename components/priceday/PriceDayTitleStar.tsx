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
 */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useLongPressStar } from '../../lib/pins/useLongPressStar';
import {
    isPriceDayStarred,
    togglePriceDayStar,
    subscribePriceDayStars,
} from '../../lib/pins/priceDayStarStore';

export default function PriceDayTitleStar({ number }: { number: number }) {
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

    return (
        <div
            className="dp-title project-title-star-wrap"
            style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
            {...handlers}
        >
            PRICEDAY #{number}
            {starred && <span className="project-name-star" aria-hidden="true">{'\u2605\ufe0e'}</span>}
            {floatId > 0 && <span key={floatId} className={`project-name-star-float${floatDown ? ' is-down' : ''}`} aria-hidden="true">{'\u2605\ufe0e'}</span>}
        </div>
    );
}
