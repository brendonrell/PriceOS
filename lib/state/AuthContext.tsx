'use client';

/*
 * AuthContext — passthrough provider exposing SIWE session state to
 * the rest of the app.
 *
 * The state itself (`siweAddress`, status, etc.) lives in
 * WalletProviders' InnerProviders component, where wagmi hooks +
 * RainbowKit's auth adapter are wired together. This file just
 * defines the context shape so any component that needs to read auth
 * state can call `useAuth()` without knowing about RainbowKit
 * internals.
 *
 * Earlier iterations of this file owned the entire SIWE flow client-
 * side (custom signIn that called signMessageAsync, etc.). That
 * worked on desktop but broke on iOS Safari mobile when the JS
 * context died between the wallet deep-link and the verify round-
 * trip. RainbowKit's `RainbowKitAuthenticationProvider` (wired in
 * WalletProviders) handles that cycle natively, so this context is
 * now a passive view.
 *
 * Consumers:
 *   - UserMenuButtons — reads `siweAddress` to decide button shape +
 *     `isAuthenticating` to gate clicks during loading
 *   - LinksView       — reads `siweAddress` for the profile link target,
 *     calls `signOut()` from the Log Out button
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
    /** True while the initial cookie hydration is in flight. After
        hydration this stays false; RainbowKit's modal flow has its own
        in-modal loading state. */
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
