'use client';

/*
 * OfferShieldCast — the little "ward goes up" flourish when the Offer Shield
 * spell is switched ON (Brendon, 2026-07-16). A brief, non-blocking cast: a
 * ring wards outward and the shield glyph rises + fades. Mounted once in
 * PriceOSShell; fires off the `pd:offer-shield-cast` window event dispatched
 * when the pill flips on.
 */

import { useEffect, useState } from 'react';

const VS15 = '︎';

export default function OfferShieldCast() {
    // A rising key restarts the CSS animation cleanly on a rapid re-cast.
    const [cast, setCast] = useState(0);

    useEffect(() => {
        const onCast = () => setCast((n) => n + 1);
        window.addEventListener('pd:offer-shield-cast', onCast);
        return () => window.removeEventListener('pd:offer-shield-cast', onCast);
    }, []);

    useEffect(() => {
        if (cast === 0) return;
        const t = window.setTimeout(() => setCast(0), 950);
        return () => window.clearTimeout(t);
    }, [cast]);

    if (cast === 0) return null;
    return (
        <div className="shield-cast" aria-hidden="true" key={cast}>
            <div className="shield-cast-ring" />
            <div className="shield-cast-glyph">{`⍲${VS15}`}</div>
        </div>
    );
}
