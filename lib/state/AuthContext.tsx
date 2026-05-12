'use client';

/*
 * AuthContext — passthrough provider exposing SIWE session state to
 * the rest of the app.
 *
 * The state itself (`siweAddress`, phase, etc.) lives in
 * WalletProviders' InnerProviders component, where wagmi hooks are
 * wired together with the auto-sign-on-connect orchestration. This
 * file just defines the context shape so any component that needs
 * to read auth state can call `useAuth()` without knowing about
 * wagmi or SIWE internals.
 *
 * Earlier iterations of this file owned the entire SIWE flow client-
 * side (custom signIn that called signMessageAsync, etc.), which
 * was supplanted by RainbowKit's RainbowKitAuthenticationProvider
 * adapter pattern, which was in turn supplanted by the current
 * approach: drop RK's auth provider entirely and run SIWE directly
 * via wagmi hooks the moment the wallet's session settles. The
 * shape of this context — siweAddress + isAuthenticating + signOut
 * — has stayed stable across all three iterations; consumers
 * (UserMenuButtons, LinksView, settings rows, etc.) haven't had to
 * change.
 *
 * Identity vs connection: `siweAddress` is the SIWE-verified
 * identity, independent of wagmi's connection state. The wallet
 * can disconnect and `siweAddress` will remain set until explicit
 * signOut or an address swap. This decoupling means consumers
 * reading `siweAddress` are reading "is the user logged in", not
 * "is the wallet currently attached for tx signing"; the latter
 * requires reading wagmi's `useAccount` directly.
 *
 * Consumers:
 *   - UserMenuButtons — reads `siweAddress` to decide button shape +
 *     `isAuthenticating` to gate clicks during loading
 *   - LinksView       — reads `siweAddress` for the profile link
 *     target, calls `signOut()` from the Log Out button
 *   - Various settings rows — read `siweAddress` to gate wallet-
 *     scoped UI
 */

import {
    createContext,
    useContext,
    type ReactNode,
} from 'react';

interface AuthContextValue {
    /** Lowercased SIWE-verified address. Null when no SIWE session. */
    siweAddress: string | null;
    /** True when we have a verified SIWE session. */
    isAuthenticated: boolean;
    /** True while the initial cookie hydration is in flight OR while
        an auto-sign signature request is in flight after a fresh
        connect. */
    isAuthenticating: boolean;
    /** Sign out: DELETE session cookie + wagmi disconnect + local state. */
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthContextProviderProps {
    siweAddress: string | null;
    isAuthenticating: boolean;
    signOut: () => Promise<void>;
    children: ReactNode;
}

export function AuthContextProvider({
    siweAddress,
    isAuthenticating,
    signOut,
    children,
}: AuthContextProviderProps) {
    return (
        <AuthContext.Provider
            value={{
                siweAddress,
                isAuthenticated: !!siweAddress,
                isAuthenticating,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used inside AuthContextProvider');
    }
    return ctx;
}
