'use client';

/*
 * AuthContext — SIWE (Sign-In With Ethereum) flow on top of wagmi.
 *
 * Three layers of "auth" in this stack:
 *
 *   1. Wallet connected (wagmi `useAccount().isConnected`):
 *      A wallet is paired with the page. The address is known but no
 *      signed proof has been exchanged with the server. Read-only
 *      surfaces (gallery, project pages) work; writes do not.
 *
 *   2. SIWE-signed (this context's `siweAddress`):
 *      The user signed an EIP-4361 message with the connected wallet
 *      and the server verified the signature, then wrote a signed
 *      iron-session cookie. Server now treats this user as
 *      authenticated. `requireAuth()` in `lib/auth/siwe.ts` reads the
 *      cookie on every protected request.
 *
 *   3. Logged out:
 *      Cookie cleared (DELETE /api/auth/siwe) AND wagmi disconnected.
 *      Both halves matter — leaving the cookie around after wagmi
 *      disconnect would let a stale session keep writing.
 *
 * Lifecycle:
 *   - On mount, GET /api/auth/siwe to hydrate `siweAddress` from the
 *     cookie (if any). This handles full-page reloads cleanly.
 *   - When wagmi connects + the connected address differs from
 *     `siweAddress`, auto-fire `signIn()`:
 *       a. POST /api/auth/nonce → server stashes nonce in session,
 *          returns it
 *       b. Build EIP-4361 message via `siwe`'s SiweMessage, sign with
 *          wagmi's `useSignMessage`
 *       c. POST /api/auth/siwe { message, signature } → server
 *          verifies + writes address to session cookie
 *       d. Update local `siweAddress` from the verify response
 *   - User-rejected sign (or any failure) leaves `siweAddress = null`.
 *     The connect button stays in its "needs sign" state; clicking it
 *     re-fires the flow (the existing `useConnectModal()` re-prompt
 *     route works too — wagmi treats the wallet as still connected).
 *   - When wagmi disconnects (or address swaps), drop local
 *     `siweAddress` so the connect button reverts to "Connect". The
 *     server cookie eventually expires; meanwhile mismatched cookie
 *     vs. wagmi state is harmless because protected requests still
 *     succeed (the server only cares about the cookie).
 *
 * This context is the single source of truth for "is the current user
 * authenticated?" — UI components consume `useAuth()` rather than
 * reading wagmi directly. Wagmi's `useAccount()` stays useful for
 * raw wallet bits (chain, balance lookups) but should NOT be the
 * gate for protected UI.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useAccount, useChainId, useDisconnect, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';

interface AuthContextValue {
    /** Lowercased SIWE-verified address. Null when no SIWE session. */
    siweAddress: string | null;
    /** True when we have a verified SIWE session. */
    isAuthenticated: boolean;
    /** True while a sign-in flow (nonce → sign → verify) is in flight. */
    isAuthenticating: boolean;
    /** Manually trigger the SIWE flow. Auto-fires on wallet connect; this
        is the retry path after a user rejection. */
    signIn: () => Promise<void>;
    /** Sign out: DELETE session cookie + wagmi disconnect. */
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { disconnect } = useDisconnect();
    const { signMessageAsync } = useSignMessage();

    const [siweAddress, setSiweAddress] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    /* In-flight guard. State updates are async + batched, so a fast
       re-render of the auto-sign useEffect could fire signIn() twice
       before `isAuthenticating` reflects true. Ref is synchronous. */
    const inFlightRef = useRef(false);

    /* Hydrate session on mount. Server returns { address: null } when
       no cookie is present — that's a 200, not a 401. We only flip
       siweAddress when we get a non-null address back. */
    useEffect(() => {
        let cancelled = false;
        fetch('/api/auth/siwe', { method: 'GET', credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                if (data && typeof data.address === 'string') {
                    setSiweAddress(data.address.toLowerCase());
                }
            })
            .catch(() => {
                /* swallow — no cookie / network blip is non-fatal */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const signIn = useCallback(async () => {
        if (!isConnected || !address) return;
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setIsAuthenticating(true);
        try {
            // 1. Get nonce.
            const nonceRes = await fetch('/api/auth/nonce', {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (!nonceRes.ok) throw new Error('nonce fetch failed');
            const { nonce } = (await nonceRes.json()) as { nonce: string };
            if (typeof nonce !== 'string' || nonce.length === 0) {
                throw new Error('nonce response malformed');
            }

            // 2. Build + sign SIWE message.
            const message = new SiweMessage({
                domain: window.location.host,
                address,
                statement: 'Sign in to Price Discussion.',
                uri: window.location.origin,
                version: '1',
                chainId,
                nonce,
                issuedAt: new Date().toISOString(),
            }).prepareMessage();
            const signature = await signMessageAsync({ message });

            // 3. POST to verify, server writes session cookie.
            const verifyRes = await fetch('/api/auth/siwe', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, signature }),
            });
            if (!verifyRes.ok) throw new Error('verify failed');
            const data = (await verifyRes.json()) as { address?: string };
            if (data?.address) setSiweAddress(data.address.toLowerCase());
        } catch (err) {
            // User rejected, network error, or verification failed.
            // Stay disconnected from a SIWE perspective; wagmi still
            // considers the wallet connected so the user can retry by
            // clicking the connect button (which re-routes to signIn
            // when wagmi is connected but siweAddress is null).
            // eslint-disable-next-line no-console
            console.warn('[siwe] sign-in failed', err);
        } finally {
            inFlightRef.current = false;
            setIsAuthenticating(false);
        }
    }, [address, chainId, isConnected, signMessageAsync]);

    /* Auto-fire SIWE when wagmi connects but no matching session exists.
       Skip when we're already authenticating, or already authenticated
       to the same address. */
    useEffect(() => {
        if (!isConnected || !address) return;
        if (inFlightRef.current) return;
        if (siweAddress && siweAddress === address.toLowerCase()) return;
        signIn();
        // signIn is captured via deps; siweAddress + isConnected drive re-eval.
    }, [isConnected, address, siweAddress, signIn]);

    /* Drop local SIWE state when the wallet half changes underneath us:
        - wagmi disconnects (user clicked disconnect in the wallet)
        - address swaps to a different account
       The cookie itself stays until DELETE — that's harmless because
       siweAddress is the gate for UI, not the cookie. */
    useEffect(() => {
        if (!isConnected && siweAddress) {
            setSiweAddress(null);
            return;
        }
        if (
            isConnected &&
            address &&
            siweAddress &&
            address.toLowerCase() !== siweAddress
        ) {
            setSiweAddress(null);
        }
    }, [isConnected, address, siweAddress]);

    const signOut = useCallback(async () => {
        try {
            await fetch('/api/auth/siwe', {
                method: 'DELETE',
                credentials: 'same-origin',
            });
        } catch {
            /* swallow — best effort */
        }
        setSiweAddress(null);
        try {
            disconnect();
        } catch {
            /* swallow — wallet might already be gone */
        }
    }, [disconnect]);

    return (
        <AuthContext.Provider
            value={{
                siweAddress,
                isAuthenticated: !!siweAddress,
                isAuthenticating,
                signIn,
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
        throw new Error('useAuth must be used inside AuthProvider');
    }
    return ctx;
}
