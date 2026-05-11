'use client';

/*
 * WalletProviders — top-of-tree client wrapper for the wallet stack.
 *
 * Two-layer structure because hooks like `useDisconnect` and
 * `useAccount` require WagmiProvider as an ancestor:
 *
 *   <WagmiProvider>
 *     <QueryClientProvider>
 *       <InnerProviders>          ← uses wagmi hooks + holds auth state
 *         <RainbowKitAuthenticationProvider>
 *           <RainbowKitProvider>
 *             <AuthContext.Provider>
 *               {children}
 *
 * Server-side hydration (both layers):
 *
 *   - `initialState` is wagmi's connection state, parsed from this
 *     request's cookie header by `cookieToInitialState` in layout.tsx.
 *     Pre-populating WagmiProvider with it means the first paint shows
 *     the user as connected if their wagmi.store cookie says so —
 *     instead of flashing disconnected before client-side cookie
 *     rehydration runs.
 *
 *   - `initialAuth` is the SIWE address read from this request's
 *     iron-session cookie by `getSession()` in layout.tsx. When the
 *     layout supplied it, InnerProviders boots straight to
 *     `authenticated`/`unauthenticated` and skips the hydration GET
 *     entirely — that GET was always going to ask the same cookie the
 *     server just answered. When `initialAuth === undefined` (legacy
 *     callers, or env-var failure path), InnerProviders falls back to
 *     the GET-on-mount behavior.
 *
 * InnerProviders' job:
 *   - holds React state for `status` (RainbowKit's auth status enum:
 *     loading | authenticated | unauthenticated) and `siweAddress`
 *   - constructs the RainbowKit auth adapter with closure callbacks
 *     that flip the local state when a sign succeeds or sign-out fires
 *   - watches wagmi's connection state and signs the user out when
 *     they disconnect or swap addresses (server cookie + local state)
 *   - exposes the Auth context to consumers via AuthProvider
 */

import {
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    useAccount,
    useDisconnect,
    WagmiProvider,
    type State as WagmiState,
} from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    darkTheme,
    RainbowKitAuthenticationProvider,
    RainbowKitProvider,
    type AuthenticationStatus,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from '../../lib/wallet/wagmiConfig';
import { createAuthAdapter } from '../../lib/wallet/authAdapter';
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

interface InnerProvidersProps {
    children: ReactNode;
    initialAuth?: string | null;
}

function InnerProviders({ children, initialAuth }: InnerProvidersProps) {
    /* wagmi v2's `useAccount` surfaces `status` as an explicit state
       machine: 'reconnecting' | 'connecting' | 'connected' | 'disconnected'.
       The disconnect-watcher below reads `status` instead of `isConnected`
       so it can distinguish "wallet is gone" from "wallet hasn't finished
       hydrating yet" — see the comment on that effect for the full story. */
    const { address, status: wagmiStatus } = useAccount();
    const { disconnect } = useDisconnect();

    /* Server-supplied auth means we already know the answer at first
       render. `undefined` = fall back to the legacy GET-on-mount path. */
    const hasServerAuth = initialAuth !== undefined;

    /* RainbowKit auth status. With server props we boot straight into
       a final state — no `loading` flicker, no race against the GET
       round-trip. Without them, boot to `loading` and let the
       fallback effect resolve it. */
    const [status, setStatus] = useState<AuthenticationStatus>(() => {
        if (!hasServerAuth) return 'loading';
        return initialAuth ? 'authenticated' : 'unauthenticated';
    });
    const [siweAddress, setSiweAddress] = useState<string | null>(() =>
        hasServerAuth ? initialAuth ?? null : null
    );

    /* Fallback hydration. Only runs when the layout didn't pass
       initialAuth (defensive — env-var failure path, legacy callers).
       With layout wired correctly this branch is dead code. */
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
                    setStatus('authenticated');
                } else {
                    setStatus('unauthenticated');
                }
            })
            .catch(() => {
                if (!cancelled) setStatus('unauthenticated');
            });
        return () => {
            cancelled = true;
        };
    }, [hasServerAuth]);

    /* RainbowKit auth adapter, built once per mount. Closure callbacks
       flip the local state when verify() succeeds or signOut() fires. */
    const authAdapter = useMemo(
        () =>
            createAuthAdapter({
                onAuthenticated: (addr) => {
                    setSiweAddress(addr);
                    setStatus('authenticated');
                },
                onSignedOut: () => {
                    setSiweAddress(null);
                    setStatus('unauthenticated');
                },
            }),
        []
    );

    /* If wagmi reports the wallet is gone (or the address swaps), drop
       the SIWE session too — leaving the cookie around after a wallet
       swap would let a different account's session leak forward.

       CRITICAL: we read wagmi's `status` rather than `isConnected`. On
       every mount wagmi runs a `reconnect()` cycle even when SSR
       pre-populated `initialState` from cookieStorage; during that
       cycle `status === 'reconnecting'` and `isConnected === false`
       briefly. The layout's server-side iron-session read can
       independently boot us with `status === 'authenticated'` at the
       same moment (the SIWE cookie and the wagmi cookie are
       independent — one can be valid while the other is rehydrating).
       Earlier shipped code used `if (!isConnected) serverSignOut()`,
       which fired during that window and DELETE'd a perfectly good
       session — the user landed on the page logged-in, watched a
       silent sign-out happen, and saw the connect modal again. That
       was Brendon's #1 dapp pet peeve.

       The guard: bail while wagmi is still resolving ('reconnecting'
       or 'connecting'). Only act on 'disconnected' (terminal-no-wallet)
       or 'connected' (steady-state — check address swap). The
       `status === 'authenticated'` early-return at the top still
       prevents redundant DELETEs when signOutFull already flipped
       local state to 'unauthenticated'. */
    useEffect(() => {
        if (status !== 'authenticated') return;
        if (wagmiStatus === 'reconnecting' || wagmiStatus === 'connecting') return;
        if (wagmiStatus === 'disconnected') {
            // Wallet went away — clear server + local state.
            void serverSignOut().finally(() => {
                setSiweAddress(null);
                setStatus('unauthenticated');
            });
            return;
        }
        // 'connected' — check address swap.
        if (
            address &&
            siweAddress &&
            address.toLowerCase() !== siweAddress
        ) {
            // Address swapped — invalidate session.
            void serverSignOut().finally(() => {
                setSiweAddress(null);
                setStatus('unauthenticated');
            });
        }
    }, [wagmiStatus, address, status, siweAddress]);

    /* Full sign-out: server cookie + local state + wagmi disconnect.
       Order matters: setStatus('unauthenticated') before disconnect()
       so that the watcher useEffect above sees status !== 'authenticated'
       on its next run (driven by the wagmiStatus flip) and early-
       returns instead of issuing a redundant second DELETE. */
    const signOutFull = async () => {
        await serverSignOut();
        setSiweAddress(null);
        setStatus('unauthenticated');
        try {
            disconnect();
        } catch {
            /* swallow — wallet might already be gone */
        }
    };

    const isAuthenticating = status === 'loading';

    return (
        <RainbowKitAuthenticationProvider
            adapter={authAdapter}
            status={status}
        >
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
        </RainbowKitAuthenticationProvider>
    );
}

/* DELETE the iron-session cookie. Used in the disconnect-watcher
   useEffect (where we don't also want to call wagmi.disconnect) and
   inside signOutFull (which does). */
async function serverSignOut(): Promise<void> {
    try {
        await fetch('/api/auth/siwe', {
            method: 'DELETE',
            credentials: 'same-origin',
        });
    } catch {
        /* swallow — best effort */
    }
}
