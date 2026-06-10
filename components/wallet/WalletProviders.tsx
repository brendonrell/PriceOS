'use client';

/*
 * WalletProviders — top-of-tree client wrapper for the wallet stack.
 *
 * ── SPLIT ARCHITECTURE (perf batch 2026-06-10) ──────────────────────
 * This file is the EAGER half: it ships in the first load and owns the
 * auth state machine + everything that never needed wagmi. The heavy
 * half — wagmi + RainbowKit + the connector SDKs (WalletConnect,
 * MetaMask, Coinbase; the ~1.2MB chunk that used to ride in the root
 * layout's first load on every page) — lives in WalletStack.tsx behind
 * a dynamic import, mounted as a SIBLING of the app tree (so the app
 * never remounts) on first idle after paint, or immediately on the
 * first connect tap. lib/wallet/walletBus.ts is the seam that lets
 * deep consumers (UserMenuButtons, LinksView) reach the connect modal
 * / ENS name without importing the heavy chunk.
 *
 * Identity (SIWE) was ALREADY decoupled from connection (see below), so
 * the eager half can render the full signed-in UI from the server-read
 * cookie alone; the deferred half only matters when a wallet has to
 * actually connect or sign.
 *
 * AUTH FLOW (auto-sign on connect, sticky session — unchanged)
 *
 *   POPUPS BACK-TO-BACK
 *   1. User taps any connect surface → walletBus.openConnectModal() →
 *      RK modal opens (stack chunk is idle-prefetched long before a
 *      human reaches the button; a cold tap queues the open and the
 *      modal appears the moment the chunk lands).
 *   2. User picks a wallet → wagmi connector fires; status flips
 *      'disconnected' → 'connecting'. The stack prefetches a nonce via
 *      POST /api/auth/nonce in parallel with the wallet's approval
 *      handshake.
 *   3. Wallet returns → wagmi flips to 'connected'. The SignInModal
 *      (rendered inside the stack — it needs live wagmi state) anchors
 *      the sign request to a click; autoSign() builds the SIWE message
 *      with the pre-fetched nonce, pre-fires the iOS deep-link wake,
 *      and calls wagmi.signMessageAsync.
 *   4. User signs → signature verified server-side → address persisted
 *      in the iron-session cookie → this file's state flips to
 *      authenticated via the onSigned callback.
 *
 *   STICKY SIWE SESSION
 *   The SIWE cookie is the source of truth for "logged in". It only
 *   clears on:
 *     a. Explicit user logout via signOutFull()
 *     b. Address mismatch (security — wagmi connects to a different
 *        address than the one tied to the signed session)
 *     c. Server-side TTL expiry (14 days, refreshed on session.save())
 *
 *   Wagmi connection state is NOT a signal to clear SIWE. If the wallet
 *   disconnects (WC drops on iOS Safari refresh, user kills the wallet
 *   app, mobile loses network), the SIWE cookie persists and the UI
 *   continues to show the user as authenticated. Wallet-bound surfaces
 *   can prompt for a reconnect when the user attempts a tx-signing
 *   action; read-only views stay lit from the SIWE address.
 *
 *   This decouples "identity" from "connection". Identity is server-
 *   state, persistent, only torn down on explicit logout. Connection is
 *   wallet-state, ephemeral, restored on-demand (and, post-split,
 *   restored when the deferred stack mounts shortly after paint).
 *
 * SERVER-SIDE HYDRATION (unchanged shape)
 *   - `initialState` is wagmi's connection state from this request's
 *     cookie header (cookieToInitialState in layout) — forwarded to the
 *     deferred stack untouched.
 *   - `initialAuth` is the SIWE address from this request's iron-session
 *     cookie (getSession in layout) — consumed HERE, eagerly, so the
 *     first paint renders the correct auth state with zero round-trips.
 */

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
} from 'react';
import type { State as WagmiState } from 'wagmi';
import { serverSignOut } from '../../lib/wallet/siweSession';
import { AuthContextProvider } from '../../lib/state/AuthContext';
import { AccountCreateModal } from './AccountCreateModal';
import { fetchUserRow, fetchMe } from '../../lib/wallet/accountClient';
import { hydrateFromRow, resetUserState } from '../../lib/state/userState';
import type { UserRow } from '../../lib/supabase';
import type { UserProfileResponse } from '../../app/api/user/[address]/route';
import { setMainSpriteIdentity } from '../../lib/engines/priceSpriteEngine';
import { startEnsLookup } from '../../lib/engines/ensEngine';
import {
    markStackLoadFailed,
    markStackLoadRecovered,
    registerStackLoader,
    requestWalletDisconnect,
} from '../../lib/wallet/walletBus';
import type { WalletStackProps } from './WalletStack';

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

