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
import { SignInModal } from './SignInModal';
import { AccountCreateModal } from './AccountCreateModal';
import { fetchUserRow, fetchMe } from '../../lib/wallet/accountClient';
import { hydrateFromRow, resetUserState } from '../../lib/state/userState';
import type { UserRow } from '../../lib/supabase';
import type { UserProfileResponse } from '../../app/api/user/[address]/route';
import { setMainSpriteIdentity } from '../../lib/engines/priceSpriteEngine';
import { startEnsLookup } from '../../lib/engines/ensEngine';

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
               Drop phase back to 'idle' but DO NOT disconnect wagmi —
               the SignInModal stays open (it's keyed off
               connected-and-not-signed) so the user can tap Sign again
               without re-running the connect flow. Cancel button is
               the explicit path back to disconnected. */
            setSiweAddress(null);
            setPhase('idle');
        } finally {
            inFlightSignRef.current = false;
        }
    }, [address, chainId, signMessageAsync]);

    /* Wagmi-state watcher.

         Address swap: wagmi is 'connected' with an address that
         doesn't match siweAddress → serverSignOut + clear local.
         Fires regardless of how we got into 'connected' (user
         initiated or cookie restore). Security: a stale SIWE for
         the old address must not authorize requests as the new
         address.

       Auto-fire-on-connect branch removed (2026-05). Previously this
       useEffect ran autoSign() on the 'connecting' → 'connected' edge
       so the signature prompt would land back-to-back with the connect
       popup. That happy-path worked but had two failure modes Brendon
       hit repeatedly:
         a. The sign popup sometimes didn't appear at all (wallet had
            already bounced back to Safari; useEffect's pseudo-gesture
            window was cold).
         b. If the user rejected or the wallet dropped, autoSign would
            disconnect wagmi — leaving no surface to retry from.
       The SignInModal renders whenever wagmi reports 'connected' AND
       siweAddress is unset, anchoring the Sign request to a click. The
       modal closes on success; on rejection it stays so the user can
       tap Sign again. Cancel disconnects. */
    const prevWagmiStatusRef = useRef<typeof wagmiStatus | undefined>(undefined);
    useEffect(() => {
        prevWagmiStatusRef.current = wagmiStatus;

        // Address swap.
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

        /* All other transitions — including the 'connecting' →
           'connected' edge — are no-ops here. The SignInModal handles
           the user-initiated connect → sign sequence via its button.
           Reconnecting → connected and connected → disconnected
           remain no-ops for SIWE state too; identity is sticky against
           wagmi state changes. */
    }, [wagmiStatus, address, siweAddress]);

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

    /* User-row state for Real User Accounts v0.

         undefined → not yet known (no fetch started, or fetch in
                     flight). needsSignup is false in this state so
                     the AccountCreateModal doesn't flash open during
                     the post-SIWE GET.
         null      → server confirmed no row exists for this address.
         object    → server returned a row. handle === null means a
                     partial row (legacy / hypothetical for v0) and
                     still gates signup.

       Fetched on every siweAddress change. The address-swap branch
       in the wagmi watcher clears siweAddress before re-fetching, so
       the cached row from the previous identity never bleeds into
       the new one. */
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
            setMainSpriteIdentity(siweAddress, userRow.price_sprite);
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

    /* SignInModal is visible when wagmi has a connected address but
       no SIWE session yet, AND we're past the initial cookie hydration
       (so we don't flash the modal during the auth-cookie GET). The
       address swap branch above clears siweAddress when the wagmi
       address stops matching, which re-opens this modal so the user
       can sign in as the new identity without a manual reconnect. */
    const signInModalOpen =
        wagmiStatus === 'connected' &&
        !!address &&
        !siweAddress &&
        phase !== 'hydrating';

    const handleSignInCancel = useCallback(() => {
        try {
            disconnect();
        } catch {
            /* swallow — wallet might already be gone */
        }
        setSiweAddress(null);
        setPhase('idle');
    }, [disconnect]);

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
                handle={userRow?.handle ?? null}
                accountLevel={userRow?.account_level ?? 0}
                needsSignup={needsSignup}
                onAccountCreated={handleAccountCreated}
                signOut={signOutFull}
            >
                {children}
                <SignInModal
                    open={signInModalOpen}
                    address={address ?? null}
                    signing={phase === 'signing'}
                    onSign={() => {
                        void autoSign();
                    }}
                    onCancel={handleSignInCancel}
                />
                <AccountCreateModal
                    open={needsSignup}
                    address={siweAddress}
                    onAccountCreated={handleAccountCreated}
                />
            </AuthContextProvider>
        </RainbowKitProvider>
    );
}
