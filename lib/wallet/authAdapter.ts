'use client';

/*
 * authAdapter — RainbowKit's SIWE flow with a mobile-Safari deep-link
 * pre-fire.
 *
 * Lifecycle (RainbowKit 2.2.x):
 *   1. RK modal calls `getNonce()` → server stashes nonce in
 *      iron-session, returns it.
 *   2. Modal calls `createMessage({ nonce, address, chainId })` and
 *      awaits the return. We return an EIP-4361-prepared string
 *      directly — `signMessageAsync({ message })` is what RK calls
 *      next, and wagmi's signMessageAsync signs `string | { raw }`.
 *      Returning a SiweMessage object here is the actual cause of the
 *      "invalid parameters" wallet rejection some adapters hit; the
 *      generic <Message> param on `AuthenticationAdapter` lets you
 *      return anything, but in practice it has to be what
 *      signMessageAsync can sign.
 *   3. RK calls `signMessageAsync` → wagmi → WC provider → relay.
 *      WALLETCONNECT MOBILE DEEP-LINK NOTE: WC v2's internal
 *      `handleDeeplinkRedirect` (in @walletconnect/utils) is the
 *      mechanism that bounces the user from Safari back to their
 *      wallet on follow-up RPC calls. It reads
 *      `localStorage.WALLETCONNECT_DEEPLINK_CHOICE` (which RK sets
 *      when the user picks a named wallet from the modal) and opens
 *      that URL — but it's guarded by `document.hasFocus()`. On iOS
 *      Safari that returns false during the post-connect transition,
 *      WC logs "Document does not have focus, skipping deeplink", and
 *      the sign request stays parked on the relay until it expires
 *      and surfaces as a "connection error". The Verify tap that
 *      triggers `createMessage` IS in user-gesture context, so we
 *      take that opportunity to wake the wallet ourselves; WC's own
 *      redirect can still run downstream and is harmless if it skips.
 *   4. Wallet signs → modal calls `verify({ message, signature })`
 *      → server validates, writes address into session, returns it.
 *   5. `signOut` clears the server session.
 *
 * SIWE message shape adds two fields beyond the minimum:
 *   - expirationTime (10 min from issuedAt) — siwe v2's verify()
 *     enforces this on the server, and wallets render messages with
 *     an explicit expiry more readably than open-ended ones.
 *   - resources — a single entry pointing at our origin. EIP-4361
 *     "RECOMMENDED": some wallet UIs hide messages with no resources.
 */

import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';

const SIWE_EXPIRY_MINUTES = 10;
const WC_DEEPLINK_CHOICE_KEY = 'WALLETCONNECT_DEEPLINK_CHOICE';

interface AuthAdapterOptions {
    onAuthenticated: (address: string) => void;
    onSignedOut: () => void;
}

/* iOS Safari is the failure-mode platform for the WC deep-link
   hasFocus() skip. On Android, WC's redirect runs in user-gesture
   context reliably; on desktop there's no deep-link to fire. Scoping
   the workaround to iOS browsers avoids double-firing on platforms
   that don't need it. WebViews inside wallet apps (RainbowKit's
   injected path) don't have a stored deep-link choice, so the
   workaround no-ops there anyway — the scope check is defence in
   depth. */
function isIosBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    // iPadOS 13+ reports as Mac; touchpoint check disambiguates.
    const isIpadOs =
        ua.includes('Macintosh') &&
        typeof navigator.maxTouchPoints === 'number' &&
        navigator.maxTouchPoints > 1;
    return /iP(hone|ad|od)/.test(ua) || isIpadOs;
}

/* Read the wallet choice RainbowKit stashed when the user picked a
   wallet from the modal and open that URL. WC's getDeepLink helper
   (Oi() in @walletconnect/utils) reads the same key — we're using
   the same source of truth, just firing under user-gesture context
   to sidestep the hasFocus() bail-out. Matches RK's own mobileUri
   strategy: anchor click + _blank for https universal links, direct
   navigation for native schemes (rainbow://, metamask://, etc.). */
function wakeWalletForSignStep(): void {
    if (typeof window === 'undefined') return;
    let href: string | undefined;
    try {
        const raw = window.localStorage.getItem(WC_DEEPLINK_CHOICE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { href?: string };
        href = parsed?.href;
    } catch {
        return; // corrupted entry — let WC's own redirect try downstream.
    }
    if (typeof href !== 'string' || href.length === 0) return;

    if (href.startsWith('http')) {
        // Universal link — anchor click is what iOS Safari treats as
        // a user gesture for app handoff. `link.click()` inside a
        // synchronous click handler keeps the gesture lineage.
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.click();
    } else {
        // Native scheme — direct navigation. Replaces the current URL
        // and asks iOS to hand off; Safari stays alive in the
        // background so the WC websocket can still resolve the
        // signature when the wallet responds.
        window.location.href = href;
    }
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
            const issuedAt = new Date();
            const expirationTime = new Date(
                issuedAt.getTime() + SIWE_EXPIRY_MINUTES * 60 * 1000
            );

            const message = new SiweMessage({
                domain: window.location.host,
                address,
                statement: 'Sign in to Price Discussion.',
                uri: window.location.origin,
                version: '1',
                chainId,
                nonce,
                issuedAt: issuedAt.toISOString(),
                expirationTime: expirationTime.toISOString(),
                resources: [window.location.origin],
            }).prepareMessage();

            /* Mobile-Safari deep-link pre-fire (see header comment). We
               run this AFTER message preparation so the synchronous
               click-handler gesture is still on the stack when
               window.open / window.location.href executes — iOS
               requires the gesture to be unbroken from the original
               user tap. RK calls createMessage synchronously off the
               Verify tap, so this works. */
            if (isIosBrowser()) {
                wakeWalletForSignStep();
            }

            return message;
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
