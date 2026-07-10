'use client';

/*
 * WalletStack — the DEFERRED half of the wallet stack (perf batch
 * 2026-06-10). Everything that pulls wagmi / RainbowKit / the connector
 * SDKs (WalletConnect, MetaMask, Coinbase — the ~1.2MB chunk) lives behind
 * this module's dynamic import. WalletProviders (the eager half) mounts it
 * as a SIBLING of the app tree on first idle after paint, or immediately
 * when the user taps a connect surface — see lib/wallet/walletBus.ts for
 * the seam.
 *
 * Division of labour after the split:
 *
 *   WalletProviders (eager, ships in the first load)
 *     - owns the auth state machine state: siweAddress / phase / userRow
 *     - everything that never needed wagmi: SIWE cookie hydration,
 *       user-row fetch, account-state hydration (fetchMe), sprite
 *       identity, ENS prefetch engine, AccountCreateModal, AuthContext
 *
 *   WalletStack (this file, deferred)
 *     - WagmiProvider (cookie initialState) + react-query + RainbowKit
 *     - nonce prefetch on 'connecting', autoSign (SIWE round-trip),
 *       address-swap watch, SignInModal (needs live wagmi status)
 *     - publishes the RK connect-modal opener + wagmi disconnect + the
 *       ENS name for the signed-in address onto the walletBus
 *
 * State transitions flow UP through callback props (the parent owns the
 * state); wagmi/RK capabilities flow OUT through the bus (consumers are
 * deep in the app tree). The RainbowKit modal renders through a portal,
 * so living outside the app subtree changes nothing visually.
 *
 * Timing note: wagmi's cookie-restore (and therefore the SignInModal for
 * a connected-but-unsigned wallet, and ENS resolution) now starts when
 * this chunk mounts — first idle after paint — instead of at hydration.
 * Identity (SIWE) was already decoupled from connection and ships with
 * the server HTML, so signed-in UI is unaffected.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    useAccount,
    useChainId,
    useDisconnect,
    useEnsName,
    useSignMessage,
    WagmiProvider,
    type State as WagmiState,
} from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { darkTheme, RainbowKitProvider, useConnectModal } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '../../lib/wallet/wagmiConfig';
import {
    buildSiweMessage,
    fetchNonce,
    isIosBrowser,
    verifySignature,
    wakeWalletForSignStep,
} from '../../lib/wallet/siweClient';
import {
    registerConnectModalOpener,
    registerWalletDisconnect,
    registerWalletEthCall,
    registerWalletSignMessage,
    setWalletEnsName,
} from '../../lib/wallet/walletBus';
import { CHAIN_ID } from '../../lib/market/chain';
import { SignInModal } from './SignInModal';

export interface WalletStackProps {
    /** Hydrated wagmi state from the server-side cookie read in layout.tsx,
        forwarded by WalletProviders. */
    initialState?: WagmiState;
    /** Current SIWE identity (parent-owned). */
    siweAddress: string | null;
    /** True during the parent's initial cookie hydration — gates the
        SignInModal exactly as the pre-split phase check did. */
    hydrating: boolean;
    /** True while a signature request is in flight (parent-owned 'signing'
        phase) — drives the modal's button/disable state. */
    signing: boolean;
    /** Parent setters — the auth state machine lives in WalletProviders. */
    onSigning: () => void;
    onSigned: (address: string) => void;
    onSignFailed: () => void;
    /** Connected wagmi address stopped matching the SIWE identity —
        parent runs serverSignOut + clears local state. */
    onAddressSwap: () => void;
}

export default function WalletStack(props: WalletStackProps) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={wagmiConfig} initialState={props.initialState}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#FF0055',
                        accentColorForeground: '#ffffff',
                        borderRadius: 'small',
                        fontStack: 'system',
                    })}
                    appInfo={{ appName: 'Price Discussion' }}
                    modalSize="compact"
                >
                    <StackController {...props} />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

