'use client';

/*
 * useEffectiveAddress — the Incognito Proxy's one read (2026-07-28).
 *
 * The session address, unless the proxy lens is on AND resolved — then the
 * proxy's. Surfaces adopt this hook one by one (the brief's §Scope order);
 * everything not adopted keeps reading the real you. Writes NEVER key on
 * this — the proxy is a lens, not a login.
 */

import { useSyncExternalStore } from 'react';
import { useAuth } from '../state/AuthContext';
import { getIncognito, subscribeIncognito } from './incognitoEngine';

export function useEffectiveAddress(): {
    /** The address viewer-personal reads should resolve against. */
    address: string | null;
    /** True while a resolved proxy identity is worn. */
    proxied: boolean;
    /** The pill's label for the worn identity (`@handle` / ens / 0x…). */
    proxyLabel: string | null;
} {
    const { siweAddress } = useAuth();
    const inc = useSyncExternalStore(subscribeIncognito, getIncognito, getIncognito);
    const proxied = inc.active && !!inc.proxyAddress;
    return {
        address: proxied ? inc.proxyAddress : (siweAddress ?? null),
        proxied,
        proxyLabel: proxied ? inc.proxyLabel : null,
    };
}
