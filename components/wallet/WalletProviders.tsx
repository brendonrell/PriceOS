'use client';

/*
 * WalletProviders — top-of-tree client wrapper for the wallet stack.
 *
 * AUTH FLOW (post-rewrite: auto-sign on connect, sticky session)
 *
 *   POPUPS BACK-TO-BACK
 *   1. User taps any connect surface → RK modal opens.
 *   2. User picks a wallet → wagmi connector fires; status flips
 *      'disconnected' → 'connecting'. Our prefetch effect kicks off
 *      a POST /api/auth/nonce in parallel with the wallet's
 *      approval handshake. By the time the user approves in their
 *      wallet, the nonce is in hand — no server roundtrip in the
 *      gap between popup 1 and popup 2.
 *   3. Wallet returns → wagmi flips 'connecting' → 'connected'.
 *      autoSign() fires: builds the SIWE message with the pre-
 *      fetched nonce, pre-fires the iOS-Safari wallet deep-link
 *      (best-effort), and calls wagmi.signMessageAsync. Because the
 *      WC session is still hot from the connect step and the
 *      wallet hasn't yet had time to bounce back to Safari, most
 *      wallets render the sign prompt inside the same wallet
 *      session — user sees popup 1 (connect) and popup 2 (sign)
 *      back-to-back without leaving the wallet UI.
 *   4. User signs → wagmi returns signature → POST /api/auth/siwe
 *      → address persisted in iron-session cookie, local state
 *      flips to authenticated.
 *
 *   STICKY SIWE SESSION
 *   The SIWE cookie is the source of truth for "logged in". It
 *   only clears on:
 *     a. Explicit user logout via signOutFull()
 *     b. Address mismatch (security — wagmi connects to a
 *        different address than the one tied to the signed session)
 *     c. Server-side TTL expiry (14 days, refreshed on every
 *        session.save() touch)
 *
 *   Wagmi connection state is NOT a signal to clear SIWE. If the
 *   wallet disconnects (WalletConnect drops on iOS Safari refresh,
 *   user kills the wallet app, mobile loses network), the SIWE
 *   cookie persists and the UI continues to show the user as
 *   authenticated. Wallet-bound surfaces can prompt for a reconnect
 *   when the user attempts a tx-signing action; read-only views
 *   stay lit from the SIWE address.
 *
 *   This decouples "identity" from "connection". Identity is
 *   server-state, persistent, only torn down on explicit logout.
 *   Connection is wallet-state, ephemeral, restored on-demand.
 *
 *   The previous shipped logic cleared the iron-session on wagmi
 *   'disconnected' (gated by a prev-status ref intended to ignore
 *   the initial 'reconnecting' → 'disconnected' transition). The
 *   guard worked for that one path but missed another: when
 *   cookieToInitialState boots wagmi with status='connected'
 *   synchronously from the cookie, the FIRST observed status is
 *   'connected'; if WC then fails to restore and drops to
 *   'disconnected', prev='connected' falls through the guard and
 *   the SIWE cookie gets destroyed. The fix below removes the
 *   wagmi-driven sign-out path entirely rather than chasing every
 *   transition the disconnect can arrive via.
 *
 *   Differences from the previous shipped flow:
 *     - No RainbowKitAuthenticationProvider, no SIWE adapter, no
 *       intermediate "Verify your account" modal step.
 *     - Nonce fetch is pre-positioned during 'connecting', not
 *       blocking after 'connected'.
 *     - signMessageAsync is called directly via wagmi, not routed
 *       through RK's adapter.
 *     - Wagmi 'disconnected' transitions no longer clear the SIWE
 *       cookie. SIWE survives any wagmi state change short of an
 *       explicit signOut or an address swap.
 *
 * SERVER-SIDE HYDRATION (unchanged shape from prior build)
 *   - `initialState` is wagmi's connection state from this
 *     request's cookie header (cookieToInitialState in layout).
 *   - `initialAuth` is the SIWE address from this request's
 *     iron-session cookie (getSession in layout).
 *
 * INNER PROVIDERS' JOB
 *   - holds React state for `siweAddress` and a phase flag
 *     ('hydrating' | 'idle' | 'signing' | 'authenticated')
 *   - prefetches the nonce when wagmi enters 'connecting'
 *   - fires autoSign() on the 'connecting' → 'connected' transition
 *     (user-initiated path; the 'reconnecting' → 'connected'
 *     cookie-restore path does NOT auto-sign)
 *   - watches for address swaps and clears SIWE when the connected
 *     address stops matching the signed-in address
 *   - exposes the Auth context to consumers via AuthProvider
 */

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import {
    useAccount,
    useChainId,
    useDisconnect,
    useSignMessage,
    WagmiProvider,
    type State as WagmiState,
} from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '../../lib/wallet/wagmiConfig';
import {
    buildSiweMessage,
    fetchNonce,
    isIosBrowser,
    serverSignOut,
    verifySignature,
    wakeWalletForSignStep,
} from '../../lib/wallet/siweClient';
import { AuthContextProvider } from '../../lib/state/AuthContext';

