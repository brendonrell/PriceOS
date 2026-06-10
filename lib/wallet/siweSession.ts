'use client';

/*
 * siweSession — session-cookie helpers with ZERO heavy imports.
 *
 * Split out of siweClient.ts in the 2026-06-10 perf batch: siweClient
 * imports the `siwe` package (which transitively bundles a full copy of
 * ethers v5 — most of a megabyte), and the eager WalletProviders only
 * ever needed serverSignOut, a bare fetch. Keeping the cookie helpers
 * here lets the entire siwe + ethers payload defer with WalletStack
 * instead of riding in every page's first load.
 *
 * Add session-cookie-only helpers here; anything that touches message
 * building / signature shapes belongs in siweClient (deferred side).
 */

export async function serverSignOut(): Promise<void> {
    try {
        await fetch('/api/auth/siwe', {
            method: 'DELETE',
            credentials: 'same-origin',
        });
    } catch {
        /* swallow — best effort */
    }
}