export function WalletProviders({
    children,
    initialState,
    initialAuth,
}: WalletProvidersProps) {
    /* Server-supplied auth means we already know the answer at first
       render. `undefined` = fall back to the legacy GET-on-mount path
       (defensive — env-var failure path, legacy callers). */
    const hasServerAuth = initialAuth !== undefined;

    const [phase, setPhase] = useState<AuthPhase>(() => {
        if (!hasServerAuth) return 'hydrating';
        return initialAuth ? 'authenticated' : 'idle';
    });
    const [siweAddress, setSiweAddress] = useState<string | null>(() =>
        hasServerAuth ? initialAuth ?? null : null
    );

    /* ── Deferred wallet stack loading ───────────────────────────────
       The heavy chunk loads on first idle after paint (requestIdleCallback
       with a timeout floor, setTimeout fallback) — out of the critical
       path, but resident long before a human reaches a connect button.
       walletBus can also force the load synchronously-on-tap; either way
       the import is single-flight. A failed import re-arms so the next
       tap retries instead of staying dead until refresh. */
    const [Stack, setStack] = useState<ComponentType<WalletStackProps> | null>(
        null
    );
    const stackLoadStartedRef = useRef(false);
    const loadStack = useCallback(() => {
        if (stackLoadStartedRef.current) return;
        stackLoadStartedRef.current = true;
        import('./WalletStack')
            .then((m) => {
                markStackLoadRecovered();
                setStack(() => m.default);
            })
            .catch(() => {
                stackLoadStartedRef.current = false;
                markStackLoadFailed();
            });
    }, []);

    useEffect(() => {
        registerStackLoader(loadStack);
        type IdleWindow = Window & {
            requestIdleCallback?: (
                cb: () => void,
                opts?: { timeout: number }
            ) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        const w = window as IdleWindow;
        let idleId: number | undefined;
        let timerId: ReturnType<typeof setTimeout> | undefined;
        if (typeof w.requestIdleCallback === 'function') {
            idleId = w.requestIdleCallback(loadStack, { timeout: 2500 });
        } else {
            timerId = setTimeout(loadStack, 1200);
        }
        return () => {
            if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
            if (timerId !== undefined) clearTimeout(timerId);
        };
    }, [loadStack]);

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

    /* Stack → parent state transitions. Stable identities (setters only)
       so the stack's effects don't re-fire on every parent render. */
    const handleSigning = useCallback(() => {
        setPhase('signing');
    }, []);
    const handleSigned = useCallback((verifiedAddress: string) => {
        setSiweAddress(verifiedAddress);
        setPhase('authenticated');
    }, []);
    const handleSignFailed = useCallback(() => {
        setSiweAddress(null);
        setPhase('idle');
    }, []);
    /* Address swap (security — see WalletStack watcher): a stale SIWE for
       the old address must not authorize requests as the new address. */
    const handleAddressSwap = useCallback(() => {
        void serverSignOut().finally(() => {
            setSiweAddress(null);
            setPhase('idle');
        });
    }, []);

    /* Full sign-out: server cookie + local state + wagmi disconnect (via
       the bus — queued if the stack isn't mounted yet, in which case
       there's no live connection worth keeping anyway; the queued
       disconnect tears down whatever the stack would restore). */
    const signOutFull = useCallback(async () => {
        await serverSignOut();
        setSiweAddress(null);
        setPhase('idle');
        requestWalletDisconnect();
    }, []);

    /* isAuthenticating semantic: true during initial cookie hydration AND
       during an in-flight sign request, so connect surfaces can show a
       spinner / disable themselves while the auto-sign cycle resolves. */
    const isAuthenticating = phase === 'hydrating' || phase === 'signing';

    /* User-row state for Real User Accounts v0.

         undefined → not yet known (no fetch started, or fetch in
                     flight). needsSignup is false in this state so
                     the AccountCreateModal doesn't flash open during
                     the post-SIWE GET.
         null      → server confirmed no row exists for this address.
         object    → server returned a row. handle === null means a
                     partial row (legacy / hypothetical for v0) and
                     still gates signup.

       Fetched on every siweAddress change. The address-swap path clears
       siweAddress before re-fetching, so the cached row from the
       previous identity never bleeds into the new one. */
    const [userRow, setUserRow] = useState<
        UserProfileResponse | null | undefined
    >(undefined);

    useEffect(() => {
        if (!siweAddress) {
            setUserRow(undefined);
            return;
        }
        let cancelled = false;
        setUserRow(undefined);
        fetchUserRow(siweAddress)
            .then((row) => {
                if (cancelled) return;
                setUserRow(row);
            })
            .catch(() => {
                /* Network / 5xx — leave state as undefined so
                   needsSignup stays false and the user isn't blocked
                   behind an empty modal they can't close. A future
                   retry surface or "Refresh" CTA can recover this;
                   for v0 the user can re-trigger via sign-out + sign-
                   in. */
                if (!cancelled) setUserRow(undefined);
            });
        return () => {
            cancelled = true;
        };
    }, [siweAddress]);

    /* User-state hydration — "log in anywhere, exactly as you left it."
       Decoupled from the needsSignup fetch above so it can't regress the
       signup flow, and so it survives the follows-join issue on the public
       /api/user route (fetchMe hits /api/me: service-role, own row, no join).
       On SIWE settle it pulls the caller's own row (incl. private state
       columns) and reconciles it into the local caches + live contexts;
       server wins. On sign-out / address change it drops the hydration guard
       so the next identity gets a clean overwrite. */
    useEffect(() => {
        if (!siweAddress) {
            resetUserState();
            return;
        }
        let cancelled = false;
        fetchMe()
            .then((row) => {
                if (cancelled || !row) return;
                hydrateFromRow(row);
            })
            .catch(() => {
                /* Offline / 5xx — the existing caches remain as the last-seen
                   mirror; a later sign-in retries. */
            });
        return () => {
            cancelled = true;
        };
    }, [siweAddress]);

    /* needsSignup: SIWE-authed AND the fetched row is known AND that
       row either doesn't exist or has handle === null. The "fetched
       row is known" gate (userRow !== undefined) is what keeps the
       modal from flashing during the post-SIWE GET. */
    const needsSignup =
        !!siweAddress
        && userRow !== undefined
        && (userRow === null || userRow.handle === null);

    /* Completion callback handed to both the modal (via props) and
       the AuthContext (for any other surface that ends up creating
       a row). Synthesises a follower/following pair so the cached
       value satisfies the UserProfileResponse shape returned by
       /api/user/{address}; counts are 0 for a freshly-claimed
       account anyway. */
    const handleAccountCreated = useCallback((user: UserRow) => {
        setUserRow({
            ...user,
            follower_count: 0,
            following_count: 0,
        });
    }, []);

    /* Sprite engine identity wiring. The priceSpriteEngine renders the
       standin kaomoji by default; once we have a SIWE'd wallet AND a
       fetched user row with both a claimed handle and a picked
       price_sprite, hand the engine that identity so it switches to
       the composed sprite. Any earlier state (no SIWE, fetch in
       flight, partial row) gets a null identity so the engine stays
       on the standin and downstream consumers (UserMenuButtons) keep
       the sprite + level badge hidden via frame.hasIdentity.

       Effect cleanup runs on every dep change AND on unmount —
       clearing the identity on unmount ensures the module-singleton
       engine doesn't bleed an old user's sprite into the next page
       if the provider tree re-mounts. */
    useEffect(() => {
        const hasFullIdentity =
            !!siweAddress
            && userRow !== undefined
            && userRow !== null
            && userRow.handle !== null
            && userRow.price_sprite !== null;
        if (hasFullIdentity) {
            setMainSpriteIdentity(siweAddress, userRow.price_sprite, userRow.price_sprite_resolved ?? null);
        } else {
            setMainSpriteIdentity(null, null);
        }
        return () => {
            setMainSpriteIdentity(null, null);
        };
    }, [siweAddress, userRow]);

    /* ENS prefetch — fires on every siweAddress change so ENS names
       are loaded before the user opens Settings. The engine caches to
       localStorage (5-min TTL) for instant warm-start on next mount. */
    useEffect(() => {
        startEnsLookup(siweAddress);
    }, [siweAddress]);

    return (
        <AuthContextProvider
            siweAddress={siweAddress}
            isAuthenticating={isAuthenticating}
            handle={userRow?.handle ?? null}
            accountLevel={userRow?.account_level ?? 0}
            priceRank={userRow?.price_rank ?? 0}
            needsSignup={needsSignup}
            onAccountCreated={handleAccountCreated}
            signOut={signOutFull}
        >
            {children}
            <AccountCreateModal
                open={needsSignup}
                address={siweAddress}
                onAccountCreated={handleAccountCreated}
            />
            {Stack && (
                <Stack
                    initialState={initialState}
                    siweAddress={siweAddress}
                    hydrating={phase === 'hydrating'}
                    signing={phase === 'signing'}
                    onSigning={handleSigning}
                    onSigned={handleSigned}
                    onSignFailed={handleSignFailed}
                    onAddressSwap={handleAddressSwap}
                />
            )}
        </AuthContextProvider>
    );
}
