'use client';

/*
 * getWalletClientOnDemand — action-time wallet client for surfaces that
 * live OUTSIDE the deferred WagmiProvider.
 *
 * The provider mounts as a SIBLING of the app tree (WalletStack, deferred
 * chunk — see components/wallet/WalletStack.tsx), so any render-time
 * `useWalletClient()` in the app tree throws WagmiProviderNotFoundError.
 * On the server that failed EVERY page's SSR (each response became a 500
 * the browser then repaired client-side — found 2026-07-03 chasing the
 * desktop home crash); on the client those hooks could never return a
 * wallet either. Market surfaces call this inside their tap handlers
 * instead: by then the deferred stack chunk is resident (idle-load after
 * paint), so both dynamic imports resolve from cache and add no weight to
 * the main bundle.
 *
 * Returns undefined when no wallet is connected — the same shape the
 * engine calls already accept for `wallet:`.
 */
import type { GetWalletClientReturnType } from '@wagmi/core';

export async function getWalletClientOnDemand(): Promise<
    GetWalletClientReturnType | undefined
> {
    try {
        const [{ getWalletClient }, { wagmiConfig }] = await Promise.all([
            import('@wagmi/core'),
            import('./wagmiConfig'),
        ]);
        return await getWalletClient(wagmiConfig);
    } catch {
        /* Not connected (ConnectorNotConnectedError) or stack unavailable —
           engines surface their own "connect wallet" error downstream. */
        return undefined;
    }
}
