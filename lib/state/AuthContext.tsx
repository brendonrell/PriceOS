'use client';

/*
 * AuthContext — passthrough provider exposing SIWE session state to
 * the rest of the app.
 *
 * The state itself (`siweAddress`, phase, fetched user row, etc.)
 * lives in WalletProviders (the eager half of the post-split wallet
 * stack, 2026-06-10); the wagmi-bound orchestration (auto-sign-on-
 * connect, address-swap watch) lives in the deferred WalletStack and
 * drives that state through callbacks. This file just defines the
 * context shape so any component that needs to read auth state can
 * call `useAuth()` without knowing about wagmi, SIWE, or Supabase
 * internals.
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
    useMemo,
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
    /** PriceRank — your TIER (0 = unranked, up to 10 = Apex). Derived from
        PriceScore crossing the thresholds in lib/achievements/tiers.ts.
        (Model locked 2026-06-14: Score is the number, Rank is the tier it
        unlocks — supersedes the older "PriceRank is the one number" note.)
        Backed by `users.price_rank`; defaults to 0. The old
        users.account_level column is dead and must never be surfaced. */
    priceRank: number;
    /** PriceScore — THE number. Sum of unlocked achievement points. Backed by
        `users.price_score`; 0 by default. The PriceSprite modal readout, the
        progress-to-next-tier bar, and the achievements wall all read this. */
    priceScore: number;
    /** PriceStreak — current consecutive-active-day count. Backed by
        `users.price_streak`; 0 by default. Activates (starts feeding Score)
        at 60 days; a missed day resets it to 0. */
    priceStreak: number;
    /** THE SIGIL — true when this wallet has forged its personal mark
        (users.sigil_forged_at not null). Seeds useSigilForged; flips live
        via the pd:sigil-forged broadcast when the forge fires. */
    sigilForged: boolean;
    /** THE SIGIL — hidden platform-wide (users.sigil_hidden). When true the
        viewer's own mark is suppressed in their connect pill; the same column
        is read on every profile so the hide reaches everyone. Flips live via
        the pd:sigil-visibility-changed refetch. */
    sigilHidden: boolean;
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
    priceRank: number;
    priceScore: number;
    priceStreak: number;
    sigilForged: boolean;
    sigilHidden: boolean;
    needsSignup: boolean;
    onAccountCreated: (user: UserRow) => void;
    signOut: () => Promise<void>;
    children: ReactNode;
}

export function AuthContextProvider({
    siweAddress,
    isAuthenticating,
    handle,
    priceRank,
    priceScore,
    priceStreak,
    sigilForged,
    sigilHidden,
    needsSignup,
    onAccountCreated,
    signOut,
    children,
}: AuthContextProviderProps) {
    /* Memoized so provider re-renders that don't change any auth field
       (e.g. the deferred wallet stack mounting inside WalletProviders)
       don't cascade a new context value through every useAuth consumer.
       (Perf batch 2026-06-10.) */
    const value = useMemo(
        () => ({
            siweAddress,
            isAuthenticated: !!siweAddress,
            isAuthenticating,
            handle,
            priceRank,
            priceScore,
            priceStreak,
            sigilForged,
            sigilHidden,
            needsSignup,
            onAccountCreated,
            signOut,
        }),
        [
            siweAddress,
            isAuthenticating,
            handle,
            priceRank,
            priceScore,
            priceStreak,
            sigilForged,
            sigilHidden,
            needsSignup,
            onAccountCreated,
            signOut,
        ],
    );

    return (
        <AuthContext.Provider value={value}>
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