function StackController({
    siweAddress,
    hydrating,
    signing,
    onSigning,
    onSigned,
    onSignFailed,
    onAddressSwap,
}: WalletStackProps) {
    const { address, status: wagmiStatus, chainId: walletChainId, connector } = useAccount();
    const { disconnect } = useDisconnect();
    const { signMessageAsync } = useSignMessage();
    const chainId = useChainId();
    const { openConnectModal } = useConnectModal();

    /* Publish the RK connect-modal opener to the bus. RK hands back
       undefined while its modal is already open; keep the bus in sync so
       a queued tap never lands on a stale closure. */
    useEffect(() => {
        registerConnectModalOpener(openConnectModal ?? null);
        return () => registerConnectModalOpener(null);
    }, [openConnectModal]);

    /* Publish wagmi's disconnect for the parent's sign-out path. */
    useEffect(() => {
        registerWalletDisconnect(() => {
            try {
                disconnect();
            } catch {
                /* swallow — wallet might already be gone */
            }
        });
        return () => registerWalletDisconnect(null);
    }, [disconnect]);

    /* Forever-free RPC pass (2026-07-10): publish the connected wallet's own
       provider as a read-only eth_call on the bus. Guarded on the wallet
       actually being ON the app's chain — an injected wallet parked on
       another network would answer eth_call against THAT chain and hand
       back garbage for our contracts, so wrong-chain sessions simply don't
       register and consumers fall back to the cached Worker route. The
       registration clears on disconnect/chain-switch via the effect cleanup. */
    useEffect(() => {
        if (wagmiStatus !== 'connected' || !connector || walletChainId !== CHAIN_ID) return;
        registerWalletEthCall(async (to, data) => {
            const provider = (await connector.getProvider()) as {
                request: (args: { method: string; params?: unknown }) => Promise<unknown>;
            };
            const result = await provider.request({
                method: 'eth_call',
                params: [{ to, data }, 'latest'],
            });
            if (typeof result !== 'string') throw new Error('Bad eth_call result');
            return result;
        });
        return () => registerWalletEthCall(null);
    }, [wagmiStatus, connector, walletChainId]);

    /* Personal-message signer on the bus (Sticker Studio package approval).
       A personal signature carries no chain, so this gates only on the
       wallet being connected; cleared on disconnect via the cleanup. */
    useEffect(() => {
        if (wagmiStatus !== 'connected') return;
        registerWalletSignMessage((message) => signMessageAsync({ message }));
        return () => registerWalletSignMessage(null);
    }, [wagmiStatus, signMessageAsync]);

    /* ENS resolution for the SIWE identity — same useEnsName call
       UserMenuButtons made before the split (mainnet-pinned; ENS lives on
       chainId 1 regardless of the connected chain; react-query caches it).
       Published to the bus; the pill's shortAddr fallback covers the
       pre-resolve window exactly as it did before. */
    const { data: ensName } = useEnsName({
        address: siweAddress ? (siweAddress as `0x${string}`) : undefined,
        chainId: 1,
        query: { enabled: !!siweAddress },
    });
    useEffect(() => {
        setWalletEnsName(ensName ?? null);
        return () => setWalletEnsName(null);
    }, [ensName]);

    /* Nonce prefetch. When wagmi enters 'connecting' (user-initiated
       connect — distinct from 'reconnecting' which is the auto
       cookie-restore path) we fire a POST /api/auth/nonce in parallel
       with the wallet's connection handshake. By the time wagmi flips to
       'connected', the nonce is in hand and autoSign can build + sign the
       SIWE message without a blocking server roundtrip in the gap.

       Stored in a ref because we want fire-and-forget, single in-flight
       at a time, no re-render on resolve. Consumed by autoSign(); if
       missing or rejected, autoSign falls back to fetching inline. Reset
       on 'disconnected' so a subsequent attempt re-fetches (nonces are
       single-use server-side; an unused prefetch is harmless). */
    const noncePromiseRef = useRef<Promise<string> | null>(null);
    useEffect(() => {
        if (wagmiStatus === 'connecting' && !noncePromiseRef.current) {
            noncePromiseRef.current = fetchNonce().catch((e) => {
                noncePromiseRef.current = null;
                throw e;
            });
        }
        if (wagmiStatus === 'disconnected') {
            noncePromiseRef.current = null;
        }
    }, [wagmiStatus]);

    /* autoSign — runs the SIWE round-trip; resolves to parent-state
       'authenticated' (onSigned) or 'idle' (onSignFailed). Anchored to the
       SignInModal's Sign button (gesture lineage — see SignInModal docs).
       Logic verbatim from the pre-split InnerProviders. */
    const inFlightSignRef = useRef(false);
    const autoSign = useCallback(async () => {
        if (inFlightSignRef.current) return;
        if (!address) return;
        const targetAddress = address;
        const targetChainId = chainId;
        inFlightSignRef.current = true;
        onSigning();
        try {
            let nonce: string;
            try {
                nonce = noncePromiseRef.current
                    ? await noncePromiseRef.current
                    : await fetchNonce();
            } catch {
                nonce = await fetchNonce();
            }
            noncePromiseRef.current = null;

            const message = buildSiweMessage({
                address: targetAddress,
                chainId: targetChainId,
                nonce,
            });

            /* iOS Safari deep-link pre-fire — best-effort. The user just
               returned from approving the connection in the wallet, and
               iOS grants post-deep-link returns a brief gesture credit
               window. When it works the wallet stays foregrounded and the
               sign prompt lands in the same session; when it doesn't,
               WC's own redirect still runs downstream. */
            if (isIosBrowser()) {
                wakeWalletForSignStep();
            }

            const signature = await signMessageAsync({ message });
            const verifiedAddress = await verifySignature(message, signature);
            if (!verifiedAddress) {
                throw new Error('SIWE verification failed');
            }
            onSigned(verifiedAddress);
        } catch {
            /* Sign rejected, network failed, or verify rejected. Drop back
               to 'idle' but DO NOT disconnect wagmi — the SignInModal stays
               open (keyed off connected-and-not-signed) so the user can tap
               Sign again without re-running the connect flow. Cancel is the
               explicit path back to disconnected. */
            onSignFailed();
        } finally {
            inFlightSignRef.current = false;
        }
    }, [address, chainId, signMessageAsync, onSigning, onSigned, onSignFailed]);

    /* Wagmi-state watcher — address swap only. Wagmi 'connected' with an
       address that doesn't match siweAddress → parent signs out server-
       side and clears local state. Fires regardless of how 'connected'
       was reached (user-initiated or cookie restore). Security: a stale
       SIWE for the old address must not authorize requests as the new
       one. All other transitions are no-ops — identity is sticky against
       wagmi state changes (see WalletProviders docs). */
    useEffect(() => {
        if (
            wagmiStatus === 'connected' &&
            address &&
            siweAddress &&
            address.toLowerCase() !== siweAddress
        ) {
            onAddressSwap();
        }
    }, [wagmiStatus, address, siweAddress, onAddressSwap]);

    /* SignInModal is visible when wagmi has a connected address but no
       SIWE session yet, AND we're past the initial cookie hydration (so
       it doesn't flash during the auth-cookie GET). The address-swap
       branch clears siweAddress upstream, which re-opens this modal so
       the user can sign in as the new identity without reconnecting. */
    const signInModalOpen =
        wagmiStatus === 'connected' && !!address && !siweAddress && !hydrating;

    const handleSignInCancel = useCallback(() => {
        try {
            disconnect();
        } catch {
            /* swallow — wallet might already be gone */
        }
        onSignFailed();
    }, [disconnect, onSignFailed]);

    return (
        <SignInModal
            open={signInModalOpen}
            address={address ?? null}
            signing={signing}
            onSign={() => {
                void autoSign();
            }}
            onCancel={handleSignInCancel}
        />
    );
}
