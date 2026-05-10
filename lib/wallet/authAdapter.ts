'use client';

/*
 * authAdapter — RainbowKit's official SIWE flow.
 *
 * `createAuthenticationAdapter` lets RainbowKit's modal own the entire
 * connect → sign-message → verify cycle. On mobile this matters because
 * RainbowKit can request the wallet to handle connect AND sign in a
 * single round-trip, instead of two sequential deep-links — which is
 * the failure mode iOS Safari hits when the JS context gets killed
 * between the connect deep-link and the sign deep-link.
 *
 * Lifecycle (RainbowKit 2.2.x adapter API):
 *   1. RainbowKit modal calls `getNonce()` → server stashes nonce in
 *      session, returns it.
 *   2. Modal calls `createMessage({ nonce, address, chainId })` and
 *      awaits the result. The return value MUST be a string (the
 *      EIP-4361 prepared message body) — RainbowKit hands it directly
 *      to wagmi's `signMessageAsync({ message })`, which requires a
 *      string. Returning a SiweMessage *object* here is the actual
 *      "invalid parameters" wallet rejection; wagmi can't sign an
 *      object, only a string.
 *   3. Wallet returns signature; modal calls `verify({ message,
 *      signature })` with the same string.
 *   4. Server verifies signature against expected nonce, writes
 *      address into the session cookie. On success, the adapter
 *      notifies its caller via `onAuthenticated(address)` so React
 *      state updates.
 *   5. `signOut()` clears the server session and notifies via
 *      `onSignedOut()`.
 *
 * NOTE on RainbowKit version drift: the 2.1.x adapter API had a
 * separate `getMessageBody({ message })` step that converted the
 * SiweMessage object to a string before signing. 2.2.x removed
 * `getMessageBody` and pushed string preparation into `createMessage`.
 * The package.json constraint is `^2.1.0`, which resolves to 2.2.11
 * in package-lock.json — so this file targets the 2.2.x shape.
 *
 * The adapter is built as a factory because it needs closures over
 * the `onAuthenticated` / `onSignedOut` callbacks — those callbacks
 * live in WalletProviders' inner component (where the React state for
 * `siweAddress` and `status` is held).
 */

import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';

interface AuthAdapterOptions {
    onAuthenticated: (address: string) => void;
    onSignedOut: () => void;
}

export function createAuthAdapter(options: AuthAdapterOptions) {
    return createAuthenticationAdapter({
        getNonce: async () => {
            const r = await fetch('/api/auth/nonce', {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (!r.ok) throw new Error('nonce fetch failed');
            const { nonce } = (await r.json()) as { nonce: string };
            if (typeof nonce !== 'string' || nonce.length === 0) {
                throw new Error('nonce response malformed');
            }
            return nonce;
        },

        createMessage: ({ nonce, address, chainId }) => {
            return new SiweMessage({
                domain: window.location.host,
                address,
                statement: 'Sign in to Price Discussion.',
                uri: window.location.origin,
                version: '1',
                chainId,
                nonce,
                issuedAt: new Date().toISOString(),
            }).prepareMessage();
        },

        verify: async ({ message, signature }) => {
            const r = await fetch('/api/auth/siwe', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, signature }),
            });
            if (!r.ok) return false;
            const data = (await r.json()) as { address?: string };
            if (data?.address) {
                options.onAuthenticated(data.address.toLowerCase());
                return true;
            }
            return false;
        },

        signOut: async () => {
            try {
                await fetch('/api/auth/siwe', {
                    method: 'DELETE',
                    credentials: 'same-origin',
                });
            } catch {
                /* swallow — best effort */
            }
            options.onSignedOut();
        },
    });
}
