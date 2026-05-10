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
 * `InnerProviders` is the brain. It:
 *   - holds React state for `status` (RainbowKit's auth status enum:
 *     loading | authenticated | unauthenticated) and `siweAddress`
 *   - hydrates that state on mount via GET /api/auth/siwe
 *   - constructs the RainbowKit auth adapter with closure callbacks
 *     that flip the local state when a sign succeeds or sign-out fires
 *   - watches wagmi's connection state and signs the user out when
 *     they disconnect or swap addresses (server cookie + local state)
 *   - exposes the Auth context to consumers via AuthProvider
 *
 * The `initialState` prop comes from the layout's server component
 * (read from cookies via `cookieToInitialState`). Pre-populating
 * wagmi's state on first paint avoids the disconnected-flash that
 * normally happens before localStorage rehydration. With cookieStorage
 * configured in wagmiConfig, this round-trip is server-readable.
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
    /** Hydrated wagmi state from server-side cookie read in layout.tsx.
        Lets the first paint already show wagmi as connected if a valid
        session cookie exists, instead of flashing disconnected. */
    initialState?: WagmiState;
}

export function WalletProviders({
    children,
    initialState,
}: WalletProvidersProps) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={wagmiConfig} initialState={initialState}>
            <QueryClientProvider client={queryClient}>
                <InnerProviders>{children}</InnerProviders>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

function InnerProviders({ children }: { children: ReactNode }) {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    /* RainbowKit auth status — `loading` until the hydration GET
       resolves, then `authenticated` (cookie valid) or `unauthenticated`
       (no cookie). RainbowKit reads this and gates the modal flow. */
    const [status, setStatus] = useState<AuthenticationStatus>('loading');
    const [siweAddress, setSiweAddress] = useState<string | null>(null);

    /* Hydrate from server on mount. Server returns { address: null }
       when no cookie is present (200, not 401). Flip status either way
       so the modal isn't stuck on `loading` forever. */
    useEffect(() => {
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
    }, []);

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

    /* If wagmi disconnects (or address swaps), drop the SIWE session
       too — leaving the cookie around after a wallet swap would let a
       different account's session leak forward. Best-effort delete + 
       wagmi disconnect already handled inside `signOutFull` below. */
    useEffect(() => {
        if (status !== 'authenticated') return;
        if (!isConnected) {
            // Wallet went away — clear server + local state.
            void serverSignOut().finally(() => {
                setSiweAddress(null);
                setStatus('unauthenticated');
            });
            return;
        }
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
    }, [isConnected, address, status, siweAddress]);

    /* Full sign-out: server cookie + wagmi disconnect + local state.
       Exposed to children via AuthContext so LinksView's Log Out can
       call it. */
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