interface WalletProvidersProps {
    children: ReactNode;
    /** Hydrated wagmi state from server-side cookie read in layout.tsx
        via `cookieToInitialState(wagmiConfig, cookieHeader)`. */
    initialState?: WagmiState;
    /** Lowercased SIWE address from server-side iron-session read in
        layout.tsx via `getSession()`. `null` = server confirms no
        session; `undefined` = layout didn't supply (fall back to
        client-side GET on mount). */
    initialAuth?: string | null;
}

export function WalletProviders({
    children,
    initialState,
    initialAuth,
}: WalletProvidersProps) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={wagmiConfig} initialState={initialState}>
            <QueryClientProvider client={queryClient}>
                <InnerProviders initialAuth={initialAuth}>
                    {children}
                </InnerProviders>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

type AuthPhase =
    /** Initial cookie hydration GET in flight (fallback path only —
        with layout-supplied initialAuth this state never appears). */
    | 'hydrating'
    /** No SIWE session, not currently signing. */
    | 'idle'
    /** SIWE signature request in flight. */
    | 'signing'
    /** SIWE session active. */
    | 'authenticated';

interface InnerProvidersProps {
    children: ReactNode;
    initialAuth?: string | null;
}

function InnerProviders({ children, initialAuth }: InnerProvidersProps) {
    const { address, status: wagmiStatus } = useAccount();
    const { disconnect } = useDisconnect();
    const { signMessageAsync } = useSignMessage();
    const chainId = useChainId();

    /* Server-supplied auth means we already know the answer at first
       render. `undefined` = fall back to the legacy GET-on-mount
       path (defensive — env-var failure path, legacy callers). */
    const hasServerAuth = initialAuth !== undefined;

    const [phase, setPhase] = useState<AuthPhase>(() => {
        if (!hasServerAuth) return 'hydrating';
        return initialAuth ? 'authenticated' : 'idle';
    });
    const [siweAddress, setSiweAddress] = useState<string | null>(() =>
        hasServerAuth ? initialAuth ?? null : null
    );

    /* Fallback hydration. Only runs when the layout didn't pass
       initialAuth. With layout wired correctly this branch is dead
       code. */
    useEffect(() => {
        if (hasServerAuth) return;
        let cancelled = false;
        fetch('/api/auth/siwe', {
            method: 'GET',
            credentials: 'same-origin',
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                if (data && typeof data.address === 'string') {
                    setSiweAddress(data.address.toLowerCase());
                    setPhase('authenticated');
                } else {
                    setPhase('idle');
                }
            })
            .catch(() => {
                if (!cancelled) setPhase('idle');
            });
        return () => {
            cancelled = true;
        };
    }, [hasServerAuth]);

    /* Nonce prefetch. When wagmi enters 'connecting' (user-initiated
       connect — distinct from 'reconnecting' which is the auto
       cookie-restore path) we fire a POST /api/auth/nonce in
       parallel with the wallet's connection handshake. By the time
       wagmi flips to 'connected', the nonce is in hand and autoSign
       can build + sign the SIWE message without a blocking server
       roundtrip in the gap.

       Stored in a ref because we want fire-and-forget, single
       in-flight at a time, no re-render on resolve. The promise is
       consumed by autoSign() below; if it's missing or rejects,
       autoSign falls back to fetching a fresh nonce inline.

       Reset on 'disconnected' so a subsequent connection attempt
       re-fetches. Nonces are single-use server-side so an unused
       prefetch is harmless to leave behind — but resetting keeps
       the ref's lifecycle obvious. */
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

    /* autoSign — runs the SIWE round-trip and resolves to either
       'authenticated' (success) or 'idle' (failure, with wagmi
       disconnect to clear the partially-authed state). The
       transition watcher below decides when to call this. */
    const inFlightSignRef = useRef(false);
    const autoSign = useCallback(async () => {
        if (inFlightSignRef.current) return;
        if (!address) return;
        const targetAddress = address;
        const targetChainId = chainId;
        inFlightSignRef.current = true;
        setPhase('signing');
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

            /* iOS Safari deep-link pre-fire — best-effort. Gesture
               lineage is weaker here than in the previous "user
               taps Verify" anchor (we're in a useEffect, not a
               click handler), but the user JUST returned from
               approving connection in the wallet and iOS Safari
               grants post-deep-link returns a brief gesture credit
               window. When it works, the wallet stays foregrounded
               and the sign prompt appears in the same session
               without a Safari bounce. When it doesn't, WC's own
               redirect can still run downstream. */
            if (isIosBrowser()) {
                wakeWalletForSignStep();
            }

            const signature = await signMessageAsync({ message });
            const verifiedAddress = await verifySignature(message, signature);
            if (!verifiedAddress) {
                throw new Error('SIWE verification failed');
            }
            setSiweAddress(verifiedAddress);
            setPhase('authenticated');
        } catch {
            /* Sign rejected, network failed, or verify rejected.
               Drop wagmi connection so the user lands back at a
               clean disconnected state — they can re-tap connect
               to retry. Leaving them connected-without-SIWE would
               create a partially-authed state the UI doesn't have
               a clear shape for and contradicts the "finish auth
               on connect" stance. */
            try {
                disconnect();
            } catch {
                /* swallow */
            }
            setSiweAddress(null);
            setPhase('idle');
        } finally {
            inFlightSignRef.current = false;
        }
    }, [address, chainId, disconnect, signMessageAsync]);

    /* Combined wagmi-state watcher. Two branches:

         1. Address swap: wagmi is 'connected' with an address that
            doesn't match siweAddress → serverSignOut + clear local.
            Fires regardless of how we got into 'connected' (user
            initiated or cookie restore). Security: a stale SIWE
            for the old address must not authorize requests as the
            new address.

         2. User-initiated connect: prev wagmi status was
            'connecting' and current is 'connected' → autoSign if
            no SIWE for this address yet. The 'reconnecting' →
            'connected' cookie-restore path does NOT fire autoSign
            (the user didn't actively log in; they just refreshed
            with a still-valid wagmi cookie).

       Notably absent: any wagmi 'disconnected' branch. SIWE is
       sticky against wagmi state changes. The wallet section can
       prompt for a reconnect when a tx-signing action requires
       one; identity stays lit until explicit signOut or address
       swap.

       prevWagmiStatusRef is the transition oracle. Initial mount
       starts undefined; first observation sets it without firing
       any branch. */
    const prevWagmiStatusRef = useRef<typeof wagmiStatus | undefined>(undefined);
    useEffect(() => {
        const prev = prevWagmiStatusRef.current;
        prevWagmiStatusRef.current = wagmiStatus;

        // Branch 1: address swap.
        if (
            wagmiStatus === 'connected' &&
            address &&
            siweAddress &&
            address.toLowerCase() !== siweAddress
        ) {
            void serverSignOut().finally(() => {
                setSiweAddress(null);
                setPhase('idle');
            });
            return;
        }

        // Branch 2: user-initiated connect → autoSign.
        if (
            prev === 'connecting' &&
            wagmiStatus === 'connected' &&
            address &&
            phase !== 'signing'
        ) {
            const lowercased = address.toLowerCase();
            if (siweAddress !== lowercased) {
                void autoSign();
            }
            return;
        }

        /* All other transitions — including 'connected' →
           'disconnected', 'reconnecting' → 'disconnected',
           'reconnecting' → 'connected', 'connected' → 'reconnecting'
           — are no-ops for SIWE state. The iron-session cookie
           lives or dies on its own server-side TTL plus the two
           branches above. */
    }, [wagmiStatus, address, phase, siweAddress, autoSign]);

    /* Full sign-out: server cookie + local state + wagmi
       disconnect. The only path (alongside address swap) that
       clears SIWE. Order matters: setPhase('idle') before
       disconnect() so a subsequent state-watcher run sees a
       non-authenticated phase and doesn't try to react. */
    const signOutFull = useCallback(async () => {
        await serverSignOut();
        setSiweAddress(null);
        setPhase('idle');
        try {
            disconnect();
        } catch {
            /* swallow — wallet might already be gone */
        }
    }, [disconnect]);

    /* isAuthenticating semantic: true during initial cookie
       hydration AND during an in-flight sign request, so connect
       surfaces can show a spinner / disable themselves while the
       auto-sign cycle resolves. */
    const isAuthenticating = phase === 'hydrating' || phase === 'signing';

    return (
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
            <AuthContextProvider
                siweAddress={siweAddress}
                isAuthenticating={isAuthenticating}
                signOut={signOutFull}
            >
                {children}
            </AuthContextProvider>
        </RainbowKitProvider>
    );
}
