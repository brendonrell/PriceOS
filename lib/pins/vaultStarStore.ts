'use client';

/*
 * vaultStarStore — STARRED VAULTS (the +More → Starred "Vaults" surface).
 * Long-press a vault's label on its cover tile to favourite it — same
 * gesture as Project, Output, PriceDay and Album names. Vaults are public
 * (they're the grail-wall pattern), so this stars ANY vault on PD.
 *
 * Keyed `${ownerAddress}:${vaultId}` — same shape as albumStarStore, its
 * twin (vaultStore IS albumStore's shape, verbatim — Rule #0).
 *
 * Persistence protocol lives in createPinStore (2026-07-06 factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringSet } from './createPinStore';

const store = createPinStore<Set<string>>({
    storageKey: STATE_CACHE_KEYS.vaultStars,
    empty: () => new Set(),
    decode: (parsed) => decodeStringSet(parsed, (k) => k.includes(':')),
    encode: (keys) => Array.from(keys),
    push: (encoded) => pushSettings({ vaultStars: encoded as string[] }),
});

export type ToggleVaultStarResult = 'starred' | 'unstarred';

function keyOf(ownerAddress: string, vaultId: string): string {
    return `${ownerAddress.toLowerCase()}:${vaultId}`;
}

/** Parsed (ownerAddress, vaultId) pairs — for the Starred gallery. */
export function getVaultStarItems(): ReadonlyArray<{ ownerAddress: string; vaultId: string }> {
    return Array.from(store.get()).map((k) => {
        const i = k.indexOf(':');
        return { ownerAddress: k.slice(0, i), vaultId: k.slice(i + 1) };
    });
}

export function isVaultStarred(ownerAddress: string, vaultId: string): boolean {
    return store.get().has(keyOf(ownerAddress, vaultId));
}

/** Toggle a Vault's star. Caller owns the toast + float. */
export function toggleVaultStar(ownerAddress: string, vaultId: string): ToggleVaultStarResult {
    const k = keyOf(ownerAddress, vaultId);
    const next = new Set(store.get());
    if (next.has(k)) {
        next.delete(k);
        store.set(next);
        return 'unstarred';
    }
    next.add(k);
    store.set(next);
    return 'starred';
}

export function subscribeVaultStars(cb: (keys: ReadonlySet<string>) => void): () => void {
    return store.subscribe(cb);
}
