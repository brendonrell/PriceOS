/*
 * PD Studio — private-layer access (Sticker Studio + God Mode).
 * Spec lives in ClickUp ONLY (Brendon, 2026-07-10) — this file is gating
 * mechanics, not documentation.
 *
 * Seed = Brendon (pricediscussion.eth). God Mode can add backup wallets;
 * v1 additions persist per-device (localStorage) until the server store
 * lands. Visibility gating only — the real security on sticker publishing
 * is the wallet signature + the on-chain admin check.
 */

import type { Address } from 'viem';

export const STUDIO_ACCESS_SEED: readonly string[] = [
    '0x146034ec25C277F30f63933B151297689E15B9B8', // pricediscussion.eth
];

const STORE_KEY = 'pd-studio-access-v1';

export function loadAccessList(): string[] {
    let extra: string[] = [];
    if (typeof window !== 'undefined') {
        try {
            const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
            if (Array.isArray(raw)) extra = raw.filter((x) => typeof x === 'string');
        } catch { /* corrupt store reads as empty */ }
    }
    const all = [...STUDIO_ACCESS_SEED, ...extra];
    return all.filter((a, i) => all.findIndex((b) => b.toLowerCase() === a.toLowerCase()) === i);
}

export function addAccessWallet(addr: string): string[] {
    const extra = loadAccessList().filter(
        (a) => !STUDIO_ACCESS_SEED.some((s) => s.toLowerCase() === a.toLowerCase())
    );
    if (!loadAccessList().some((a) => a.toLowerCase() === addr.toLowerCase())) extra.push(addr);
    localStorage.setItem(STORE_KEY, JSON.stringify(extra));
    return loadAccessList();
}

export function removeAccessWallet(addr: string): string[] {
    // Seed wallets can't be removed — Brendon is never locked out.
    const extra = loadAccessList()
        .filter((a) => !STUDIO_ACCESS_SEED.some((s) => s.toLowerCase() === a.toLowerCase()))
        .filter((a) => a.toLowerCase() !== addr.toLowerCase());
    localStorage.setItem(STORE_KEY, JSON.stringify(extra));
    return loadAccessList();
}

export function hasStudioAccess(addr: Address | string | undefined): boolean {
    if (!addr) return false;
    return loadAccessList().some((a) => a.toLowerCase() === addr.toLowerCase());
}
