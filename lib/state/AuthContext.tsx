'use client';

/*
 * AuthContext — passthrough provider exposing SIWE session state to
 * the rest of the app.
 *
 * The state itself (`siweAddress`, phase, fetched user row, etc.)
 * lives in WalletProviders' InnerProviders component, where wagmi
 * hooks are wired together with the auto-sign-on-connect
 * orchestration and the post-SIWE account-row fetch. This file just
 * defines the context shape so any component that needs to read auth
 * state can call `useAuth()` without knowing about wagmi, SIWE, or
 * Supabase internals.
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
 * Real User Accounts v0 adds two fields:
 *   - needsSignup       — true when the SIWE-auth'd address has no
 *                         row yet (or has a row with handle === null).
 *                         AccountCreateModal mounts off this; other
 *                         surfaces can read it to gate "your profile"
 *                         UI behind the claim step.
 *   - onAccountCreated  — completion callback the AccountCreateModal
 *                         calls when the server confirms the new row.
 *                         Wired through context so the modal can stay
 *                         decoupled from where the user-row state
 *                         actually lives (InnerProviders). Exposed in
 *                         the public context so other surfaces that
 *                         create rows (admin tools, debug pages) can
 *                         notify the auth layer the same way.
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
 *   - WalletProviders — reads `needsSignup` to mount AccountCreateModal
 *   - Various settings rows — read `siweAddress` to gate wallet-
 *     scoped UI
 */

import {
    createContext,
    useContext,
    type ReactNode,
} from 'react';
import type { UserRow } from '@/lib/supabase';

interface AuthContextValue {
    /** Lowercased SIWE-verified address. Null when no SIWE session. */
    siweAddress: string | null;
    /** True when we have a verified SIWE session. */
    isAuthenticated: boolean;
    /** True while the initial cookie hydration is in flight OR while
        an auto-sign signature request is in flight after a fresh
        connect. */
    isAuthenticating: boolean;
    /** Claimed PD handle for the SIWE-auth'd address. Null when no
        session, while the user-row fetch is in flight, or after the
        fetch returns a row with handle === null (the AccountCreateModal
        is gating that state). Display surfaces (the connect-menu pill,
        future profile-link targets, etc.) read this as the top of the
        user-text priority chain — above ENS, above shortAddr. */
    handle: string | null;
    /** True when the SIWE-auth'd address has no claimed handle yet.
        AccountCreateModal mounts on this. False during the auth-cookie
        hydration AND during the post-SIWE user-row fetch, so the modal
        never flashes open on a stale state. */
    needsSignup: boolean;
    /** Completion handler the AccountCreateModal calls on a successful
        POST /api/users/create. Updates the cached user row so
        needsSignup flips to false → modal unmounts. */
    onAccountCreated: (user: UserRow) => void;
    /** Sign out: DELETE session cookie + wagmi disconnect + local state. */
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthContextProviderProps {
    siweAddress: string | null;
    isAuthenticating: boolean;
    handle: string | null;
    needsSignup: boolean;
    onAccountCreated: (user: UserRow) => void;
    signOut: () => Promise<void>;
    children: ReactNode;
}

export function AuthContextProvider({
    siweAddress,
    isAuthenticating,
    handle,
    needsSignup,
    onAccountCreated,
    signOut,
    children,
}: AuthContextProviderProps) {
    return (
        <AuthContext.Provider
            value={{
                siweAddress,
                isAuthenticated: !!siweAddress,
                isAuthenticating,
                handle,
                needsSignup,
                onAccountCreated,
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
