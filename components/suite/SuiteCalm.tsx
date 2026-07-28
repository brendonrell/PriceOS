'use client';

/*
 * SuiteCalm — ⬟ PriceCalm, the Suite's calm room (Brendon's pick,
 * 2026-07-28: "Calm room is our winner").
 *
 * The REAL Zen Garden (Rule #0 — components/profile/ZenGarden, the raked
 * karesansui of the viewer's own portfolio), given the room to itself.
 * Whatever the miniplayer is playing keeps playing — the room adds sound
 * to nothing and takes nothing away. Pure aesthetic, no writes.
 */

import { useEffect, useState } from 'react';
import ZenGarden from '../profile/ZenGarden';
import { useAuth } from '../../lib/state/AuthContext';

export default function SuiteCalm() {
    const { siweAddress } = useAuth();
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        if (!siweAddress) { setCount(null); return; }
        let alive = true;
        fetch(`/api/user/${siweAddress.toLowerCase()}/outputs`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (alive) setCount(Number(d?.total) || 0); })
            .catch(() => { if (alive) setCount(0); });
        return () => { alive = false; };
    }, [siweAddress]);

    if (!siweAddress) {
        return <p className="suite-calm-note">Connect your wallet — the garden is raked from your own pieces.</p>;
    }
    return (
        <div className="suite-calm">
            {count === null
                ? <p className="suite-calm-note">Raking the sand…</p>
                : <ZenGarden address={siweAddress} count={count} />}
        </div>
    );
}
