'use client';

/*
 * authAdapter — RainbowKit's official SIWE flow.
 *
 * `createAuthenticationAdapter` lets RainbowKit's modal own the entire
 * connect → sign-message → verify cycle. On mobile this matters because
 * RainbowKit can request the wallet to handle connect AND sign in a
 * single round-trip (supported wallets follow the WalletConnect Auth
 * spec), instead of two sequential deep-links — which is the failure
 * mode iOS Safari hits when the JS context gets killed between the
 * connect deep-link and the sign deep-link.
 *
 * Lifecycle:
 *   1. RainbowKit modal calls `getNonce()` → server stashes nonce in
 *      session, returns it.
 *   2. Modal calls `createMessage()` to build the SIWE message object.
 *   3. Modal calls `getMessageBody()` to get the EIP-4361 string the
 *      wallet will sign.
 *   4. Wallet returns signature; modal calls `verify()`.
 *   5. Server verifies signature against expected nonce, writes address
 *      into the session cookie. If success, the adapter notifies its
 *      caller via `onAuthenticated(address)` so React state updates.
 *   6. `signOut()` clears the server session and notifies via
 *      `onSignedOut()`.
 *
 * The adapter is built as a factory because it needs closures over the
 * `onAuthenticated` / `onSignedOut` callbacks — those callbacks live in
 * WalletProviders' inner component (where the React state for
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
            });
        },

        /* RainbowKit calls this to convert the SiweMessage object
           returned by `createMessage` into the EIP-4361 string the
           wallet actually signs. Without it RainbowKit serializes the
           object via fallback logic (often JSON.stringify) and the
           wallet rejects with "invalid parameters" because the result
           isn't a valid SIWE string. */
        getMessageBody: ({ message }) => {
            return (message as SiweMessage).prepareMessage();
        },

        verify: async ({ message, signature }) => {
            const messageBody =
                typeof message === 'string'
                    ? message
                    : (message as SiweMessage).prepareMessage();
            const r = await fetch('/api/auth/siwe', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageBody,
                    signature,
                }),
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
