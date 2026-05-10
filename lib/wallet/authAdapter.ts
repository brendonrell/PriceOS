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
 *   3. Modal calls `getMessageBody({ message })` to convert that object
 *      to the EIP-4361 string the wallet will sign. This step is
 *      REQUIRED — RainbowKit calls it inside its sign hook before
 *      handing the result to wagmi's `signMessageAsync`. Without it,
 *      the wallet receives `undefined` (or a SiweMessage object) and
 *      rejects with "invalid parameters" on every platform, not just
 *      mobile. The `AuthenticationAdapter<Message>` type marks this
 *      field as required (no `?`); a missing-field error only escapes
 *      because Next's default build tolerates type errors.
 *   4. Wallet returns signature; modal calls `verify({ message, signature })`
 *      with the SiweMessage object (not the prepared string).
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
 *
 * `createAuthenticationAdapter<SiweMessage>` is explicitly typed so the
 * Message generic is concrete. If `getMessageBody` ever falls out of
 * the object literal again, TypeScript will fail the build immediately
 * instead of letting the bug ship.
 */

import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';

interface AuthAdapterOptions {
    onAuthenticated: (address: string) => void;
    onSignedOut: () => void;
}

export function createAuthAdapter(options: AuthAdapterOptions) {
    return createAuthenticationAdapter<SiweMessage>({
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

        getMessageBody: ({ message }) => message.prepareMessage(),

        verify: async ({ message, signature }) => {
            const r = await fetch('/api/auth/siwe', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message.prepareMessage(),
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
