'use client';

/*
 * useSigilForged — has the signed-in wallet forged its Sigil?
 *
 * Seeds from the auth snapshot (users.sigil_forged_at) and flips live on the
 * `pd:sigil-forged` broadcast the forge modal fires — so the carousel gains
 * the Sigil ring and the navbar mark appears the moment the hammer falls,
 * no refetch, no reload.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/state/AuthContext';

export const SIGIL_FORGED_EVENT = 'pd:sigil-forged';

export function useSigilForged(): boolean {
    const { sigilForged } = useAuth();
    const [forged, setForged] = useState(false);

    useEffect(() => {
        setForged(sigilForged);
        const onForged = () => setForged(true);
        window.addEventListener(SIGIL_FORGED_EVENT, onForged);
        return () => window.removeEventListener(SIGIL_FORGED_EVENT, onForged);
    }, [sigilForged]);

    return forged;
}
