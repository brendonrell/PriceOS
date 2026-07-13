'use client';

/*
 * useFaction — the viewer's CURRENTLY-FLYING faction, or null while neutral.
 *
 * Reads the same slot useProfileLogo owns (localStorage `pd_profile_logo` +
 * the `pd:profile-logo-changed` broadcast) and maps it through the faction
 * registry. All war UI (Cartography toggle, ceremony corners, tape war lines)
 * gates on THIS — IYKYK: civilians see today's clean site, indefinitely.
 *
 * Flying ≠ oath: the server oath (faction_oaths) persists while a neutral
 * logo flies; this hook only answers "is war UI visible right now".
 */

import { useEffect, useState } from 'react';
import { factionForLogo, type Faction } from './factions';

const STORAGE_KEY = 'pd_profile_logo';
const EVENT_NAME = 'pd:profile-logo-changed';

function read(): Faction | null {
    if (typeof window === 'undefined') return null;
    try {
        return factionForLogo(localStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
}

export function useFaction(): Faction | null {
    const [faction, setFaction] = useState<Faction | null>(null);

    useEffect(() => {
        setFaction(read());
        const sync = (e: Event) => {
            const detail = (e as CustomEvent<string | null>).detail;
            setFaction(factionForLogo(detail));
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
    }, []);

    return faction;
}
